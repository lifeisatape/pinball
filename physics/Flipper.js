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
        this.angularVelocity = angleDiff * 0.2;
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
            const currentAngularVelocity = this.angle - this.lastAngle;
            const velocityDotNormal = ball.velocity.dot(collision.normal);

            // Простая логика без принудительного разделения
            if (this.isActive && Math.abs(currentAngularVelocity) > 0.01) {
                // Активный удар флиппера
                if (velocityDotNormal < 0) {
                    ball.velocity.x -= (1 + CONFIG.BOUNCE_DAMPING) * velocityDotNormal * collision.normal.x;
                    ball.velocity.y -= (1 + CONFIG.BOUNCE_DAMPING) * velocityDotNormal * collision.normal.y;
                }

                // Добавляем силу флиппера
                ball.velocity.x += collision.normal.x * CONFIG.FLIPPER_STRENGTH * 0.5;
                ball.velocity.y += collision.normal.y * CONFIG.FLIPPER_STRENGTH * 0.5;

            } else if (velocityDotNormal < -0.2) {
                // Обычное отражение от неподвижного флиппера
                ball.velocity.x -= (1 + CONFIG.BOUNCE_DAMPING * 0.6) * velocityDotNormal * collision.normal.x;
                ball.velocity.y -= (1 + CONFIG.BOUNCE_DAMPING * 0.6) * velocityDotNormal * collision.normal.y;
            }

            ball.velocity.clamp(CONFIG.MAX_BALL_SPEED);
            return true;
        }

        return false;
    }
}