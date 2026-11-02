export type ProviderReply =
  | { ok: true; status: number; data: Record<string, unknown>; message: string }
  | { ok: false; status: number | null; data: null; message: string };

/** Never expose fetch exceptions, URLs, provider error text or headers. */
export async function providerJson(name: string, url: URL | string, init?: RequestInit): Promise<ProviderReply> {
  let response: Response;
  try {
    response = await fetch(url, { ...init, signal: AbortSignal.timeout(15000) });
  } catch (error) {
    const timeout = error instanceof Error && ['AbortError', 'TimeoutError'].includes(error.name);
    return { ok: false, status: null, data: null, message: timeout ? 'Request timed out before an HTTP response. Try again shortly.' : 'Network request failed before an HTTP response. Try again shortly.' };
  }
  let data: Record<string, unknown> | null = null;
  try {
    const body: unknown = await response.json();
    if (body && typeof body === 'object' && !Array.isArray(body)) data = body as Record<string, unknown>;
  } catch { /* Report status separately from invalid JSON. */ }
  const fail = (message: string): ProviderReply => ({ ok: false, status: response.status, data: null, message });
  if (response.status === 429) return fail('HTTP 429: request limit reached. Wait before retrying.');
  if (response.status === 401 || response.status === 403) return fail(`HTTP ${response.status}: access or credentials rejected.`);
  if (!response.ok) return fail(`HTTP ${response.status}: ${name} is unavailable. Try again shortly.`);
  if (!data) return fail(`HTTP ${response.status}: invalid JSON response.`);
  return { ok: true, status: response.status, data, message: `HTTP ${response.status}: connection successful.` };
}
