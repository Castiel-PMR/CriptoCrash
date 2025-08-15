import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Liquidation, Platform } from '@shared/schema';
import { LiquidationBlock, Particle, AnimationState } from '../types/liquidation';

interface LiquidationCanvasProps {
  liquidations: Liquidation[];
  animationSpeed: number;
  isPaused: boolean;
}

interface ExtendedAnimationState extends AnimationState {
  platform: Platform;
}

export function LiquidationCanvas({ liquidations, animationSpeed, isPaused }: LiquidationCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationStateRef = useRef<ExtendedAnimationState>({
    liquidations: [],
    particles: [],
    animationSpeed: 1,
    isPaused: false,
    lastTime: 0,
    platform: {
      x: 0,
      y: 0,
      width: 150,
      height: 20,
      score: 0,
      totalCaught: 0,
    },
  });

  const [keys, setKeys] = useState({ left: false, right: false });
  const [clickScore, setClickScore] = useState({ score: 0, count: 0 });

  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  // Update canvas size
  const updateCanvasSize = useCallback(() => {
    const width = window.innerWidth;
    const height = window.innerHeight - 80; // Account for header
    setCanvasSize({ width, height });
    
    if (canvasRef.current) {
      canvasRef.current.width = width;
      canvasRef.current.height = height;
      
      // Initialize platform position
      const state = animationStateRef.current;
      state.platform.x = width / 2 - state.platform.width / 2;
      state.platform.y = height - 40;
    }
  }, []);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        console.log('Left arrow pressed');
        setKeys(prev => ({ ...prev, left: true }));
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        console.log('Right arrow pressed');
        setKeys(prev => ({ ...prev, right: true }));
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        console.log('Left arrow released');
        setKeys(prev => ({ ...prev, left: false }));
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        console.log('Right arrow released');
        setKeys(prev => ({ ...prev, right: false }));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Mouse click handling
  useEffect(() => {
    const handleCanvasClick = (e: MouseEvent) => {
      if (!canvasRef.current) return;
      
      const rect = canvasRef.current.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;
      
      const state = animationStateRef.current;
      
      // Check if click hit any money bag
      for (let i = 0; i < state.liquidations.length; i++) {
        const bag = state.liquidations[i];
        
        if (!bag.isExploding && 
            clickX >= bag.x && clickX <= bag.x + bag.width &&
            clickY >= bag.y && clickY <= bag.y + bag.height) {
          
          // Create click explosion (different from platform catch or ground hit)
          bag.isExploding = true;
          bag.explosionTime = 0;
          
          // Update click score
          setClickScore(prev => ({
            score: prev.score + bag.amount,
            count: prev.count + 1
          }));
          
          // Create special click explosion particles
          const particleCount = Math.min(40, Math.floor(bag.width / 2.5));
          for (let j = 0; j < particleCount; j++) {
            state.particles.push(createClickParticle(
              bag.x + bag.width / 2,
              bag.y + bag.height / 2,
              bag.isLong
            ));
          }
          
          // Remove the bag from array since it's clicked
          state.liquidations.splice(i, 1);
          break; // Only explode one bag per click
        }
      }
    };

    const canvas = canvasRef.current;
    if (canvas) {
      canvas.addEventListener('click', handleCanvasClick);
      return () => canvas.removeEventListener('click', handleCanvasClick);
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

    // Calculate size based on liquidation value (more dramatic scaling)
    const value = liquidation.value;
    let size;
    
    // More dramatic size scaling based on ranges
    if (value < 10000) {
      size = 80; // $1K-10K = small bags
    } else if (value < 50000) {
      size = 100; // $10K-50K = medium-small bags
    } else if (value < 100000) {
      size = 120; // $50K-100K = medium bags  
    } else if (value < 500000) {
      size = 150; // $100K-500K = large bags
    } else if (value < 1000000) {
      size = 180; // $500K-1M = very large bags
    } else {
      size = 220; // $1M+ = massive bags
    }

    // Speed inversely proportional to size (bigger bags fall much slower)
    const baseVelocity = Math.max(0.2, 2.0 - (size - 80) / 80); // Slower speed for bigger bags

    console.log(`Liquidation: $${value.toFixed(0)} -> Size: ${size}px, Speed: ${baseVelocity.toFixed(2)}`);;

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
      isCaught: false,
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

  // Create special particle for caught bags (more spectacular)
  const createCaughtParticle = useCallback((x: number, y: number, isLong: boolean): Particle => {
    const colors = ['#FFD700', '#FFA500', '#FFFF00', '#FF6347', '#00FF00']; // Multiple colors for celebration
    return {
      id: Math.random().toString(),
      x,
      y,
      vx: (Math.random() - 0.5) * 16, // Even faster spread
      vy: (Math.random() - 0.5) * 14 - 6, // Much more upward velocity
      life: 1,
      decay: Math.random() * 0.01 + 0.005, // Longer lasting celebration
      color: colors[Math.floor(Math.random() * colors.length)],
      size: Math.random() * 8 + 6, // Bigger celebration particles
    };
  }, []);

  // Create special particle for clicked bags (different animation)
  const createClickParticle = useCallback((x: number, y: number, isLong: boolean): Particle => {
    const colors = ['#FF0080', '#8000FF', '#0080FF', '#FF8000', '#80FF00']; // Bright neon colors for clicks
    return {
      id: Math.random().toString(),
      x,
      y,
      vx: (Math.random() - 0.5) * 20, // Very fast radial spread
      vy: (Math.random() - 0.5) * 20, // Equal up/down spread for click effect
      life: 1,
      decay: Math.random() * 0.02 + 0.01, // Medium lasting
      color: colors[Math.floor(Math.random() * colors.length)],
      size: Math.random() * 10 + 5, // Variable sizes for dynamic effect
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

    // Physics with proper speed control
    block.velocity += 0.02 * animationSpeed; // Reduced gravity
    block.y += block.velocity * animationSpeed;
    block.rotation += block.rotationSpeed * animationSpeed;

    // Check collision with platform
    const state = animationStateRef.current;
    const platform = state.platform;
    
    if (!block.isCaught && 
        block.x + block.width > platform.x && 
        block.x < platform.x + platform.width &&
        block.y + block.height > platform.y && 
        block.y < platform.y + platform.height) {
      // Caught by platform!
      block.isCaught = true;
      block.isExploding = true;
      block.explosionTime = 0;
      
      // Update platform score
      platform.score += block.amount;
      platform.totalCaught++;

      // Create special caught explosion (more particles, different colors)
      const particleCount = Math.min(50, Math.floor(block.width / 2)); // Even more particles for caught bags
      for (let i = 0; i < particleCount; i++) {
        state.particles.push(createCaughtParticle(
          block.x + block.width / 2,
          block.y + block.height / 2,
          block.isLong
        ));
      }
      return true;
    }

    // Check if hit bottom (missed by platform)
    if (block.y + block.height >= canvas.height - 60) {
      block.isExploding = true;
      block.explosionTime = 0;

      // Create normal coin particles (fewer particles for missed bags)
      const particleCount = Math.min(20, Math.floor(block.width / 4));
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

    // Text with better readability - add background/outline
    ctx.shadowBlur = 0;
    
    // Dollar sign on bag with outline for better visibility
    const dollarFontSize = Math.max(16, bagWidth * 0.25);
    ctx.font = `bold ${dollarFontSize}px JetBrains Mono, monospace`;
    ctx.textAlign = 'center';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.strokeText('$', 0, bagHeight * 0.1);
    ctx.fillStyle = '#FFD700';
    ctx.fillText('$', 0, bagHeight * 0.1);

    // Amount text with outline for better readability
    const amountFontSize = Math.max(12, bagWidth * 0.15);
    ctx.font = `bold ${amountFontSize}px JetBrains Mono, monospace`;
    let formattedAmount;
    if (block.amount >= 1000000) {
      formattedAmount = (block.amount / 1000000).toFixed(1) + 'M';
    } else if (block.amount >= 1000) {
      formattedAmount = (block.amount / 1000).toFixed(0) + 'K';
    } else {
      formattedAmount = block.amount.toFixed(0);
    }
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.strokeText(formattedAmount, 0, bagHeight * 0.3);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(formattedAmount, 0, bagHeight * 0.3);

    // Coin symbol with outline
    const coinFontSize = Math.max(10, bagWidth * 0.12);
    ctx.font = `bold ${coinFontSize}px JetBrains Mono, monospace`;
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.strokeText(block.coin, 0, -bagHeight * 0.1);
    ctx.fillStyle = '#FFD700';
    ctx.fillText(block.coin, 0, -bagHeight * 0.1);

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

  // Draw platform
  const drawPlatform = useCallback((ctx: CanvasRenderingContext2D, platform: Platform) => {
    ctx.save();
    
    // Platform body with gradient
    const gradient = ctx.createLinearGradient(platform.x, platform.y, platform.x + platform.width, platform.y + platform.height);
    gradient.addColorStop(0, '#4A90E2');
    gradient.addColorStop(0.5, '#357ABD');
    gradient.addColorStop(1, '#1E4A78');
    
    ctx.fillStyle = gradient;
    ctx.shadowColor = '#4A90E2';
    ctx.shadowBlur = 10;
    ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
    
    // Platform border
    ctx.strokeStyle = '#87CEEB';
    ctx.lineWidth = 2;
    ctx.strokeRect(platform.x, platform.y, platform.width, platform.height);
    
    // Platform decorative elements
    ctx.fillStyle = '#87CEEB';
    for (let i = 0; i < 3; i++) {
      const dotX = platform.x + (platform.width / 4) * (i + 1);
      ctx.beginPath();
      ctx.arc(dotX, platform.y + platform.height / 2, 3, 0, Math.PI * 2);
      ctx.fill();
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

      // Update platform position based on keys
      const platformSpeed = 8 * animationSpeed;
      if (keys.left && state.platform.x > 0) {
        state.platform.x -= platformSpeed;
        console.log('Platform moving left:', state.platform.x);
      }
      if (keys.right && state.platform.x < canvas.width - state.platform.width) {
        state.platform.x += platformSpeed;
        console.log('Platform moving right:', state.platform.x);
      }

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

      // Draw platform
      drawPlatform(ctx, state.platform);
      
      // Draw score and controls
      ctx.save();
      ctx.fillStyle = '#FFD700';
      ctx.font = 'bold 16px JetBrains Mono, monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`Platform Score: $${(state.platform.score / 1000000).toFixed(1)}M`, 20, canvas.height - 100);
      ctx.fillText(`Platform Caught: ${state.platform.totalCaught}`, 20, canvas.height - 80);
      
      // Draw click score
      ctx.fillStyle = '#FF0080';
      ctx.fillText(`Click Score: $${(clickScore.score / 1000000).toFixed(1)}M`, 20, canvas.height - 60);
      ctx.fillText(`Clicked: ${clickScore.count}`, 20, canvas.height - 40);
      
      // Draw controls instructions
      ctx.fillStyle = '#87CEEB';
      ctx.font = '14px JetBrains Mono, monospace';
      ctx.textAlign = 'right';
      ctx.fillText('Use ← → keys to move platform', canvas.width - 20, canvas.height - 60);
      ctx.fillText('Click on money bags to explode them', canvas.width - 20, canvas.height - 40);
      ctx.restore();
    }

    requestAnimationFrame(animate);
  }, [animationSpeed, isPaused, keys, updateLiquidationBlock, updateParticle, drawLiquidationBlock, drawParticle, drawPlatform, clickScore]);

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
        tabIndex={0}
        style={{ outline: 'none' }}
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
