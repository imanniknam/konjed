"use client";

export type ApiOk<T> = { ok: true; data: T };
export type ApiFail = { ok: false; error: { code: string; message: string; fields?: Record<string, string> } };

/** Thin fetch wrapper: JSON in/out, returns a discriminated result instead of throwing. */
export async function api<T = unknown>(method: string, url: string, body?: unknown): Promise<ApiOk<T> | ApiFail> {
  try {
    const res = await fetch(url, { method, headers: body ? { "content-type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined, credentials: "same-origin" });
    const json = await res.json();
    return json;
  } catch {
    return { ok: false, error: { code: "network", message: "اتصال به سرور برقرار نشد. اینترنتت رو بررسی کن." } };
  }
}

export async function upload(file: File): Promise<ApiOk<{ url: string; kind: string }> | ApiFail> {
  const fd = new FormData();
  fd.append("file", file);
  try {
    const res = await fetch("/api/uploads", { method: "POST", body: fd, credentials: "same-origin" });
    return await res.json();
  } catch {
    return { ok: false, error: { code: "network", message: "آپلود انجام نشد. دوباره امتحان کن." } };
  }
}

export { toFa, dateFa } from "../format";
