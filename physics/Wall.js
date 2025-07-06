
// Wall Class
class Wall {
    constructor(x1, y1, x2, y2, color = '#ff4444', width = 20) {
        this.x1 = x1;
        this.y1 = y1;
        this.x2 = x2;
        this.y2 = y2;
        this.color = color;
        this.width = width;
    }

    draw(ctx) {
        ctx.strokeStyle = this.color;
        ctx.lineWidth = this.width;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(this.x1, this.y1);
        ctx.lineTo(this.x2, this.y2);
        ctx.stroke();
    }

    checkCollision(ball) {
        const distance = distanceToLineSegment(ball.position, new Vector2D(this.x1, this.y1), new Vector2D(this.x2, this.y2));

        if (distance < ball.radius + this.width / 2) {
            const normal = getNormalToLineSegment(ball.position, new Vector2D(this.x1, this.y1), new Vector2D(this.x2, this.y2));

            const overlap = ball.radius + this.width / 2 - distance;
            const pushDistance = overlap * 0.8;
            ball.position.x += normal.x * pushDistance;
            ball.position.y += normal.y * pushDistance;

            const dotProduct = ball.velocity.dot(normal);
            ball.velocity.x -= 2 * dotProduct * normal.x;
            ball.velocity.y -= 2 * dotProduct * normal.y;
            ball.velocity.multiply(CONFIG.BOUNCE_DAMPING);

            return true;
        }
        return false;
    }
}
