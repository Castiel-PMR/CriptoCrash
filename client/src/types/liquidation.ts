export interface LiquidationBlock {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  velocity: number;
  rotation: number;
  rotationSpeed: number;
  coin: string;
  isLong: boolean;
  amount: number;
  price: number;
  opacity: number;
  isExploding: boolean;
  explosionTime: number;
  isCaught: boolean;
}

export interface Particle {
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

export interface Robot {
  x: number;
  y: number;
  targetX: number;
  isActive: boolean;
  isSwinging: boolean;
  swingProgress: number;
  targetBag: string | null;
}

export interface AnimationState {
  liquidations: LiquidationBlock[];
  particles: Particle[];
  animationSpeed: number;
  isPaused: boolean;
  lastTime: number;
}
