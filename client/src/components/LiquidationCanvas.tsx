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

    // Calculate size based on liquidation value (logarithmic scale for better visual balance)
    const logValue = Math.log10(Math.max(liquidation.value, 1000));
    const minSize = 40;
    const maxSize = 120;
    const size = Math.min(maxSize, minSize + (logValue - 3) * 20); // Scale from $1K to larger amounts

    // Speed inversely proportional to size (bigger bags fall slower)
    const baseVelocity = Math.max(0.5, 3 - (size - minSize) / 20);

    return {
      id: liquidation.id,
      x: Math.random() * (canvas.width - size),
      y: -size,
      width: size,
      height: size * 0.8, // Money bag proportions
      velocity: baseVelocity,
      rotation: 0,
      rotationSpeed: 0, // No rotation for money bags
      coin: liquidation.symbol.replace('USDT', '').replace('USD', ''),
      isLong: liquidation.side === 'long',
      amount: liquidation.value,
      price: liquidation.price,
      opacity: 1,
      isExploding: false,
      explosionTime: 0,
    };
  }, []);

  // Create coin particle for explosion
  const createParticle = useCallback((x: number, y: number, isLong: boolean): Particle => {
    return {
      id: Math.random().toString(),
      x,
      y,
      vx: (Math.random() - 0.5) * 12, // Faster spread for coin explosion
      vy: (Math.random() - 0.5) * 10 - 4, // More upward velocity
      life: 1,
      decay: Math.random() * 0.015 + 0.008, // Longer lasting coins
      color: '#ffd700', // Gold color for coins
      size: Math.random() * 6 + 4, // Slightly bigger coins
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

      // Create coin particles (more particles for bigger bags)
      const state = animationStateRef.current;
      const particleCount = Math.min(30, Math.floor(block.width / 3)); // More coins for bigger bags
      for (let i = 0; i < particleCount; i++) {
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

  // Draw money bag
  const drawLiquidationBlock = useCallback((ctx: CanvasRenderingContext2D, block: LiquidationBlock) => {
    ctx.save();
    ctx.globalAlpha = block.opacity;
    ctx.translate(block.x + block.width / 2, block.y + block.height / 2);

    // Money bag shape
    const bagWidth = block.width;
    const bagHeight = block.height;
    const neckHeight = bagHeight * 0.15;
    
    // Main bag body (rounded rectangle)
    ctx.beginPath();
    ctx.roundRect(-bagWidth/2, -bagHeight/2 + neckHeight, bagWidth, bagHeight - neckHeight, bagWidth * 0.1);
    
    // Gradient fill
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, bagWidth/2);
    if (block.isLong) {
      gradient.addColorStop(0, '#8B4513'); // Brown for long liquidations
      gradient.addColorStop(0.7, '#654321');
      gradient.addColorStop(1, '#3C2415');
      ctx.shadowColor = '#ef4444';
    } else {
      gradient.addColorStop(0, '#228B22'); // Green for short liquidations
      gradient.addColorStop(0.7, '#1F5F1F');
      gradient.addColorStop(1, '#0D2B0D');
      ctx.shadowColor = '#10b981';
    }
    
    ctx.shadowBlur = 8;
    ctx.fillStyle = gradient;
    ctx.fill();
    
    // Bag neck/tie
    ctx.beginPath();
    ctx.ellipse(0, -bagHeight/2 + neckHeight/2, bagWidth * 0.3, neckHeight, 0, 0, Math.PI * 2);
    ctx.fillStyle = block.isLong ? '#654321' : '#1F5F1F';
    ctx.fill();
    
    // Rope/string on neck
    ctx.strokeStyle = '#8B4513';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, -bagHeight/2 + neckHeight/2, bagWidth * 0.32, neckHeight * 1.1, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Dollar sign on bag
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#FFD700'; // Gold color
    ctx.font = `bold ${Math.max(12, bagWidth * 0.2)}px JetBrains Mono, monospace`;
    ctx.textAlign = 'center';
    ctx.fillText('$', 0, bagHeight * 0.1);

    // Amount text below dollar sign
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `${Math.max(8, bagWidth * 0.12)}px JetBrains Mono, monospace`;
    let formattedAmount;
    if (block.amount >= 1000000) {
      formattedAmount = (block.amount / 1000000).toFixed(1) + 'M';
    } else if (block.amount >= 1000) {
      formattedAmount = (block.amount / 1000).toFixed(0) + 'K';
    } else {
      formattedAmount = block.amount.toFixed(0);
    }
    ctx.fillText(formattedAmount, 0, bagHeight * 0.25);

    // Coin symbol
    ctx.fillStyle = '#FFD700';
    ctx.font = `${Math.max(6, bagWidth * 0.08)}px JetBrains Mono, monospace`;
    ctx.fillText(block.coin, 0, -bagHeight * 0.15);

    ctx.restore();
  }, []);

  // Draw coin particle
  const drawParticle = useCallback((ctx: CanvasRenderingContext2D, particle: Particle) => {
    ctx.save();
    ctx.globalAlpha = particle.life;
    
    // Draw coin shape
    ctx.fillStyle = '#FFD700'; // Gold color
    ctx.shadowColor = '#FFD700';
    ctx.shadowBlur = 5;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    ctx.fill();
    
    // Coin border
    ctx.strokeStyle = '#FFA500';
    ctx.lineWidth = 1;
    ctx.stroke();
    
    // Dollar sign on coin (for larger coins)
    if (particle.size > 3) {
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#B8860B'; // Darker gold
      ctx.font = `bold ${particle.size}px JetBrains Mono, monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('$', particle.x, particle.y);
    }
    
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
