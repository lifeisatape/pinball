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
            ctx.arc(this.centerX, this.centerY, this.radius, this.startAngle, this.endAngle);
        } else {
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
                const normal = new Vector2D(dx / distanceFromCenter, dy / distanceFromCenter);

                if (distanceFromCenter < targetRadius) {
                    normal.x *= -1;
                    normal.y *= -1;
                }

                // Простое отражение без принудительного разделения
                const velocityDotNormal = ball.velocity.dot(normal);

                if (velocityDotNormal < 0) {
                    ball.velocity.x -= (1 + CONFIG.BOUNCE_DAMPING) * velocityDotNormal * normal.x;
                    ball.velocity.y -= (1 + CONFIG.BOUNCE_DAMPING) * velocityDotNormal * normal.y;
                }

                return true;
            }
        }
        return false;
    }

    checkLineCollision(ball) {
        // Вычисляем ближайшую точку на отрезке
        const A = ball.position.x - this.x1;
        const B = ball.position.y - this.y1;
        const C = this.x2 - this.x1;
        const D = this.y2 - this.y1;

        const dot = A * C + B * D;
        const lenSq = C * C + D * D;

        if (lenSq === 0) return false;

        let param = dot / lenSq;
        param = Math.max(0, Math.min(1, param)); // Ограничиваем отрезком

        const closestX = this.x1 + param * C;
        const closestY = this.y1 + param * D;

        const dx = ball.position.x - closestX;
        const dy = ball.position.y - closestY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        const collisionRadius = ball.radius + this.width / 2;

        if (distance < collisionRadius && distance > 0.1) {
            const normal = new Vector2D(dx / distance, dy / distance);

            // Простое отражение
            const velocityDotNormal = ball.velocity.dot(normal);

            if (velocityDotNormal < 0) {
                ball.velocity.x -= (1 + CONFIG.BOUNCE_DAMPING) * velocityDotNormal * normal.x;
                ball.velocity.y -= (1 + CONFIG.BOUNCE_DAMPING) * velocityDotNormal * normal.y;
            }

            return true;
        }
        return false;
    }
}