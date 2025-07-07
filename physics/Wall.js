
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
        
        if (this.type === 'semicircle' || this.type === 'quarter') {
            // Draw arc
            ctx.arc(this.centerX, this.centerY, this.radius, this.startAngle, this.endAngle);
        } else {
            // Draw straight line
            ctx.moveTo(this.x1, this.y1);
            ctx.lineTo(this.x2, this.y2);
        }
        
        ctx.stroke();
    }

    checkCollision(ball) {
        if (this.type === 'semicircle' || this.type === 'quarter') {
            return this.checkArcCollision(ball);
        } else {
            return this.checkLineCollision(ball);
        }
    }

    checkArcCollision(ball) {
        const dx = ball.position.x - this.centerX;
        const dy = ball.position.y - this.centerY;
        const distanceFromCenter = Math.sqrt(dx * dx + dy * dy);

        // Проверяем, находится ли мяч в области дуги
        const minDistance = this.radius - this.width / 2 - ball.radius;
        const maxDistance = this.radius + this.width / 2 + ball.radius;

        if (distanceFromCenter >= minDistance && distanceFromCenter <= maxDistance) {
            // Проверяем угол
            let angle = Math.atan2(dy, dx);
            if (angle < 0) angle += Math.PI * 2;

            let startAngle = this.startAngle;
            let endAngle = this.endAngle;
            if (startAngle < 0) startAngle += Math.PI * 2;
            if (endAngle < 0) endAngle += Math.PI * 2;

            let withinArc = false;
            if (startAngle <= endAngle) {
                withinArc = angle >= startAngle && angle <= endAngle;
            } else {
                withinArc = angle >= startAngle || angle <= endAngle;
            }

            if (withinArc) {
                const targetRadius = this.radius;
                const currentDistance = distanceFromCenter;

                if (Math.abs(currentDistance - targetRadius) < this.width / 2 + ball.radius) {
                    // Вычисляем нормаль
                    const normal = new Vector2D(dx / distanceFromCenter, dy / distanceFromCenter);
                    
                    // Корректируем нормаль в зависимости от внутренней/внешней коллизии
                    if (currentDistance < targetRadius) {
                        normal.x *= -1;
                        normal.y *= -1;
                    }

                    // Разделяем объекты более эффективно
                    const overlap = ball.radius + this.width / 2 - Math.abs(currentDistance - targetRadius);
                    const separation = Math.max(overlap + 1, 2); // Гарантируем разделение
                    
                    ball.position.x += normal.x * separation;
                    ball.position.y += normal.y * separation;

                    // Реалистичное отражение с учетом входящей скорости
                    const velocityDotNormal = ball.velocity.dot(normal);
                    
                    // Отражаем только если мяч движется к стене
                    if (velocityDotNormal < 0) {
                        // Упругое отражение с демпфированием
                        const restitution = CONFIG.BOUNCE_DAMPING * 0.8;
                        ball.velocity.x -= (1 + restitution) * velocityDotNormal * normal.x;
                        ball.velocity.y -= (1 + restitution) * velocityDotNormal * normal.y;
                        
                        // Дополнительное трение для реализма
                        ball.velocity.multiply(0.98);
                    }

                    return true;
                }
            }
        }
        return false;
    }

    checkLineCollision(ball) {
        const distance = distanceToLineSegment(ball.position, new Vector2D(this.x1, this.y1), new Vector2D(this.x2, this.y2));

        if (distance < ball.radius + this.width / 2) {
            const normal = getNormalToLineSegment(ball.position, new Vector2D(this.x1, this.y1), new Vector2D(this.x2, this.y2));

            // Более надежное разделение
            const overlap = ball.radius + this.width / 2 - distance;
            const separation = Math.max(overlap + 1, 2);
            
            ball.position.x += normal.x * separation;
            ball.position.y += normal.y * separation;

            // Реалистичное отражение
            const velocityDotNormal = ball.velocity.dot(normal);
            
            if (velocityDotNormal < 0) {
                const restitution = CONFIG.BOUNCE_DAMPING * 0.8;
                ball.velocity.x -= (1 + restitution) * velocityDotNormal * normal.x;
                ball.velocity.y -= (1 + restitution) * velocityDotNormal * normal.y;
                
                // Трение по поверхности
                ball.velocity.multiply(0.98);
            }

            return true;
        }
        return false;
    }
}
