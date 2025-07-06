
// Bumper Class
class Bumper {
    constructor(x, y, radius = 20) {
        this.position = new Vector2D(x, y);
        this.radius = radius;
        this.hitAnimation = 0;
        this.points = 100;
        this.x = x; // For compatibility
        this.y = y; // For compatibility
    }

    update() {
        if (this.hitAnimation > 0) {
            this.hitAnimation -= 0.1;
        }
    }

    checkCollision(ball) {
        const dx = ball.position.x - this.position.x;
        const dy = ball.position.y - this.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < ball.radius + this.radius) {
            const normal = new Vector2D(dx / distance, dy / distance);

            const overlap = ball.radius + this.radius - distance + 2;
            ball.position.x += normal.x * overlap;
            ball.position.y += normal.y * overlap;

            const bounceForce = 15;
            ball.velocity.x = normal.x * bounceForce;
            ball.velocity.y = normal.y * bounceForce;

            this.hitAnimation = 1;
            return this.points;
        }
        return 0;
    }

    draw(ctx) {
        const animRadius = this.radius + this.hitAnimation * 10;

        const gradient = ctx.createRadialGradient(
            this.position.x - 5, this.position.y - 5, 0,
            this.position.x, this.position.y, animRadius
        );
        gradient.addColorStop(0, '#ffffff');
        gradient.addColorStop(0.3, '#ff4444');
        gradient.addColorStop(1, '#aa0000');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(this.position.x, this.position.y, animRadius, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();

        if (this.hitAnimation > 0) {
            ctx.shadowColor = '#ff4444';
            ctx.shadowBlur = 20;
            ctx.strokeStyle = '#ffff00';
            ctx.lineWidth = 3;
            ctx.stroke();
            ctx.shadowBlur = 0;
        }
    }
}
