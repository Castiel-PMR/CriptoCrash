import { Cannon, Cannonball, LiquidationBlock } from '../types/liquidation';

/**
 * Update cannon movement and firing animation
 */
export function updateCannons(
  leftCannon: Cannon,
  canvasWidth: number,
  canvasHeight: number,
  deltaTime: number
): void {
  // Фиксированные границы движения (оставляем 100px справа для кнопки звука)
  const minX = 30;
  const maxX = canvasWidth - 120;
  
  // Инициализация границ только один раз
  if (leftCannon.minX === undefined || leftCannon.maxX === 0) {
    leftCannon.minX = minX;
    leftCannon.maxX = maxX;
  }
  
  // Принудительная проверка границ - если пушка вышла за пределы, возвращаем обратно
  if (leftCannon.x < minX) {
    leftCannon.x = minX;
    leftCannon.movingRight = true;
  }
  if (leftCannon.x > maxX) {
    leftCannon.x = maxX;
    leftCannon.movingRight = false;
  }
  
  // Move cannon horizontally along bottom border
  const frameMultiplier = deltaTime / 16.67;
  const speed = leftCannon.speed || 1.0;
  
  let movementDirection = 0;
  if (leftCannon.movingRight) {
    leftCannon.x += speed * frameMultiplier;
    movementDirection = 1;
    // Достигли правой границы - разворачиваемся
    if (leftCannon.x >= maxX) {
      leftCannon.x = maxX; // Строго фиксируем позицию
      leftCannon.movingRight = false;
    }
  } else {
    leftCannon.x -= speed * frameMultiplier;
    movementDirection = -1;
    // Достигли левой границы - разворачиваемся
    if (leftCannon.x <= minX) {
      leftCannon.x = minX; // Строго фиксируем позицию
      leftCannon.movingRight = true;
    }
  }
  
  // Rotate wheels based on movement direction (realistic wheel rotation)
  const wheelRadius = 15;
  const distancePerFrame = speed * frameMultiplier;
  const rotationPerFrame = (distancePerFrame / wheelRadius) * movementDirection;
  leftCannon.wheelRotation = (leftCannon.wheelRotation || 0) + rotationPerFrame;
  
  // Position cannon slightly raised from bottom
  leftCannon.y = canvasHeight - 50;
  
  // Update firing animation for left cannon only
  if (leftCannon.isFiring) {
    leftCannon.fireProgress += deltaTime * 0.02;
    
    if (leftCannon.fireProgress >= 1) {
      leftCannon.isFiring = false;
      leftCannon.fireProgress = 0;
      leftCannon.targetBag = null;
    }
  }
}

/**
 * Update cannonballs positions and lifetime
 */
export function updateCannonballs(cannonballs: Cannonball[], deltaTime: number): Cannonball[] {
  const frameMultiplier = deltaTime / 16.67; // Нормализация к 60 FPS
  
  return cannonballs.filter(ball => {
    ball.x += ball.vx * frameMultiplier;
    ball.y += ball.vy * frameMultiplier;
    ball.life -= deltaTime;
    
    return ball.life > 0;
  });
}

/**
 * Check if cannon should fire at a bag and create cannonball if needed
 */
export function checkAndFireCannon(
  block: LiquidationBlock,
  leftCannon: Cannon,
  cannonballs: Cannonball[],
  canvasHeight: number,
  playCannonSound: (isLeftCannon: boolean) => void
): void {
  // Зона стрельбы близко ко дну - стреляем только когда мешок близко
  const cannonRange = canvasHeight * 0.75; // Начинаем стрелять с 75% высоты (ближе ко дну)
  const bottomLimit = canvasHeight * 0.98; // Почти до самого дна
  
  // Проверяем, не стреляли ли мы уже по этому мешку
  const alreadyTargeted = cannonballs.some(ball => ball.targetBagId === block.id);
  
  // Fire at bags in range - ОДИН РАЗ на мешок
  if (block.y + block.height >= cannonRange && 
      block.y + block.height <= bottomLimit && 
      !alreadyTargeted) {
    
    // Высокая вероятность, но стреляем только один раз
    const bagProgress = (block.y + block.height - cannonRange) / (bottomLimit - cannonRange);
    const baseProbability = 0.08; // 8% базовая вероятность на каждый кадр
    const progressMultiplier = 1 + bagProgress * 19; // До 20x у дна
    const shouldFire = Math.random() < (baseProbability * progressMultiplier);
    
    // Fire cannon if not currently firing
    if (!leftCannon.isFiring && shouldFire) {
      const bagCenterX = block.x + block.width / 2;
      const bagCenterY = block.y + block.height / 2;
      
      // Calculate angle and fire
      const dx = bagCenterX - leftCannon.x;
      const dy = bagCenterY - leftCannon.y;
      leftCannon.angle = Math.atan2(dy, dx);
      leftCannon.isFiring = true;
      leftCannon.fireProgress = 0;
      leftCannon.targetBag = block.id;
      
      // Calculate distance and MEGA speed
      const distance = Math.sqrt(dx * dx + dy * dy);
      const baseSpeed = 50; // ОГРОМНАЯ скорость - ядро летит мгновенно!
      
      // Гарантированное время жизни - ядро ВСЕГДА долетит
      const timeToReach = distance / baseSpeed;
      const lifeTime = Math.max(1000, timeToReach * 5.0); // Огромный запас времени!
      
      cannonballs.push({
        x: leftCannon.x,
        y: leftCannon.y,
        vx: (dx / distance) * baseSpeed,
        vy: (dy / distance) * baseSpeed,
        targetBagId: block.id,
        life: lifeTime,
      });
      
      // Play cannon sound effect
      playCannonSound(leftCannon.side === 'left');
    }
  }
}

/**
 * Draw cannon in historical 17-18 century style
 */
export function drawCannon(ctx: CanvasRenderingContext2D, cannon: Cannon): void {
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
  
  // Barrel rotation based on firing state with safe fallback
  const barrelAngle = cannon.isFiring ? (cannon.angle ?? 0) : 0;
  
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
    const flashAlpha = Math.max(0, (1 - cannon.fireProgress * 2.5));
    
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
}

/**
 * Draw cannonball (historical iron ball)
 */
export function drawCannonball(ctx: CanvasRenderingContext2D, ball: Cannonball): void {
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
}
