import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { Liquidation, Platform } from '@shared/schema';
import { LiquidationBlock, Particle, AnimationState, Cannon, Cannonball } from '../types/liquidation';

interface LiquidationCanvasProps {
  liquidations: Liquidation[];
  isPaused: boolean;
  chartOpacity?: number;
}

interface ExtendedAnimationState extends AnimationState {
  platform: Platform;
  leftCannon: Cannon;
  rightCannon: Cannon;
  cannonballs: Cannonball[];
}

export function LiquidationCanvas({ 
  liquidations, 
  isPaused, 
  chartOpacity = 100 
}: LiquidationCanvasProps) {
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
    leftCannon: {
      x: 50,
      y: 0,
      angle: 0,
      isFiring: false,
      fireProgress: 0,
      targetBag: null,
      side: 'left',
    },
    rightCannon: {
      x: 0, // Will be set when canvas is available
      y: 0,
      angle: 0,
      isFiring: false,
      fireProgress: 0,
      targetBag: null,
      side: 'right',
    },
    cannonballs: [],
  });

  const processedLiquidations = useRef(new Set<string>());
  const lastVisibleTime = useRef<number>(Date.now());
  const chartOpacityRef = useRef<number>(chartOpacity);
  const componentStartTime = useRef<number>(Date.now()); // Track when component started


  // Update refs when props change
  useEffect(() => {
    chartOpacityRef.current = chartOpacity;
  }, [chartOpacity]);

  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [showFlashText, setShowFlashText] = useState(false);
  const [isFlashing, setIsFlashing] = useState(false);

  // Laser sound effect
  const playLaserSound = useCallback((isLeftCannon: boolean) => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Different frequencies for different cannons
      const frequency = isLeftCannon ? 800 : 600; // Higher pitch for left (blue), lower for right (red)
      oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(frequency * 0.3, audioContext.currentTime + 0.15);
      
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
      
      oscillator.type = 'sawtooth';
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.15);
    } catch (error) {
      // Silent fail if audio context not supported
    }
  }, []);

  // Effect for text flashing animation
  useEffect(() => {
    if (showFlashText) {
      setIsFlashing(true);
      const flashInterval = setInterval(() => {
        setIsFlashing(prev => !prev);
      }, 300); // Flashing every 300ms

      return () => clearInterval(flashInterval);
    } else {
      setIsFlashing(false);
    }
  }, [showFlashText]);

  // Update canvas size
  const updateCanvasSize = useCallback(() => {
    if (!canvasRef.current) return;
    
    // Получаем размер родительского контейнера, а не всего окна
    const parent = canvasRef.current.parentElement;
    if (!parent) return;
    
    const rect = parent.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    
    setCanvasSize({ width, height });
    
    canvasRef.current.width = width;
    canvasRef.current.height = height;
    
    // Initialize platform position
    const state = animationStateRef.current;
    state.platform.x = width / 2 - state.platform.width / 2;
    state.platform.y = height - 40;
  }, []);





  useEffect(() => {
    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, [updateCanvasSize]);

  // Handle page visibility to prevent accumulated liquidations
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // When page becomes visible, update the last visible time
        lastVisibleTime.current = Date.now();
        
        // Don't clear processed liquidations to prevent duplicates
        // Just clear existing animations that might have accumulated
        const state = animationStateRef.current;
        state.liquidations = [];
        state.particles = [];
        
        console.log('Page visible - cleared accumulated liquidations');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Create liquidation block from data
  const createLiquidationBlock = useCallback((liquidation: Liquidation): LiquidationBlock => {
    const canvas = canvasRef.current;
    if (!canvas) throw new Error('Canvas not available');

    // Calculate size based on liquidation value (more dramatic scaling)
    const value = liquidation.value;
    let size;
    
    // Ещё более медленная система скоростей для спокойного просмотра
    let baseVelocity;
    if (value < 5000) {
      size = 60; // Очень маленькие
      baseVelocity = 1.2; // Замедлил ещё больше до 1.2
    } else if (value < 15000) {
      size = 80; // Маленькие  
      baseVelocity = 1.0; // Замедлил ещё больше до 1.0
    } else if (value < 50000) {
      size = 100; // Средние
      baseVelocity = 0.9; // Замедлил ещё больше до 0.9
    } else if (value < 100000) {
      size = 130; // Средне-большие
      baseVelocity = 0.8; // Замедлил ещё больше до 0.8
    } else if (value < 500000) {
      size = 160; // Большие
      baseVelocity = 0.6; // Замедлил ещё больше до 0.6
    } else if (value < 1000000) {
      size = 200; // Очень большие
      baseVelocity = 0.5; // Замедлил ещё больше до 0.5
    } else {
      size = 250; // Огромные
      baseVelocity = 0.4; // Замедлил ещё больше до 0.4
    }

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

  // Create special particle for clicked bags with 10 different explosion types
  const createClickParticle = useCallback((x: number, y: number, isLong: boolean, explosionType: number): Particle => {
    let colors, speed, size, decay, vx, vy;
    
    switch (explosionType) {
      case 0: // Fireworks - яркие разноцветные искры
        colors = ['#FF0040', '#FF4000', '#FFFF00', '#40FF00', '#0040FF', '#8000FF'];
        speed = 25;
        size = Math.random() * 8 + 3;
        decay = 0.008;
        vx = (Math.random() - 0.5) * speed;
        vy = (Math.random() - 0.5) * speed;
        break;
        
      case 1: // Star burst - звездообразный взрыв
        colors = ['#FFD700', '#FFA500', '#FF6347'];
        speed = 15;
        size = Math.random() * 12 + 4;
        decay = 0.012;
        const angle = (Math.PI * 2 / 8) * Math.floor(Math.random() * 8);
        vx = Math.cos(angle) * speed;
        vy = Math.sin(angle) * speed;
        break;
        
      case 2: // Spiral explosion - спиральный взрыв
        colors = ['#00FFFF', '#0080FF', '#8000FF'];
        speed = 18;
        size = Math.random() * 6 + 2;
        decay = 0.015;
        const spiralAngle = Math.random() * Math.PI * 4;
        const radius = Math.random() * speed;
        vx = Math.cos(spiralAngle) * radius;
        vy = Math.sin(spiralAngle) * radius;
        break;
        
      case 3: // Heart explosion - сердечки
        colors = ['#FF1493', '#FF69B4', '#FF91A4'];
        speed = 12;
        size = Math.random() * 10 + 6;
        decay = 0.01;
        vx = (Math.random() - 0.5) * speed;
        vy = (Math.random() - 0.5) * speed - 5; // Немного вверх
        break;
        
      case 4: // Lightning - молнии
        colors = ['#FFFF00', '#FFFFFF', '#FFFF80'];
        speed = 30;
        size = Math.random() * 15 + 2;
        decay = 0.025;
        vx = (Math.random() - 0.5) * speed;
        vy = (Math.random() - 0.5) * speed;
        break;
        
      case 5: // Rainbow explosion - радуга
        colors = ['#FF0000', '#FF8000', '#FFFF00', '#00FF00', '#0000FF', '#8000FF'];
        speed = 16;
        size = Math.random() * 8 + 4;
        decay = 0.008;
        vx = (Math.random() - 0.5) * speed;
        vy = (Math.random() - 0.5) * speed;
        break;
        
      case 6: // Shockwave - ударная волна
        colors = ['#FFFFFF', '#C0C0C0', '#808080'];
        speed = 22;
        size = Math.random() * 20 + 5;
        decay = 0.02;
        const shockAngle = Math.random() * Math.PI * 2;
        vx = Math.cos(shockAngle) * speed;
        vy = Math.sin(shockAngle) * speed;
        break;
        
      case 7: // Flower petals - лепестки цветов
        colors = ['#FFB6C1', '#FFC0CB', '#FF69B4', '#DA70D6'];
        speed = 10;
        size = Math.random() * 12 + 8;
        decay = 0.006;
        vx = (Math.random() - 0.5) * speed;
        vy = (Math.random() - 0.5) * speed - 3;
        break;
        
      case 8: // Ice crystals - ледяные кристаллы
        colors = ['#87CEEB', '#ADD8E6', '#B0E0E6', '#FFFFFF'];
        speed = 14;
        size = Math.random() * 9 + 3;
        decay = 0.01;
        vx = (Math.random() - 0.5) * speed;
        vy = (Math.random() - 0.5) * speed;
        break;
        
      case 9: // Fire explosion - огненный взрыв
        colors = ['#FF4500', '#FF6347', '#FF8C00', '#FFD700'];
        speed = 20;
        size = Math.random() * 14 + 6;
        decay = 0.018;
        vx = (Math.random() - 0.5) * speed;
        vy = (Math.random() - 0.5) * speed - 8; // Огонь идет вверх
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

  // Mouse click handling
  const handleCanvasClick = useCallback((e: MouseEvent) => {
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
        
        // Create click explosion immediately
        bag.isExploding = true;
        bag.explosionTime = 0;
        
        // Choose random explosion type (0-9)
        const explosionType = Math.floor(Math.random() * 10);
        
        // Create special click explosion particles with random animation
        const particleCount = Math.min(50, Math.floor(bag.width / 2));
        for (let j = 0; j < particleCount; j++) {
          state.particles.push(createClickParticle(
            bag.x + bag.width / 2,
            bag.y + bag.height / 2,
            bag.isLong,
            explosionType
          ));
        }
        
        // Remove the bag from array since it's clicked
        state.liquidations.splice(i, 1);
        break; // Only explode one bag per click
      }
    }
  }, [createClickParticle]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.addEventListener('click', handleCanvasClick, { passive: false });
      return () => canvas.removeEventListener('click', handleCanvasClick);
    }
  }, [handleCanvasClick]);

  // Update liquidation block
  const updateLiquidationBlock = useCallback((block: LiquidationBlock, deltaTime: number): boolean => {
    const canvas = canvasRef.current;
    if (!canvas) return false;

    if (block.isExploding) {
      block.explosionTime += deltaTime;
      block.opacity = Math.max(0, 1 - block.explosionTime / 500);
      return block.explosionTime < 500;
    }

    // Постоянная физика с базовой скоростью мешочка (независимо от FPS)
    block.y += block.velocity * (deltaTime / 16.67); // Нормализуем к 60 FPS (16.67ms на кадр)
    block.rotation += block.rotationSpeed;

    // Check if bag is in cannon's destruction range (from bottom to middle-lower part)
    const cannonRange = canvas.height * 0.70; // Range from bottom to 70% of screen height (gives chance for manual destruction)
    const bottomLimit = canvas.height * 0.95; // Don't let bags reach the very bottom
    
    // Fire at random positions within the cannon range, not immediately at crossing
    if (block.y + block.height >= cannonRange && block.y + block.height <= bottomLimit) {
      const state = animationStateRef.current;
      const leftCannon = state.leftCannon;
      
      // Random chance to fire at any point within the range
      const shouldFire = Math.random() < 0.005; // 0.5% chance per frame to fire at bags in range (much more random timing)
      
      // Fire left cannon only if it's not currently firing and random chance succeeds
      if (!leftCannon.isFiring && shouldFire) {
        const bagCenterX = block.x + block.width / 2;
        const bagCenterY = block.y + block.height / 2;
        
        // Only use left cannon now
        const activeCannon = leftCannon;
        
        // Calculate angle and fire
        const dx = bagCenterX - activeCannon.x;
        const dy = bagCenterY - activeCannon.y;
        activeCannon.angle = Math.atan2(dy, dx);
        activeCannon.isFiring = true;
        activeCannon.fireProgress = 0;
        activeCannon.targetBag = block.id;
        
        // Create laser beam
        const distance = Math.sqrt(dx * dx + dy * dy);
        const speed = 8;
        state.cannonballs.push({
          x: activeCannon.x,
          y: activeCannon.y,
          vx: (dx / distance) * speed,
          vy: (dy / distance) * speed,
          targetBagId: block.id,
          life: 300,
        });
        
        // Play laser sound effect
        playLaserSound(activeCannon.side === 'left');
      }
    }

    // Check if hit by cannonball
    const state = animationStateRef.current;
    for (let i = 0; i < state.cannonballs.length; i++) {
      const ball = state.cannonballs[i];
      if (ball.targetBagId === block.id) {
        const dx = ball.x - (block.x + block.width / 2);
        const dy = ball.y - (block.y + block.height / 2);
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < block.width / 2 + 8) { // Ball radius is 8
          // Remove the cannonball
          state.cannonballs.splice(i, 1);
          
          // Use same explosion as mouse click with random type
          const explosionType = Math.floor(Math.random() * 10) + 1;
          block.isExploding = true;
          block.explosionTime = 0;
          block.explosionType = explosionType;
          
          // Create particles with same count as click explosion using random explosion type
          const particleCount = Math.min(50, Math.floor(block.width / 2) + 10);
          for (let j = 0; j < particleCount; j++) {
            state.particles.push(createClickParticle(
              block.x + block.width / 2,
              block.y + block.height / 2,
              block.isLong,
              explosionType
            ));
          }
          
          return true;
        }
      }
    }

    // Check if hit bottom without being shot
    if (block.y + block.height >= canvas.height - 60) {
      block.isExploding = true;
      block.explosionTime = 0;

      // Create smaller particles for missed bags
      const particleCount = Math.min(15, Math.floor(block.width / 5));
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
  }, [createParticle]);

  // Update particle
  const updateParticle = useCallback((particle: Particle, deltaTime: number): boolean => {
    const frameMultiplier = deltaTime / 16.67; // Нормализуем к 60 FPS
    particle.x += particle.vx * frameMultiplier;
    particle.y += particle.vy * frameMultiplier;
    particle.vy += 0.1 * frameMultiplier; // Gravity
    particle.life -= particle.decay * frameMultiplier;
    particle.size *= Math.pow(0.98, frameMultiplier);
    
    return particle.life > 0;
  }, []);

  // Update cannon (only left one)
  const updateCannons = useCallback((canvasWidth: number, canvasHeight: number, deltaTime: number): void => {
    const state = animationStateRef.current;
    
    // Position left cannon only (almost at bottom)
    state.leftCannon.x = 40;
    state.leftCannon.y = canvasHeight - 20;
    
    // Update firing animation for left cannon only
    if (state.leftCannon.isFiring) {
      state.leftCannon.fireProgress += deltaTime * 0.02;
      
      if (state.leftCannon.fireProgress >= 1) {
        state.leftCannon.isFiring = false;
        state.leftCannon.fireProgress = 0;
        state.leftCannon.targetBag = null;
      }
    }
  }, []);

  // Create cannonball
  const createCannonball = useCallback((cannon: Cannon, targetX: number, targetY: number, bagId: string): Cannonball => {
    const dx = targetX - cannon.x;
    const dy = targetY - cannon.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const speed = 8;
    
    return {
      x: cannon.x,
      y: cannon.y,
      vx: (dx / distance) * speed,
      vy: (dy / distance) * speed,
      targetBagId: bagId,
      life: 300, // 5 seconds at 60fps
    };
  }, []);



  // Update cannonballs
  const updateCannonballs = useCallback((deltaTime: number): void => {
    const state = animationStateRef.current;
    
    state.cannonballs = state.cannonballs.filter(ball => {
      ball.x += ball.vx;
      ball.y += ball.vy;
      ball.life -= deltaTime;
      
      return ball.life > 0;
    });
  }, []);

  // Draw money bag without dollar sign for better readability
  const drawLiquidationBlock = useCallback((ctx: CanvasRenderingContext2D, block: LiquidationBlock) => {
    ctx.save();
    ctx.globalAlpha = block.opacity;
    ctx.translate(block.x + block.width / 2, block.y + block.height / 2);

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

    // Text with better readability - no dollar sign
    ctx.shadowBlur = 0;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Coin symbol with outline (top position) - bigger font but fits in bag
    const coinFontSize = Math.max(14, bagWidth * 0.22);
    ctx.font = `bold ${coinFontSize}px JetBrains Mono, monospace`;
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.strokeText(block.coin, 0, -bagHeight * 0.05);
    ctx.fillStyle = '#FFD700';
    ctx.fillText(block.coin, 0, -bagHeight * 0.05);

    // Amount text with outline for better readability - bigger font
    const amountFontSize = Math.max(13, bagWidth * 0.2);
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
    ctx.strokeText(formattedAmount, 0, bagHeight * 0.25);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(formattedAmount, 0, bagHeight * 0.25);

    ctx.restore();
  }, []);

  // Draw particle with different shapes based on color/type
  const drawParticle = useCallback((ctx: CanvasRenderingContext2D, particle: Particle) => {
    ctx.save();
    ctx.globalAlpha = particle.life;
    
    // Determine particle type by color
    const isGoldCoin = particle.color === '#FFD700' || particle.color === '#ffd700';
    
    if (isGoldCoin) {
      // Original gold coin for floor impacts
      ctx.fillStyle = '#FFD700';
      ctx.shadowColor = '#FFD700';
      ctx.shadowBlur = 5;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.strokeStyle = '#FFA500';
      ctx.lineWidth = 1;
      ctx.stroke();
      
      if (particle.size > 3) {
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#B8860B';
        ctx.font = `bold ${particle.size}px JetBrains Mono, monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('$', particle.x, particle.y);
      }
    } else {
      // Special effects for click explosions
      ctx.fillStyle = particle.color;
      ctx.shadowColor = particle.color;
      ctx.shadowBlur = 8;
      
      // Different shapes for different effects
      if (particle.color.includes('FF1493') || particle.color.includes('FF69B4')) {
        // Heart shape for pink particles
        const size = particle.size;
        ctx.beginPath();
        ctx.moveTo(particle.x, particle.y + size/4);
        ctx.bezierCurveTo(particle.x, particle.y, particle.x - size/2, particle.y, particle.x - size/2, particle.y + size/4);
        ctx.bezierCurveTo(particle.x - size/2, particle.y + size/2, particle.x, particle.y + size/2, particle.x, particle.y + size);
        ctx.bezierCurveTo(particle.x, particle.y + size/2, particle.x + size/2, particle.y + size/2, particle.x + size/2, particle.y + size/4);
        ctx.bezierCurveTo(particle.x + size/2, particle.y, particle.x, particle.y, particle.x, particle.y + size/4);
        ctx.fill();
      } else if (particle.color.includes('FFD700') || particle.color.includes('FFA500')) {
        // Star shape for golden particles
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
        // Diamond shape for ice crystals
        const size = particle.size;
        ctx.beginPath();
        ctx.moveTo(particle.x, particle.y - size);
        ctx.lineTo(particle.x + size, particle.y);
        ctx.lineTo(particle.x, particle.y + size);
        ctx.lineTo(particle.x - size, particle.y);
        ctx.closePath();
        ctx.fill();
      } else {
        // Default circle for other effects
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    
    ctx.restore();
  }, []);

  // Draw cannon in Napoleon style
  const drawCannon = useCallback((ctx: CanvasRenderingContext2D, cannon: Cannon) => {
    ctx.save();
    ctx.translate(cannon.x, cannon.y);
    
    // Mirror right cannon horizontally
    if (cannon.side === 'right') {
      ctx.scale(-1, 1);
    }
    
    // Compact Star Wars style base - smaller size
    const baseGradient = ctx.createLinearGradient(-20, -6, 20, 6);
    baseGradient.addColorStop(0, '#2d3748'); // Dark gray
    baseGradient.addColorStop(0.5, '#4a5568'); // Medium gray
    baseGradient.addColorStop(1, '#1a202c'); // Very dark gray
    
    ctx.fillStyle = baseGradient;
    ctx.shadowColor = '#4299e1';
    ctx.shadowBlur = 4;
    ctx.fillRect(-20, -6, 40, 12);
    
    // Glowing border - smaller
    ctx.strokeStyle = '#63b3ed';
    ctx.lineWidth = 1;
    ctx.strokeRect(-20, -6, 40, 12);
    ctx.shadowBlur = 0;
    
    // Single central hover disc - smaller
    const discGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 8);
    discGradient.addColorStop(0, '#4299e1'); // Blue center
    discGradient.addColorStop(0.7, '#2b6cb0'); // Darker blue
    discGradient.addColorStop(1, '#2c5282'); // Dark edge
    
    ctx.save();
    ctx.translate(0, 6);
    ctx.fillStyle = discGradient;
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.fill();
    
    // Inner ring effect - smaller
    ctx.strokeStyle = '#90cdf4';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    
    // Compact Star Wars blaster barrel
    const barrelLength = 35; // Shorter barrel
    let barrelAngle = cannon.isFiring ? cannon.angle : -Math.PI / 6; // Default elevation
    
    // Adjust angle for mirrored right cannon
    if (cannon.side === 'right') {
      barrelAngle = cannon.isFiring ? -cannon.angle : -Math.PI / 6;
    }
    
    ctx.save();
    ctx.rotate(barrelAngle);
    
    const barrelGradient = ctx.createLinearGradient(0, -5, 0, 5);
    barrelGradient.addColorStop(0, '#4a5568'); // Gray
    barrelGradient.addColorStop(0.5, '#2d3748'); // Dark gray
    barrelGradient.addColorStop(1, '#1a202c'); // Very dark gray
    
    ctx.fillStyle = barrelGradient;
    ctx.fillRect(0, -5, barrelLength, 10); // Thinner barrel
    
    // Glowing barrel outline - Star Wars style
    ctx.strokeStyle = '#63b3ed';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, -5, barrelLength, 10);
    
    // Barrel segments for Star Wars detail
    ctx.strokeStyle = '#90cdf4';
    ctx.lineWidth = 0.5;
    for (let i = 8; i < barrelLength; i += 8) {
      ctx.beginPath();
      ctx.moveTo(i, -5);
      ctx.lineTo(i, 5);
      ctx.stroke();
    }
    
    // Laser muzzle flash when firing (Star Wars style)
    if (cannon.isFiring && cannon.fireProgress < 0.4) {
      const laserColor = cannon.side === 'left' ? '#00BFFF' : '#FF0000'; // Blue for left, red for right
      const glowColor = cannon.side === 'left' ? '#87CEEB' : '#FF6B6B';
      
      // Outer glow
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = 20;
      ctx.fillStyle = glowColor;
      ctx.globalAlpha = (1 - cannon.fireProgress * 2.5) * 0.4;
      ctx.beginPath();
      ctx.arc(barrelLength + 15, 0, 30, 0, Math.PI * 2);
      ctx.fill();
      
      // Middle glow
      ctx.shadowBlur = 10;
      ctx.globalAlpha = (1 - cannon.fireProgress * 2.5) * 0.7;
      ctx.beginPath();
      ctx.arc(barrelLength + 10, 0, 20, 0, Math.PI * 2);
      ctx.fill();
      
      // Core laser flash
      ctx.shadowBlur = 5;
      ctx.fillStyle = laserColor;
      ctx.globalAlpha = 1 - cannon.fireProgress * 2.5;
      ctx.beginPath();
      ctx.arc(barrelLength + 8, 0, 12, 0, Math.PI * 2);
      ctx.fill();
      
      // Bright white center
      ctx.fillStyle = '#FFFFFF';
      ctx.shadowBlur = 0;
      ctx.globalAlpha = (1 - cannon.fireProgress * 2.5) * 0.8;
      ctx.beginPath();
      ctx.arc(barrelLength + 6, 0, 6, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.globalAlpha = 1;
    }
    
    ctx.restore();
    
    ctx.restore();
  }, []);

  // Draw laser beam (Star Wars style)
  const drawCannonball = useCallback((ctx: CanvasRenderingContext2D, ball: Cannonball) => {
    ctx.save();
    
    // Determine laser color based on cannon side
    const isLeftCannon = ball.x < window.innerWidth / 2;
    const laserColor = isLeftCannon ? '#00BFFF' : '#FF0000'; // Blue for left, red for right
    const glowColor = isLeftCannon ? '#87CEEB' : '#FF6B6B';
    
    // Outer glow
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 15;
    ctx.fillStyle = glowColor;
    ctx.globalAlpha = 0.3;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, 12, 0, Math.PI * 2);
    ctx.fill();
    
    // Middle glow
    ctx.shadowBlur = 8;
    ctx.globalAlpha = 0.6;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, 8, 0, Math.PI * 2);
    ctx.fill();
    
    // Core laser beam
    ctx.shadowBlur = 3;
    ctx.fillStyle = laserColor;
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, 4, 0, Math.PI * 2);
    ctx.fill();
    
    // Bright center
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, 2, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
  }, []);

  // Real Bitcoin candlestick data from Binance with animation state
  const [bitcoinCandles, setBitcoinCandles] = useState<any[]>([]);
  const [lastUpdateTime, setLastUpdateTime] = useState<number>(0);
  const [timeframe, setTimeframe] = useState<string>('30m');
  
  // Timeframe options
  const timeframeOptions = [
    { value: '1m', label: '1м', limit: 60 },
    { value: '5m', label: '5м', limit: 60 },
    { value: '15m', label: '15м', limit: 48 },
    { value: '30m', label: '30м', limit: 48 },
    { value: '1h', label: '1ч', limit: 24 },
    { value: '4h', label: '4ч', limit: 24 },
    { value: '1d', label: '1д', limit: 30 }
  ];
  
  // Fetch real Bitcoin data
  useEffect(() => {
    const fetchBitcoinData = async () => {
      try {
        const selectedTimeframe = timeframeOptions.find(tf => tf.value === timeframe);
        const limit = selectedTimeframe?.limit || 48;
        
        // Get candlestick data based on selected timeframe
        const response = await fetch(`https://data-api.binance.vision/api/v3/klines?symbol=BTCUSDT&interval=${timeframe}&limit=${limit}`);
        const data = await response.json();
        
        // Convert to OHLCV format
        const candles = data.map((kline: any[]) => ({
          timestamp: kline[0],
          open: parseFloat(kline[1]),
          high: parseFloat(kline[2]),
          low: parseFloat(kline[3]),
          close: parseFloat(kline[4]),
          volume: parseFloat(kline[5])
        }));
        
        setBitcoinCandles(candles);
        setLastUpdateTime(Date.now());
        console.log('Обновлены данные Bitcoin:', candles.length, `свечей (${timeframe} интервал)`);
      } catch (error) {
        console.error('Ошибка загрузки данных Bitcoin:', error);
        // Fallback to previous static data if API fails
        const fallbackData = [];
        const basePrice = 96000;
        for (let i = 0; i < 24; i++) {
          const price = basePrice + (Math.random() - 0.5) * 2000;
          fallbackData.push({
            timestamp: Date.now() - (24 - i) * 60 * 60 * 1000,
            open: price,
            high: price + Math.random() * 500,
            low: price - Math.random() * 500,
            close: price + (Math.random() - 0.5) * 200,
            volume: Math.random() * 1000
          });
        }
        setBitcoinCandles(fallbackData);
      }
    };
    
    fetchBitcoinData();
    
    // Update every 1 second for real-time feel
    const interval = setInterval(fetchBitcoinData, 1 * 1000);
    return () => clearInterval(interval);
  }, [timeframe]);

  // Draw real Bitcoin candlestick chart background  
  const drawBitcoinChart = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number, opacity?: number) => {
    if (bitcoinCandles.length === 0) return;
    
    // Find min/max prices from all candles
    const allPrices = bitcoinCandles.flatMap(candle => [candle.high, candle.low]);
    const minPrice = Math.min(...allPrices);
    const maxPrice = Math.max(...allPrices);
    const priceRange = maxPrice - minPrice;
    
    if (priceRange === 0) return; // No price movement
    
    ctx.save();
    
    // No grid lines - clean chart background
    
    // Draw candlesticks in monochrome style - configurable opacity
    const actualOpacity = opacity !== undefined ? opacity : chartOpacity;
    ctx.globalAlpha = actualOpacity / 100;
    
    const candleWidth = Math.max(6, width / bitcoinCandles.length * 0.7);
    const candleSpacing = width / bitcoinCandles.length;
    
    bitcoinCandles.forEach((candle, index) => {
      const x = (index + 0.5) * candleSpacing;
      
      // Scale prices to canvas with proper margins
      const margin = height * 0.1;
      const chartHeight = height - 2 * margin;
      
      const openY = margin + ((maxPrice - candle.open) / priceRange) * chartHeight;
      const closeY = margin + ((maxPrice - candle.close) / priceRange) * chartHeight;
      const highY = margin + ((maxPrice - candle.high) / priceRange) * chartHeight;
      const lowY = margin + ((maxPrice - candle.low) / priceRange) * chartHeight;
      
      // Monochrome style - subtle black and white background
      const isGreen = candle.close >= candle.open;
      
      if (isGreen) {
        // Light gray for up candles - filled with background color
        ctx.strokeStyle = '#888888';
        ctx.fillStyle = '#0a0a0a'; // Цвет фона графика
      } else {
        // Dark gray for down candles - filled
        ctx.fillStyle = '#333333';
        ctx.strokeStyle = '#333333';
      }
      
      // Draw high-low shadow lines (wicks) first
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(x, highY);
      ctx.lineTo(x, lowY);
      ctx.stroke();
      
      // Draw candle body
      const bodyTop = Math.min(openY, closeY);
      const bodyHeight = Math.max(2, Math.abs(closeY - openY));
      
      // Reset stroke and fill colors for body
      if (isGreen) {
        ctx.strokeStyle = '#888888';
        ctx.fillStyle = '#0a0a0a'; // Цвет фона графика
      } else {
        ctx.fillStyle = '#333333';
        ctx.strokeStyle = '#333333';
      }
      
      if (bodyHeight < 3) {
        // Doji - thin horizontal line
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(x - candleWidth/2, openY);
        ctx.lineTo(x + candleWidth/2, openY);
        ctx.stroke();
      } else {
        if (isGreen) {
          // Up candles - filled with background color and stroked outline
          ctx.fillRect(x - candleWidth/2, bodyTop, candleWidth, bodyHeight);
          ctx.lineWidth = 0.5;
          ctx.strokeRect(x - candleWidth/2, bodyTop, candleWidth, bodyHeight);
        } else {
          // Down candles - filled dark
          ctx.fillRect(x - candleWidth/2, bodyTop, candleWidth, bodyHeight);
        }
      }
    });
    
    // Draw minimal price labels with live indicator
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = '#666666';
    ctx.font = '9px JetBrains Mono, monospace';
    ctx.textAlign = 'right';
    
    const lastCandle = bitcoinCandles[bitcoinCandles.length - 1];
    if (lastCandle) {
      // Show current Bitcoin price
      ctx.fillText(`BTC $${Math.round(lastCandle.close).toLocaleString()}`, width - 10, 20);
      
      // Add live indicator (pulsing dot)
      const timeSinceUpdate = Date.now() - lastUpdateTime;
      const isRecent = timeSinceUpdate < 20000; // 20 seconds
      if (isRecent) {
        const alpha = 0.3 + 0.4 * Math.sin(Date.now() * 0.005); // Pulsing effect
        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#00ff88';
        ctx.beginPath();
        ctx.arc(width - 120, 15, 3, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = '#666666';
        ctx.textAlign = 'right';
        ctx.fillText('LIVE', width - 130, 20);
      }
    }
    
    ctx.restore();
  }, [bitcoinCandles]);

  // Animation loop
  const animate = useCallback((currentTime: number) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const state = animationStateRef.current;
    const deltaTime = currentTime - state.lastTime;
    state.lastTime = currentTime;
    state.isPaused = isPaused;

    if (!isPaused) {
      // Clear canvas completely to remove traces
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw Bitcoin chart background (dimmed)
      drawBitcoinChart(ctx, canvas.width, canvas.height, chartOpacityRef.current);



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
        const alive = updateParticle(particle, deltaTime);
        if (alive) {
          drawParticle(ctx, particle);
        }
        return alive;
      });

      // Update and draw left cannon only
      updateCannons(canvas.width, canvas.height, deltaTime);
      drawCannon(ctx, state.leftCannon);
      
      // Draw temporary cannon range indicators (for testing)
      const cannonRange = canvas.height * 0.70;
      const bottomLimit = canvas.height * 0.95;
      
      // Upper boundary (red)
      ctx.strokeStyle = '#ff0000';
      ctx.lineWidth = 2;
      ctx.setLineDash([10, 5]);
      ctx.beginPath();
      ctx.moveTo(0, cannonRange);
      ctx.lineTo(canvas.width, cannonRange);
      ctx.stroke();
      
      // Lower boundary (orange)
      ctx.strokeStyle = '#ff8800';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, bottomLimit);
      ctx.lineTo(canvas.width, bottomLimit);
      ctx.stroke();
      ctx.setLineDash([]);

      // Update and draw cannonballs
      updateCannonballs(deltaTime);
      state.cannonballs.forEach(ball => {
        drawCannonball(ctx, ball);
      });


    }

    requestAnimationFrame(animate);
  }, [isPaused, updateLiquidationBlock, updateParticle, drawLiquidationBlock, drawParticle, drawBitcoinChart, updateCannons, drawCannon, drawCannonball, updateCannonballs]);

  // Add new liquidations to animation (without duplicates)
  useEffect(() => {
    const state = animationStateRef.current;
    const currentTime = Date.now();
    
    liquidations.forEach(liquidation => {
      // Skip liquidations that happened before component loaded (prevents duplicates on reload)
      if (liquidation.timestamp < componentStartTime.current) {
        return;
      }
      
      // Skip old liquidations - only show very fresh ones to prevent duplicates on reload
      const liquidationAge = currentTime - liquidation.timestamp;
      const maxAge = 3000; // 3 seconds max age for liquidations
      
      if (liquidationAge > maxAge) {
        // Skip old liquidations
        return;
      }
      
      // Create unique identifier including timestamp and value to prevent duplicates
      const uniqueKey = `${liquidation.id}_${liquidation.timestamp}_${liquidation.value}`;
      
      // Check if already processed
      if (!processedLiquidations.current.has(uniqueKey)) {
        // Check if already exists in current animation
        const exists = state.liquidations.some(block => block.id === liquidation.id);
        if (!exists) {
          try {
            const block = createLiquidationBlock(liquidation);
            state.liquidations.push(block);
            processedLiquidations.current.add(uniqueKey);
            
            // Trigger flash text when liquidation appears
            setShowFlashText(true);
            setTimeout(() => setShowFlashText(false), 2000); // Show for 2 seconds
            
            // Keep processed set manageable (remove old entries)
            if (processedLiquidations.current.size > 1000) {
              const entries = Array.from(processedLiquidations.current);
              processedLiquidations.current = new Set(entries.slice(-500));
            }
          } catch (error) {
            console.warn('Could not create liquidation block:', error);
          }
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
      
      {/* Timeframe Selector */}
      <div className="absolute top-4 left-4 z-10">
        <div className="flex items-center gap-1 bg-black/30 backdrop-blur-sm rounded-lg p-2">
          <span className="text-xs text-gray-400 font-mono mr-2">График:</span>
          {timeframeOptions.map((tf) => (
            <button
              key={tf.value}
              onClick={() => setTimeframe(tf.value)}
              className={`
                px-2 py-1 text-xs font-mono rounded transition-all duration-200
                ${timeframe === tf.value 
                  ? 'bg-accent-blue text-black font-bold' 
                  : 'text-gray-300 hover:text-white hover:bg-white/10'
                }
              `}
            >
              {tf.label}
            </button>
          ))}
        </div>
        

      </div>
      
      {/* Flashing text "Click to explode bags" in center */}
      {showFlashText && (
        <div 
          className={`
            absolute bottom-20 left-1/2 transform -translate-x-1/2 z-10
            transition-opacity duration-150
            ${isFlashing ? 'opacity-100' : 'opacity-30'}
          `}
        >
          <div className="bg-black/40 backdrop-blur-sm rounded-lg px-4 py-2 border border-yellow-400/30">
            <span className="text-lg font-mono text-yellow-400 whitespace-nowrap">
              Click to explode bags
            </span>
          </div>
        </div>
      )}

    </div>
  );
}
