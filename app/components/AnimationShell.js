"use client";

import Link from "next/link";

export default function AnimationShell({ showUploadLink = true }) {
  return (
    <>
      <canvas id="stars" />
      <div id="cat-container" />
      <div id="vignette" />
      <div className="toolbar">
        {showUploadLink && (
          <Link href="/upload" className="toolbar-link">
            Upload your own
          </Link>
        )}
        <button id="screenshot-btn" title="Screenshot (S)">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <rect x="2" y="4" width="12" height="9" rx="1" />
            <circle cx="8" cy="8.5" r="2.5" />
            <path d="M5 4L6 2h4l1 2" />
          </svg>
        </button>
        <button id="fullscreen-btn" title="Toggle fullscreen (F)">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M2 6V2h4M10 2h4v4M14 10v4h-4M6 14H2v-4" />
          </svg>
        </button>
      </div>
      <div id="hint">Click a cat &middot; H panel &middot; F fullscreen &middot; S screenshot</div>
    </>
  );
}
