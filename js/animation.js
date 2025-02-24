const config = {
    minCats: 1,
    maxCats: 8,
    minScale: 0.3,
    maxScale: 1.2,
    baseSpeed: 0.5,
    backgroundColor: '#2c2c2c',
    attractionForce: 0.02,
    orbitDistance: 150,
    orbitSpeed: 0.02,
    bounciness: 0.7,
    collisionRadius: 50
};

// Add mouse position tracking
const mouse = {
    x: window.innerWidth / 2,
    y: window.innerHeight / 2
};

// Track mouse position
document.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
});

const images = ['cat1.png', 'cat2.png', 'cat3.png'];

class FloatingCat {
    constructor() {
        this.element = document.createElement('img');
        this.element.className = 'floating-cat';
        this.element.src = `img/${images[Math.floor(Math.random() * images.length)]}`; // Fixed image path
        this.reset();
        document.body.appendChild(this.element);
        this.radius = config.collisionRadius;
    }

    reset() {
        // Initialize position relative to viewport size
        this.x = Math.random() * window.innerWidth;
        this.y = Math.random() * window.innerHeight;
        this.scale = config.minScale + Math.random() * (config.maxScale - config.minScale);
        this.speedX = (Math.random() - 0.5) * config.baseSpeed * 2; // Increased speed range
        this.speedY = (Math.random() - 0.5) * config.baseSpeed * 2;
        this.rotation = Math.random() * 360;
        this.rotationSpeed = (Math.random() - 0.5) * 0.5;
        this.orbitAngle = Math.random() * Math.PI * 2;
        
        // Set initial position
        this.element.style.transform = `translate(${this.x}px, ${this.y}px) rotate(${this.rotation}deg) scale(${this.scale})`;
        this.element.style.opacity = '0';
        setTimeout(() => this.element.style.opacity = '1', 100);
    }

    update() {
        // Calculate direction to mouse
        const dx = mouse.x - this.x;
        const dy = mouse.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Attraction to mouse
        if (distance > config.orbitDistance) {
            this.speedX += (dx / distance) * config.attractionForce;
            this.speedY += (dy / distance) * config.attractionForce;
        } else {
            // Orbital motion when close to mouse
            this.orbitAngle += config.orbitSpeed;
            const targetX = mouse.x + Math.cos(this.orbitAngle) * config.orbitDistance;
            const targetY = mouse.y + Math.sin(this.orbitAngle) * config.orbitDistance;
            
            this.speedX = (targetX - this.x) * 0.1;
            this.speedY = (targetY - this.y) * 0.1;
        }

        // Apply momentum and damping
        this.speedX *= 0.99;
        this.speedY *= 0.99;

        // Update position
        this.x += this.speedX;
        this.y += this.speedY;
        this.rotation += this.rotationSpeed;

        // Bounce from screen edges
        if (this.x < this.radius) {
            this.x = this.radius;
            this.speedX = Math.abs(this.speedX) * config.bounciness;
        }
        if (this.x > window.innerWidth - this.radius) {
            this.x = window.innerWidth - this.radius;
            this.speedX = -Math.abs(this.speedX) * config.bounciness;
        }
        if (this.y < this.radius) {
            this.y = this.radius;
            this.speedY = Math.abs(this.speedY) * config.bounciness;
        }
        if (this.y > window.innerHeight - this.radius) {
            this.y = window.innerHeight - this.radius;
            this.speedY = -Math.abs(this.speedY) * config.bounciness;
        }

        this.element.style.transform = `translate(${this.x}px, ${this.y}px) rotate(${this.rotation}deg) scale(${this.scale})`;
    }

    remove() {
        this.element.style.opacity = '0';
        setTimeout(() => this.element.remove(), 1000);
    }
}

class CatManager {
    constructor() {
        this.cats = [];
        this.targetCount = config.minCats;
        this.updateInterval = setInterval(() => this.updateCatCount(), 5000);
        this.animate = this.animate.bind(this);
        requestAnimationFrame(this.animate);
    }

