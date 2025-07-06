
// Ramp Class
class Ramp {
    constructor(points, width = 10) {
        this.points = points;
        this.width = width;
    }

    checkCollision(ball) {
        for (let i = 0; i < this.points.length - 1; i++) {
            const start = this.points[i];
            const end = this.points[i + 1];

            const distance = distanceToLineSegment(ball.position, start, end);

            if (distance < ball.radius + this.width / 2) {
                const normal = getNormalToLineSegment(ball.position, start, end);

                const overlap = ball.radius + this.width / 2 - distance;
                ball.position.x += normal.x * overlap;
                ball.position.y += normal.y * overlap;

                const dotProduct = ball.velocity.dot(normal);
                ball.velocity.x -= 2 * dotProduct * normal.x;
                ball.velocity.y -= 2 * dotProduct * normal.y;
                ball.velocity.multiply(0.9);

                return true;
            }
        }
        return false;
    }

    draw(ctx) {
        if (this.points.length < 2) return;

        // Green color scheme
        ctx.strokeStyle = '#44ff88';
        ctx.lineWidth = this.width;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.beginPath();
        ctx.moveTo(this.points[0].x, this.points[0].y);

        for (let i = 1; i < this.points.length; i++) {
            ctx.lineTo(this.points[i].x, this.points[i].y);
        }

        ctx.stroke();

        // Green glow effect
        ctx.shadowColor = '#44ff88';
        ctx.shadowBlur = 10;
        ctx.stroke();
        ctx.shadowBlur = 0;
    }
}
