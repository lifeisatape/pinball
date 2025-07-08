
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

                    // Мягкое разделение для дуг
                    const overlap = ball.radius + this.width / 2 - Math.abs(currentDistance - targetRadius);
                    
                    if (overlap > 0.5) {
                        const separationFactor = Math.min(overlap * 0.4, 1.5);
                        ball.position.x += normal.x * separationFactor;
                        ball.position.y += normal.y * separationFactor;
                    }

                    const velocityDotNormal = ball.velocity.dot(normal);
                    
                    if (velocityDotNormal < -0.5) {
                        const restitution = CONFIG.BOUNCE_DAMPING * 0.8;
                        ball.velocity.x -= (1 + restitution) * velocityDotNormal * normal.x;
                        ball.velocity.y -= (1 + restitution) * velocityDotNormal * normal.y;
                        ball.velocity.multiply(0.98);
                    } else if (overlap > 0) {
                        ball.velocity.multiply(0.995);
                    }

                    return true;
                }
            }
        }
        return false;
    }

    checkLineCollision(ball) {
        // Проверяем расстояние до отрезка
        const lineStart = new Vector2D(this.x1, this.y1);
        const lineEnd = new Vector2D(this.x2, this.y2);
        
        // Проверяем пересечение траектории мяча с отрезком стены
        if (this.checkTrajectoryIntersection(ball, lineStart, lineEnd)) {
            return true;
        }
        
        // Вычисляем ближайшую точку на отрезке
        const A = ball.position.x - this.x1;
        const B = ball.position.y - this.y1;
        const C = this.x2 - this.x1;
        const D = this.y2 - this.y1;

        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        
        if (lenSq === 0) return false; // Нулевой отрезок
        
        let param = dot / lenSq;
        let closestX, closestY;
        let isEndpoint = false;
        
        if (param < -0.1) {
            // Ближе к началу отрезка
            closestX = this.x1;
            closestY = this.y1;
            isEndpoint = true;
        } else if (param > 1.1) {
            // Ближе к концу отрезка
            closestX = this.x2;
            closestY = this.y2;
            isEndpoint = true;
        } else {
            // На отрезке или рядом с ним
            closestX = this.x1 + param * C;
            closestY = this.y1 + param * D;
        }

        const dx = ball.position.x - closestX;
        const dy = ball.position.y - closestY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        const collisionRadius = ball.radius + this.width / 2;

        if (distance < collisionRadius && distance > 0.01) {
            const normal = new Vector2D(dx / distance, dy / distance);

            // Мягкое разделение объектов только при необходимости
            const overlap = collisionRadius - distance;
            
            if (overlap > 0.5) { // Только при значительном перекрытии
                const separationFactor = Math.min(overlap * 0.3, 1.0); // Мягкое разделение
                ball.position.x += normal.x * separationFactor;
                ball.position.y += normal.y * separationFactor;
            }

            // Отражение только если мяч движется к стене достаточно быстро
            const velocityDotNormal = ball.velocity.dot(normal);
            
            if (velocityDotNormal < -0.5) { // Порог скорости для отражения
                const restitution = isEndpoint ? 
                    CONFIG.BOUNCE_DAMPING * 0.6 : 
                    CONFIG.BOUNCE_DAMPING * 0.8;
                    
                ball.velocity.x -= (1 + restitution) * velocityDotNormal * normal.x;
                ball.velocity.y -= (1 + restitution) * velocityDotNormal * normal.y;
                
                // Меньше трения
                ball.velocity.multiply(isEndpoint ? 0.95 : 0.98);
            } else if (overlap > 0) {
                // Просто замедляем мяч при касании
                ball.velocity.multiply(0.99);
            }

            return true;
        }
        return false;
    }

    // Новый метод для проверки пересечения траектории
    checkTrajectoryIntersection(ball, lineStart, lineEnd) {
        const ballStart = ball.lastPosition;
        const ballEnd = ball.position;
        
        // Проверяем расстояние от предыдущей позиции до отрезка
        const prevDistance = distanceToLineSegment(ballStart, lineStart, lineEnd);
        const currDistance = distanceToLineSegment(ballEnd, lineStart, lineEnd);
        
        const radius = ball.radius + this.width / 2;
        
        // Если мяч пересек стену между кадрами
        if (prevDistance > radius && currDistance < radius) {
            // Находим точку пересечения и отражаем от неё
            const normal = getNormalToLineSegment(ballEnd, lineStart, lineEnd);
            
            // Перемещаем мяч на безопасное расстояние
            ball.position.x = ballStart.x + normal.x * (radius + 2);
            ball.position.y = ballStart.y + normal.y * (radius + 2);
            
            // Отражаем скорость
            const velocityDotNormal = ball.velocity.dot(normal);
            if (velocityDotNormal < 0) {
                ball.velocity.x -= (1 + CONFIG.BOUNCE_DAMPING * 0.7) * velocityDotNormal * normal.x;
                ball.velocity.y -= (1 + CONFIG.BOUNCE_DAMPING * 0.7) * velocityDotNormal * normal.y;
                ball.velocity.multiply(0.95);
            }
            
            return true;
        }
        
        return false;
    }
}
