// Ball Class - ОРИГИНАЛ + Anti-tunneling
class Ball {
    constructor(x, y) {
        this.position = new Vector2D(x, y);
        this.velocity = new Vector2D(0, 0);
        this.radius = CONFIG.BALL_RADIUS;

        // Только для anti-tunneling
        this.lastPosition = new Vector2D(x, y);
    }

    update() {
        // Сохраняем позицию ДО движения
        this.lastPosition.x = this.position.x;
        this.lastPosition.y = this.position.y;

        // ОРИГИНАЛЬНАЯ ФИЗИКА (не изменяем!)
        this.velocity.add(new Vector2D(0, CONFIG.GRAVITY));
        this.velocity.clamp(Math.min(CONFIG.MAX_BALL_SPEED, 15)); // Ограничение скорости при высоком FPS
        this.velocity.multiply(CONFIG.FRICTION);

        // Anti-tunneling: если скорость слишком высокая, разбиваем движение на шаги
        const speed = this.velocity.magnitude();
        if (speed > this.radius * 0.3) { // Более агрессивная проверка
            // Разбиваем движение на шаги размером с радиус мяча
            const steps = Math.ceil(speed / (this.radius * 0.25)); // Меньшие шаги
            const stepVelocity = new Vector2D(this.velocity.x / steps, this.velocity.y / steps);

            for (let i = 0; i < steps; i++) {
                this.position.add(stepVelocity);

                // Проверяем границы на каждом шаге
                if (this.checkBoundaryCollisionStep()) {
                    break; // Если столкнулись, прекращаем движение
                }
            }
        } else {
            // Обычное движение для низких скоростей
            this.position.add(this.velocity);
        }

        return this.handleWallCollisions();
    }

    // Новый метод: проверка границ на каждом подшаге
    checkBoundaryCollisionStep() {
        let collision = false;

        // Левая граница
        if (this.position.x < this.radius) {
            this.position.x = this.radius;
            this.velocity.x *= -CONFIG.BOUNCE_DAMPING;
            collision = true;
        }

        // Правая граница
        if (this.position.x > CONFIG.VIRTUAL_WIDTH - this.radius) {
            this.position.x = CONFIG.VIRTUAL_WIDTH - this.radius;
            this.velocity.x *= -CONFIG.BOUNCE_DAMPING;
            collision = true;
        }

        // Верхняя граница
        if (this.position.y < this.radius) {
            this.position.y = this.radius;
            this.velocity.y *= -CONFIG.BOUNCE_DAMPING;
            collision = true;
        }

        return collision;
    }

    // ОРИГИНАЛЬНЫЙ метод границ (оставляем как есть)
    handleWallCollisions() {
        // Левая граница
        if (this.position.x < this.radius) {
            this.position.x = this.radius;
            this.velocity.x *= -CONFIG.BOUNCE_DAMPING;
        }

        // Правая граница
        if (this.position.x > CONFIG.VIRTUAL_WIDTH - this.radius) {
            this.position.x = CONFIG.VIRTUAL_WIDTH - this.radius;
            this.velocity.x *= -CONFIG.BOUNCE_DAMPING;
        }

        // Верхняя граница
        if (this.position.y < this.radius) {
            this.position.y = this.radius;
            this.velocity.y *= -CONFIG.BOUNCE_DAMPING;
        }

        // Проверка на потерю мяча (низ экрана)
        return this.position.y > CONFIG.VIRTUAL_HEIGHT + 50;
    }

    // ОРИГИНАЛЬНЫЙ reset
    reset() {
        this.position.x = CONFIG.VIRTUAL_WIDTH * 0.51;
        this.position.y = 50;
        this.velocity.x = 0;
        this.velocity.y = 0;
        this.lastPosition.x = this.position.x;
        this.lastPosition.y = this.position.y;
    }

    // МЕТАЛЛИЧЕСКИЙ вид шарика
    draw(ctx) {
        const gradient = ctx.createRadialGradient(
            this.position.x - 3, this.position.y - 3, 0,
            this.position.x, this.position.y, this.radius
        );
        gradient.addColorStop(0, '#ffffff');
        gradient.addColorStop(0.2, '#e6e6e6');
        gradient.addColorStop(0.5, '#c0c0c0');
        gradient.addColorStop(0.8, '#909090');
        gradient.addColorStop(1, '#606060');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2);
        ctx.fill();

        // Металлический блик
        const highlight = ctx.createRadialGradient(
            this.position.x - 2, this.position.y - 2, 0,
            this.position.x - 2, this.position.y - 2, this.radius * 0.6
        );
        highlight.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
        highlight.addColorStop(1, 'rgba(255, 255, 255, 0)');

        ctx.fillStyle = highlight;
        ctx.beginPath();
        ctx.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2);
        ctx.fill();

        // Темная окантовка для металлического эффекта
        ctx.strokeStyle = '#404040';
        ctx.lineWidth = 1;
        ctx.stroke();
    }

    // Новый метод: проверка линии движения для коллизий
    // Используется другими объектами для anti-tunneling
    getMovementLine() {
        return {
            start: this.lastPosition.copy(),
            end: this.position.copy(),
            radius: this.radius
        };
    }

    // Новый метод: безопасное перемещение назад при коллизии
    moveBack(factor = 0.5) {
        this.position.x = this.lastPosition.x + (this.position.x - this.lastPosition.x) * factor;
        this.position.y = this.lastPosition.y + (this.position.y - this.lastPosition.y) * factor;
    }
}