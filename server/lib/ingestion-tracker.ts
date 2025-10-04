import crypto from "crypto";
import type { IngestionEvent, IngestionStatus, UpdateIngestionEvent } from "../../shared/schema.js";
import { storage, storageReady } from "../storage.js";
import logger from "../middleware/logger.js";

interface BeginIngestionOptions {
  source: string;
  scope: string;
  metadata?: Record<string, unknown>;
  fallbackUsed?: boolean;
  dedupeKey?: string;
  metrics?: Record<string, unknown>;
}

interface CompleteIngestionOptions {
  status?: IngestionStatus;
  recordsWritten?: number;
  fallbackUsed?: boolean;
  metadata?: Record<string, unknown>;
  checksum?: string;
  error?: unknown;
  metrics?: Record<string, unknown>;
  retryCount?: number;
  lastErrorAt?: Date;
  updatedAt?: Date;
}

export interface IngestionContext {
  id: string;
  source: string;
  scope: string;
  startedAt: Date;
}

export interface IngestionSummaryTotals {
  totalEvents: number;
  byStatus: Record<IngestionStatus, number>;
  fallbackEvents: number;
  retries: number;
}

export interface IngestionSummaryAverages {
  durationMs: number | null;
  recordsWritten: number | null;
}

export interface IngestionSummary {
  generatedAt: string;
  totals: IngestionSummaryTotals;
  averages: IngestionSummaryAverages;
  recentEvents: IngestionEvent[];
  lastSuccessfulEvent?: IngestionEvent;
  lastFailedEvent?: IngestionEvent;
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  try {
    return JSON.stringify(error);
  } catch (_error) {
    return String(error);
  }
}

/**
 * Begin tracking an ingestion event and return a context handle.
 */
export async function beginIngestionEvent(options: BeginIngestionOptions): Promise<IngestionContext> {
  // Wait for storage to be initialized
  await storageReady;
  
  const startedAt = new Date();
  const dedupeKey = options.dedupeKey ?? computeChecksum({
    source: options.source,
    scope: options.scope,
    startedAt: startedAt.toISOString(),
    metadata: options.metadata ?? null
  });

  try {
    const event = await storage.createIngestionEvent({
      source: options.source,
      scope: options.scope,
      status: "running",
      startedAt,
      fallbackUsed: options.fallbackUsed ?? false,
      metadata: options.metadata,
      dedupeKey,
      metrics: options.metrics,
      updatedAt: startedAt
    });

    if (event && event.id) {
      logger.info(
        {
          ingestionId: event.id,
          source: event.source,
          scope: event.scope,
          metadata: options.metadata,
          dedupeKey: event.dedupeKey
        },
        "Ingestion event started"
      );

      return {
        id: event.id,
        source: event.source,
        scope: event.scope,
        startedAt: event.startedAt ?? startedAt
      };
    }

    logger.warn(
      {
        source: options.source,
        scope: options.scope,
        metadata: options.metadata
      },
      "Storage createIngestionEvent returned no event; using degraded ingestion tracking"
    );
  } catch (error) {
    logger.warn(
      {
        source: options.source,
        scope: options.scope,
        metadata: options.metadata,
        error: toErrorMessage(error)
      },
      "Failed to persist ingestion event; using degraded ingestion tracking"
    );
  }

  const fallbackSuffix = typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : computeChecksum({ source: options.source, scope: options.scope, startedAt: startedAt.toISOString() }).slice(0, 16);
  const fallbackId = `fallback:${options.source}:${options.scope}:${fallbackSuffix}`;

  return {
    id: fallbackId,
    source: options.source,
    scope: options.scope,
    startedAt
  };
}

function buildUpdatePayload(
  ctx: IngestionContext,
  finishedAt: Date,
  options: CompleteIngestionOptions
): UpdateIngestionEvent {
  const update: UpdateIngestionEvent = {
    status: options.status ?? (options.error ? "failed" : "completed"),
    finishedAt,
    durationMs: finishedAt.getTime() - ctx.startedAt.getTime(),
  };

  if (options.recordsWritten !== undefined) {
    update.recordsWritten = options.recordsWritten;
  }
  if (options.fallbackUsed !== undefined) {
    update.fallbackUsed = options.fallbackUsed;
  }
  if (options.metadata !== undefined) {
    update.metadata = options.metadata;
  }
  if (options.checksum !== undefined) {
    update.checksum = options.checksum;
  }
  if (options.error !== undefined) {
    update.error = toErrorMessage(options.error);
  }
  if (options.metrics !== undefined) {
    update.metrics = options.metrics;
  }
  if (options.retryCount !== undefined) {
    update.retryCount = options.retryCount;
  }
  if (options.lastErrorAt !== undefined) {
    update.lastErrorAt = options.lastErrorAt;
  }
  update.updatedAt = options.updatedAt ?? finishedAt;

  return update;
}

