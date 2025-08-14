import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Liquidation } from '@shared/schema';
import { LiquidationBlock, Particle, AnimationState } from '../types/liquidation';

interface LiquidationCanvasProps {
  liquidations: Liquidation[];
  animationSpeed: number;
  isPaused: boolean;
}

export function LiquidationCanvas({ liquidations, animationSpeed, isPaused }: LiquidationCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationStateRef = useRef<AnimationState>({
    liquidations: [],
    particles: [],
    animationSpeed: 1,
    isPaused: false,
    lastTime: 0,
  });

  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  // Update canvas size
  const updateCanvasSize = useCallback(() => {
    const width = window.innerWidth;
    const height = window.innerHeight - 80; // Account for header
    setCanvasSize({ width, height });
    
    if (canvasRef.current) {
      canvasRef.current.width = width;
      canvasRef.current.height = height;
    }
  }, []);

  useEffect(() => {
    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, [updateCanvasSize]);

  // Create liquidation block from data
  const createLiquidationBlock = useCallback((liquidation: Liquidation): LiquidationBlock => {
    const canvas = canvasRef.current;
    if (!canvas) throw new Error('Canvas not available');

    return {
      id: liquidation.id,
      x: Math.random() * (canvas.width - 100),
      y: -50,
      width: Math.random() * 40 + 60,
      height: Math.random() * 20 + 30,
      velocity: Math.random() * 2 + 1,
      rotation: 0,
      rotationSpeed: (Math.random() - 0.5) * 0.05,
      coin: liquidation.symbol.replace('USDT', '').replace('USD', ''),
      isLong: liquidation.side === 'long',
      amount: liquidation.value,
      price: liquidation.price,
      opacity: 1,
      isExploding: false,
      explosionTime: 0,
    };
  }, []);

  // Create particle for explosion
  const createParticle = useCallback((x: number, y: number, isLong: boolean): Particle => {
    return {
      id: Math.random().toString(),
      x,
      y,
      vx: (Math.random() - 0.5) * 8,
      vy: (Math.random() - 0.5) * 8 - 2,
      life: 1,
      decay: Math.random() * 0.02 + 0.01,
      color: isLong ? '#ef4444' : '#10b981',
      size: Math.random() * 4 + 2,
    };
  }, []);

  // Update liquidation block
  const updateLiquidationBlock = useCallback((block: LiquidationBlock, deltaTime: number): boolean => {
    const canvas = canvasRef.current;
    if (!canvas) return false;

    if (block.isExploding) {
      block.explosionTime += deltaTime;
      block.opacity = Math.max(0, 1 - block.explosionTime / 500);
      return block.explosionTime < 500;
    }

    // Physics
    block.velocity += 0.05 * animationSpeed;
    block.y += block.velocity * animationSpeed;
    block.rotation += block.rotationSpeed * animationSpeed;

    // Check if hit bottom
    if (block.y + block.height >= canvas.height - 60) {
      block.isExploding = true;
      block.explosionTime = 0;

      // Create particles
      const state = animationStateRef.current;
      for (let i = 0; i < 15; i++) {
        state.particles.push(createParticle(
          block.x + block.width / 2,
          block.y + block.height / 2,
          block.isLong
        ));
      }
      return true;
    }

    return block.y < canvas.height + block.height;
  }, [animationSpeed, createParticle]);

  // Update particle
  const updateParticle = useCallback((particle: Particle): boolean => {
    particle.x += particle.vx;
    particle.y += particle.vy;
    particle.vy += 0.1; // Gravity
    particle.life -= particle.decay;
    particle.size *= 0.98;
    
    return particle.life > 0;
  }, []);

  // Draw liquidation block
  const drawLiquidationBlock = useCallback((ctx: CanvasRenderingContext2D, block: LiquidationBlock) => {
    ctx.save();
    ctx.globalAlpha = block.opacity;
    ctx.translate(block.x + block.width / 2, block.y + block.height / 2);
    ctx.rotate(block.rotation);

    // Block background
    const gradient = ctx.createLinearGradient(-block.width/2, -block.height/2, block.width/2, block.height/2);
    if (block.isLong) {
      gradient.addColorStop(0, '#ef4444');
      gradient.addColorStop(1, '#dc2626');
      ctx.shadowColor = '#ef4444';
    } else {
      gradient.addColorStop(0, '#10b981');
      gradient.addColorStop(1, '#059669');
      ctx.shadowColor = '#10b981';
    }

    ctx.shadowBlur = 15;
    ctx.fillStyle = gradient;
    ctx.fillRect(-block.width/2, -block.height/2, block.width, block.height);

    // Border
    ctx.strokeStyle = block.isLong ? '#fee2e2' : '#d1fae5';
    ctx.lineWidth = 2;
    ctx.strokeRect(-block.width/2, -block.height/2, block.width, block.height);

    // Text
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px JetBrains Mono, monospace';
    ctx.textAlign = 'center';

    // Coin symbol
    ctx.fillText(block.coin, 0, -8);

    // Amount
    ctx.font = '10px JetBrains Mono, monospace';
    const formattedAmount = '$' + (block.amount / 1000000).toFixed(1) + 'M';
    ctx.fillText(formattedAmount, 0, 6);

    ctx.restore();
  }, []);

  // Draw particle
  const drawParticle = useCallback((ctx: CanvasRenderingContext2D, particle: Particle) => {
    ctx.save();
    ctx.globalAlpha = particle.life;
    ctx.fillStyle = particle.color;
    ctx.shadowColor = particle.color;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }, []);

  // Animation loop
  const animate = useCallback((currentTime: number) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const state = animationStateRef.current;
    const deltaTime = currentTime - state.lastTime;
    state.lastTime = currentTime;
    state.animationSpeed = animationSpeed;
    state.isPaused = isPaused;

    if (!isPaused) {
      // Clear canvas with fade effect
      ctx.fillStyle = 'rgba(10, 10, 10, 0.1)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Update and draw liquidations
      state.liquidations = state.liquidations.filter(block => {
        const alive = updateLiquidationBlock(block, deltaTime);
        if (alive) {
          drawLiquidationBlock(ctx, block);
        }
        return alive;
      });

      // Update and draw particles
      state.particles = state.particles.filter(particle => {
        const alive = updateParticle(particle);
        if (alive) {
          drawParticle(ctx, particle);
        }
        return alive;
      });
    }

    requestAnimationFrame(animate);
  }, [animationSpeed, isPaused, updateLiquidationBlock, updateParticle, drawLiquidationBlock, drawParticle]);

  // Add new liquidations to animation
  useEffect(() => {
    const state = animationStateRef.current;
    const newLiquidations = liquidations.slice(-5); // Take last 5 new liquidations
    
    newLiquidations.forEach(liquidation => {
      // Check if already exists
      const exists = state.liquidations.some(block => block.id === liquidation.id);
      if (!exists) {
        try {
          const block = createLiquidationBlock(liquidation);
          state.liquidations.push(block);
        } catch (error) {
          console.warn('Could not create liquidation block:', error);
        }
      }
    });
  }, [liquidations, createLiquidationBlock]);

  // Start animation
  useEffect(() => {
    const animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, [animate]);

  return (
    <div className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        width={canvasSize.width}
        height={canvasSize.height}
      />
      
      {/* Impact Zone Indicator */}
      <div className="absolute bottom-0 left-0 right-0 h-16 impact-zone pointer-events-none">
        <div className="h-full flex items-center justify-center">
          <span className="text-accent-blue text-sm font-mono opacity-60">IMPACT ZONE</span>
        </div>
      </div>
    </div>
  );
}
