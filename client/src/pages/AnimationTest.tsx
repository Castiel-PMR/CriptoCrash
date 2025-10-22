import { useRef, useEffect, useCallback, useState } from 'react';

interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  decay: number;
  color: string;
  size: number;
}

const AnimationTest = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const particlesRef = useRef<Particle[]>([]);
  const [currentAnimation, setCurrentAnimation] = useState(0);

  const animationNames = [
    'Fireworks - яркие разноцветные искры',
    'Star burst - звездообразный взрыв', 
    'Spiral explosion - спиральный взрыв',
    'Heart explosion - сердечки',
    'Lightning - молнии',
    'Cosmic explosion - космический взрыв',
    'Shockwave - ударная волна',
    'Flower petals - лепестки цветов',
    'Ice crystals - ледяные кристаллы',
    'Fire explosion - огненный взрыв'
  ];

  // Create particle based on explosion type (same logic as main canvas)
  const createParticle = useCallback((x: number, y: number, explosionType: number): Particle => {
    let colors, speed, size, decay, vx, vy;
    
    switch (explosionType) {
      case 0: // Fireworks
        colors = ['#FF0040', '#FF4000', '#FFFF00', '#40FF00', '#0040FF', '#8000FF'];
        speed = 25;
        size = Math.random() * 8 + 3;
        decay = 0.008;
        vx = (Math.random() - 0.5) * speed;
        vy = (Math.random() - 0.5) * speed;
        break;
        
      case 1: // Star burst
        colors = ['#FFD700', '#FFA500', '#FF6347'];
        speed = 15;
        size = Math.random() * 12 + 4;
        decay = 0.012;
        const angle = (Math.PI * 2 / 8) * Math.floor(Math.random() * 8);
        vx = Math.cos(angle) * speed;
        vy = Math.sin(angle) * speed;
        break;
        
      case 2: // Spiral explosion
        colors = ['#00FFFF', '#0080FF', '#8000FF'];
        speed = 18;
        size = Math.random() * 6 + 2;
        decay = 0.015;
        const spiralAngle = Math.random() * Math.PI * 4;
        const radius = Math.random() * speed;
        vx = Math.cos(spiralAngle) * radius;
        vy = Math.sin(spiralAngle) * radius;
        break;
        
      case 3: // Heart explosion
        colors = ['#FF1493', '#FF69B4', '#FF91A4'];
        speed = 12;
        size = Math.random() * 10 + 6;
        decay = 0.01;
        vx = (Math.random() - 0.5) * speed;
        vy = (Math.random() - 0.5) * speed - 5;
        break;
        
      case 4: // Lightning
        colors = ['#FFFF00', '#FFFFFF', '#FFFF80'];
        speed = 30;
        size = Math.random() * 15 + 2;
        decay = 0.025;
        vx = (Math.random() - 0.5) * speed;
        vy = (Math.random() - 0.5) * speed;
        break;
        
      case 5: // Cosmic explosion
        colors = ['#4B0082', '#8A2BE2', '#9370DB', '#BA55D3'];
        speed = 18;
        size = Math.random() * 10 + 4;
        decay = 0.012;
        vx = (Math.random() - 0.5) * speed;
        vy = (Math.random() - 0.5) * speed;
        break;
        
      case 6: // Shockwave (исправлено)
        colors = ['#FFFFFF', '#C0C0C0', '#808080'];
        speed = 22;
        size = Math.random() * 12 + 3; // Уменьшил размер частиц
        decay = 0.02;
        const shockAngle = Math.random() * Math.PI * 2;
        vx = Math.cos(shockAngle) * speed;
        vy = Math.sin(shockAngle) * speed;
        break;
        
      case 7: // Flower petals
        colors = ['#FFB6C1', '#FFC0CB', '#FF69B4', '#DA70D6'];
        speed = 10;
        size = Math.random() * 12 + 8;
        decay = 0.006;
        vx = (Math.random() - 0.5) * speed;
        vy = (Math.random() - 0.5) * speed - 3;
        break;
        
      case 8: // Ice crystals
        colors = ['#87CEEB', '#ADD8E6', '#B0E0E6', '#FFFFFF'];
        speed = 14;
        size = Math.random() * 9 + 3;
        decay = 0.01;
        vx = (Math.random() - 0.5) * speed;
        vy = (Math.random() - 0.5) * speed;
        break;
        
      case 9: // Fire explosion
        colors = ['#FF4500', '#FF6347', '#FF8C00', '#FFD700'];
        speed = 20;
        size = Math.random() * 14 + 6;
        decay = 0.018;
        vx = (Math.random() - 0.5) * speed;
        vy = (Math.random() - 0.5) * speed - 8;
        break;
        
      default:
        colors = ['#FF0080'];
        speed = 15;
        size = 5;
        decay = 0.01;
        vx = 0;
        vy = 0;
    }
    
    return {
      id: Math.random().toString(),
      x,
      y,
      vx,
      vy,
      life: 1,
      decay,
      color: colors[Math.floor(Math.random() * colors.length)],
      size,
    };
  }, []);

  // Draw particle (same logic as main canvas)
  const drawParticle = useCallback((ctx: CanvasRenderingContext2D, particle: Particle) => {
    ctx.save();
    ctx.globalAlpha = particle.life;
    
    ctx.fillStyle = particle.color;
    ctx.shadowColor = particle.color;
    ctx.shadowBlur = 8;
    
    // Different shapes for different effects (simplified)
    if (particle.color.includes('FF1493') || particle.color.includes('FF69B4')) {
      // Heart shape
      const size = particle.size;
      ctx.beginPath();
      ctx.moveTo(particle.x, particle.y + size/4);
      ctx.bezierCurveTo(particle.x, particle.y, particle.x - size/2, particle.y, particle.x - size/2, particle.y + size/4);
      ctx.bezierCurveTo(particle.x - size/2, particle.y + size/2, particle.x, particle.y + size/2, particle.x, particle.y + size);
      ctx.bezierCurveTo(particle.x, particle.y + size/2, particle.x + size/2, particle.y + size/2, particle.x + size/2, particle.y + size/4);
      ctx.bezierCurveTo(particle.x + size/2, particle.y, particle.x, particle.y, particle.x, particle.y + size/4);
      ctx.fill();
    } else if (particle.color.includes('FFD700') || particle.color.includes('FFA500')) {
      // Star shape
      const size = particle.size;
      const spikes = 5;
      const outerRadius = size;
      const innerRadius = size * 0.5;
      let rot = Math.PI / 2 * 3;
      const step = Math.PI / spikes;
      
      ctx.beginPath();
      ctx.moveTo(particle.x, particle.y - outerRadius);
      for (let i = 0; i < spikes; i++) {
        const x = particle.x + Math.cos(rot) * outerRadius;
        const y = particle.y + Math.sin(rot) * outerRadius;
        ctx.lineTo(x, y);
        rot += step;
        
        const x2 = particle.x + Math.cos(rot) * innerRadius;
        const y2 = particle.y + Math.sin(rot) * innerRadius;
        ctx.lineTo(x2, y2);
        rot += step;
      }
      ctx.lineTo(particle.x, particle.y - outerRadius);
      ctx.fill();
    } else if (particle.color.includes('FFFFFF') || particle.color.includes('C0C0C0')) {
      // Ring shape for shockwave
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.lineWidth = Math.max(1, particle.size / 4);
      ctx.strokeStyle = particle.color;
      ctx.stroke();
    } else if (particle.color.includes('87CEEB') || particle.color.includes('ADD8E6')) {
      // Diamond shape
      const size = particle.size;
      ctx.beginPath();
      ctx.moveTo(particle.x, particle.y - size);
      ctx.lineTo(particle.x + size, particle.y);
      ctx.lineTo(particle.x, particle.y + size);
      ctx.lineTo(particle.x - size, particle.y);
      ctx.closePath();
      ctx.fill();
    } else {
      // Default circle
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fill();
    }
    
    ctx.restore();
  }, []);

  // Animation loop
  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#0A0A1A';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Update and draw particles
    const particles = particlesRef.current;
    for (let i = particles.length - 1; i >= 0; i--) {
      const particle = particles[i];
      
      // Update particle
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.life -= particle.decay;
      particle.vy += 0.1; // Gravity
      
      // Draw particle
      if (particle.life > 0) {
        drawParticle(ctx, particle);
      } else {
        particles.splice(i, 1);
      }
    }

    animationRef.current = requestAnimationFrame(animate);
  }, [drawParticle]);

  // Start explosion
  const triggerExplosion = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    // Clear existing particles
    particlesRef.current = [];

    // Create particles for current animation type
    const particleCount = 50;
    for (let i = 0; i < particleCount; i++) {
      particlesRef.current.push(createParticle(centerX, centerY, currentAnimation));
    }
  }, [currentAnimation, createParticle]);

  // Setup canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = 800;
    canvas.height = 600;

    animate();
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [animate]);

  // Auto trigger explosion when animation changes
  useEffect(() => {
    triggerExplosion();
  }, [currentAnimation, triggerExplosion]);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Тест анимаций взрыва</h1>
        
        <div className="mb-6">
          <h2 className="text-xl mb-4">Текущая анимация: {animationNames[currentAnimation]}</h2>
          <div className="flex flex-wrap gap-2 mb-4">
            {animationNames.map((name, index) => (
              <button
                key={index}
                onClick={() => setCurrentAnimation(index)}
                className={`px-4 py-2 rounded text-sm ${
                  currentAnimation === index 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-700 hover:bg-gray-600'
                }`}
              >
                {index}: {name.split(' - ')[1]}
              </button>
            ))}
          </div>
          
          <button
            onClick={triggerExplosion}
            className="px-6 py-3 bg-green-600 hover:bg-green-700 rounded font-bold"
          >
            Запустить взрыв снова
          </button>
        </div>

        <div className="border border-gray-600 rounded">
          <canvas
            ref={canvasRef}
            className="w-full h-auto bg-gray-800"
            style={{ maxHeight: '600px' }}
          />
        </div>
        
        <div className="mt-4 text-gray-400">
          <p>Щелкните на кнопки выше, чтобы переключаться между разными анимациями взрыва.</p>
          <p>Если какая-то анимация работает неправильно, сообщите номер анимации.</p>
        </div>
      </div>
    </div>
  );
};

export default AnimationTest;