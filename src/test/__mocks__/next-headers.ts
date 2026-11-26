/**
 * Mock for next/headers used in Vitest Node environment.
 * service.server.ts wraps next/headers in a try/catch,
 * so this stub returning a minimal headers interface is enough.
 */
export async function headers() {
  return new Map<string, string>();
}

export async function cookies() {
  return {
    get: () => undefined,
    set: () => {},
    delete: () => {},
  };
}
