// Drop Target Class
class DropTarget {
    constructor(x, y, width = 15, height = 30, shape = 'rectangle') {
        this.position = new Vector2D(x, y);
        this.width = width;
        this.height = height;
        this.shape = shape || 'rectangle';
        this.isActive = true;
        this.points = 200;
        this.resetTime = 0;
        this.x = x; // For compatibility
        this.y = y; // For compatibility
    }

    update() {
        // Handle respawn
        if (!this.isActive && this.resetTime > 0) {
            this.resetTime--;
            if (this.resetTime <= 0) {
                this.isActive = true;
                // Play target respawn sound
                window.soundManager.playSound('targetIn');
            }
        }
    }

    checkCollision(ball) {
        if (!this.isActive) return 0;

        if (this.shape === 'circle') {
            const radius = Math.max(this.width, this.height) / 2;
            const dx = ball.position.x - this.position.x;
            const dy = ball.position.y - this.position.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < radius + ball.radius) {
                this.isActive = false;
                this.resetTime = 300;

                // Calculate collision normal
                const normalX = dx / distance;
                const normalY = dy / distance;

                // Reflect velocity
                const dotProduct = ball.velocity.x * normalX + ball.velocity.y * normalY;
                ball.velocity.x = ball.velocity.x - 2 * dotProduct * normalX;
                ball.velocity.y = ball.velocity.y - 2 * dotProduct * normalY;

                // Add some boost
                ball.velocity.x *= 1.2;
                ball.velocity.y *= 1.2;

                return this.points;
            }
        } else {
            const dx = Math.abs(ball.position.x - this.position.x);
            const dy = Math.abs(ball.position.y - this.position.y);

            if (dx < this.width/2 + ball.radius && dy < this.height/2 + ball.radius) {
                this.isActive = false;
                this.resetTime = 300;

                const normalX = ball.position.x < this.position.x ? -1 : 1;
                ball.velocity.x = Math.abs(ball.velocity.x) * normalX * 1.2;

                // Play target hit sound
                window.soundManager.playSound('targetHit');

                return this.points;
            }
        }
        return 0;
    }

    draw(ctx) {
        if (!this.isActive) return;

        if (this.shape === 'circle') {
            const radius = Math.max(this.width, this.height) / 2;

            const gradient = ctx.createRadialGradient(
                this.position.x, this.position.y, 0,
                this.position.x, this.position.y, radius
            );
            gradient.addColorStop(0, '#ffaa00');
            gradient.addColorStop(0.7, '#ff8800');
            gradient.addColorStop(1, '#cc6600');

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(this.position.x, this.position.y, radius, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1;
            ctx.stroke();
        } else {
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
}