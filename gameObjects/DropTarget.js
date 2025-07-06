
// Drop Target Class
class DropTarget {
    constructor(x, y, width = 15, height = 30) {
        this.position = new Vector2D(x, y);
        this.width = width;
        this.height = height;
        this.isActive = true;
        this.points = 200;
        this.resetTime = 0;
        this.x = x; // For compatibility
        this.y = y; // For compatibility
    }

    update() {
        if (!this.isActive && this.resetTime > 0) {
            this.resetTime--;
            if (this.resetTime <= 0) {
                this.isActive = true;
            }
        }
    }

    checkCollision(ball) {
        if (!this.isActive) return 0;

        const dx = Math.abs(ball.position.x - this.position.x);
        const dy = Math.abs(ball.position.y - this.position.y);

        if (dx < this.width/2 + ball.radius && dy < this.height/2 + ball.radius) {
            this.isActive = false;
            this.resetTime = 300;

            const normalX = ball.position.x < this.position.x ? -1 : 1;
            ball.velocity.x = Math.abs(ball.velocity.x) * normalX * 1.2;

            return this.points;
        }
        return 0;
    }

    reset() {
        this.isActive = true;
        this.resetTime = 0;
    }

    draw(ctx) {
        if (!this.isActive) return;

        const gradient = ctx.createLinearGradient(
            this.position.x - this.width/2, this.position.y,
            this.position.x + this.width/2, this.position.y
        );
        gradient.addColorStop(0, '#ff8800');
        gradient.addColorStop(0.5, '#ffaa00');
        gradient.addColorStop(1, '#ff8800');

        ctx.fillStyle = gradient;
        ctx.fillRect(
            this.position.x - this.width/2,
            this.position.y - this.height/2,
            this.width,
            this.height
        );

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.strokeRect(
            this.position.x - this.width/2,
            this.position.y - this.height/2,
            this.width,
            this.height
        );
    }
}
