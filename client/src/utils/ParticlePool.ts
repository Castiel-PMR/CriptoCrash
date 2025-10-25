/**
 * 🎯 Object Pool для Particles
 * Цель: Переиспользование объектов вместо создания новых
 * Результат: Снижение нагрузки на GC (Garbage Collector)
 */

import { Particle } from '../types/liquidation';

export class ParticlePool {
  private pool: Particle[] = [];
  private active = new Set<Particle>();
  private readonly maxPoolSize: number;
  private particleCounter = 0;

  constructor(initialSize: number = 200, maxSize: number = 500) {
    this.maxPoolSize = maxSize;
    
    // Предварительное создание пула
    for (let i = 0; i < initialSize; i++) {
      this.pool.push(this.createParticle());
    }
  }

  /**
   * Получить частицу из пула
   */
  acquire(x: number, y: number, color: string, size: number, vx: number, vy: number, decay: number): Particle {
    let particle: Particle;
    
    if (this.pool.length > 0) {
      // Переиспользуем из пула
      particle = this.pool.pop()!;
      this.resetParticle(particle, x, y, color, size, vx, vy, decay);
    } else {
      // Создаем новую только если пул пуст
      particle = this.createParticle();
      this.resetParticle(particle, x, y, color, size, vx, vy, decay);
    }
    
    this.active.add(particle);
    return particle;
  }

  /**
   * Вернуть частицу в пул
   */
  release(particle: Particle): void {
    if (!this.active.has(particle)) return;
    
    this.active.delete(particle);
    
    // Не добавляем в пул больше максимума
    if (this.pool.length < this.maxPoolSize) {
      this.pool.push(particle);
    }
  }

  /**
   * Создание новой частицы
   */
  private createParticle(): Particle {
    return {
      id: `particle_${this.particleCounter++}`,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      life: 1,
      decay: 0.02,
      color: '#ffd700',
      size: 5,
      createdAt: Date.now(),
    };
  }

  /**
   * Сброс параметров частицы
   */
  private resetParticle(
    particle: Particle,
    x: number,
    y: number,
    color: string,
    size: number,
    vx: number,
    vy: number,
    decay: number
  ): void {
    particle.x = x;
    particle.y = y;
    particle.vx = vx;
    particle.vy = vy;
    particle.life = 1;
    particle.decay = decay;
    particle.color = color;
    particle.size = size;
    particle.createdAt = Date.now();
  }

  /**
   * Получить статистику пула
   */
  getStats() {
    return {
      poolSize: this.pool.length,
      activeCount: this.active.size,
      totalCreated: this.particleCounter,
    };
  }

  /**
   * Очистить пул (при unmount компонента)
   */
  clear(): void {
    this.pool = [];
    this.active.clear();
  }
}
