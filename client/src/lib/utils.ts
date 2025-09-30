import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function supportsAbortTimeout(): boolean {
  return typeof AbortSignal !== "undefined" && typeof (AbortSignal as any).timeout === "function";
}

export function createAbortController(timeoutMs: number): {
  signal?: AbortSignal;
  cancel: () => void;
} {
  if (supportsAbortTimeout()) {
    const signal = (AbortSignal as any).timeout(timeoutMs) as AbortSignal;
    return {
      signal,
      cancel: () => {
        /* no-op */
      }
    };
  }

  if (typeof AbortController === "undefined") {
    return {
      signal: undefined,
      cancel: () => {
        /* no-op */
      }
    };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  return {
    signal: controller.signal,
    cancel: () => clearTimeout(timeoutId as unknown as number)
  };
}

export function buildApiUrl(path: string): string {
  if (!path) {
    return "/";
  }

  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  return path.startsWith("/") ? path : `/${path}`;
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
