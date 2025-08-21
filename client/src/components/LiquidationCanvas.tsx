import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { Liquidation, Platform } from '@shared/schema';
import { LiquidationBlock, Particle, AnimationState, Cannon, Cannonball } from '../types/liquidation';

interface LiquidationCanvasProps {
  liquidations: Liquidation[];
  isPaused: boolean;
  chartOpacity?: number;
  timeframe: string;
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
  chartOpacity = 100,
  timeframe 
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
      movingRight: true,
      speed: 1.0,
      minX: 30,
      maxX: 0, // Will be set dynamically based on canvas width
      wheelRotation: 0,
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
  const [isSoundMuted, setIsSoundMuted] = useState(false);

  // Audio context ref for consistent sound
  const audioContextRef = useRef<AudioContext | null>(null);
  
  // Initialize audio context on first user interaction
  const initAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      try {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch (error) {
        console.log('Audio not supported');
      }
    }
  }, []);

  // Cannon sound effect
  const playCannonSound = useCallback((isLeftCannon: boolean) => {
    if (isSoundMuted) return; // Skip sound if muted
    
    // Initialize audio context if needed
    if (!audioContextRef.current) {
      initAudioContext();
    }
    
    if (!audioContextRef.current) return;
    
    try {
      // Resume context if suspended (browser autoplay policy)
      if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
      }
      
      // Create a realistic cannon boom sound
      const gainNode = audioContextRef.current.createGain();
      const oscillator1 = audioContextRef.current.createOscillator();
      const oscillator2 = audioContextRef.current.createOscillator();
      
      // Deep boom base frequency
      oscillator1.type = 'triangle';
      oscillator1.frequency.setValueAtTime(60, audioContextRef.current.currentTime);
      oscillator1.frequency.exponentialRampToValueAtTime(30, audioContextRef.current.currentTime + 0.5);
      
      // Higher frequency for crack/snap
      oscillator2.type = 'square';
      oscillator2.frequency.setValueAtTime(400, audioContextRef.current.currentTime);
      oscillator2.frequency.exponentialRampToValueAtTime(50, audioContextRef.current.currentTime + 0.2);
      
      // Volume envelope - sharp attack, slow decay
      gainNode.gain.setValueAtTime(0, audioContextRef.current.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.3, audioContextRef.current.currentTime + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.1, audioContextRef.current.currentTime + 0.1);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContextRef.current.currentTime + 0.8);
      
      // Connect both oscillators
      oscillator1.connect(gainNode);
      oscillator2.connect(gainNode);
      gainNode.connect(audioContextRef.current.destination);
      
      oscillator1.start(audioContextRef.current.currentTime);
      oscillator2.start(audioContextRef.current.currentTime);
      oscillator1.stop(audioContextRef.current.currentTime + 0.8);
      oscillator2.stop(audioContextRef.current.currentTime + 0.2);
    } catch (error) {
      console.log('Audio playback failed:', error);
    }
  }, [isSoundMuted, initAudioContext]);

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
        
      case 5: // Cosmic explosion - космический взрыв
        colors = ['#4B0082', '#8A2BE2', '#9370DB', '#BA55D3'];
        speed = 18;
        size = Math.random() * 10 + 4;
        decay = 0.012;
        vx = (Math.random() - 0.5) * speed;
        vy = (Math.random() - 0.5) * speed;
        break;
        
      case 6: // Shockwave - ударная волна (исправлено)
        colors = ['#FFFFFF', '#C0C0C0', '#808080'];
        speed = 22;
        size = Math.random() * 12 + 3; // Уменьшил размер частиц
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

  // Handle interaction (mouse click or touch)
  const handleCanvasInteraction = useCallback((clientX: number, clientY: number) => {
    if (!canvasRef.current) return;
    
    // Initialize audio context on first user interaction
    initAudioContext();
    
    const rect = canvasRef.current.getBoundingClientRect();
    const clickX = clientX - rect.left;
    const clickY = clientY - rect.top;
    
    // Check if click is on mute button (bottom right corner)
    const buttonSize = 40;
    const buttonX = canvasRef.current.width - buttonSize - 15;
    const buttonY = canvasRef.current.height - buttonSize - 15;
    
    if (clickX >= buttonX && clickX <= buttonX + buttonSize && 
        clickY >= buttonY && clickY <= buttonY + buttonSize) {
      setIsSoundMuted(prev => !prev);
      return;
    }
    
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
        
        // Choose random explosion type (0-9, excluding removed animations)
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
        break; // Only explode one bag per interaction
      }
    }
  }, [createClickParticle, isSoundMuted, initAudioContext]);

  // Mouse click handling
  const handleCanvasClick = useCallback((e: MouseEvent) => {
    handleCanvasInteraction(e.clientX, e.clientY);
  }, [handleCanvasInteraction]);

  // Touch handling for mobile
  const handleCanvasTouch = useCallback((e: TouchEvent) => {
    e.preventDefault(); // Prevent scrolling
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      handleCanvasInteraction(touch.clientX, touch.clientY);
    }
  }, [handleCanvasInteraction]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.addEventListener('click', handleCanvasClick, { passive: false });
      canvas.addEventListener('touchstart', handleCanvasTouch, { passive: false });
      return () => {
        canvas.removeEventListener('click', handleCanvasClick);
        canvas.removeEventListener('touchstart', handleCanvasTouch);
      };
    }
  }, [handleCanvasClick, handleCanvasTouch]);

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
      
      // Progressive firing probability - higher chance closer to bottom
      const bagProgress = (block.y + block.height - cannonRange) / (bottomLimit - cannonRange);
      const baseProbability = 0.0005; // Very low base chance
      const progressMultiplier = 1 + bagProgress * 4; // Up to 5x higher chance near bottom
      const shouldFire = Math.random() < (baseProbability * progressMultiplier);
      
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
        
        // Play cannon sound effect
        playCannonSound(activeCannon.side === 'left');
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
          const explosionType = Math.floor(Math.random() * 10);
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
  }, [createParticle, playCannonSound]);

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
    
    // Set dynamic max position near mute button (leave 100px space for button)
    const dynamicMaxX = canvasWidth - 120;
    if (state.leftCannon.maxX === 0) {
      state.leftCannon.maxX = dynamicMaxX;
    }
    
    // Move cannon horizontally along bottom border
    const frameMultiplier = deltaTime / 16.67;
    const speed = state.leftCannon.speed || 1.0;
    
    let movementDirection = 0;
    if (state.leftCannon.movingRight) {
      state.leftCannon.x += speed * frameMultiplier;
      movementDirection = 1;
      if (state.leftCannon.x >= dynamicMaxX) {
        state.leftCannon.movingRight = false;
      }
    } else {
      state.leftCannon.x -= speed * frameMultiplier;
      movementDirection = -1;
      if (state.leftCannon.x <= (state.leftCannon.minX || 30)) {
        state.leftCannon.movingRight = true;
      }
    }
    
    // Rotate wheels based on movement direction (realistic wheel rotation)
    const wheelRadius = 15;
    const distancePerFrame = speed * frameMultiplier;
    const rotationPerFrame = (distancePerFrame / wheelRadius) * movementDirection;
    state.leftCannon.wheelRotation = (state.leftCannon.wheelRotation || 0) + rotationPerFrame;
    
    // Position cannon slightly raised from bottom
    state.leftCannon.y = canvasHeight - 50;
    
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

  // Draw cannon in historical 17-18 century style
  const drawCannon = useCallback((ctx: CanvasRenderingContext2D, cannon: Cannon) => {
    ctx.save();
    ctx.translate(cannon.x, cannon.y);
    
    // Base cyber carriage platform 
    const cybertechGradient = ctx.createLinearGradient(0, 10, 0, 35);
    cybertechGradient.addColorStop(0, '#2A2A3A');
    cybertechGradient.addColorStop(0.5, '#3A3A4A');
    cybertechGradient.addColorStop(1, '#1A1A2A');
    
    ctx.fillStyle = cybertechGradient;
    ctx.fillRect(-35, 10, 70, 25);
    
    // Tech panel lines
    ctx.strokeStyle = '#4A4A5A';
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.6;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(-30, 15 + i * 5);
      ctx.lineTo(30, 15 + i * 5);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    
    // Large cyber wheels
    const wheelGradient = ctx.createRadialGradient(0, 0, 5, 0, 0, 15);
    wheelGradient.addColorStop(0, '#3A3A4A');
    wheelGradient.addColorStop(1, '#1A1A2A');
    
    // Left wheel
    ctx.fillStyle = wheelGradient;
    ctx.beginPath();
    ctx.arc(-25, 35, 15, 0, Math.PI * 2);
    ctx.fill();
    
    // Right wheel  
    ctx.beginPath();
    ctx.arc(25, 35, 15, 0, Math.PI * 2);
    ctx.fill();
    
    // Wheel spokes (8 spokes each) - with rotation
    ctx.strokeStyle = '#5A5A6A';
    ctx.lineWidth = 2;
    const wheelRotation = cannon.wheelRotation || 0;
    
    for (let wheel of [-25, 25]) {
      ctx.save();
      ctx.translate(wheel, 35);
      ctx.rotate(wheelRotation);
      
      for (let i = 0; i < 8; i++) {
        const angle = (i * Math.PI) / 4;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(angle) * 12, Math.sin(angle) * 12);
        ctx.stroke();
      }
      
      ctx.restore();
      
      // Hub
      ctx.fillStyle = '#5A5A6A';
      ctx.beginPath();
      ctx.arc(wheel, 35, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Cannon trunnions (side mounting points)
    ctx.fillStyle = '#6A6A7A';
    ctx.beginPath();
    ctx.arc(0, 5, 3, 0, Math.PI * 2);
    ctx.fill();
    
    // Barrel rotation based on firing state
    let barrelAngle = cannon.isFiring ? cannon.angle : 0;
    
    ctx.save();
    ctx.rotate(barrelAngle);
    
    // Main cannon barrel (cyber-tech styling)
    const barrelGradient = ctx.createLinearGradient(0, -10, 0, 10);
    barrelGradient.addColorStop(0, '#4A4A5A');
    barrelGradient.addColorStop(0.3, '#3A3A4A');
    barrelGradient.addColorStop(0.7, '#2A2A3A');
    barrelGradient.addColorStop(1, '#1A1A2A');
    
    ctx.fillStyle = barrelGradient;
    
    // Tapered barrel shape (wider at breech, narrower at muzzle)
    ctx.beginPath();
    ctx.moveTo(-5, -10);
    ctx.lineTo(45, -7);
    ctx.lineTo(50, -6);
    ctx.lineTo(50, 6);
    ctx.lineTo(45, 7);
    ctx.lineTo(-5, 10);
    ctx.closePath();
    ctx.fill();
    
    // Reinforcement bands (cyber-tech style)
    ctx.fillStyle = '#5A5A6A';
    ctx.fillRect(5, -10, 4, 20);
    ctx.fillRect(20, -9, 3, 18);
    ctx.fillRect(35, -8, 3, 16);
    
    // Decorative moldings
    ctx.strokeStyle = '#6A6A7A';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, -8);
    ctx.lineTo(45, -6);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, 8);
    ctx.lineTo(45, 6);
    ctx.stroke();
    
    // Muzzle end (darker, worn look)
    ctx.fillStyle = '#2A2A3A';
    ctx.fillRect(47, -6, 3, 12);
    
    // Touch hole for ignition
    ctx.fillStyle = '#1A1A2A';
    ctx.beginPath();
    ctx.arc(-2, 0, 2, 0, Math.PI * 2);
    ctx.fill();
    
    // Muzzle flash when firing (orange/yellow period-appropriate flash)
    if (cannon.isFiring && cannon.fireProgress < 0.4) {
      const flashAlpha = (1 - cannon.fireProgress * 2.5);
      
      // Outer flash
      ctx.fillStyle = '#FFA500';
      ctx.globalAlpha = flashAlpha * 0.6;
      ctx.beginPath();
      ctx.arc(55, 0, 20, 0, Math.PI * 2);
      ctx.fill();
      
      // Middle flash
      ctx.fillStyle = '#FF6347';
      ctx.globalAlpha = flashAlpha * 0.8;
      ctx.beginPath();
      ctx.arc(53, 0, 12, 0, Math.PI * 2);
      ctx.fill();
      
      // Core flash
      ctx.fillStyle = '#FFFF00';
      ctx.globalAlpha = flashAlpha;
      ctx.beginPath();
      ctx.arc(51, 0, 6, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.globalAlpha = 1;
    }
    
    ctx.restore();
    
    ctx.restore();
  }, []);

  // Draw cannonball (historical iron ball)
  const drawCannonball = useCallback((ctx: CanvasRenderingContext2D, ball: Cannonball) => {
    ctx.save();
    
    // Iron cannonball with gradient for 3D effect
    const ballGradient = ctx.createRadialGradient(ball.x - 2, ball.y - 2, 0, ball.x, ball.y, 6);
    ballGradient.addColorStop(0, '#8C7853');
    ballGradient.addColorStop(0.4, '#6B5B73');
    ballGradient.addColorStop(1, '#2F2F2F');
    
    ctx.fillStyle = ballGradient;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, 6, 0, Math.PI * 2);
    ctx.fill();
    
    // Dark outline for definition
    ctx.strokeStyle = '#1A1A1A';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, 6, 0, Math.PI * 2);
    ctx.stroke();
    
    // Small highlight for metallic sheen
    ctx.fillStyle = '#C0C0C0';
    ctx.globalAlpha = 0.6;
    ctx.beginPath();
    ctx.arc(ball.x - 2, ball.y - 2, 2, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.globalAlpha = 1;
    ctx.restore();
  }, []);

  // Real Bitcoin candlestick data from Binance with animation state
  const [bitcoinCandles, setBitcoinCandles] = useState<any[]>([]);
  const [lastUpdateTime, setLastUpdateTime] = useState<number>(0);

  
  // Timeframe mapping for data fetching  
    const timeframeLimits: Record<string, number> = {
      '1m': 60,
      '5m': 60, 
      '15m': 60,
      '30m': 60,
      '1h': 60,
      '4h': 60,
      '1d': 60
    };

  
  // Fetch real Bitcoin data
  useEffect(() => {
    const fetchBitcoinData = async () => {
      try {
        const limit = timeframeLimits[timeframe] || 48;
        
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
    
    // Reserve space for price scale on the right
    const scaleWidth = 80;
    const chartWidth = width - scaleWidth;
    
    // Draw candlesticks in monochrome style - configurable opacity
    const actualOpacity = opacity !== undefined ? opacity : chartOpacity;
    ctx.globalAlpha = actualOpacity / 100;
    
    const candleWidth = Math.max(6, chartWidth / bitcoinCandles.length * 0.7);
    const candleSpacing = chartWidth / bitcoinCandles.length;
    
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
    
    // Draw price scale to the right of chart
    const margin = height * 0.1;
    const chartHeight = height - 2 * margin;
    
    // Price scale background
    ctx.globalAlpha = 0.05;
    ctx.fillStyle = '#333333';
    ctx.fillRect(chartWidth, 0, scaleWidth, height);
    
    // Vertical separator line
    ctx.globalAlpha = 0.3;
    ctx.strokeStyle = '#444444';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(chartWidth, 0);
    ctx.lineTo(chartWidth, height);
    ctx.stroke();
    
    // Price scale labels
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = '#888888';
    ctx.font = '10px JetBrains Mono, monospace';
    ctx.textAlign = 'right';
    
    // Calculate price levels (8 levels)
    const priceStep = priceRange / 7;
    for (let i = 0; i <= 7; i++) {
      const price = minPrice + (i * priceStep);
      const y = margin + chartHeight - (i * chartHeight / 7);
      
      // Price label
      ctx.fillText(`${Math.round(price).toLocaleString()}`, chartWidth + scaleWidth - 5, y + 4);
      
      // Small tick mark
      ctx.globalAlpha = 0.4;
      ctx.strokeStyle = '#666666';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(chartWidth + 2, y);
      ctx.lineTo(chartWidth + 8, y);
      ctx.stroke();
      ctx.globalAlpha = 0.7;
    }
    
    // Current price indicator
    const lastCandle = bitcoinCandles[bitcoinCandles.length - 1];
    if (lastCandle) {
      const currentPrice = lastCandle.close;
      const currentPriceY = margin + ((maxPrice - currentPrice) / priceRange) * chartHeight;
      
      // Current price line across scale
      ctx.globalAlpha = 0.8;
      ctx.strokeStyle = '#ff6666';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(chartWidth, currentPriceY);
      ctx.lineTo(chartWidth + scaleWidth, currentPriceY);
      ctx.stroke();
      
      // Current price label without red background - just the text
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px JetBrains Mono, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${Math.round(currentPrice).toLocaleString()}`, chartWidth + scaleWidth/2, currentPriceY + 3);
      
      // Add live indicator (pulsing dot)
      const timeSinceUpdate = Date.now() - lastUpdateTime;
      const isRecent = timeSinceUpdate < 20000; // 20 seconds
      if (isRecent) {
        const alpha = 0.6 + 0.4 * Math.sin(Date.now() * 0.005); // Pulsing effect
        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#00ff88';
        ctx.beginPath();
        ctx.arc(chartWidth - 8, currentPriceY, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    
    // No header text - clean chart appearance
    
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
      
      // Cannon range calculation (invisible)
      const cannonRange = canvas.height * 0.70;
      const bottomLimit = canvas.height * 0.95;

      // Update and draw cannonballs
      updateCannonballs(deltaTime);
      state.cannonballs.forEach(ball => {
        drawCannonball(ctx, ball);
      });

      // Draw stylish mute button in bottom right corner
      const buttonSize = 40;
      const buttonX = canvas.width - buttonSize - 15;
      const buttonY = canvas.height - buttonSize - 15;
      
      // Button background with gradient
      const gradient = ctx.createRadialGradient(buttonX + buttonSize/2, buttonY + buttonSize/2, 0, buttonX + buttonSize/2, buttonY + buttonSize/2, buttonSize/2);
      if (isSoundMuted) {
        gradient.addColorStop(0, '#ff6b6b');
        gradient.addColorStop(1, '#ee5a52');
      } else {
        gradient.addColorStop(0, '#51cf66');
        gradient.addColorStop(1, '#40c057');
      }
      
      ctx.fillStyle = gradient;
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      ctx.roundRect(buttonX, buttonY, buttonSize, buttonSize, 8);
      ctx.fill();
      
      // Border with cyber theme
      ctx.strokeStyle = isSoundMuted ? '#ff9999' : '#69db7c';
      ctx.lineWidth = 2;
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.roundRect(buttonX, buttonY, buttonSize, buttonSize, 8);
      ctx.stroke();
      
      // Speaker icon
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(isSoundMuted ? '🔇' : '🔊', buttonX + buttonSize/2, buttonY + buttonSize/2);

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
