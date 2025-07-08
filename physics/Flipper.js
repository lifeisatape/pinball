// Flipper Class - ОРИГИНАЛ + Anti-tunneling
class Flipper {
    constructor(x, y, isLeft) {
        this.position = new Vector2D(x, y);
        this.isLeft = isLeft;

        this.restAngle = isLeft ? Math.PI / 8 : -Math.PI / 8;
        this.activeAngle = isLeft ? -Math.PI / 6 : Math.PI / 6;

        this.angle = this.restAngle;
        this.targetAngle = this.angle;
        this.length = CONFIG.FLIPPER_LENGTH;
        this.baseWidth = CONFIG.FLIPPER_WIDTH * 1.5;
        this.tipWidth = CONFIG.FLIPPER_WIDTH * 0.8;
        this.isActive = false;
        this.angularVelocity = 0;
        this.lastAngle = this.angle;

        this.shape = new FlipperShape(x, y, this.length, this.baseWidth, this.tipWidth, isLeft);
        this.updateShape();
    }

    updateShape() {
        this.shape.angle = this.angle;
        this.shape.updateShape();
    }

    activate() {
        this.isActive = true;
        this.targetAngle = this.activeAngle;
        window.soundManager.playSound('flipperIn');
    }

    deactivate() {
        this.isActive = false;
        this.targetAngle = this.restAngle;
        window.soundManager.playSound('flipperOut');
    }

    update() {
        this.lastAngle = this.angle;

        const angleDiff = this.targetAngle - this.angle;
        this.angularVelocity = angleDiff * 0.4;
        this.angle += this.angularVelocity;

        const minAngle = Math.min(this.restAngle, this.activeAngle);
        const maxAngle = Math.max(this.restAngle, this.activeAngle);
        this.angle = Math.max(minAngle, Math.min(maxAngle, this.angle));

        this.updateShape();
    }

