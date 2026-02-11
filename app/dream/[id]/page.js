"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import AnimationRunner from "../../components/AnimationRunner";
import AnimationShell from "../../components/AnimationShell";

export default function DreamPage() {
  const params = useParams();
  const id = params?.id;
  const [imageUrls, setImageUrls] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    document.body.setAttribute("data-page", "dream");
    return () => document.body.removeAttribute("data-page");
  }, []);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/dream/${id}`)
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        const message = data?.error || (res.status === 404 ? "Dream not found" : "Failed to load dream");
        if (!res.ok) throw new Error(message);
        return data;
      })
      .then((data) => {
        const urls = data?.imageUrls;
        if (Array.isArray(urls) && urls.length > 0) {
          setImageUrls(urls);
        } else {
          setError("No images in this dream");
        }
      })
      .catch((err) => setError(err?.message || "Failed to load dream"));
  }, [id]);

  if (error) {
    return (
      <div style={{ padding: "2rem", color: "rgba(255,255,255,0.8)", textAlign: "center" }}>
        <p>{error}</p>
        <a href="/" style={{ color: "#8af" }}>Back home</a>
      </div>
    );
  }

  if (!imageUrls?.length) {
    return (
      <div style={{ padding: "2rem", color: "rgba(255,255,255,0.6)", textAlign: "center" }}>
        Loading dream…
      </div>
    );
  }

  return (
    <>
      <AnimationShell showUploadLink={false} />
      <AnimationRunner imageSources={imageUrls} />
    </>
  );
}
