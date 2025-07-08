class Ball {
    constructor(x, y) {
        this.position = new Vector2D(x, y);
        this.velocity = new Vector2D(0, 0);
        this.radius = CONFIG.BALL_RADIUS;
        this.lastPosition = new Vector2D(x, y);
        this.minVelocity = 0.1;
    }

    update() {
        // Сохраняем последнюю позицию
        this.lastPosition.x = this.position.x;
        this.lastPosition.y = this.position.y;

        // Применяем гравитацию
        this.velocity.add(new Vector2D(0, CONFIG.GRAVITY));

        // Применяем трение воздуха
        this.velocity.multiply(CONFIG.FRICTION);

        // Останавливаем мяч если скорость очень мала
        if (this.velocity.magnitude() < this.minVelocity) {
            this.velocity.x *= 0.8;
            this.velocity.y *= 0.8;
        }

        // Ограничиваем максимальную скорость
        this.velocity.clamp(CONFIG.MAX_BALL_SPEED);

        // Простое перемещение без дополнительных проверок
        this.position.add(this.velocity);

        return this.handleWallCollisions();
    }

    handleWallCollisions() {
        let bounced = false;

        // Левая граница
        if (this.position.x < this.radius) {
            this.position.x = this.radius;
            if (this.velocity.x < 0) {
                this.velocity.x *= -CONFIG.BOUNCE_DAMPING;
                bounced = true;
            }
        }

        // Правая граница
        if (this.position.x > CONFIG.VIRTUAL_WIDTH - this.radius) {
            this.position.x = CONFIG.VIRTUAL_WIDTH - this.radius;
            if (this.velocity.x > 0) {
                this.velocity.x *= -CONFIG.BOUNCE_DAMPING;
                bounced = true;
            }
        }

        // Верхняя граница
        if (this.position.y < this.radius) {
            this.position.y = this.radius;
            if (this.velocity.y < 0) {
                this.velocity.y *= -CONFIG.BOUNCE_DAMPING;
                bounced = true;
            }
        }

        // Проверка на потерю мяча (низ экрана)
        return this.position.y > CONFIG.VIRTUAL_HEIGHT + 50;
    }

    reset() {
        this.position.x = CONFIG.VIRTUAL_WIDTH * 0.51;
        this.position.y = 50;
        this.velocity.x = 0;
        this.velocity.y = 0;
        this.lastPosition.x = this.position.x;
        this.lastPosition.y = this.position.y;
    }

    draw(ctx) {
        const gradient = ctx.createRadialGradient(
            this.position.x - 3, this.position.y - 3, 0,
            this.position.x, this.position.y, this.radius
        );
        gradient.addColorStop(0, '#ffffff');
        gradient.addColorStop(0.3, '#ffff80');
        gradient.addColorStop(1, '#ffcc00');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();
    }
}