    // ОРИГИНАЛЬНАЯ отрисовка
    draw(ctx) {
        if (this.shape.points.length === 0) return;

        ctx.save();

        const cos = Math.cos(this.angle);
        const sin = Math.sin(this.angle);
        const midX = this.position.x + cos * (this.length / 2);
        const midY = this.position.y + sin * (this.length / 2);

        const gradient = ctx.createLinearGradient(
            midX - sin * this.baseWidth / 2,
            midY + cos * this.baseWidth / 2,
            midX + sin * this.baseWidth / 2,
            midY - cos * this.baseWidth / 2
        );

        gradient.addColorStop(0, '#ff8888');
        gradient.addColorStop(0.3, '#ff6666');
        gradient.addColorStop(0.7, '#dd4444');
        gradient.addColorStop(1, '#aa2222');

        ctx.fillStyle = gradient;
        ctx.beginPath();

        if (this.shape.worldPoints && this.shape.worldPoints.length > 0) {
            ctx.moveTo(this.shape.worldPoints[0].x, this.shape.worldPoints[0].y);

            for (let i = 1; i < this.shape.worldPoints.length; i++) {
                ctx.lineTo(this.shape.worldPoints[i].x, this.shape.worldPoints[i].y);
            }

            ctx.closePath();
            ctx.fill();

            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            const innerGradient = ctx.createRadialGradient(
                midX - cos * 10, midY - sin * 10, 0,
                midX, midY, this.length / 3
            );
            innerGradient.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
            innerGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

            ctx.fillStyle = innerGradient;
            ctx.fill();
        }

        ctx.restore();

        const pivotGradient = ctx.createRadialGradient(
            this.position.x - 1, this.position.y - 1, 0,
            this.position.x, this.position.y, 6
        );
        pivotGradient.addColorStop(0, '#ffffff');
        pivotGradient.addColorStop(0.3, '#cccccc');
        pivotGradient.addColorStop(0.7, '#888888');
        pivotGradient.addColorStop(1, '#444444');

        ctx.fillStyle = pivotGradient;
        ctx.beginPath();
        ctx.arc(this.position.x, this.position.y, 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#222222';
        ctx.lineWidth = 1;
        ctx.stroke();
    }

    // УЛУЧШЕННАЯ проверка коллизий с anti-tunneling
    checkCollision(ball) {
        // Сначала обычная проверка через shape
        const collision = this.shape.intersectsCircle(ball);

        if (collision.hit) {
            this.handleCollision(ball, collision);
            return true;
        }

        // Anti-tunneling: проверяем траекторию для быстрого мяча
        if (ball.lastPosition && ball.velocity.magnitude() > ball.radius * 0.7) {
            return this.sweepTest(ball);
        }

        return false;
    }

    // Обработка обычной коллизии (ОРИГИНАЛЬНАЯ ЛОГИКА)
    handleCollision(ball, collision) {
        const pushDistance = collision.penetration + 2;
        ball.position.x += collision.normal.x * pushDistance;
        ball.position.y += collision.normal.y * pushDistance;

        const currentAngularVelocity = this.angle - this.lastAngle;

        const contactOffset = new Vector2D(
            collision.contactPoint.x - this.position.x,
            collision.contactPoint.y - this.position.y
        );

        const tangentialVelocity = new Vector2D(
            -contactOffset.y * currentAngularVelocity * 10,
            contactOffset.x * currentAngularVelocity * 10
        );

        const velocityDotNormal = ball.velocity.dot(collision.normal);

        if (this.isActive && Math.abs(currentAngularVelocity) > 0.01) {
            // АКТИВНЫЙ флиппер - отражаем скорость
            if (velocityDotNormal < 0) {
                ball.velocity.x -= 2 * velocityDotNormal * collision.normal.x;
                ball.velocity.y -= 2 * velocityDotNormal * collision.normal.y;
            }

            // Добавляем силу
            const normalForce = CONFIG.FLIPPER_STRENGTH;
            ball.velocity.x += collision.normal.x * normalForce;
            ball.velocity.y += collision.normal.y * normalForce;

            ball.velocity.x += tangentialVelocity.x;
            ball.velocity.y += tangentialVelocity.y;
        } else {
            // ПАССИВНЫЙ флиппер - ведет себя КАК СТЕНА (с затуханием)
            if (velocityDotNormal < 0) {
                ball.velocity.x -= 2 * velocityDotNormal * collision.normal.x;
                ball.velocity.y -= 2 * velocityDotNormal * collision.normal.y;
                // Применяем СИЛЬНОЕ затухание для неподвижного флиппера
                ball.velocity.multiply(CONFIG.BOUNCE_DAMPING * 0.7); // Еще сильнее затухание
            }
        }

        // Общее затухание только для активного флиппера
        if (this.isActive && Math.abs(currentAngularVelocity) > 0.01) {
            ball.velocity.multiply(CONFIG.BOUNCE_DAMPING);
        }
        // Для пассивного затухание уже применено выше

        ball.velocity.clamp(CONFIG.MAX_BALL_SPEED);
    }

    // Sweep test для флиппера
    sweepTest(ball) {
        const movement = ball.getMovementLine();

        // Упрощенная проверка: трактуем флиппер как капсулу (линия + радиус)
        const flipperStart = this.getFlipperStart();
        const flipperEnd = this.getFlipperEnd();
        const flipperRadius = this.baseWidth / 2;

        const intersection = this.lineCapsuleIntersection(
            movement.start, movement.end, ball.radius,
            flipperStart, flipperEnd, flipperRadius
        );

        if (intersection.hit) {
            // Перемещаем мяч в точку коллизии
            ball.position.x = intersection.point.x;
            ball.position.y = intersection.point.y;

            // Создаем упрощенный объект коллизии
            const simpleCollision = {
                hit: true,
                normal: intersection.normal,
                contactPoint: intersection.point,
                penetration: 1 // Минимальное проникновение
            };

            this.handleCollision(ball, simpleCollision);
            return true;
        }

        return false;
    }

    // Получение начальной точки флиппера
    getFlipperStart() {
        return this.position.copy();
    }

    // Получение конечной точки флиппера
    getFlipperEnd() {
        const cos = Math.cos(this.angle);
        const sin = Math.sin(this.angle);
        const direction = this.isLeft ? 1 : -1;

        return new Vector2D(
            this.position.x + cos * this.length * direction,
            this.position.y + sin * this.length * direction
        );
    }

    // Пересечение линии движения мяча с капсулой флиппера
    lineCapsuleIntersection(ballStart, ballEnd, ballRadius, capsuleStart, capsuleEnd, capsuleRadius) {
        const totalRadius = ballRadius + capsuleRadius;

        // Проверяем пересечение с линией флиппера
        const capsuleDir = new Vector2D(
            capsuleEnd.x - capsuleStart.x,
            capsuleEnd.y - capsuleStart.y
        );
        const capsuleLength = capsuleDir.magnitude();

        if (capsuleLength < 0.1) {
            // Флиппер слишком короткий, обрабатываем как точку
            return this.lineCircleIntersection(ballStart, ballEnd, capsuleStart, totalRadius);
        }

        capsuleDir.normalize();

        // Находим ближайшую точку на линии флиппера к траектории мяча
        const ballDir = new Vector2D(ballEnd.x - ballStart.x, ballEnd.y - ballStart.y);
        const ballLength = ballDir.magnitude();

        if (ballLength < 0.1) {
            return { hit: false };
        }

        ballDir.normalize();

        // Упрощенная проверка: проверяем минимальное расстояние между линиями
        const startDiff = new Vector2D(ballStart.x - capsuleStart.x, ballStart.y - capsuleStart.y);

        const ballDotCapsule = ballDir.dot(capsuleDir);
        const ballDotStart = ballDir.dot(startDiff);
        const capsuleDotStart = capsuleDir.dot(startDiff);

        const denom = 1 - ballDotCapsule * ballDotCapsule;

        if (Math.abs(denom) < 0.001) {
            // Линии параллельны
            return { hit: false };
        }

        const ballT = (ballDotCapsule * capsuleDotStart - ballDotStart) / denom;
        const capsuleT = (capsuleDotStart - ballDotCapsule * ballDotStart) / denom;

        // Ограничиваем параметры
        const clampedBallT = Math.max(0, Math.min(1, ballT));
        const clampedCapsuleT = Math.max(0, Math.min(1, capsuleT));

        // Находим ближайшие точки
        const ballPoint = new Vector2D(
            ballStart.x + ballDir.x * clampedBallT * ballLength,
            ballStart.y + ballDir.y * clampedBallT * ballLength
        );

        const capsulePoint = new Vector2D(
            capsuleStart.x + capsuleDir.x * clampedCapsuleT * capsuleLength,
            capsuleStart.y + capsuleDir.y * clampedCapsuleT * capsuleLength
        );

        const distance = Math.sqrt(
            (ballPoint.x - capsulePoint.x) * (ballPoint.x - capsulePoint.x) +
            (ballPoint.y - capsulePoint.y) * (ballPoint.y - capsulePoint.y)
        );

        if (distance < totalRadius) {
            // Вычисляем нормаль
            const normal = new Vector2D(
                ballPoint.x - capsulePoint.x,
                ballPoint.y - capsulePoint.y
            );

            if (normal.magnitude() > 0.001) {
                normal.normalize();
            } else {
                // Fallback нормаль
                normal.set(0, -1);
            }

            return {
                hit: true,
                point: ballPoint,
                normal: normal,
                t: clampedBallT
            };
        }

        return { hit: false };
    }

    // Пересечение линии с окружностью (для коротких флипперов)
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
            return { hit: false };
        }

        const discriminantSqrt = Math.sqrt(discriminant);
        const t1 = (-b - discriminantSqrt) / (2 * a);

        if (t1 >= 0 && t1 <= 1) {
            const intersectionPoint = new Vector2D(
                lineStart.x + t1 * dx,
                lineStart.y + t1 * dy
            );

            const normal = new Vector2D(
                intersectionPoint.x - circleCenter.x,
                intersectionPoint.y - circleCenter.y
            ).normalize();

            return {
                hit: true,
                point: intersectionPoint,
                normal: normal,
                t: t1
            };
        }

        return { hit: false };
    }
}