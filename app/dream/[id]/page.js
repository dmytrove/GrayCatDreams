"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import AnimationRunner from "../../components/AnimationRunner";
import AnimationShell from "../../components/AnimationShell";

function DreamContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params?.id;
  const adminParam = searchParams?.get("admin") || "";

  const [imageUrls, setImageUrls] = useState(null);
  const [settings, setSettings] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    document.body.setAttribute("data-page", "dream");
    return () => document.body.removeAttribute("data-page");
  }, []);

  useEffect(() => {
    if (!id) return;
    const apiUrl = adminParam
      ? `/api/dream/${id}?admin=${encodeURIComponent(adminParam)}`
      : `/api/dream/${id}`;

    fetch(apiUrl)
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
          if (data.settings) setSettings(data.settings);
          if (data.isAdmin) setIsAdmin(true);
        } else {
          setError("No images in this dream");
        }
      })
      .catch((err) => setError(err?.message || "Failed to load dream"));
  }, [id, adminParam]);

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
      <AnimationRunner
        imageSources={imageUrls}
        settings={settings}
        adminMode={isAdmin}
        dreamId={id}
        adminToken={isAdmin ? adminParam : null}
      />
    </>
  );
}

export default function DreamPage() {
  return (
    <Suspense fallback={
      <div style={{ padding: "2rem", color: "rgba(255,255,255,0.6)", textAlign: "center" }}>
        Loading dream…
      </div>
    }>
      <DreamContent />
    </Suspense>
  );
}
