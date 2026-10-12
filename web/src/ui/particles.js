// Partículas en suspensión: puntos difuminados que derivan despacio; su número sigue al PM2.5.

const MIN_PARTICLES = 14;
const MAX_PARTICLES = 110;

function countFor(pm25) {
    const value = Number.isFinite(pm25) ? Math.min(Math.max(pm25, 0), 300) : 0;
    return Math.round(MIN_PARTICLES + (MAX_PARTICLES - MIN_PARTICLES) * (value / 300));
}

function createParticle(width, height) {
    return {
        x: Math.random() * width,
        y: Math.random() * height,
        radius: 1.5 + Math.random() * 3.5,
        alpha: 0.08 + Math.random() * 0.22,
        vx: 0.05 + Math.random() * 0.18,
        vy: -0.03 - Math.random() * 0.1,
    };
}

export function startParticles(canvas, { reducedMotion = false } = {}) {
    const context = canvas.getContext?.('2d');
    if (!context || reducedMotion) {
        return { setDensity() {}, stop() {} };
    }

    let particles = [];
    let target = MIN_PARTICLES;
    let frame = 0;
    let running = true;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);

    function resize() {
        canvas.width = window.innerWidth * ratio;
        canvas.height = window.innerHeight * ratio;
        context.setTransform(ratio, 0, 0, ratio, 0, 0);
    }

    function step() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        while (particles.length < target) {
            particles.push(createParticle(width, height));
        }
        if (particles.length > target) {
            particles.length = target;
        }
        context.clearRect(0, 0, width, height);
        for (const p of particles) {
            p.x += p.vx;
            p.y += p.vy;
            if (p.x - p.radius > width) p.x = -p.radius;
            if (p.y + p.radius < 0) p.y = height + p.radius;
            const glow = context.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius * 3);
            glow.addColorStop(0, `rgba(255,255,255,${p.alpha})`);
            glow.addColorStop(1, 'rgba(255,255,255,0)');
            context.fillStyle = glow;
            context.beginPath();
            context.arc(p.x, p.y, p.radius * 3, 0, Math.PI * 2);
            context.fill();
        }
        frame = running ? requestAnimationFrame(step) : 0;
    }

    function onVisibility() {
        if (document.hidden) {
            cancelAnimationFrame(frame);
            frame = 0;
        } else if (running && !frame) {
            frame = requestAnimationFrame(step);
        }
    }

    resize();
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', onVisibility);
    frame = requestAnimationFrame(step);

    return {
        setDensity(pm25) {
            target = countFor(pm25);
        },
        stop() {
            running = false;
            cancelAnimationFrame(frame);
            window.removeEventListener('resize', resize);
            document.removeEventListener('visibilitychange', onVisibility);
        },
    };
}
