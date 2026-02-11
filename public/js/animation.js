// ===========================================================================
// Config
// ===========================================================================
const config = {
    // Cats
    minCats: 3,
    maxCats: 10,
    minScale: 0.3,
    maxScale: 1.2,
    baseSpeed: 0.8,
    backgroundColor: '#2c2c2c',

    // Physics
    attractionForce: 0.02,
    orbitDistance: 150,
    orbitSpeed: 0.02,
    bounciness: 0.7,
    collisionRadius: 50,
    gravity: 0,

    // Modes
    dvdMode: false,
    dvdSpeed: 2,
    mouseMode: 'off', // 'off' | 'attract' | 'repel'

    // Visuals
    showHitbox: false,
    glowEnabled: true,
    glowIntensity: 12,
    trailsEnabled: true,
    trailLength: 18,
    constellations: false,
    constellationDist: 250,
    breathing: true,
    breathingAmount: 0.03,
    breathingSpeed: 0.002,
    vignette: true,
    shootingStars: true,

    // Audio
    soundEnabled: true,
    ambientMusic: false,
    ambientVolume: 0.015,

    // Effects
    depthEffect: true,
    spinDrift: 0.15,
    spinDamping: 0.98,
    slowMoRadius: 0,
    slowMoFactor: 0.3,

    // Theme
    theme: 'night',
    starTint: [220, 225, 255],

    // Internal tuning
    spawnProbability: 0.7,
    orbitEasing: 0.1,
    velocityDamping: 0.99,
    rotationSpeedRange: 0.5,
    catUpdateIntervalMs: 3000,
    fadeOutMs: 1000,
    fadeInMs: 100,
    maxImageSize: 200,
    clickImpulse: 8,
    clickSpinBurst: 15
};

// ===========================================================================
// Themes
// ===========================================================================
const themes = {
    night:  { bg: '#2c2c2c', tint: [220, 225, 255] },
    sunset: { bg: '#4a2820', tint: [255, 200, 150] },
    ocean:  { bg: '#152535', tint: [150, 220, 255] },
    neon:   { bg: '#1a0a2e', tint: [255, 150, 255] },
    forest: { bg: '#152515', tint: [150, 255, 180] }
};

function applyTheme(name) {
    const t = themes[name];
    if (!t) return;
    config.backgroundColor = t.bg;
    config.starTint = t.tint;
    applyBackground(t.bg);
}

// ===========================================================================
// Mouse / Touch tracking
// ===========================================================================
const mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };

document.addEventListener('mousemove', (e) => { mouse.x = e.clientX; mouse.y = e.clientY; });
document.addEventListener('touchmove', (e) => {
    if (e.touches.length > 0) { mouse.x = e.touches[0].clientX; mouse.y = e.touches[0].clientY; }
}, { passive: true });
document.addEventListener('touchstart', (e) => {
    if (e.touches.length > 0) { mouse.x = e.touches[0].clientX; mouse.y = e.touches[0].clientY; }
}, { passive: true });

// ===========================================================================
// Sound Engine (chimes + ambient)
// ===========================================================================
class SoundEngine {
    constructor() {
        this.ctx = null;
        this.lastPlayTime = 0;
        this.ambientNodes = null;
    }

