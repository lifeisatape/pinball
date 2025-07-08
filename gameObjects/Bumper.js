// Bumper Class - ОРИГИНАЛ + Anti-tunneling
class Bumper {
    constructor(x, y, radius = 20) {
        this.position = new Vector2D(x, y);
        this.radius = radius;
        this.hitAnimation = 0;
        this.points = 100;
        this.x = x; // For compatibility
        this.y = y; // For compatibility
    }

    // ОРИГИНАЛЬНЫЙ update
    update() {
        if (this.hitAnimation > 0) {
            this.hitAnimation -= 0.1;
        }
    }

    // УЛУЧШЕННАЯ проверка коллизий с anti-tunneling
    checkCollision(ball) {
        // Обычная проверка текущей позиции
        const dx = ball.position.x - this.position.x;
        const dy = ball.position.y - this.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < ball.radius + this.radius) {
            // Предотвращаем деление на ноль и застревание в центре
            if (distance < 0.1) {
                // Если мяч слишком близко к центру, выталкиваем его случайным образом
                const angle = Math.random() * Math.PI * 2;
                const normal = new Vector2D(Math.cos(angle), Math.sin(angle));
                const targetDistance = ball.radius + this.radius + 5;
                ball.position.x = this.position.x + normal.x * targetDistance;
                ball.position.y = this.position.y + normal.y * targetDistance;
            } else {
                const normal = new Vector2D(dx / distance, dy / distance);
                
                // Гарантируем, что мяч находится на правильном расстоянии
                const targetDistance = ball.radius + this.radius + 2;
                ball.position.x = this.position.x + normal.x * targetDistance;
                ball.position.y = this.position.y + normal.y * targetDistance;
            }

            // Пересчитываем нормаль после корректировки позиции
            const newDx = ball.position.x - this.position.x;
            const newDy = ball.position.y - this.position.y;
            const newDistance = Math.sqrt(newDx * newDx + newDy * newDy);
            const finalNormal = new Vector2D(newDx / newDistance, newDy / newDistance);

            ball.velocity.x = finalNormal.x * CONFIG.BUMPER_BOUNCE_FORCE;
            ball.velocity.y = finalNormal.y * CONFIG.BUMPER_BOUNCE_FORCE;

            this.hitAnimation = 1;
            return this.points;
        }

        // Anti-tunneling: проверяем траекторию движения для быстрого мяча
        if (ball.lastPosition && ball.velocity.magnitude() > ball.radius) {
            return this.sweepTest(ball);
        }

        return 0;
    }

    // Sweep test для бампера
    sweepTest(ball) {
        const movement = ball.getMovementLine();

        // Проверяем пересечение линии движения с окружностью бампера
        const intersection = this.lineCircleIntersection(
            movement.start, movement.end, 
            this.position, this.radius + ball.radius
        );

        if (intersection.hit) {
            // Вычисляем направление от центра бампера к точке пересечения
            const dx = intersection.point.x - this.position.x;
            const dy = intersection.point.y - this.position.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < 0.1) {
                // Если слишком близко к центру, используем случайное направление
                const angle = Math.random() * Math.PI * 2;
                const normal = new Vector2D(Math.cos(angle), Math.sin(angle));
                const targetDistance = this.radius + ball.radius + 5;
                ball.position.x = this.position.x + normal.x * targetDistance;
                ball.position.y = this.position.y + normal.y * targetDistance;
                
                ball.velocity.x = normal.x * CONFIG.BUMPER_BOUNCE_FORCE;
                ball.velocity.y = normal.y * CONFIG.BUMPER_BOUNCE_FORCE;
            } else {
                const normal = new Vector2D(dx / distance, dy / distance);
                
                // Корректируем позицию с безопасным отступом
                const targetDistance = this.radius + ball.radius + 2;
                ball.position.x = this.position.x + normal.x * targetDistance;
                ball.position.y = this.position.y + normal.y * targetDistance;

                // Применяем силу бампера
                ball.velocity.x = normal.x * CONFIG.BUMPER_BOUNCE_FORCE;
                ball.velocity.y = normal.y * CONFIG.BUMPER_BOUNCE_FORCE;
            }

            this.hitAnimation = 1;
            return this.points;
        }

        return 0;
    }

    // Пересечение линии с окружностью
    lineCircleIntersection(lineStart, lineEnd, circleCenter, circleRadius) {
        const dx = lineEnd.x - lineStart.x;
        const dy = lineEnd.y - lineStart.y;
        const fx = lineStart.x - circleCenter.x;
        const fy = lineStart.y - circleCenter.y;

        const a = dx * dx + dy * dy;
        const b = 2 * (fx * dx + fy * dy);
        const c = (fx * fx + fy * fy) - circleRadius * circleRadius;

        const discriminant = b * b - 4 * a * c;

        if (discriminant < 0) {
            return { hit: false }; // Нет пересечения
        }

        const discriminantSqrt = Math.sqrt(discriminant);
        const t1 = (-b - discriminantSqrt) / (2 * a);
        const t2 = (-b + discriminantSqrt) / (2 * a);

        // Берем ближайшую точку пересечения в пределах линии
        let t = -1;
        if (t1 >= 0 && t1 <= 1) {
            t = t1;
        } else if (t2 >= 0 && t2 <= 1) {
            t = t2;
        }

        if (t >= 0) {
            const intersectionPoint = new Vector2D(
                lineStart.x + t * dx,
                lineStart.y + t * dy
            );

            return {
                hit: true,
                point: intersectionPoint,
                t: t
            };
        }

        return { hit: false };
    }

    // ОРИГИНАЛЬНАЯ отрисовка
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