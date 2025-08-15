import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { Liquidation, Platform } from '@shared/schema';
import { LiquidationBlock, Particle, AnimationState } from '../types/liquidation';

interface LiquidationCanvasProps {
  liquidations: Liquidation[];
  isPaused: boolean;
}

interface ExtendedAnimationState extends AnimationState {
  platform: Platform;
}

export function LiquidationCanvas({ liquidations, isPaused }: LiquidationCanvasProps) {
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

  const processedLiquidations = useRef(new Set<string>());

  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

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

  // Create liquidation block from data
  const createLiquidationBlock = useCallback((liquidation: Liquidation): LiquidationBlock => {
    const canvas = canvasRef.current;
    if (!canvas) throw new Error('Canvas not available');

    // Calculate size based on liquidation value (more dramatic scaling)
    const value = liquidation.value;
    let size;
    
    // Фиксированная система размеров и скоростей (увеличенные скорости)
    let baseVelocity;
    if (value < 5000) {
      size = 60; // Очень маленькие
      baseVelocity = 5.0; // Быстрые
    } else if (value < 15000) {
      size = 80; // Маленькие  
      baseVelocity = 4.0; // Средне-быстрые
    } else if (value < 50000) {
      size = 100; // Средние
      baseVelocity = 3.2; // Средние
    } else if (value < 100000) {
      size = 130; // Средне-большие
      baseVelocity = 2.5; // Средне-медленные
    } else if (value < 500000) {
      size = 160; // Большие
      baseVelocity = 2.0; // Медленные
    } else if (value < 1000000) {
      size = 200; // Очень большие
      baseVelocity = 1.5; // Очень медленные
    } else {
      size = 250; // Огромные
      baseVelocity = 1.2; // Самые медленные
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

    // Постоянная физика с базовой скоростью мешочка
    block.y += block.velocity; // Используем базовую скорость мешочка
    block.rotation += block.rotationSpeed;

    // Check if hit bottom
    if (block.y + block.height >= canvas.height - 60) {
      block.isExploding = true;
      block.explosionTime = 0;

      // Create normal coin particles (fewer particles for missed bags)
      const particleCount = Math.min(20, Math.floor(block.width / 4));
      const state = animationStateRef.current;
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

  // Static Bitcoin chart data - generated once
  const staticBitcoinData = useMemo(() => {
    const dataPoints = 100;
    const basePrice = 96000; // Current BTC price around $96k
    const volatility = 2000; // Price volatility
    
    // Create realistic price movement
    const prices: number[] = [];
    let currentPrice = basePrice;
    
    for (let i = 0; i < dataPoints; i++) {
      // Add some realistic price movement
      const change = (Math.random() - 0.5) * volatility * 0.1;
      currentPrice += change;
      
      // Keep price in reasonable range
      currentPrice = Math.max(basePrice - volatility, Math.min(basePrice + volatility, currentPrice));
      prices.push(currentPrice);
    }
    
    return prices;
  }, []);

  // Draw Bitcoin chart background
  const drawBitcoinChart = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.save();
    
    // Very dim background for the chart
    ctx.globalAlpha = 0.08;
    
    const prices = staticBitcoinData;
    
    // Find min/max for scaling
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice;
    
    // Draw grid lines
    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 1;
    
    // Horizontal grid lines (price levels)
    for (let i = 0; i <= 10; i++) {
      const y = (height * i) / 10;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    
    // Vertical grid lines (time)
    for (let i = 0; i <= 12; i++) {
      const x = (width * i) / 12;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    
    // Draw price line
    ctx.strokeStyle = '#f7931a'; // Bitcoin orange color
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    for (let i = 0; i < prices.length; i++) {
      const x = (width * i) / (prices.length - 1);
      const normalizedPrice = (prices[i] - minPrice) / priceRange;
      const y = height - (normalizedPrice * height * 0.8) - (height * 0.1); // Leave margins
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
    
    // Draw price labels
    ctx.fillStyle = '#666666';
    ctx.font = '12px JetBrains Mono, monospace';
    ctx.textAlign = 'right';
    
    // Current price at the end
    const currentY = height - ((prices[prices.length - 1] - minPrice) / priceRange * height * 0.8) - (height * 0.1);
    ctx.fillText(`$${Math.round(prices[prices.length - 1]).toLocaleString()}`, width - 10, currentY);
    
    // High price
    ctx.fillText(`$${Math.round(maxPrice).toLocaleString()}`, width - 10, height * 0.1 + 15);
    
    // Low price
    ctx.fillText(`$${Math.round(minPrice).toLocaleString()}`, width - 10, height * 0.9);
    
    // Time labels
    ctx.textAlign = 'center';
    ctx.fillText('24h', width * 0.1, height - 10);
    ctx.fillText('12h', width * 0.5, height - 10);
    ctx.fillText('Now', width * 0.9, height - 10);
    
    ctx.restore();
  }, [staticBitcoinData]);

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
      drawBitcoinChart(ctx, canvas.width, canvas.height);



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

      // Draw controls instructions
      ctx.save();
      ctx.fillStyle = '#87CEEB';
      ctx.font = '14px JetBrains Mono, monospace';
      ctx.textAlign = 'right';
      ctx.fillText('Кликните по мешочкам чтобы взорвать их', canvas.width - 20, canvas.height - 40);
      ctx.restore();
    }

    requestAnimationFrame(animate);
  }, [isPaused, updateLiquidationBlock, updateParticle, drawLiquidationBlock, drawParticle]);

  // Add new liquidations to animation (without duplicates)
  useEffect(() => {
    const state = animationStateRef.current;
    
    liquidations.forEach(liquidation => {
      // Check if already processed
      if (!processedLiquidations.current.has(liquidation.id)) {
        // Check if already exists in current animation
        const exists = state.liquidations.some(block => block.id === liquidation.id);
        if (!exists) {
          try {
            const block = createLiquidationBlock(liquidation);
            state.liquidations.push(block);
            processedLiquidations.current.add(liquidation.id);
            
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
      
      {/* Impact Zone Indicator */}
      <div className="absolute bottom-0 left-0 right-0 h-16 impact-zone pointer-events-none">
        <div className="h-full flex items-center justify-center">
          <span className="text-accent-blue text-sm font-mono opacity-60">IMPACT ZONE</span>
        </div>
      </div>
    </div>
  );
}