    init() {
        if (this.ctx) return;
        try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); }
        catch (_) { /* not supported */ }
    }

    _play(freq, vol, dur) {
        if (!this.ctx || !config.soundEnabled) return;
        if (this.ctx.state === 'suspended') this.ctx.resume();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain); gain.connect(this.ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        gain.gain.setValueAtTime(vol, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
        osc.start(); osc.stop(this.ctx.currentTime + dur);
    }

    playCollision() {
        const now = performance.now();
        if (now - this.lastPlayTime < 120) return;
        this.lastPlayTime = now;
        this._play(400 + Math.random() * 600, 0.03, 0.35);
    }

    playPop() { this._play(1200 + Math.random() * 400, 0.05, 0.25); }

    // --- Ambient generative pad ---
    startAmbient() {
        if (!this.ctx || this.ambientNodes) return;
        if (this.ctx.state === 'suspended') this.ctx.resume();

        const master = this.ctx.createGain();
        master.gain.setValueAtTime(0, this.ctx.currentTime);
        master.gain.linearRampToValueAtTime(config.ambientVolume, this.ctx.currentTime + 3);
        master.connect(this.ctx.destination);

        const oscs = [];
        const notes = [130.81, 196.00, 261.63, 329.63]; // C3 G3 C4 E4
        for (const freq of notes) {
            const osc = this.ctx.createOscillator();
            const filter = this.ctx.createBiquadFilter();
            osc.type = 'sine';
            osc.frequency.value = freq;
            filter.type = 'lowpass';
            filter.frequency.value = 250;
            filter.Q.value = 0.7;
            osc.connect(filter);
            filter.connect(master);
            osc.start();
            oscs.push(osc);
        }

        // Slow LFO on filters
        const lfo = this.ctx.createOscillator();
        const lfoGain = this.ctx.createGain();
        lfo.type = 'sine';
        lfo.frequency.value = 0.08;
        lfoGain.gain.value = 80;
        lfo.connect(lfoGain);
        lfo.start();
        // LFO modulates each filter frequency (not directly storable, but we can use a shared connection)

        this.ambientNodes = { master, oscs, lfo, lfoGain };
    }

    stopAmbient() {
        if (!this.ambientNodes) return;
        const t = this.ctx.currentTime;
        this.ambientNodes.master.gain.linearRampToValueAtTime(0, t + 2);
        const nodes = this.ambientNodes;
        setTimeout(() => {
            nodes.oscs.forEach(o => { try { o.stop(); } catch (_) {} });
            try { nodes.lfo.stop(); } catch (_) {}
            nodes.master.disconnect();
        }, 2500);
        this.ambientNodes = null;
    }

    setAmbientVolume(v) {
        if (this.ambientNodes) {
            this.ambientNodes.master.gain.linearRampToValueAtTime(v, this.ctx.currentTime + 0.3);
        }
    }
}

const sound = new SoundEngine();
const _initAudio = () => { sound.init(); document.removeEventListener('click', _initAudio); document.removeEventListener('touchstart', _initAudio); };
document.addEventListener('click', _initAudio);
document.addEventListener('touchstart', _initAudio);

// ===========================================================================
// Star Field (stars + shooting stars)
// ===========================================================================
class StarField {
    constructor() {
        this.canvas = document.getElementById('stars');
        this.ctx = this.canvas.getContext('2d');
        this.stars = [];
        this.shooters = [];
        this.resize();
        this._onResize = () => this.resize();
        window.addEventListener('resize', this._onResize);
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        const target = Math.floor((this.canvas.width * this.canvas.height) / 5000);
        if (Math.abs(this.stars.length - target) > 20 || this.stars.length === 0) this._generate(target);
    }

