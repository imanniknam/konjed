import { NextResponse } from "next/server";
import { route } from "@/lib/server/http/handler";
import { getUpload } from "@/lib/server/storage/local";
export const GET = route<{ key: string[] }>(async ({ params }) => {
  const f = await getUpload(params.key.join("/"));
  return new NextResponse(new Uint8Array(f.data), { headers: { "content-type": f.mime, "cache-control": "public, max-age=31536000, immutable", "x-content-type-options": "nosniff", "content-disposition": "inline" } });
});
