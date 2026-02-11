/** Whitelisted config keys that admins can persist */
export const SETTINGS_KEYS = [
  'minCats', 'maxCats', 'baseSpeed', 'theme',
  'gravity', 'bounciness', 'collisionRadius', 'attractionForce', 'orbitDistance',
  'dvdMode', 'dvdSpeed', 'mouseMode',
  'glowEnabled', 'glowIntensity', 'trailsEnabled', 'constellations',
  'breathing', 'shootingStars', 'vignette', 'spinDrift', 'depthEffect', 'slowMoRadius',
  'soundEnabled', 'ambientMusic',
];

/**
 * Filter raw input to only allowed settings keys with safe types.
 * Returns a clean object (or empty object if input is invalid).
 */
export function sanitizeSettings(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const clean = {};
  for (const key of SETTINGS_KEYS) {
    if (!(key in raw)) continue;
    const v = raw[key];
    const t = typeof v;
    if (t === 'string' || t === 'number' || t === 'boolean') {
      clean[key] = v;
    }
  }
  return clean;
}
