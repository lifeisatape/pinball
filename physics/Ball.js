
// Ball Class
class Ball {
    constructor(x, y) {
        this.position = new Vector2D(x, y);
        this.velocity = new Vector2D(0, 0);
        this.radius = CONFIG.BALL_RADIUS;
    }

    update() {
        this.velocity.add(new Vector2D(0, CONFIG.GRAVITY));
        this.velocity.clamp(CONFIG.MAX_BALL_SPEED);
        this.velocity.multiply(CONFIG.FRICTION);
        this.position.add(this.velocity);
        return this.handleWallCollisions();
    }

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
