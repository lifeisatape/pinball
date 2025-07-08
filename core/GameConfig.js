// Game Configuration
const CONFIG = {
    GRAVITY: 0.3,
    FRICTION: 0.98,
    BOUNCE_DAMPING: 0.78,
    FLIPPER_STRENGTH: 12,
    BALL_RADIUS: 7,
    FLIPPER_LENGTH: 50,
    FLIPPER_WIDTH: 8,
    LAUNCH_POWER: 20,
    MAX_BALL_SPEED: 20,
    VIRTUAL_WIDTH: 320,
    VIRTUAL_HEIGHT: 480,
    BUMPER_BOUNCE_FORCE: 10,
    SPINNER_BOUNCE_FORCE: 5,
    
    // Physics improvements
    FIXED_TIME_STEP: 1/120, // 120 FPS для стабильности
    MAX_SUB_STEPS: 8,       // Максимум подшагов для CCD
    COLLISION_TOLERANCE: 0.1, // Допуск для разделения объектов
    MIN_VELOCITY_THRESHOLD: 0.1 // Минимальная скорость для остановки
};