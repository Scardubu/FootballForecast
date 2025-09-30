import request from 'supertest';
import express from 'express';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { telemetryRouter } from '../routers/telemetry';
import { storage } from '../storage';
import type { IngestionEvent } from '../../shared/schema.js';

vi.mock('../storage');

const mockStorage = vi.mocked(storage);

const app = express();
app.use(express.json());
app.use('/api/telemetry', telemetryRouter);
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const message = err?.message || 'Internal Server Error';
  res.status(500).json({ error: message });
});

const makeEvent = (overrides: Partial<IngestionEvent> = {}): IngestionEvent => ({
  id: overrides.id ?? 'evt-1',
  source: overrides.source ?? 'scraper',
  scope: overrides.scope ?? 'fixtures',
  status: overrides.status ?? 'completed',
  startedAt: overrides.startedAt ?? new Date('2024-01-01T00:00:00Z'),
  finishedAt: overrides.finishedAt ?? new Date('2024-01-01T00:00:05Z'),
  durationMs: overrides.durationMs ?? 5000,
  recordsWritten: overrides.recordsWritten ?? 100,
  fallbackUsed: overrides.fallbackUsed ?? false,
  checksum: overrides.checksum ?? null,
  metadata: overrides.metadata ?? null,
  error: overrides.error ?? null,
  dedupeKey: overrides.dedupeKey ?? 'dk-1',
  retryCount: overrides.retryCount ?? 0,
  lastErrorAt: overrides.lastErrorAt ?? null,
  metrics: overrides.metrics ?? null,
  updatedAt: overrides.updatedAt ?? new Date('2024-01-01T00:00:05Z'),
});

describe('Telemetry Router - Ingestion Summary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns summary with caching headers', async () => {
    const events: IngestionEvent[] = [
      makeEvent({ id: 'e1', status: 'completed', durationMs: 1200 }),
      makeEvent({ id: 'e2', status: 'failed', fallbackUsed: true, durationMs: 2200 }),
    ];
    mockStorage.getRecentIngestionEvents.mockResolvedValue(events);

    const res = await request(app)
      .get('/api/telemetry/ingestion?limit=25')
      .expect(200);

    expect(res.headers['cache-control']).toBe('public, max-age=60');
    expect(res.headers['etag']).toMatch(/^"ingestion-[a-f0-9]{40}"$/);

    expect(res.body).toHaveProperty('generatedAt');
    expect(res.body).toHaveProperty('totals');
    expect(res.body.totals).toMatchObject({
      totalEvents: 2,
      fallbackEvents: 1,
    });
    expect(res.body.averages.durationMs).toBeGreaterThan(0);
    expect(Array.isArray(res.body.recentEvents)).toBe(true);
  });

  it('limits results using query param', async () => {
    mockStorage.getRecentIngestionEvents.mockResolvedValue([makeEvent({ id: 'only' })]);
    const res = await request(app)
      .get('/api/telemetry/ingestion?limit=1')
      .expect(200);
    expect(mockStorage.getRecentIngestionEvents).toHaveBeenCalledWith(1);
    expect(res.body.totals.totalEvents).toBe(1);
  });

  it('handles storage errors', async () => {
    mockStorage.getRecentIngestionEvents.mockRejectedValue(new Error('db down'));
    const res = await request(app)
      .get('/api/telemetry/ingestion')
      .expect(500);
    expect(res.body).toHaveProperty('error');
  });
});
