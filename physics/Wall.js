
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
        // Проверяем коллизию с учетом предыдущей позиции шарика
        const prevPosition = new Vector2D(
            ball.position.x - ball.velocity.x,
            ball.position.y - ball.velocity.y
        );
        
        const distance = distanceToLineSegment(ball.position, new Vector2D(this.x1, this.y1), new Vector2D(this.x2, this.y2));
        const prevDistance = distanceToLineSegment(prevPosition, new Vector2D(this.x1, this.y1), new Vector2D(this.x2, this.y2));
        
        // Проверяем, пересекает ли траектория шарика стенку
        const collisionRadius = ball.radius + this.width / 2;
        
        if (distance < collisionRadius || (prevDistance > collisionRadius && distance < prevDistance)) {
            const normal = getNormalToLineSegment(ball.position, new Vector2D(this.x1, this.y1), new Vector2D(this.x2, this.y2));

            // Полностью вытолкнуть шарик из стенки
            const overlap = Math.max(0, collisionRadius - distance);
            ball.position.x += normal.x * (overlap + 2);
            ball.position.y += normal.y * (overlap + 2);

            // Отражение скорости
            const dotProduct = ball.velocity.dot(normal);
            if (dotProduct < 0) { // Только если шарик движется к стенке
                ball.velocity.x -= 2 * dotProduct * normal.x;
                ball.velocity.y -= 2 * dotProduct * normal.y;
                ball.velocity.multiply(CONFIG.BOUNCE_DAMPING);
            }

            return true;
        }
        return false;
    }
}