    updateCatCount() {
        // Fix the operator precedence issue and make the logic clearer
        const shouldIncrease = Math.random() < 0.7;
        this.targetCount = Math.min(config.maxCats, Math.max(config.minCats, this.targetCount + (shouldIncrease ? 1 : -1)));
        
        while (this.cats.length > this.targetCount) {
            const catToRemove = this.cats.pop();
            if (catToRemove) {
                catToRemove.remove();
            }
        }
        
        while (this.cats.length < this.targetCount) {
            this.cats.push(new FloatingCat());
        }
    }

    handleCollisions() {
        for (let i = 0; i < this.cats.length; i++) {
            for (let j = i + 1; j < this.cats.length; j++) {
                const cat1 = this.cats[i];
                const cat2 = this.cats[j];

                const dx = cat2.x - cat1.x;
                const dy = cat2.y - cat1.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < cat1.radius + cat2.radius) {
                    // Collision detected - calculate collision response
                    const angle = Math.atan2(dy, dx);
                    const sin = Math.sin(angle);
                    const cos = Math.cos(angle);

                    // Rotate velocities
                    const vx1 = cat1.speedX * cos + cat1.speedY * sin;
                    const vy1 = cat1.speedY * cos - cat1.speedX * sin;
                    const vx2 = cat2.speedX * cos + cat2.speedY * sin;
                    const vy2 = cat2.speedY * cos - cat2.speedX * sin;

                    // Collision reaction
                    const finalVx1 = vx2 * config.bounciness;
                    const finalVx2 = vx1 * config.bounciness;

                    // Rotate velocities back
                    cat1.speedX = (finalVx1 * cos - vy1 * sin);
                    cat1.speedY = (vy1 * cos + finalVx1 * sin);
                    cat2.speedX = (finalVx2 * cos - vy2 * sin);
                    cat2.speedY = (vy2 * cos + finalVx2 * sin);

                    // Separate cats to prevent sticking
                    const overlap = (cat1.radius + cat2.radius - distance) / 2;
                    const separationX = (dx / distance) * overlap;
                    const separationY = (dy / distance) * overlap;
                    
                    cat1.x -= separationX;
                    cat1.y -= separationY;
                    cat2.x += separationX;
                    cat2.y += separationY;
                }
            }
        }
    }

    animate() {
        this.handleCollisions();
        this.cats.forEach(cat => cat.update());
        requestAnimationFrame(this.animate);
    }
}

// Setup GUI
function setupGUI() {
    const gui = new lil.GUI();
    
    gui.add(config, 'minCats', 1, 10, 1).onChange(() => {
        if (config.minCats > config.maxCats) config.maxCats = config.minCats;
    });
    
    gui.add(config, 'maxCats', 1, 20, 1).onChange(() => {
        if (config.maxCats < config.minCats) config.minCats = config.maxCats;
    });
    
    gui.add(config, 'minScale', 0.1, 1, 0.1).onChange(() => {
        if (config.minScale > config.maxScale) config.maxScale = config.minScale;
    });
    
    gui.add(config, 'maxScale', 0.1, 2, 0.1).onChange(() => {
        if (config.maxScale < config.minScale) config.minScale = config.maxScale;
    });
    
    gui.add(config, 'baseSpeed', 0.1, 5, 0.1);
    
    gui.addColor(config, 'backgroundColor').onChange((value) => {
        document.body.style.backgroundColor = value;
    });

    // Add new controls
    gui.add(config, 'attractionForce', 0.001, 0.1, 0.001)
        .name('Attraction');
    gui.add(config, 'orbitDistance', 50, 300, 10)
        .name('Orbit Radius');
    gui.add(config, 'orbitSpeed', 0.001, 0.1, 0.001)
        .name('Orbit Speed');

    // Add physics controls
    gui.add(config, 'bounciness', 0.1, 1, 0.1)
        .name('Bounciness');
    gui.add(config, 'collisionRadius', 20, 100, 5)
        .name('Collision Size');
}

// Start the animation when the page loads
window.addEventListener('load', () => {
    new CatManager();
    setupGUI();
});