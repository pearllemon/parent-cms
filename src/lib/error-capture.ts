// Captures the last unhandled error seen on the server so the SSR wrapper in
// src/server.ts can log something useful when h3 swallows a throw.

let lastError: unknown;

export function captureError(error: unknown) {
  lastError = error;
}

export function consumeLastCapturedError(): unknown {
  const error = lastError;
  lastError = undefined;
  return error;
}

const globalScope = globalThis as typeof globalThis & {
  __lovableErrorCaptureInstalled?: boolean;
  process?: { on?: (event: string, cb: (err: unknown) => void) => void };
};

if (!globalScope.__lovableErrorCaptureInstalled) {
  globalScope.__lovableErrorCaptureInstalled = true;
  try {
    globalScope.process?.on?.("unhandledRejection", captureError);
    globalScope.process?.on?.("uncaughtException", captureError);
  } catch {
    // Worker runtimes may not expose process events; ignore.
  }
}
