"use client";

import { useRef, useState, useCallback, useEffect } from "react";

const MAX_IMAGES = 10;
const MAX_SIZE = 5 * 1024 * 1024;
const ACCEPT = "image/jpeg,image/png,image/webp";

function getRemoveBackgroundFn() {
  if (typeof window === "undefined") return Promise.reject(new Error("Browser only"));
  return import(/* webpackIgnore: true */ "https://esm.sh/@imgly/background-removal@1.7.0").then((mod) => {
    let fn = mod?.default ?? mod?.removeBackground ?? mod?.imglyRemoveBackground;
    for (let i = 0; i < 5 && fn && typeof fn === "object" && fn.default !== undefined; i++) fn = fn.default;
    if (typeof fn !== "function" && mod && typeof mod === "object") {
      for (const key of Object.keys(mod)) {
        if (typeof mod[key] === "function") {
          fn = mod[key];
          break;
        }
      }
    }
    if (typeof fn !== "function") throw new Error("Invalid module");
    return fn;
  });
}

export default function UploadForm() {
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState("");
  const [statusError, setStatusError] = useState(false);
  const [result, setResult] = useState(null);
  const [modelProgress, setModelProgress] = useState(false);
  const [modelProgressPct, setModelProgressPct] = useState(0);
  const [uploading, setUploading] = useState(false);
  const removeBackgroundFnRef = useRef(null);

  // Revoke all object URLs on unmount to prevent memory leaks
  const itemsRef = useRef(items);
  itemsRef.current = items;
  useEffect(() => {
    return () => {
      itemsRef.current.forEach((item) => {
        if (item.url) URL.revokeObjectURL(item.url);
      });
    };
  }, []);

  const loadBackgroundRemoval = useCallback(() => {
    if (removeBackgroundFnRef.current) return Promise.resolve(removeBackgroundFnRef.current);
    setModelProgress(true);
    setModelProgressPct(0);
    return getRemoveBackgroundFn()
      .then((fn) => {
        removeBackgroundFnRef.current = fn;
        setModelProgressPct(100);
        return fn;
      })
      .catch(() => {
        setStatus("Failed to load background removal.");
        setStatusError(true);
        setModelProgress(false);
        throw new Error("Failed to load background removal");
      });
  }, []);

  const addFiles = useCallback(
    (files) => {
      const list = Array.from(files).filter((f) => f.type && f.type.startsWith("image/"));
      if (!list.length) {
        setStatus("Please choose image files (JPEG, PNG, WebP).");
        setStatusError(true);
        return;
      }
      if (items.length + list.length > MAX_IMAGES) {
        setStatus(`Maximum ${MAX_IMAGES} images. You have ${items.length}, adding ${list.length} would exceed.`);
        setStatusError(true);
        return;
      }
      setStatus("");
      setStatusError(false);
      list.forEach((file) => {
        if (file.size > MAX_SIZE) {
          setStatus(`"${file.name}" is too large (max 5MB).`);
          setStatusError(true);
          return;
        }
        const id = `item-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        setItems((prev) => [...prev, { id, file, status: "loading", blob: null, url: null }]);
        loadBackgroundRemoval()
          .then((removeBackground) =>
            removeBackground(file, {
              progress: (key, current, total) => {
                if (total > 0) setModelProgressPct(Math.round((current / total) * 100));
              },
            })
          )
          .then((blob) => {
            const url = URL.createObjectURL(blob);
            setItems((prev) =>
              prev.map((p) => (p.id === id ? { ...p, status: "done", blob, url } : p))
            );
            setModelProgress(false);
          })
          .catch(() => {
            setItems((prev) => prev.map((p) => (p.id === id ? { ...p, status: "error" } : p)));
            setStatus("Background removal failed for one image.");
            setStatusError(true);
          });
      });
    },
    [items.length, loadBackgroundRemoval]
  );

  const removeItem = useCallback((id) => {
    setItems((prev) => {
      const p = prev.find((x) => x.id === id);
      if (p?.url) URL.revokeObjectURL(p.url);
      return prev.filter((x) => x.id !== id);
    });
  }, []);

  const createDream = useCallback(() => {
    const done = items.filter((p) => p.blob);
    if (!done.length || uploading) return;
    setStatus("Uploading…");
    setResult(null);
    setUploading(true);
    Promise.all(
      done.map(
        (p) =>
          new Promise((resolve, reject) => {
            const r = new FileReader();
            r.onload = () => resolve(r.result);
            r.onerror = reject;
            r.readAsDataURL(p.blob);
          })
      )
    )
      .then((dataUrls) => {
        const base64List = dataUrls.map((d) => (d.indexOf(",") >= 0 ? d.split(",")[1] : d));
        return fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ images: base64List }),
        });
      })
      .then((res) => {
        if (!res.ok) return res.json().then((j) => Promise.reject(new Error(j.error || res.statusText)));
        return res.json();
      })
      .then((data) => {
        setStatus("");
        setResult(data);
      })
      .catch((err) => {
        setStatus(err.message || "Upload failed.");
        setStatusError(true);
      })
      .finally(() => {
        setUploading(false);
      });
  }, [items, uploading]);

  const handleDrop = (e) => {
    e.preventDefault();
    e.currentTarget.classList.remove("dragover");
    addFiles(e.dataTransfer.files);
  };
  const handleDragOver = (e) => {
    e.preventDefault();
    e.currentTarget.classList.add("dragover");
  };
  const handleDragLeave = (e) => e.currentTarget.classList.remove("dragover");

  const doneCount = items.filter((p) => p.blob).length;

  return (
    <>
      <div
        className="drop-zone"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <input
          type="file"
          id="fileInput"
          accept={ACCEPT}
          multiple
          onChange={(e) => {
            addFiles(e.target.files || []);
            e.target.value = "";
          }}
          style={{ display: "none" }}
        />
        <label htmlFor="fileInput">Drop images here or click to choose</label>
        {modelProgress && (
          <div className="progress-bar" style={{ maxWidth: 400, margin: "16px auto 0" }}>
            <div style={{ width: `${modelProgressPct}%` }} />
          </div>
        )}
      </div>

      <div className="preview-grid">
        {items.map((item) => (
          <div key={item.id} className="preview-item">
            {item.url && <img src={item.url} alt="" />}
            <span className="status">{item.status === "loading" ? "Loading…" : item.status === "done" ? "Done" : "Error"}</span>
            {item.status === "done" && (
              <button
                type="button"
                className="remove"
                aria-label="Remove"
                onClick={() => removeItem(item.id)}
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="actions">
        <button type="button" className="btn-primary" disabled={doneCount === 0 || uploading} onClick={createDream}>
          {uploading ? "Uploading…" : "Create Dream"}
        </button>
        {status && <span id="statusText" className={statusError ? "error" : ""}>{status}</span>}
      </div>

      {result && (
        <div className="result">
          {result.adminUrl && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Admin link (bookmark this!):</div>
              <a href={result.adminUrl} target="_blank" rel="noopener noreferrer">
                {result.adminUrl}
              </a>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginTop: 4 }}>
                Use this link to customize settings. Only you have this link.
              </div>
            </div>
          )}
          <div>
            <div style={{ marginBottom: 4 }}>Share link:</div>
            <a href={result.url} target="_blank" rel="noopener noreferrer">
              {result.url}
            </a>
          </div>
          <div className="open-btn">
            <a href={result.adminUrl || result.url} className="btn-primary" style={{ display: "inline-block", marginTop: 8 }}>
              Open dream
            </a>
          </div>
        </div>
      )}
    </>
  );
}