async function persistUpdate(ctx: IngestionContext, update: UpdateIngestionEvent, logContext: Record<string, unknown>) {
  try {
    const result = await storage.updateIngestionEvent(ctx.id, update);
    if (!result) {
      logger.warn(
        {
          ingestionId: ctx.id,
          update
        },
        "Ingestion event update referenced unknown id"
      );
    }
  } catch (error) {
    logger.error(
      {
        ingestionId: ctx.id,
        update,
        error: toErrorMessage(error)
      },
      "Failed to persist ingestion event update"
    );
  }

  logger.info(logContext, "Ingestion event finalized");
}

/**
 * Complete an ingestion event. Use `failIngestionEvent` for error scenarios.
 */
export async function completeIngestionEvent(
  ctx: IngestionContext,
  options: CompleteIngestionOptions = {}
): Promise<void> {
  const finishedAt = new Date();
  const update = buildUpdatePayload(ctx, finishedAt, options);

  const logContext = {
    ingestionId: ctx.id,
    source: ctx.source,
    scope: ctx.scope,
    status: update.status,
    recordsWritten: options.recordsWritten,
    fallbackUsed: options.fallbackUsed ?? false,
    retryCount: options.retryCount
  };

  if (!ctx.id.startsWith('fallback:')) {
    await persistUpdate(ctx, update, logContext);
    return;
  }

  logger.info(
    {
      ...logContext,
      updateLog: update,
    },
    'Ingestion event finalized (fallback context)'
  );
}

/**
 * Mark an ingestion event as failed and record the error.
 */
export async function failIngestionEvent(
  ctx: IngestionContext,
  error: unknown,
  options: Omit<CompleteIngestionOptions, "status" | "error"> = {}
): Promise<void> {
  let retryCount = 1;
  if (!ctx.id.startsWith('fallback:')) {
    try {
      const existing = await storage.getIngestionEvent(ctx.id);
      if (existing?.retryCount !== undefined) {
        retryCount = existing.retryCount + 1;
      }
    } catch (lookupError) {
      logger.warn({ ingestionId: ctx.id, error: toErrorMessage(lookupError) }, "Failed to retrieve ingestion event for retry tracking");
    }
  }
  const lastErrorAt = new Date();
  await completeIngestionEvent(ctx, {
    ...options,
    status: "failed",
    error,
    retryCount,
    lastErrorAt
  });
}

/**
 * Convenience helper for degraded ingestion outcomes.
 */
export async function markIngestionDegraded(
  ctx: IngestionContext,
  options: Omit<CompleteIngestionOptions, "status"> = {}
): Promise<void> {
  await completeIngestionEvent(ctx, {
    ...options,
    status: "degraded"
  });
}

/**
 * Generate a deterministic checksum for provenance metadata.
 */
export function computeChecksum(payload: unknown): string {
  const serialized = typeof payload === "string" ? payload : JSON.stringify(payload);
  return crypto.createHash("sha256").update(serialized).digest("hex");
}

function calculateTotals(events: IngestionEvent[]): IngestionSummaryTotals {
  const byStatus = {
    pending: 0,
    running: 0,
    completed: 0,
    failed: 0,
    degraded: 0
  } as Record<IngestionStatus, number>;

  let fallbackEvents = 0;
  let retries = 0;

  for (const event of events) {
    const status = (event.status as IngestionStatus) ?? "pending";
    if (byStatus[status] === undefined) {
      byStatus[status] = 0;
    }
    byStatus[status] += 1;
    if (event.fallbackUsed) {
      fallbackEvents += 1;
    }
    retries += Number(event.retryCount ?? 0);
  }

  return {
    totalEvents: events.length,
    byStatus,
    fallbackEvents,
    retries
  };
}

function calculateAverages(events: IngestionEvent[]): IngestionSummaryAverages {
  const durations: number[] = [];
  const recordsWritten: number[] = [];

  for (const event of events) {
    if (typeof event.durationMs === "number") {
      durations.push(event.durationMs);
    }
    if (typeof event.recordsWritten === "number") {
      recordsWritten.push(event.recordsWritten);
    }
  }

  const average = (values: number[]): number | null => {
    if (values.length === 0) {
      return null;
    }
    const total = values.reduce((sum, value) => sum + value, 0);
    return Math.round(total / values.length);
  };

  return {
    durationMs: average(durations),
    recordsWritten: average(recordsWritten)
  };
}

export async function getIngestionSummary(limit: number = 50): Promise<IngestionSummary> {
  const events = await storage.getRecentIngestionEvents(limit);
  const totals = calculateTotals(events);
  const averages = calculateAverages(events);

  const lastSuccessfulEvent = events.find(event => event.status === "completed");
  const lastFailedEvent = events.find(event => event.status === "failed");

  return {
    generatedAt: new Date().toISOString(),
    totals,
    averages,
    recentEvents: events,
    lastSuccessfulEvent,
    lastFailedEvent
  };
}
