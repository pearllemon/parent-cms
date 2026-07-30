// Client-side error reporting hook used by the root error boundary.
// Posts a compact payload to the Lovable preview parent frame when available;
// otherwise it just logs.
type ErrorContext = Record<string, unknown>;

export function reportLovableError(error: unknown, context: ErrorContext = {}) {
  const payload = {
    type: "lovable:client-error",
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    context,
    url: typeof window !== "undefined" ? window.location.href : undefined,
    at: new Date().toISOString(),
  };

  console.error("[lovable]", payload.message, context, error);

  try {
    if (typeof window !== "undefined" && window.parent && window.parent !== window) {
      window.parent.postMessage(payload, "*");
    }
  } catch {
    // Cross-origin parent — nothing else to do.
  }
}
