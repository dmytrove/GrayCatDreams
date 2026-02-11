"use client";

import Script from "next/script";
import { useEffect, useState, useRef } from "react";

export default function AnimationRunner({ imageSources = null, settings = null, adminMode = false, dreamId = null, adminToken = null }) {
  const [scriptReady, setScriptReady] = useState(false);
  const inited = useRef(false);

  useEffect(() => {
    if (imageSources == null) return;
    if (!imageSources.length) return;
    if (!scriptReady || typeof window.initAnimation !== "function") return;
    if (inited.current) return;
    inited.current = true;
    window.initAnimation({ imageSources, settings, adminMode, dreamId, adminToken });
  }, [scriptReady, imageSources, settings, adminMode, dreamId, adminToken]);

  return (
    <>
      <Script
        src="/js/lil-gui.umd.min.js"
        strategy="beforeInteractive"
      />
      <Script
        src="/js/animation.js"
        strategy="afterInteractive"
        onLoad={() => setScriptReady(true)}
      />
    </>
  );
}
