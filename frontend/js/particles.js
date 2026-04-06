/**
 * ClearSight.ai — Particle Background
 * Lightweight canvas-based particle effect representing network traffic
 */

class ParticleSystem {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) return;
        
        this.ctx = this.canvas.getContext('2d');
        this.particles = [];
        this.particleCount = window.innerWidth < 768 ? 40 : 80;
        this.mouseY = 0;
        this.mouseX = 0;
        this.isActive = true;
        
        this.colors = ['#00d4ff', '#00ff88', '#ff3366', '#555577'];
        
        this.init();
        this.animate();
        
        window.addEventListener('resize', this.resize.bind(this));
        window.addEventListener('mousemove', (e) => {
            this.mouseX = e.clientX;
            this.mouseY = e.clientY;
        });
    }

    init() {
        this.resize();
        this.particles = [];
        for (let i = 0; i < this.particleCount; i++) {
            this.particles.push(this.createParticle());
        }
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    createParticle() {
        return {
            x: Math.random() * this.canvas.width,
            y: Math.random() * this.canvas.height,
            size: Math.random() * 2 + 0.5,
            speedX: (Math.random() - 0.5) * 0.5,
            speedY: (Math.random() - 0.5) * 0.5,
            color: this.colors[Math.floor(Math.random() * (this.colors.length - 1))], // Favor non-red colors
            opacity: Math.random() * 0.5 + 0.1
        };
    }

    drawParticle(p) {
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        this.ctx.fillStyle = p.color;
        this.ctx.globalAlpha = p.opacity;
        this.ctx.fill();
    }

    connectParticles() {
        for (let i = 0; i < this.particles.length; i++) {
            for (let j = i; j < this.particles.length; j++) {
                const dx = this.particles[i].x - this.particles[j].x;
                const dy = this.particles[i].y - this.particles[j].y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < 150) {
                    this.ctx.beginPath();
                    this.ctx.strokeStyle = this.particles[i].color;
                    this.ctx.globalAlpha = 1 - (distance / 150);
                    this.ctx.globalAlpha *= 0.2; // Keep connections very subtle
                    this.ctx.lineWidth = 0.5;
                    this.ctx.moveTo(this.particles[i].x, this.particles[i].y);
                    this.ctx.lineTo(this.particles[j].x, this.particles[j].y);
                    this.ctx.stroke();
                }
            }
            
            // Connect to mouse interactions if close
            const dxMouse = this.particles[i].x - this.mouseX;
            const dyMouse = this.particles[i].y - this.mouseY;
            const distMouse = Math.sqrt(dxMouse * dxMouse + dyMouse * dyMouse);
            
            if (distMouse < 200 && this.mouseX > 0) {
                this.ctx.beginPath();
                this.ctx.strokeStyle = '#00d4ff';
                this.ctx.globalAlpha = (1 - (distMouse / 200)) * 0.3;
                this.ctx.lineWidth = 1;
                this.ctx.moveTo(this.particles[i].x, this.particles[i].y);
                this.ctx.lineTo(this.mouseX, this.mouseY);
                this.ctx.stroke();
                
                // Slight attraction to mouse
                this.particles[i].x -= dxMouse * 0.005;
                this.particles[i].y -= dyMouse * 0.005;
            }
        }
    }

    update() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        for (let i = 0; i < this.particles.length; i++) {
            const p = this.particles[i];
            
            p.x += p.speedX;
            p.y += p.speedY;

            // Bounce off edges
            if (p.x < 0 || p.x > this.canvas.width) p.speedX *= -1;
            if (p.y < 0 || p.y > this.canvas.height) p.speedY *= -1;

            this.drawParticle(p);
        }

        this.connectParticles();
    }

    animate() {
        if (!this.isActive) return;
        this.update();
        requestAnimationFrame(this.animate.bind(this));
    }
    
    intensify() {
        // Red color splash when finding threats
        for (let i = 0; i < this.particles.length / 3; i++) {
            this.particles[i].color = '#ff3366';
            this.particles[i].speedX *= 3;
            this.particles[i].speedY *= 3;
        }
    }
    
    calm() {
        for (let i = 0; i < this.particles.length; i++) {
            this.particles[i].color = this.colors[Math.floor(Math.random() * (this.colors.length - 1))];
            this.particles[i].speedX = (Math.random() - 0.5) * 0.5;
            this.particles[i].speedY = (Math.random() - 0.5) * 0.5;
        }
    }
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    window.particles = new ParticleSystem('particles-canvas');
});
