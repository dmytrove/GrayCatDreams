import { put } from "@vercel/blob";
import { nanoid } from "nanoid";

const MAX_IMAGES = 10;
const MAX_SIZE_BYTES = 6 * 1024 * 1024;

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" } });
}

export async function POST(request) {
  const origin = request.headers.get("origin") || request.headers.get("referer")?.replace(/\/$/, "") || "";
  const headers = { "Access-Control-Allow-Origin": origin || "*", "Content-Type": "application/json" };

  try {
    const body = await request.json();
    const images = body.images;
    if (!Array.isArray(images) || images.length === 0) {
      return Response.json({ error: "No images provided" }, { status: 400, headers });
    }
    if (images.length > MAX_IMAGES) {
      return Response.json({ error: `Maximum ${MAX_IMAGES} images allowed` }, { status: 400, headers });
    }

    const buffers = [];
    for (let i = 0; i < images.length; i++) {
      const data = images[i];
      const base64 = typeof data === "string" && data.includes(",") ? data.split(",")[1] : data;
      if (!base64) {
        return Response.json({ error: `Image ${i + 1}: invalid base64` }, { status: 400, headers });
      }
      const buf = Buffer.from(base64, "base64");
      if (buf.length > MAX_SIZE_BYTES) {
        return Response.json({ error: `Image ${i + 1} exceeds size limit` }, { status: 413, headers });
      }
      buffers.push(buf);
    }

    const id = nanoid(8);
    const adminToken = nanoid(16);
    const imageUrls = [];

    for (let i = 0; i < buffers.length; i++) {
      const blob = await put(`${id}/${i + 1}.png`, buffers[i], {
        access: "public",
        contentType: "image/png",
        addRandomSuffix: false,
      });
      imageUrls.push(blob.url);
    }

    const base = origin || (typeof request.url === "string" ? new URL(request.url).origin : "");
    const dreamUrl = `${base.replace(/\/$/, "")}/dream/${id}`;
    const createdAt = new Date().toISOString();

    await put(`${id}/manifest.json`, JSON.stringify({ id, imageUrls, createdAt, adminToken }), {
      access: "public",
      contentType: "application/json",
      addRandomSuffix: false,
    });

    const adminUrl = `${dreamUrl}?admin=${adminToken}`;
    return Response.json({ id, url: dreamUrl, adminUrl, imageUrls, createdAt }, { status: 201, headers });
  } catch (err) {
    if (err instanceof SyntaxError) {
      return Response.json({ error: "Invalid JSON body" }, { status: 400, headers: { ...headers } });
    }
    console.error("Upload error:", err);
    return Response.json({ error: "Upload failed" }, { status: 500, headers });
  }
}
