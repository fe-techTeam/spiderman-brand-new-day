// Fetch helper for portal (fan-facing) client components.
// Throws Error with the server message; err.status and err.fields (per-field
// validation messages) are attached when present.

export async function portalApi(path, { method = "GET", body, formData } = {}) {
  const res = await fetch(`/api${path}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: formData ? formData : body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `Request failed (${res.status})`);
    err.status = res.status;
    err.code = data.code;
    err.fields = data.fields;
    throw err;
  }
  return data;
}