    _generate(count) {
        this.stars = [];
        for (let i = 0; i < count; i++) {
            this.stars.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                r: Math.random() * 1.5 + 0.3,
                baseAlpha: Math.random() * 0.7 + 0.15,
                speed: Math.random() * 0.003 + 0.0008,
                offset: Math.random() * Math.PI * 2
            });
        }
    }

    destroy() {
        window.removeEventListener('resize', this._onResize);
    }

    update(time) {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;
        const [tR, tG, tB] = config.starTint;
        ctx.clearRect(0, 0, w, h);

        // --- Stars ---
        for (const s of this.stars) {
            const alpha = s.baseAlpha * (0.5 + 0.5 * Math.sin(time * s.speed + s.offset));
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${tR}, ${tG}, ${tB}, ${alpha})`;
            ctx.fill();
        }

        // --- Shooting stars ---
        if (config.shootingStars && Math.random() < 0.005) {
            const angle = Math.random() * Math.PI * 0.5 + Math.PI * 0.2;
            const speed = 6 + Math.random() * 6;
            this.shooters.push({
                x: Math.random() * w,
                y: Math.random() * h * 0.4,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1,
                len: 25 + Math.random() * 30
            });
        }

        for (let i = this.shooters.length - 1; i >= 0; i--) {
            const s = this.shooters[i];
            s.x += s.vx; s.y += s.vy;
            s.life -= 0.02;
            if (s.life <= 0 || s.x < -50 || s.x > w + 50 || s.y > h + 50) {
                this.shooters.splice(i, 1);
                continue;
            }
            const tailX = s.x - (s.vx / Math.sqrt(s.vx * s.vx + s.vy * s.vy)) * s.len;
            const tailY = s.y - (s.vy / Math.sqrt(s.vx * s.vx + s.vy * s.vy)) * s.len;
            const grad = ctx.createLinearGradient(s.x, s.y, tailX, tailY);
            grad.addColorStop(0, `rgba(${tR}, ${tG}, ${tB}, ${s.life * 0.9})`);
            grad.addColorStop(1, `rgba(${tR}, ${tG}, ${tB}, 0)`);
            ctx.beginPath();
            ctx.moveTo(tailX, tailY);
            ctx.lineTo(s.x, s.y);
            ctx.strokeStyle = grad;
            ctx.lineWidth = 1.5;
            ctx.stroke();
        }
    }
}

// ===========================================================================
// Background helpers
// ===========================================================================
function hexToRgb(hex) {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return m ? { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) } : null;
}

function applyBackground(hex) {
    const c = hexToRgb(hex);
    if (!c) { document.body.style.background = hex; return; }
    const mid = `rgb(${c.r * 0.55 | 0}, ${c.g * 0.55 | 0}, ${c.b * 0.65 | 0})`;
    const dark = `rgb(${c.r * 0.2 | 0}, ${c.g * 0.2 | 0}, ${c.b * 0.28 | 0})`;
    document.body.style.background = `radial-gradient(ellipse at center, ${hex} 0%, ${mid} 50%, ${dark} 100%)`;
}

// ===========================================================================
// Image preloading (default demo images only; root-relative so they work from any path)
// ===========================================================================
const DEFAULT_IMAGE_SOURCES = ['/img/cat1.png', '/img/cat2.png', '/img/cat3.png'];
DEFAULT_IMAGE_SOURCES.forEach(src => { const img = new Image(); img.src = src; });

/** Ensure image source is absolute (full URL or root-relative) so it works from /dream/:id */
function normalizeImageSrc(src) {
    if (typeof src !== 'string') return src;
    if (src.startsWith('http:') || src.startsWith('https:') || src.startsWith('/')) return src;
    return '/' + src.replace(/^\//, '');
}

// ===========================================================================
// FloatingCat
// ===========================================================================
class FloatingCat {
    constructor(imageSources) {
        const sources = imageSources && imageSources.length ? imageSources : DEFAULT_IMAGE_SOURCES;
        this.element = document.createElement('img');
        this.element.className = 'floating-cat';
        const rawSrc = sources[Math.floor(Math.random() * sources.length)];
        const src = normalizeImageSrc(rawSrc);
        this.element.src = src;
        if (typeof src === 'string' && (src.startsWith('http:') || src.startsWith('https:'))) {
            this.element.crossOrigin = 'anonymous';
        }
        this.removed = false;
        this.fadingOut = false;

        // Visual variety
        this.hue = Math.random() < 0.4 ? 0 : Math.floor(Math.random() * 360);
        this.breathPhase = Math.random() * Math.PI * 2;
        this.spawnTime = performance.now();
        this.trail = [];

        // Glow color based on hue
        this.glowColor = this.hue !== 0
            ? `hsl(${this.hue}, 70%, 60%)`
            : `rgba(${config.starTint[0]}, ${config.starTint[1]}, ${config.starTint[2]}, 0.6)`;

        this._applyFilter();

        // Cache rendered dimensions
        this.layoutWidth = config.maxImageSize;
        this.layoutHeight = config.maxImageSize;
        this.element.addEventListener('load', () => {
            const nw = this.element.naturalWidth;
            const nh = this.element.naturalHeight;
            if (nw > 0 && nh > 0) {
                const ratio = Math.min(1, config.maxImageSize / nw, config.maxImageSize / nh);
                this.layoutWidth = nw * ratio;
                this.layoutHeight = nh * ratio;
            }
        });

        this.hitboxElement = document.createElement('div');
        this.hitboxElement.className = 'hitbox';

        this.reset();
        document.body.appendChild(this.element);
        document.body.appendChild(this.hitboxElement);
    }

    _applyFilter() {
        const parts = [];
        if (this.hue !== 0) parts.push(`hue-rotate(${this.hue}deg)`);
        if (config.glowEnabled) parts.push(`drop-shadow(0 0 ${config.glowIntensity}px ${this.glowColor})`);
        this.element.style.filter = parts.length ? parts.join(' ') : 'none';
    }

    get radius() { return config.collisionRadius * this.scale; }

    get depthFactor() {
        if (!config.depthEffect) return 1;
        const range = Math.max(0.01, config.maxScale - config.minScale);
        return 0.4 + 0.6 * ((this.scale - config.minScale) / range);
    }

    reset() {
        this.x = Math.random() * window.innerWidth;
        this.y = Math.random() * window.innerHeight;
        this.scale = config.minScale + Math.random() * (config.maxScale - config.minScale);
        this.spawnTime = performance.now();
        this.trail = [];

        this.element.style.zIndex = Math.round(this.scale * 10) + 2;

        if (config.dvdMode) {
            this.dvdDirX = Math.random() > 0.5 ? 1 : -1;
            this.dvdDirY = Math.random() > 0.5 ? 1 : -1;
            this.rotation = 90;
            this.rotationSpeed = 0;
        } else {
            this.speedX = (Math.random() - 0.5) * config.baseSpeed * 2;
            this.speedY = (Math.random() - 0.5) * config.baseSpeed * 2;
            this.rotation = Math.random() * 360;
            this.rotationSpeed = (Math.random() - 0.5) * config.rotationSpeedRange;
        }

        this.orbitAngle = Math.random() * Math.PI * 2;

        const hw = this.layoutWidth / 2;
        const hh = this.layoutHeight / 2;
        this.element.style.transform =
            `translate(${this.x - hw}px, ${this.y - hh}px) rotate(${this.rotation}deg) scale(0)`;
        this.element.style.opacity = '0';
        setTimeout(() => { if (!this.removed) this.element.style.opacity = '1'; }, config.fadeInMs);
    }

    applyImpulse(fromX, fromY, force) {
        const dx = this.x - fromX;
        const dy = this.y - fromY;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        this.speedX += (dx / dist) * force;
        this.speedY += (dy / dist) * force;
        this.rotationSpeed += (Math.random() - 0.5) * config.clickSpinBurst;
    }

    update(time) {
        const depth = this.depthFactor;

        // Spawn animation: scale from 0 → 1 over 600ms (ease-out cubic)
        const spawnAge = performance.now() - this.spawnTime;
        const spawnT = Math.min(1, spawnAge / 600);
        const spawnScale = 1 - Math.pow(1 - spawnT, 3);

        // Breathing
        const breathMul = config.breathing
            ? 1 + config.breathingAmount * Math.sin(time * config.breathingSpeed + this.breathPhase)
            : 1;

        const visualScale = this.scale * spawnScale * breathMul;

        // Slow-motion zone
        let timeScale = 1;
        if (config.slowMoRadius > 0) {
            const dm = Math.sqrt((this.x - mouse.x) ** 2 + (this.y - mouse.y) ** 2);
            if (dm < config.slowMoRadius) {
                timeScale = config.slowMoFactor + (1 - config.slowMoFactor) * (dm / config.slowMoRadius);
            }
        }

        if (config.dvdMode) {
            const speed = config.dvdSpeed * depth * timeScale;
            this.x += this.dvdDirX * speed;
            this.y += this.dvdDirY * speed;

            const boundsW = this.element.width || config.maxImageSize;
            const boundsH = this.element.height || config.maxImageSize;

            if (this.x < 0) { this.x = 0; this.dvdDirX = 1; }
            if (this.x > window.innerWidth - boundsW) { this.x = window.innerWidth - boundsW; this.dvdDirX = -1; }
            if (this.y < 0) { this.y = 0; this.dvdDirY = 1; }
            if (this.y > window.innerHeight - boundsH) { this.y = window.innerHeight - boundsH; this.dvdDirY = -1; }

            this.element.style.transform =
                `translate(${this.x}px, ${this.y}px) rotate(90deg) scale(${visualScale})`;

            this.hitboxElement.style.width = `${boundsW}px`;
            this.hitboxElement.style.height = `${boundsH}px`;
            this.hitboxElement.style.transform = `translate(${this.x}px, ${this.y}px)`;
            this.hitboxElement.style.display = config.showHitbox ? 'block' : 'none';

            // Trail
            if (config.trailsEnabled) {
                this.trail.unshift({ x: this.x + boundsW / 2, y: this.y + boundsH / 2 });
                if (this.trail.length > config.trailLength) this.trail.pop();
            }
            return;
        }

        // --- Regular mode ---
        if (config.mouseMode !== 'off') {
            const sign = config.mouseMode === 'repel' ? -1 : 1;
            const dx = mouse.x - this.x;
            const dy = mouse.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (config.mouseMode === 'repel' || distance > config.orbitDistance) {
                this.speedX += sign * (dx / (distance || 1)) * config.attractionForce * depth * timeScale;
                this.speedY += sign * (dy / (distance || 1)) * config.attractionForce * depth * timeScale;
            } else {
                this.orbitAngle += config.orbitSpeed * depth * timeScale;
                const targetX = mouse.x + Math.cos(this.orbitAngle) * config.orbitDistance;
                const targetY = mouse.y + Math.sin(this.orbitAngle) * config.orbitDistance;
                this.speedX = (targetX - this.x) * config.orbitEasing * depth * timeScale;
                this.speedY = (targetY - this.y) * config.orbitEasing * depth * timeScale;
            }
        }

        // Gravity
        if (config.gravity > 0) {
            this.speedY += config.gravity * 0.1 * timeScale;
        }

        this.speedX *= config.velocityDamping;
        this.speedY *= config.velocityDamping;

        this.x += this.speedX * timeScale;
        this.y += this.speedY * timeScale;

        // Spin drift
        this.rotationSpeed += (Math.random() - 0.5) * config.spinDrift * timeScale;
        this.rotationSpeed *= config.spinDamping;
        this.rotation += this.rotationSpeed * timeScale;

        const r = this.radius;
        if (this.x < r) { this.x = r; this.speedX = Math.abs(this.speedX) * config.bounciness; }
        if (this.x > window.innerWidth - r) { this.x = window.innerWidth - r; this.speedX = -Math.abs(this.speedX) * config.bounciness; }
        if (this.y < r) { this.y = r; this.speedY = Math.abs(this.speedY) * config.bounciness; }
        if (this.y > window.innerHeight - r) { this.y = window.innerHeight - r; this.speedY = -Math.abs(this.speedY) * config.bounciness; }

        const hw = this.layoutWidth / 2;
        const hh = this.layoutHeight / 2;
        this.element.style.transform =
            `translate(${this.x - hw}px, ${this.y - hh}px) rotate(${this.rotation}deg) scale(${visualScale})`;

        const size = r * 2;
        this.hitboxElement.style.width = `${size}px`;
        this.hitboxElement.style.height = `${size}px`;
        this.hitboxElement.style.transform = `translate(${this.x - r}px, ${this.y - r}px)`;
        this.hitboxElement.style.display = config.showHitbox ? 'block' : 'none';

        // Trail
        if (config.trailsEnabled) {
            this.trail.unshift({ x: this.x, y: this.y });
            if (this.trail.length > config.trailLength) this.trail.pop();
        }
    }

    clampToViewport() {
        if (config.dvdMode) {
            this.x = Math.max(0, Math.min(this.x, window.innerWidth));
            this.y = Math.max(0, Math.min(this.y, window.innerHeight));
        } else {
            const r = this.radius;
            this.x = Math.max(r, Math.min(this.x, window.innerWidth - r));
            this.y = Math.max(r, Math.min(this.y, window.innerHeight - r));
        }
    }

    remove() {
        if (this.removed) return;
        this.fadingOut = true;
        this.element.style.opacity = '0';
        this.hitboxElement.style.opacity = '0';
        setTimeout(() => {
            this.removed = true;
            this.element.remove();
            this.hitboxElement.remove();
        }, config.fadeOutMs);
    }
}

// ===========================================================================
// CatManager
// ===========================================================================
class CatManager {
    constructor(options) {
        this.imageSources = options?.imageSources ?? null;
        this.cats = [];
        this.targetCount = config.minCats;
        this.starField = new StarField();

        this.updateInterval = setInterval(() => this.updateCatCount(), config.catUpdateIntervalMs);
        this.animate = this.animate.bind(this);

        this._onResize = () => this.cats.forEach(c => c.clampToViewport());
        window.addEventListener('resize', this._onResize);

        while (this.cats.length < this.targetCount) this.cats.push(new FloatingCat(this.imageSources));

        requestAnimationFrame(this.animate);
    }

    updateCatCount() {
        const shouldIncrease = Math.random() < config.spawnProbability;
        this.targetCount = Math.min(config.maxCats, Math.max(config.minCats, this.targetCount + (shouldIncrease ? 1 : -1)));

        const active = this.cats.filter(c => !c.fadingOut);
        let toRemove = active.length - this.targetCount;
        for (let i = active.length - 1; i >= 0 && toRemove > 0; i--) { active[i].remove(); toRemove--; }

        const afterRemoval = Math.min(active.length, this.targetCount);
        let toSpawn = this.targetCount - afterRemoval;
        while (toSpawn-- > 0) this.cats.push(new FloatingCat(this.imageSources));
    }

    handleClick(cx, cy) {
        let closest = null, closestDist = Infinity;
        for (const cat of this.cats) {
            if (cat.fadingOut) continue;
            const d = Math.sqrt((cat.x - cx) ** 2 + (cat.y - cy) ** 2);
            if (d < cat.radius * 2.5 && d < closestDist) { closest = cat; closestDist = d; }
        }
        if (closest) { closest.applyImpulse(cx, cy, config.clickImpulse); sound.playPop(); }
    }

    handleCollisions() {
        const active = this.cats.filter(c => !c.fadingOut);
        for (let i = 0; i < active.length; i++) {
            for (let j = i + 1; j < active.length; j++) {
                const c1 = active[i], c2 = active[j];
                const dx = c2.x - c1.x, dy = c2.y - c1.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < 0.001) { c1.x -= 1; c2.x += 1; continue; }

                if (dist < c1.radius + c2.radius) {
                    const angle = Math.atan2(dy, dx);
                    const sin = Math.sin(angle), cos = Math.cos(angle);
                    const vx1 = c1.speedX * cos + c1.speedY * sin;
                    const vy1 = c1.speedY * cos - c1.speedX * sin;
                    const vx2 = c2.speedX * cos + c2.speedY * sin;
                    const vy2 = c2.speedY * cos - c2.speedX * sin;
                    const fv1 = vx2 * config.bounciness, fv2 = vx1 * config.bounciness;
                    c1.speedX = fv1 * cos - vy1 * sin; c1.speedY = vy1 * cos + fv1 * sin;
                    c2.speedX = fv2 * cos - vy2 * sin; c2.speedY = vy2 * cos + fv2 * sin;
                    const overlap = (c1.radius + c2.radius - dist) / 2;
                    const sx = (dx / dist) * overlap, sy = (dy / dist) * overlap;
                    c1.x -= sx; c1.y -= sy; c2.x += sx; c2.y += sy;
                    sound.playCollision();
                }
            }
        }
    }

    // --- Draw extras on star canvas ---
    _drawExtras() {
        const ctx = this.starField.ctx;
        const [tR, tG, tB] = config.starTint;
        const active = this.cats.filter(c => !c.removed);

        // Constellation lines
        if (config.constellations) {
            ctx.lineWidth = 1;
            for (let i = 0; i < active.length; i++) {
                for (let j = i + 1; j < active.length; j++) {
                    const a = active[i], b = active[j];
                    const d = Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
                    if (d < config.constellationDist) {
                        const alpha = (1 - d / config.constellationDist) * 0.3;
                        ctx.beginPath();
                        ctx.moveTo(a.x, a.y);
                        ctx.lineTo(b.x, b.y);
                        ctx.strokeStyle = `rgba(${tR}, ${tG}, ${tB}, ${alpha})`;
                        ctx.stroke();
                    }
                }
            }
        }

        // Particle trails
        if (config.trailsEnabled) {
            for (const cat of active) {
                for (let k = 0; k < cat.trail.length; k++) {
                    const p = cat.trail[k];
                    const alpha = (1 - k / cat.trail.length) * 0.4;
                    const r = (1 - k / cat.trail.length) * 2.5 * cat.scale;
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
                    ctx.fillStyle = `rgba(${tR}, ${tG}, ${tB}, ${alpha})`;
                    ctx.fill();
                }
            }
        }
    }

    animate(time) {
        this.cats = this.cats.filter(c => !c.removed);
        if (!config.dvdMode) this.handleCollisions();
        this.cats.forEach(cat => cat.update(time));
        this.starField.update(time);
        this._drawExtras();
        requestAnimationFrame(this.animate);
    }

    destroy() {
        clearInterval(this.updateInterval);
        window.removeEventListener('resize', this._onResize);
        this.starField.destroy();
        this.cats.forEach(cat => cat.remove());
        this.cats = [];
    }
}

// ===========================================================================
// Fullscreen & Screenshot
// ===========================================================================
function toggleFullscreen() {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
    else document.exitFullscreen().catch(() => {});
}

function takeScreenshot(manager) {
    const w = window.innerWidth, h = window.innerHeight;
    const cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    const ctx = cv.getContext('2d');

    // Background gradient
    const bg = hexToRgb(config.backgroundColor);
    if (bg) {
        const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.7);
        g.addColorStop(0, config.backgroundColor);
        g.addColorStop(0.5, `rgb(${bg.r * 0.55 | 0}, ${bg.g * 0.55 | 0}, ${bg.b * 0.65 | 0})`);
        g.addColorStop(1, `rgb(${bg.r * 0.2 | 0}, ${bg.g * 0.2 | 0}, ${bg.b * 0.28 | 0})`);
        ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    }

    // Stars layer
    ctx.drawImage(manager.starField.canvas, 0, 0);

    // Cats
    for (const cat of manager.cats) {
        if (cat.removed) continue;
        ctx.save();
        ctx.globalAlpha = cat.fadingOut ? 0.3 : 1;
        ctx.translate(cat.x, cat.y);
        ctx.rotate(cat.rotation * Math.PI / 180);
        ctx.scale(cat.scale, cat.scale);
        if (cat.hue !== 0) { try { ctx.filter = `hue-rotate(${cat.hue}deg)`; } catch (_) {} }
        ctx.drawImage(cat.element, -cat.layoutWidth / 2, -cat.layoutHeight / 2, cat.layoutWidth, cat.layoutHeight);
        ctx.restore();
    }

    // Vignette
    if (config.vignette) {
        const vg = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.7);
        vg.addColorStop(0, 'rgba(0,0,0,0)');
        vg.addColorStop(1, 'rgba(0,0,0,0.55)');
        ctx.fillStyle = vg; ctx.fillRect(0, 0, w, h);
    }

    const link = document.createElement('a');
    link.download = `cat-dreams-${Date.now()}.png`;
    link.href = cv.toDataURL('image/png');
    link.click();
}

// ===========================================================================
// GUI (optional: only when lil-gui is loaded, e.g. via script tag)
// ===========================================================================
function setupGUI(manager) {
    if (typeof lil === 'undefined') return null;
    const gui = new lil.GUI();
    gui.close();

    gui.add(config, 'minCats', 1, 10, 1).onChange(() => { if (config.minCats > config.maxCats) config.maxCats = config.minCats; });
    gui.add(config, 'maxCats', 1, 20, 1).onChange(() => { if (config.maxCats < config.minCats) config.minCats = config.maxCats; });
    gui.add(config, 'baseSpeed', 0.1, 5, 0.1);
    gui.add(config, 'theme', Object.keys(themes)).name('Theme').onChange(applyTheme);

    const physics = gui.addFolder('Physics');
    physics.close();
    physics.add(config, 'gravity', 0, 5, 0.1).name('Gravity');
    physics.add(config, 'bounciness', 0.1, 1, 0.1);
    physics.add(config, 'collisionRadius', 20, 100, 5).name('Collision Size');
    physics.add(config, 'attractionForce', 0.001, 0.1, 0.001).name('Attraction');
    physics.add(config, 'orbitDistance', 50, 300, 10).name('Orbit Radius');

    const mode = gui.addFolder('Mode');
    mode.close();
    mode.add(config, 'dvdMode').name('DVD Mode').onChange(() => { manager.cats.forEach(c => c.reset()); });
    mode.add(config, 'dvdSpeed', 0.5, 5, 0.5).name('DVD Speed');
    mode.add(config, 'mouseMode', { Off: 'off', Attract: 'attract', Repel: 'repel' }).name('Mouse');

    const visuals = gui.addFolder('Visuals');
    visuals.close();
    visuals.add(config, 'glowEnabled').name('Glow').onChange(() => { manager.cats.forEach(c => c._applyFilter()); });
    visuals.add(config, 'glowIntensity', 4, 30, 1).name('Glow Size').onChange(() => { manager.cats.forEach(c => c._applyFilter()); });
    visuals.add(config, 'trailsEnabled').name('Trails');
    visuals.add(config, 'constellations').name('Constellations');
    visuals.add(config, 'breathing').name('Breathing');
    visuals.add(config, 'shootingStars').name('Shooting Stars');
    visuals.add(config, 'vignette').name('Vignette').onChange(v => {
        document.getElementById('vignette').style.opacity = v ? '1' : '0';
    });
    visuals.add(config, 'spinDrift', 0, 0.5, 0.01).name('Spin Drift');
    visuals.add(config, 'depthEffect').name('Depth / Parallax');
    visuals.add(config, 'slowMoRadius', 0, 300, 10).name('Slow-Mo Zone');
    visuals.add(config, 'showHitbox').name('Show Hitbox');

    const audio = gui.addFolder('Audio');
    audio.close();
    audio.add(config, 'soundEnabled').name('Sound FX');
    audio.add(config, 'ambientMusic').name('Ambient Music').onChange(v => {
        sound.init();
        v ? sound.startAmbient() : sound.stopAmbient();
    });

    return gui;
}

// ===========================================================================
// Init (exposed for dream page; auto-runs on homepage)
// ===========================================================================
// Track listeners so we can clean up on re-init
let _animCleanup = null;

function initAnimation(options) {
    const isDreamPage = document.body.getAttribute('data-page') === 'dream' || /^\/dream\//.test(window.location.pathname);
    const hasImageSources = options?.imageSources && Array.isArray(options.imageSources) && options.imageSources.length > 0;
    if (isDreamPage && !hasImageSources) return; // Dream page must receive imageSources from the app; do not fall back to default cats

    // Clean up previous init if re-called
    if (_animCleanup) _animCleanup();

    applyBackground(config.backgroundColor);
    const catManager = new CatManager(options);
    const gui = setupGUI(catManager);

    const vignetteEl = document.getElementById('vignette');
    if (vignetteEl) vignetteEl.style.opacity = config.vignette ? '1' : '0';

    const onClickCat = (e) => {
        if (e.target.closest('.lil-gui') || e.target.closest('.toolbar')) return;
        catManager.handleClick(e.clientX, e.clientY);
    };
    const onTouchCat = (e) => {
        if (e.target.closest('.lil-gui') || e.target.closest('.toolbar')) return;
        if (e.changedTouches.length > 0) {
            const t = e.changedTouches[0];
            catManager.handleClick(t.clientX, t.clientY);
        }
    };

    let guiVisible = true;
    const onKeydown = (e) => {
        if ((e.key === 'h' || e.key === 'H') && gui) { guiVisible = !guiVisible; guiVisible ? gui.show() : gui.hide(); }
        if (e.key === 'f' || e.key === 'F') toggleFullscreen();
        if (e.key === 's' || e.key === 'S') takeScreenshot(catManager);
    };

    document.addEventListener('click', onClickCat);
    document.addEventListener('touchend', onTouchCat);
    document.addEventListener('keydown', onKeydown);

    const fullscreenBtn = document.getElementById('fullscreen-btn');
    const screenshotBtn = document.getElementById('screenshot-btn');
    const onFullscreen = () => toggleFullscreen();
    const onScreenshot = () => takeScreenshot(catManager);
    if (fullscreenBtn) fullscreenBtn.addEventListener('click', onFullscreen);
    if (screenshotBtn) screenshotBtn.addEventListener('click', onScreenshot);

    const hint = document.getElementById('hint');
    if (hint) {
        setTimeout(() => { hint.style.opacity = '0'; }, 5000);
        setTimeout(() => { hint.remove(); }, 7500);
    }

    _animCleanup = () => {
        document.removeEventListener('click', onClickCat);
        document.removeEventListener('touchend', onTouchCat);
        document.removeEventListener('keydown', onKeydown);
        if (fullscreenBtn) fullscreenBtn.removeEventListener('click', onFullscreen);
        if (screenshotBtn) screenshotBtn.removeEventListener('click', onScreenshot);
        catManager.destroy();
        if (gui) gui.destroy();
    };
}
window.initAnimation = initAnimation;

window.addEventListener('load', () => {
    if (document.body.getAttribute('data-page') === 'dream') return;
    if (/^\/dream\//.test(window.location.pathname)) return;
    initAnimation();
});
