// Wall Class - ОРИГИНАЛ + Anti-tunneling sweep test
class Wall {
    constructor(x1, y1, x2, y2, color = '#ff4444', width = 20) {
        this.x1 = x1;
        this.y1 = y1;
        this.x2 = x2;
        this.y2 = y2;
        this.color = color;
        this.width = width;
    }

    // ОРИГИНАЛЬНАЯ отрисовка
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

    // УЛУЧШЕННАЯ проверка коллизий с anti-tunneling
    checkCollision(ball) {
        // Сначала пробуем обычную проверку
        if (this.type === 'semicircle' || this.type === 'quarter') {
            return this.checkArcCollision(ball);
        } else {
            return this.checkLineCollision(ball);
        }
    }

    // Проверка коллизии с прямой линией + sweep test
    checkLineCollision(ball) {
        // Обычная проверка текущей позиции
        const distance = distanceToLineSegment(ball.position, new Vector2D(this.x1, this.y1), new Vector2D(this.x2, this.y2));

        if (distance < ball.radius + this.width / 2) {
            const normal = getNormalToLineSegment(ball.position, new Vector2D(this.x1, this.y1), new Vector2D(this.x2, this.y2));

            // Более агрессивное отталкивание
            const overlap = ball.radius + this.width / 2 - distance;
            const pushDistance = overlap + 3; // Было overlap * 0.8, стало overlap + 3
            ball.position.x += normal.x * pushDistance;
            ball.position.y += normal.y * pushDistance;

            // Проверяем, не слишком ли близко к концам стены (углы)
            const ballToStart = Math.sqrt(
                Math.pow(ball.position.x - this.x1, 2) + 
                Math.pow(ball.position.y - this.y1, 2)
            );
            const ballToEnd = Math.sqrt(
                Math.pow(ball.position.x - this.x2, 2) + 
                Math.pow(ball.position.y - this.y2, 2)
            );
            
            const cornerThreshold = ball.radius * 2; // Радиус "опасной зоны" угла
            const isNearCorner = ballToStart < cornerThreshold || ballToEnd < cornerThreshold;
            
            if (isNearCorner) {
                // Для углов: более сильное отталкивание + дополнительный импульс
                ball.position.x += normal.x * 5; // Дополнительный отступ
                ball.position.y += normal.y * 5;
                
                // Более сильный отскок для углов
                const dotProduct = ball.velocity.dot(normal);
                ball.velocity.x -= 2.5 * dotProduct * normal.x; // Было 2, стало 2.5
                ball.velocity.y -= 2.5 * dotProduct * normal.y;
                ball.velocity.multiply(CONFIG.BOUNCE_DAMPING * 1.1); // Меньше затухание
            } else {
                // Обычное отражение для середины стены
                const dotProduct = ball.velocity.dot(normal);
                ball.velocity.x -= 2 * dotProduct * normal.x;
                ball.velocity.y -= 2 * dotProduct * normal.y;
                ball.velocity.multiply(CONFIG.BOUNCE_DAMPING);
            }

            return true;
        }

        // Anti-tunneling: проверяем траекторию движения
        if (ball.lastPosition && ball.velocity.magnitude() > ball.radius * 0.5) {
            return this.sweepTestLine(ball);
        }

        return false;
    }

    // Sweep test для прямой линии
    sweepTestLine(ball) {
        const movement = ball.getMovementLine();

        // Проверяем пересечение линии движения мяча с линией стены
        const lineStart = new Vector2D(this.x1, this.y1);
        const lineEnd = new Vector2D(this.x2, this.y2);

        const intersection = this.lineIntersection(
            movement.start, movement.end,
            lineStart, lineEnd,
            ball.radius + this.width / 2
        );

        if (intersection.hit) {
            // Перемещаем мяч в точку коллизии
            ball.position.x = intersection.point.x;
            ball.position.y = intersection.point.y;

            // Применяем отражение
            const normal = getNormalToLineSegment(ball.position, lineStart, lineEnd);
            const dotProduct = ball.velocity.dot(normal);
            ball.velocity.x -= 2 * dotProduct * normal.x;
            ball.velocity.y -= 2 * dotProduct * normal.y;
            ball.velocity.multiply(CONFIG.BOUNCE_DAMPING);

            return true;
        }

        return false;
    }

    // Пересечение линий с учетом радиуса
    lineIntersection(ballStart, ballEnd, lineStart, lineEnd, radius) {
        const ballDirection = new Vector2D(ballEnd.x - ballStart.x, ballEnd.y - ballStart.y);
        const lineDirection = new Vector2D(lineEnd.x - lineStart.x, lineEnd.y - lineStart.y);
        const startDiff = new Vector2D(ballStart.x - lineStart.x, ballStart.y - lineStart.y);

        const cross = ballDirection.x * lineDirection.y - ballDirection.y * lineDirection.x;

        if (Math.abs(cross) < 0.001) {
            return { hit: false }; // Параллельные линии
        }

        const t = (startDiff.x * lineDirection.y - startDiff.y * lineDirection.x) / cross;
        const u = (startDiff.x * ballDirection.y - startDiff.y * ballDirection.x) / cross;

        // Проверяем, что пересечение в пределах обеих линий
        if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
            const intersectionPoint = new Vector2D(
                ballStart.x + t * ballDirection.x,
                ballStart.y + t * ballDirection.y
            );

            // Проверяем расстояние до линии с учетом радиуса
            const distToLine = distanceToLineSegment(intersectionPoint, lineStart, lineEnd);

            if (distToLine <= radius) {
                return {
                    hit: true,
                    point: intersectionPoint,
                    t: t
                };
            }
        }

        return { hit: false };
    }

    // ОРИГИНАЛЬНАЯ проверка дуговых стен
    checkArcCollision(ball) {
        const dx = ball.position.x - this.centerX;
        const dy = ball.position.y - this.centerY;
        const distanceFromCenter = Math.sqrt(dx * dx + dy * dy);

        // Check if ball is near the arc
        const minDistance = this.radius - this.width / 2 - ball.radius;
        const maxDistance = this.radius + this.width / 2 + ball.radius;

        if (distanceFromCenter >= minDistance && distanceFromCenter <= maxDistance) {
            // Check if ball is within the arc's angle range
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
                // Calculate collision based on whether ball is inside or outside the arc
                const targetRadius = this.radius;
                const currentDistance = distanceFromCenter;

                if (Math.abs(currentDistance - targetRadius) < this.width / 2 + ball.radius) {
                    // Collision detected
                    const normal = new Vector2D(dx / distanceFromCenter, dy / distanceFromCenter);

                    // If ball is inside the arc, flip normal
                    if (currentDistance < targetRadius) {
                        normal.x *= -1;
                        normal.y *= -1;
                    }

                    // Push ball away from arc
                    const overlap = ball.radius + this.width / 2 - Math.abs(currentDistance - targetRadius);
                    const pushDistance = overlap * 0.8;
                    ball.position.x += normal.x * pushDistance;
                    ball.position.y += normal.y * pushDistance;

                    // Reflect velocity
                    const dotProduct = ball.velocity.dot(normal);
                    ball.velocity.x -= 2 * dotProduct * normal.x;
                    ball.velocity.y -= 2 * dotProduct * normal.y;
                    ball.velocity.multiply(CONFIG.BOUNCE_DAMPING);

                    return true;
                }
            }
        }

        return false;
    }
}