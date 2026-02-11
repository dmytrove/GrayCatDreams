(function () {
  const loadingEl = document.getElementById('dream-loading');
  const pathname = window.location.pathname || '';
  const match = pathname.match(/^\/dream\/([a-zA-Z0-9_-]+)$/);
  const id = match ? match[1] : null;

  function showError(message) {
    if (!loadingEl) return;
    loadingEl.textContent = '';
    const div = document.createElement('div');
    div.id = 'dream-error';
    div.textContent = message + ' ';
    const link = document.createElement('a');
    link.href = '/upload';
    link.textContent = 'Create your own';
    div.appendChild(link);
    div.append('.');
    loadingEl.appendChild(div);
  }

  if (!id) {
    showError('Invalid dream link.');
    return;
  }

  const origin = window.location.origin;
  fetch(`${origin}/api/dream/${id}`)
    .then(function (res) {
      if (!res.ok) throw new Error(res.status === 404 ? 'Dream not found' : 'Failed to load dream');
      return res.json();
    })
    .then(function (manifest) {
      var imageUrls = manifest.imageUrls || manifest.images;
      if (!Array.isArray(imageUrls) || imageUrls.length === 0) {
        throw new Error('No images in dream');
      }
      if (typeof window.initAnimation !== 'function') throw new Error('Animation not ready');
      window.initAnimation({ imageSources: imageUrls });
      if (loadingEl) loadingEl.classList.add('hidden');
    })
    .catch(function (err) {
      showError(err.message || 'Could not load this dream.');
    });
})();
