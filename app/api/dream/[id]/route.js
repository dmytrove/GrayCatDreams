import { list } from "@vercel/blob";

export async function GET(request, { params }) {
  const resolved = params && typeof params.then === "function" ? await params : params;
  const id = resolved?.id;
  const headers = {
    "Cache-Control": "public, max-age=60",
    "Content-Type": "application/json",
  };

  if (!id || id.length > 32) {
    return Response.json({ error: "Invalid dream id" }, { status: 400, headers });
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return Response.json(
      { error: "Storage not configured. Set BLOB_READ_WRITE_TOKEN in Vercel." },
      { status: 503, headers }
    );
  }

  try {
    const { blobs } = await list({ prefix: `${id}/`, limit: 20 });
    if (!blobs || blobs.length === 0) {
      return Response.json({ error: "Dream not found" }, { status: 404, headers });
    }
    const manifestBlob = blobs.find(
      (b) =>
        (b.pathname && (b.pathname === `${id}/manifest.json` || b.pathname.endsWith("/manifest.json"))) ||
        (b.name && b.name === "manifest.json")
    );
    if (manifestBlob?.url) {
      const resp = await fetch(manifestBlob.url);
      if (resp.ok) {
        const manifest = await resp.json();
        if (manifest && Array.isArray(manifest.imageUrls) && manifest.imageUrls.length > 0) {
          return Response.json(manifest, { status: 200, headers });
        }
      }
    }
    const imageBlobs = blobs
      .filter((b) => b.url && b.pathname && /\.(png|webp|jpe?g)$/i.test(b.pathname))
      .sort((a, b) => (a.pathname || "").localeCompare(b.pathname || ""));
    if (imageBlobs.length === 0) {
      return Response.json({ error: "Dream not found" }, { status: 404, headers });
    }
    const imageUrls = imageBlobs.map((b) => b.url);
    return Response.json({ id, imageUrls, createdAt: null }, { status: 200, headers });
  } catch (err) {
    return Response.json({ error: "Failed to load dream" }, { status: 500, headers });
  }
}
