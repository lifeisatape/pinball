
// Flipper Class
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
        this.maxAngularVelocity = 0.5; // Ограничиваем угловую скорость

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
    }

    deactivate() {
        this.isActive = false;
        this.targetAngle = this.restAngle;
    }

    update() {
        this.lastAngle = this.angle;

        const angleDiff = this.targetAngle - this.angle;
        this.angularVelocity = angleDiff * 0.3; // Снижаем скорость для реализма
        
        // Ограничиваем угловую скорость
        this.angularVelocity = Math.max(-this.maxAngularVelocity, 
                                       Math.min(this.maxAngularVelocity, this.angularVelocity));
        
        this.angle += this.angularVelocity;

        const minAngle = Math.min(this.restAngle, this.activeAngle);
        const maxAngle = Math.max(this.restAngle, this.activeAngle);
        this.angle = Math.max(minAngle, Math.min(maxAngle, this.angle));

        this.updateShape();
    }

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

    checkCollision(ball) {
        const collision = this.shape.intersectsCircle(ball);

        if (collision.hit) {
            // Более надежное разделение
            const separation = Math.max(collision.penetration + 2, 3);
            ball.position.x += collision.normal.x * separation;
            ball.position.y += collision.normal.y * separation;

            // Реалистичная угловая скорость
            const currentAngularVelocity = (this.angle - this.lastAngle) * 0.8;

            // Точка контакта относительно центра флиппера
            const contactOffset = new Vector2D(
                collision.contactPoint.x - this.position.x,
                collision.contactPoint.y - this.position.y
            );

            // Тангенциальная скорость (более реалистичная)
            const tangentialVelocity = new Vector2D(
                -contactOffset.y * currentAngularVelocity * 3, // Снижаем множитель
                contactOffset.x * currentAngularVelocity * 3
            );

            // Отражение скорости
            const velocityDotNormal = ball.velocity.dot(collision.normal);
            if (velocityDotNormal < 0) {
                const restitution = CONFIG.BOUNCE_DAMPING * 0.9;
                ball.velocity.x -= (1 + restitution) * velocityDotNormal * collision.normal.x;
                ball.velocity.y -= (1 + restitution) * velocityDotNormal * collision.normal.y;
            }

            // Добавляем силу от активного флиппера
            if (this.isActive && Math.abs(currentAngularVelocity) > 0.01) {
                const flipperForce = CONFIG.FLIPPER_STRENGTH * 0.7; // Снижаем силу
                ball.velocity.x += collision.normal.x * flipperForce;
                ball.velocity.y += collision.normal.y * flipperForce;

                // Добавляем тангенциальную скорость
                ball.velocity.x += tangentialVelocity.x * 0.5;
                ball.velocity.y += tangentialVelocity.y * 0.5;
            } else {
                // Минимальная сила для пассивного флиппера
                const minForce = CONFIG.FLIPPER_STRENGTH * 0.05;
                ball.velocity.x += collision.normal.x * minForce;
                ball.velocity.y += collision.normal.y * minForce;
            }

            // Применяем демпфирование и ограничение скорости
            ball.velocity.multiply(0.99);
            ball.velocity.clamp(CONFIG.MAX_BALL_SPEED);

            return true;
        }

        return false;
    }
}
