/**
 * 🎮 FPS Limiter
 * Цель: Ограничить частоту кадров для снижения нагрузки
 * Результат: Стабильный 60 FPS, меньше нагрузки на CPU
 */

export class FPSLimiter {
  private targetFPS: number;
  private frameTime: number;
  private lastFrameTime: number = 0;
  private frameCount: number = 0;
  private fpsUpdateInterval: number = 1000; // 1 секунда
  private lastFPSUpdate: number = 0;
  private currentFPS: number = 0;

  constructor(targetFPS: number = 60) {
    this.targetFPS = targetFPS;
    this.frameTime = 1000 / targetFPS;
  }

  /**
   * Проверить, можно ли рендерить следующий кадр
   */
  shouldRender(currentTime: number): boolean {
    const deltaTime = currentTime - this.lastFrameTime;
    
    if (deltaTime >= this.frameTime) {
      this.lastFrameTime = currentTime - (deltaTime % this.frameTime);
      this.frameCount++;
      
      // Обновляем FPS каждую секунду
      if (currentTime - this.lastFPSUpdate >= this.fpsUpdateInterval) {
        this.currentFPS = Math.round((this.frameCount * 1000) / (currentTime - this.lastFPSUpdate));
        this.frameCount = 0;
        this.lastFPSUpdate = currentTime;
      }
      
      return true;
    }
    
    return false;
  }

  /**
   * Получить текущий FPS
   */
  getFPS(): number {
    return this.currentFPS;
  }

  /**
   * Получить delta time (для физики)
   */
  getDeltaTime(currentTime: number): number {
    return currentTime - this.lastFrameTime;
  }

  /**
   * Сбросить счетчики
   */
  reset(): void {
    this.lastFrameTime = 0;
    this.frameCount = 0;
    this.lastFPSUpdate = 0;
    this.currentFPS = 0;
  }

  /**
   * Изменить целевой FPS
   */
  setTargetFPS(fps: number): void {
    this.targetFPS = fps;
    this.frameTime = 1000 / fps;
  }
}
