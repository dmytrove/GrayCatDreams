import { list, put } from "@vercel/blob";
import { sanitizeSettings } from "../../../lib/settings";

async function fetchManifest(id) {
  const { blobs } = await list({ prefix: `${id}/`, limit: 20 });
  if (!blobs || blobs.length === 0) return null;

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
        return manifest;
      }
    }
  }

  // Fallback: build manifest from image blobs
  const imageBlobs = blobs
    .filter((b) => b.url && b.pathname && /\.(png|webp|jpe?g)$/i.test(b.pathname))
    .sort((a, b) => (a.pathname || "").localeCompare(b.pathname || ""));
  if (imageBlobs.length === 0) return null;
  return { id, imageUrls: imageBlobs.map((b) => b.url), createdAt: null };
}

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
    const manifest = await fetchManifest(id);
    if (!manifest) {
      return Response.json({ error: "Dream not found" }, { status: 404, headers });
    }

    // Check admin token from query params
    const url = new URL(request.url);
    const adminParam = url.searchParams.get("admin");
    const isAdmin = !!(manifest.adminToken && adminParam && adminParam === manifest.adminToken);

    // Never expose adminToken in response
    const { adminToken: _omit, ...safe } = manifest;
    return Response.json({ ...safe, isAdmin }, { status: 200, headers });
  } catch (err) {
    return Response.json({ error: "Failed to load dream" }, { status: 500, headers });
  }
}

export async function PATCH(request, { params }) {
  const resolved = params && typeof params.then === "function" ? await params : params;
  const id = resolved?.id;
  const headers = { "Content-Type": "application/json" };

  if (!id || id.length > 32) {
    return Response.json({ error: "Invalid dream id" }, { status: 400, headers });
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return Response.json(
      { error: "Storage not configured." },
      { status: 503, headers }
    );
  }

  try {
    const body = await request.json();
    const adminParam = body.admin;
    const rawSettings = body.settings;

    if (!adminParam || typeof adminParam !== "string") {
      return Response.json({ error: "Missing admin token" }, { status: 401, headers });
    }

    const manifest = await fetchManifest(id);
    if (!manifest) {
      return Response.json({ error: "Dream not found" }, { status: 404, headers });
    }

    if (!manifest.adminToken || adminParam !== manifest.adminToken) {
      return Response.json({ error: "Invalid admin token" }, { status: 403, headers });
    }

    const settings = sanitizeSettings(rawSettings);
    const updated = { ...manifest, settings };

    await put(`${id}/manifest.json`, JSON.stringify(updated), {
      access: "public",
      contentType: "application/json",
      addRandomSuffix: false,
    });

    return Response.json({ ok: true }, { status: 200, headers });
  } catch (err) {
    if (err instanceof SyntaxError) {
      return Response.json({ error: "Invalid JSON body" }, { status: 400, headers });
    }
    return Response.json({ error: "Failed to save settings" }, { status: 500, headers });
  }
}
