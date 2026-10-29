// Vercel Edge Function — /api/pdf?id=<GOOGLE_DRIVE_FILE_ID>
// Streams a public Drive PDF with CORS + Range support so the 3D page-flip reader (PDF.js) can load it.
export const config = { runtime: "edge" };

export default async function handler(req) {
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Range",
    "Access-Control-Expose-Headers": "Content-Range,Accept-Ranges,Content-Length",
  };
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });

  const id = new URL(req.url).searchParams.get("id") || "";
  if (!/^[\w-]{10,}$/.test(id)) return new Response("bad id", { status: 400, headers: cors });

  const headers = {};
  const range = req.headers.get("range");
  if (range) headers["Range"] = range;

  const up = await fetch(
    `https://drive.usercontent.google.com/download?id=${id}&export=download&confirm=t`,
    { headers, redirect: "follow" }
  );
  if (!up.ok && up.status !== 206) return new Response("upstream " + up.status, { status: 502, headers: cors });

  const h = new Headers(cors);
  h.set("Content-Type", "application/pdf");
  h.set("Accept-Ranges", "bytes");
  for (const k of ["content-length", "content-range"]) {
    const v = up.headers.get(k);
    if (v) h.set(k, v);
  }
  h.set("Cache-Control", "public, max-age=3600");
  return new Response(up.body, { status: up.status, headers: h });
}
