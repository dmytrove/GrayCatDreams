const MAX_IMAGES = 10;
const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPT = 'image/jpeg,image/png,image/webp';

const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const previewGrid = document.getElementById('previewGrid');
const createBtn = document.getElementById('createBtn');
const statusText = document.getElementById('statusText');
const result = document.getElementById('result');
const dreamLink = document.getElementById('dreamLink');
const openBtn = document.getElementById('openBtn');
const modelProgress = document.getElementById('modelProgress');
const modelProgressBar = document.getElementById('modelProgressBar');

let processedBlobs = [];
let removeBackgroundFn = null;

function setStatus(msg, isError = false) {
  statusText.textContent = msg || '';
  statusText.className = isError ? 'error' : '';
}

function loadBackgroundRemoval() {
  if (removeBackgroundFn) return Promise.resolve(removeBackgroundFn);
  modelProgress.style.display = 'block';
  modelProgressBar.style.width = '0%';
  return import('https://esm.sh/@imgly/background-removal@1.7.0')
    .then((mod) => {
      // Unwrap default export (some CDNs nest it)
      let fn = mod?.default ?? mod?.removeBackground ?? mod?.imglyRemoveBackground;
      for (let i = 0; i < 5 && fn && typeof fn === 'object' && fn.default !== undefined; i++) fn = fn.default;
      if (typeof fn !== 'function' && mod && typeof mod === 'object') {
        for (const key of Object.keys(mod)) {
          if (typeof mod[key] === 'function') { fn = mod[key]; break; }
        }
      }
      if (typeof fn !== 'function') {
        throw new Error('Invalid module');
      }
      removeBackgroundFn = fn;
      modelProgressBar.style.width = '100%';
      return fn;
    })
    .catch((err) => {
      setStatus('Failed to load background removal.', true);
      modelProgress.style.display = 'none';
      throw err;
    });
}

function addFiles(files) {
  const list = Array.from(files).filter((f) => f.type && f.type.startsWith('image/'));
  if (list.length === 0) {
    setStatus('Please choose image files (JPEG, PNG, WebP).', true);
    return;
  }
  const total = processedBlobs.length + list.length;
  if (total > MAX_IMAGES) {
    setStatus(`Maximum ${MAX_IMAGES} images. You have ${processedBlobs.length}, adding ${list.length} would exceed.`, true);
    return;
  }
  for (const file of list) {
    if (file.size > MAX_SIZE) {
      setStatus(`"${file.name}" is too large (max 5MB).`, true);
      continue;
    }
    processFile(file);
  }
}

function processFile(file) {
  const id = `item-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const div = document.createElement('div');
  div.className = 'preview-item';
  div.id = id;
  const statusSpan = document.createElement('span');
  statusSpan.className = 'status';
  statusSpan.textContent = 'Loading…';
  div.appendChild(statusSpan);
  previewGrid.appendChild(div);

  loadBackgroundRemoval()
    .then((removeBackground) => {
      const statusEl = div.querySelector('.status');
      statusEl.textContent = 'Removing background…';
      return removeBackground(file, {
        progress: (key, current, total) => {
          if (total > 0) statusEl.textContent = `Loading model… ${Math.round((current / total) * 100)}%`;
        },
      });
    })
    .then((blob) => {
      const url = URL.createObjectURL(blob);
      const img = document.createElement('img');
      img.src = url;
      img.alt = '';
      const statusEl = div.querySelector('.status');
      statusEl.textContent = 'Done';
      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'remove';
      removeBtn.textContent = '×';
      removeBtn.setAttribute('aria-label', 'Remove');
      removeBtn.onclick = () => removeItem(id, blob);
      div.insertBefore(img, statusEl);
      div.insertBefore(removeBtn, img);
      processedBlobs.push({ id, blob, div });
      updateCreateButton();
      setStatus('');
    })
    .catch(() => {
      const statusEl = div.querySelector('.status');
      statusEl.textContent = 'Error';
      setStatus('Background removal failed for one image.', true);
    });
}

function removeItem(id, blob) {
  processedBlobs = processedBlobs.filter((p) => p.id !== id);
  const el = document.getElementById(id);
  if (el) el.remove();
  updateCreateButton();
}

function updateCreateButton() {
  createBtn.disabled = processedBlobs.length === 0;
}

function createDream() {
  if (processedBlobs.length === 0) return;
  setStatus('Uploading…');
  createBtn.disabled = true;

  Promise.all(
    processedBlobs.map((p) =>
      new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result);
        r.onerror = reject;
        r.readAsDataURL(p.blob);
      })
    )
  )
    .then((dataUrls) => {
      const base64List = dataUrls.map((d) => (d.indexOf(',') >= 0 ? d.split(',')[1] : d));
      const origin = window.location.origin;
      return fetch(`${origin}/api/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images: base64List }),
      });
    })
    .then((res) => {
      if (!res.ok) return res.json().then((j) => Promise.reject(new Error(j.error || res.statusText)));
      return res.json();
    })
    .then((data) => {
      result.style.display = 'block';
      dreamLink.href = data.url;
      dreamLink.textContent = data.url;
      openBtn.onclick = () => { window.location.href = data.url; };
      setStatus('');
    })
    .catch((err) => {
      setStatus(err.message || 'Upload failed.', true);
      createBtn.disabled = false;
    });
}

dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('dragover');
});
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('dragover');
  addFiles(e.dataTransfer.files);
});
fileInput.addEventListener('change', () => {
  addFiles(fileInput.files);
  fileInput.value = '';
});
createBtn.addEventListener('click', createDream);
