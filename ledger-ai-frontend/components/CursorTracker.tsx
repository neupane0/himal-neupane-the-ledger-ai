import React, { useEffect, useRef } from 'react';

const CursorTracker: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    let particles: Particle[] = [];
    let animationFrameId: number;

    // Mouse state - Initialize to center
    const mouse = { x: width / 2, y: height / 2 };

    // Particle Class
    class Particle {
      x: number;
      y: number;
      ox: number; // Origin X (now drifts)
      oy: number; // Origin Y (now drifts)
      vxDrift: number; // Ambient drift X
      vyDrift: number; // Ambient drift Y
      
      baseRadius: number;
      baseAlpha: number;
      
      // Visuals
      drawRadius: number;
      drawAlpha: number;

      constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
        this.ox = x;
        this.oy = y;
        
        // Random slow drift velocity
        this.vxDrift = (Math.random() - 0.5) * 0.2; // Slower drift
        this.vyDrift = (Math.random() - 0.5) * 0.2;
        
        // Base properties
        this.baseRadius = Math.random() * 2 + 1.0; 
        this.baseAlpha = Math.random() * 0.3 + 0.2;
        
        this.drawRadius = this.baseRadius;
        this.drawAlpha = this.baseAlpha;
      }

      update(time: number) {
        // --- 1. Ambient Drift ---
        // Move the "home" position slowly
        this.ox += this.vxDrift;
        this.oy += this.vyDrift;

        // Bounce off screen edges
        if (this.ox < 0 || this.ox > width) this.vxDrift *= -1;
        if (this.oy < 0 || this.oy > height) this.vyDrift *= -1;

        // In IDLE mode, the particle stays at its drifting origin
        this.x = this.ox;
        this.y = this.oy;

        // --- 2. 3D Depth / Visibility Logic (Flashlight Effect) ---
        // Particles are visible based on proximity to cursor, but DO NOT move towards it.
        const maxDist = Math.max(width, height) * 0.6; 
        
        // Calculate raw distance to cursor for rendering props
        const renderDist = Math.sqrt((mouse.x - this.x) ** 2 + (mouse.y - this.y) ** 2);
        
        let depth = 1 - Math.min(renderDist / maxDist, 1);
        depth = Math.pow(depth, 2); // sharper falloff

        // Size & Opacity scaling
        this.drawRadius = this.baseRadius * (0.5 + 1.5 * depth); 
        this.drawAlpha = this.baseAlpha * (0.2 + 0.8 * depth);
      }

      draw(context: CanvasRenderingContext2D) {
        if (this.drawAlpha < 0.01) return;

        context.beginPath();
        context.arc(this.x, this.y, Math.max(0, this.drawRadius), 0, Math.PI * 2);
        context.fillStyle = `rgba(0, 0, 0, ${this.drawAlpha})`;
        context.fill();
      }
    }

    const initParticles = () => {
      particles = [];
      const spacing = 60; // Grid spacing
      const cols = Math.ceil(width / spacing) + 2; 
      const rows = Math.ceil(height / spacing) + 2;

      for (let i = -1; i < cols; i++) {
        for (let j = -1; j < rows; j++) {
            // Randomize initial position slightly off grid
            const x = i * spacing + (Math.random() * 40 - 20);
            const y = j * spacing + (Math.random() * 40 - 20);
            particles.push(new Particle(x, y));
        }
      }
    };

    const animate = () => {
      const now = Date.now();
      ctx.clearRect(0, 0, width, height);
      particles.forEach(p => {
        p.update(now);
        p.draw(ctx);
      });
      animationFrameId = requestAnimationFrame(animate);
    };

    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
      mouse.x = width / 2;
      mouse.y = height / 2;
      initParticles();
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };

    const handleTouchMove = (e: TouchEvent) => {
        if(e.touches.length > 0) {
            mouse.x = e.touches[0].clientX;
            mouse.y = e.touches[0].clientY;
        }
    }

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchmove', handleTouchMove);

    handleResize();
    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas 
      ref={canvasRef} 
      className="fixed inset-0 z-0 pointer-events-none"
      style={{ background: 'transparent' }}
    />
  );
};

export default CursorTracker;