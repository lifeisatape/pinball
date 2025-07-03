// Game Configuration
const CONFIG = {
    GRAVITY: 0.3,
    FRICTION: 0.98,
    BOUNCE_DAMPING: 0.8,
    FLIPPER_STRENGTH: 12,
    BALL_RADIUS: 8,
    FLIPPER_LENGTH: 50,
    FLIPPER_WIDTH: 8,
    LAUNCH_POWER: 20,
    MAX_BALL_SPEED: 25,
    VIRTUAL_WIDTH: 320,
    VIRTUAL_HEIGHT: 480
};

// Game State
class GameState {
    constructor() {
        this.score = 0;
        this.highScore = parseInt(localStorage.getItem('pinballHighScore')) || 0;
        this.balls = 3;
        this.isGameOver = false;
        this.ballInPlay = false;
    }

    updateScore(points) {
        this.score += points;
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('pinballHighScore', this.highScore.toString());
        }
    }

    reset() {
        this.score = 0;
        this.balls = 3;
        this.isGameOver = false;
        this.ballInPlay = false;
    }
}

// Vector2D Class
class Vector2D {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }

    add(vector) {
        this.x += vector.x;
        this.y += vector.y;
        return this;
    }

    multiply(scalar) {
        this.x *= scalar;
        this.y *= scalar;
        return this;
    }

    magnitude() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }

    normalize() {
        const mag = this.magnitude();
        if (mag > 0) {
            this.x /= mag;
            this.y /= mag;
        }
        return this;
    }

    copy() {
        return new Vector2D(this.x, this.y);
    }

    dot(vector) {
        return this.x * vector.x + this.y * vector.y;
    }

    clamp(maxLength) {
        const mag = this.magnitude();
        if (mag > maxLength) {
            this.normalize().multiply(maxLength);
        }
        return this;
    }
}

// Ball Class
class Ball {
    constructor(x, y) {
        this.position = new Vector2D(x, y);
        this.velocity = new Vector2D(0, 0);
        this.radius = CONFIG.BALL_RADIUS;
    }

    update() {
        this.velocity.add(new Vector2D(0, CONFIG.GRAVITY));
        this.velocity.clamp(CONFIG.MAX_BALL_SPEED);
        this.velocity.multiply(CONFIG.FRICTION);
        this.position.add(this.velocity);
        return this.handleWallCollisions();
    }

    handleWallCollisions() {
        return this.position.y > CONFIG.VIRTUAL_HEIGHT + 50;
    }

    draw(ctx) {
        const gradient = ctx.createRadialGradient(
            this.position.x - 3, this.position.y - 3, 0,
            this.position.x, this.position.y, this.radius
        );
        gradient.addColorStop(0, '#ffffff');
        gradient.addColorStop(0.3, '#ffff80');
        gradient.addColorStop(1, '#ffcc00');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();
    }
}

// Bumper Class
class Bumper {
    constructor(x, y, radius = 20) {
        this.position = new Vector2D(x, y);
        this.radius = radius;
        this.hitAnimation = 0;
        this.points = 100;
    }

    update() {
        if (this.hitAnimation > 0) {
            this.hitAnimation -= 0.1;
        }
    }

    checkCollision(ball) {
        const dx = ball.position.x - this.position.x;
        const dy = ball.position.y - this.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < ball.radius + this.radius) {
            const normal = new Vector2D(dx / distance, dy / distance);

            const overlap = ball.radius + this.radius - distance + 2;
            ball.position.x += normal.x * overlap;
            ball.position.y += normal.y * overlap;

            const bounceForce = 15;
            ball.velocity.x = normal.x * bounceForce;
            ball.velocity.y = normal.y * bounceForce;

            this.hitAnimation = 1;
            return this.points;
        }
        return 0;
    }

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

// Spinner Class
class Spinner {
    constructor(x, y, width = 30, height = 8) {
        this.position = new Vector2D(x, y);
        this.width = width;
        this.height = height;
        this.angle = 0;
        this.angularVelocity = 0;
        this.points = 50;
    }

    update() {
        this.angle += this.angularVelocity;
        this.angularVelocity *= 0.95;
    }

    checkCollision(ball) {
        const cos = Math.cos(this.angle);
        const sin = Math.sin(this.angle);

        const dx = ball.position.x - this.position.x;
        const dy = ball.position.y - this.position.y;
        const localX = cos * dx + sin * dy;
        const localY = -sin * dx + cos * dy;

        if (Math.abs(localX) < this.width / 2 + ball.radius &&
            Math.abs(localY) < this.height / 2 + ball.radius) {

            const spinDirection = localX > 0 ? 1 : -1;
            this.angularVelocity += spinDirection * 0.3;

            const normal = new Vector2D(
                Math.abs(localX) > Math.abs(localY) ? Math.sign(localX) : 0,
                Math.abs(localY) > Math.abs(localX) ? Math.sign(localY) : 0
            );

            const worldNormalX = cos * normal.x - sin * normal.y;
            const worldNormalY = sin * normal.x + cos * normal.y;

            ball.velocity.x += worldNormalX * 8;
            ball.velocity.y += worldNormalY * 8;

            return this.points;
        }
        return 0;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.position.x, this.position.y);
        ctx.rotate(this.angle);

        const gradient = ctx.createLinearGradient(-this.width/2, 0, this.width/2, 0);
        gradient.addColorStop(0, '#4444ff');
        gradient.addColorStop(0.5, '#6666ff');
        gradient.addColorStop(1, '#4444ff');

        ctx.fillStyle = gradient;
        ctx.fillRect(-this.width/2, -this.height/2, this.width, this.height);

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.strokeRect(-this.width/2, -this.height/2, this.width, this.height);

        ctx.restore();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(this.position.x, this.position.y, 3, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Drop Target Class
class DropTarget {
    constructor(x, y, width = 15, height = 30) {
        this.position = new Vector2D(x, y);
        this.width = width;
        this.height = height;
        this.isActive = true;
        this.points = 200;
        this.resetTime = 0;
    }

    update() {
        if (!this.isActive && this.resetTime > 0) {
            this.resetTime--;
            if (this.resetTime <= 0) {
                this.isActive = true;
            }
        }
    }

    checkCollision(ball) {
        if (!this.isActive) return 0;

        const dx = Math.abs(ball.position.x - this.position.x);
        const dy = Math.abs(ball.position.y - this.position.y);

        if (dx < this.width/2 + ball.radius && dy < this.height/2 + ball.radius) {
            this.isActive = false;
            this.resetTime = 300;

            const normalX = ball.position.x < this.position.x ? -1 : 1;
            ball.velocity.x = Math.abs(ball.velocity.x) * normalX * 1.2;

            return this.points;
        }
        return 0;
    }

    draw(ctx) {
        if (!this.isActive) return;

        const gradient = ctx.createLinearGradient(
            this.position.x - this.width/2, this.position.y,
            this.position.x + this.width/2, this.position.y
        );
        gradient.addColorStop(0, '#ff8800');
        gradient.addColorStop(0.5, '#ffaa00');
        gradient.addColorStop(1, '#ff8800');

        ctx.fillStyle = gradient;
        ctx.fillRect(
            this.position.x - this.width/2,
            this.position.y - this.height/2,
            this.width,
            this.height
        );

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.strokeRect(
            this.position.x - this.width/2,
            this.position.y - this.height/2,
            this.width,
            this.height
        );
    }
}

// Ramp Class (removed green elements)
class Ramp {
    constructor(points, width = 10) {
        this.points = points;
        this.width = width;
    }

    checkCollision(ball) {
        for (let i = 0; i < this.points.length - 1; i++) {
            const start = this.points[i];
            const end = this.points[i + 1];

            const distance = this.distanceToLineSegment(ball.position, start, end);

            if (distance < ball.radius + this.width / 2) {
                const normal = this.getNormalToLineSegment(ball.position, start, end);

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

    distanceToLineSegment(point, lineStart, lineEnd) {
        const A = point.x - lineStart.x;
        const B = point.y - lineStart.y;
        const C = lineEnd.x - lineStart.x;
        const D = lineEnd.y - lineStart.y;

        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        let param = -1;
        if (lenSq !== 0) {
            param = dot / lenSq;
        }

        let xx, yy;
        if (param < 0) {
            xx = lineStart.x;
            yy = lineStart.y;
        } else if (param > 1) {
            xx = lineEnd.x;
            yy = lineEnd.y;
        } else {
            xx = lineStart.x + param * C;
            yy = lineStart.y + param * D;
        }

        const dx = point.x - xx;
        const dy = point.y - yy;
        return Math.sqrt(dx * dx + dy * dy);
    }

    getNormalToLineSegment(point, lineStart, lineEnd) {
        const dx = lineEnd.x - lineStart.x;
        const dy = lineEnd.y - lineStart.y;
        const normal = new Vector2D(-dy, dx).normalize();

        const toPoint = new Vector2D(point.x - lineStart.x, point.y - lineStart.y);
        if (normal.dot(toPoint) < 0) {
            normal.multiply(-1);
        }

        return normal;
    }

    draw(ctx) {
        if (this.points.length < 2) return;

        // Changed from green to blue/purple color scheme
        ctx.strokeStyle = '#8844ff';
        ctx.lineWidth = this.width;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.beginPath();
        ctx.moveTo(this.points[0].x, this.points[0].y);

        for (let i = 1; i < this.points.length; i++) {
            ctx.lineTo(this.points[i].x, this.points[i].y);
        }

        ctx.stroke();

        // Changed glow effect color
        ctx.shadowColor = '#8844ff';
        ctx.shadowBlur = 10;
        ctx.stroke();
        ctx.shadowBlur = 0;
    }
}

// Flipper Shape Class
class FlipperShape {
    constructor(pivotX, pivotY, length, baseWidth, tipWidth, isLeft) {
        this.pivot = new Vector2D(pivotX, pivotY);
        this.length = length;
        this.baseWidth = baseWidth;
        this.tipWidth = tipWidth;
        this.isLeft = isLeft;
        this.angle = 0;
        this.updateShape();
    }

    updateShape() {
        const cos = Math.cos(this.angle);
        const sin = Math.sin(this.angle);

        this.points = [];
        const segments = 12;
        const capSegments = 8;

        const bodyPoints = [];

        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const width = this.baseWidth + (this.tipWidth - this.baseWidth) * t;
            const halfWidth = width / 2;
            const x = this.isLeft ? t * this.length : -t * this.length;

            bodyPoints.push({
                top: { x: x, y: -halfWidth },
                bottom: { x: x, y: halfWidth }
            });
        }

        const tipX = this.isLeft ? this.length : -this.length;
        const tipRadius = this.tipWidth / 2;

        for (let i = 0; i <= capSegments; i++) {
            const angle = this.isLeft ? 
                Math.PI/2 - (i / capSegments) * Math.PI :
                Math.PI/2 + (i / capSegments) * Math.PI;

            const capX = tipX + Math.cos(angle) * tipRadius;
            const capY = Math.sin(angle) * tipRadius;

            this.points.push({ x: capX, y: capY });
        }

        for (let i = segments - 1; i >= 0; i--) {
            this.points.push(bodyPoints[i].top);
        }

        const baseRadius = this.baseWidth / 2;

        for (let i = 0; i <= capSegments; i++) {
            const angle = this.isLeft ?
                Math.PI/2 + (i / capSegments) * Math.PI :
                Math.PI/2 - (i / capSegments) * Math.PI;

            const capX = Math.cos(angle) * baseRadius;
            const capY = Math.sin(angle) * baseRadius;

            this.points.push({ x: capX, y: capY });
        }

        for (let i = 1; i <= segments; i++) {
            this.points.push(bodyPoints[i].bottom);
        }

        this.worldPoints = this.points.map(point => {
            const worldX = this.pivot.x + cos * point.x - sin * point.y;
            const worldY = this.pivot.y + sin * point.x + cos * point.y;
            return new Vector2D(worldX, worldY);
        });
    }

    intersectsCircle(circle) {
        const cos = Math.cos(-this.angle);
        const sin = Math.sin(-this.angle);
        const dx = circle.position.x - this.pivot.x;
        const dy = circle.position.y - this.pivot.y;

        const localX = cos * dx - sin * dy;
        const localY = sin * dx + cos * dy;

        let t = 0;
        let closestX = 0;
        let closestY = 0;
        let minDistance = Infinity;
        let isEndCap = false;

        if (this.isLeft) {
            t = Math.max(0, Math.min(1, localX / this.length));
        } else {
            t = Math.max(0, Math.min(1, -localX / this.length));
        }

        const bodyX = this.isLeft ? t * this.length : -t * this.length;
        const width = this.baseWidth + (this.tipWidth - this.baseWidth) * t;
        const halfWidth = width / 2;

        const bodyClosestY = Math.max(-halfWidth, Math.min(halfWidth, localY));
        const bodyDistance = Math.sqrt((localX - bodyX) * (localX - bodyX) + (localY - bodyClosestY) * (localY - bodyClosestY));

        closestX = bodyX;
        closestY = bodyClosestY;
        minDistance = bodyDistance;

        const tipX = this.isLeft ? this.length : -this.length;
        const tipRadius = this.tipWidth / 2;
        const tipDistance = Math.sqrt((localX - tipX) * (localX - tipX) + localY * localY);

        if (tipDistance < minDistance && tipDistance <= tipRadius) {
            if (tipDistance > 0.1) {
                const tipNormalX = (localX - tipX) / tipDistance;
                const tipNormalY = localY / tipDistance;
                closestX = tipX + tipNormalX * tipRadius;
                closestY = tipNormalY * tipRadius;
            } else {
                closestX = tipX;
                closestY = 0;
            }
            minDistance = tipDistance;
            isEndCap = true;
        }

        const baseRadius = this.baseWidth / 2;
        const baseDistance = Math.sqrt(localX * localX + localY * localY);

        if (baseDistance < minDistance && baseDistance <= baseRadius) {
            if (baseDistance > 0.1) {
                const baseNormalX = localX / baseDistance;
                const baseNormalY = localY / baseDistance;
                closestX = baseNormalX * baseRadius;
                closestY = baseNormalY * baseRadius;
            } else {
                closestX = 0;
                closestY = baseRadius;
            }
            minDistance = baseDistance;
            isEndCap = true;
        }

        if (minDistance <= circle.radius) {
            let normalX, normalY;

            if (isEndCap) {
                if (minDistance > 0.1) {
                    const centerX = closestX === tipX ? tipX : 0;
                    const centerY = 0;
                    normalX = (localX - centerX) / minDistance;
                    normalY = (localY - centerY) / minDistance;
                } else {
                    normalX = localX > 0 ? 1 : -1;
                    normalY = 0;
                }
            } else {
                if (minDistance > 0.1) {
                    normalX = (localX - closestX) / minDistance;
                    normalY = (localY - closestY) / minDistance;
                } else {
                    normalX = 0;
                    normalY = localY > 0 ? 1 : -1;
                }
            }

            const worldCos = Math.cos(this.angle);
            const worldSin = Math.sin(this.angle);
            const worldNormalX = worldCos * normalX - worldSin * normalY;
            const worldNormalY = worldSin * normalX + worldCos * normalY;

            return {
                hit: true,
                normal: new Vector2D(worldNormalX, worldNormalY),
                penetration: circle.radius - minDistance + 0.5,
                contactPoint: new Vector2D(
                    this.pivot.x + worldCos * closestX - worldSin * closestY,
                    this.pivot.y + worldSin * closestX + worldCos * closestY
                )
            };
        }

        return { hit: false };
    }
}

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
        this.angularVelocity = angleDiff * 0.4;
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

        gradient.addColorStop(0, '#8888ff');
        gradient.addColorStop(0.3, '#6666ff');
        gradient.addColorStop(0.7, '#4444dd');
        gradient.addColorStop(1, '#2222aa');

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
            if (velocityDotNormal < 0) {
                ball.velocity.x -= 2 * velocityDotNormal * collision.normal.x;
                ball.velocity.y -= 2 * velocityDotNormal * collision.normal.y;
            }

            if (this.isActive && Math.abs(currentAngularVelocity) > 0.01) {
                const normalForce = CONFIG.FLIPPER_STRENGTH;
                ball.velocity.x += collision.normal.x * normalForce;
                ball.velocity.y += collision.normal.y * normalForce;

                ball.velocity.x += tangentialVelocity.x;
                ball.velocity.y += tangentialVelocity.y;
            } else {
                const minForce = CONFIG.FLIPPER_STRENGTH * 0.1;
                ball.velocity.x += collision.normal.x * minForce;
                ball.velocity.y += collision.normal.y * minForce;
            }

            ball.velocity.multiply(CONFIG.BOUNCE_DAMPING);
            ball.velocity.clamp(CONFIG.MAX_BALL_SPEED);

            return true;
        }

        return false;
    }
}

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
        const distance = this.distanceToLineSegment(ball.position, new Vector2D(this.x1, this.y1), new Vector2D(this.x2, this.y2));

        if (distance < ball.radius + this.width / 2) {
            const normal = this.getNormalToLineSegment(ball.position, new Vector2D(this.x1, this.y1), new Vector2D(this.x2, this.y2));

            const overlap = ball.radius + this.width / 2 - distance;
            const pushDistance = overlap * 0.8;
            ball.position.x += normal.x * pushDistance;
            ball.position.y += normal.y * pushDistance;

            const dotProduct = ball.velocity.dot(normal);
            ball.velocity.x -= 2 * dotProduct * normal.x;
            ball.velocity.y -= 2 * dotProduct * normal.y;
            ball.velocity.multiply(CONFIG.BOUNCE_DAMPING);

            return true;
        }
        return false;
    }

    distanceToLineSegment(point, lineStart, lineEnd) {
        const A = point.x - lineStart.x;
        const B = point.y - lineStart.y;
        const C = lineEnd.x - lineStart.x;
        const D = lineEnd.y - lineStart.y;

        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        let param = -1;
        if (lenSq !== 0) {
            param = dot / lenSq;
        }

        let xx, yy;
        if (param < 0) {
            xx = lineStart.x;
            yy = lineStart.y;
        } else if (param > 1) {
            xx = lineEnd.x;
            yy = lineEnd.y;
        } else {
            xx = lineStart.x + param * C;
            yy = lineStart.y + param * D;
        }

        const dx = point.x - xx;
        const dy = point.y - yy;
        return Math.sqrt(dx * dx + dy * dy);
    }

    getNormalToLineSegment(point, lineStart, lineEnd) {
        const dx = lineEnd.x - lineStart.x;
        const dy = lineEnd.y - lineStart.y;
        const normal = new Vector2D(-dy, dx).normalize();

        const toPoint = new Vector2D(point.x - lineStart.x, point.y - lineStart.y);
        if (normal.dot(toPoint) < 0) {
            normal.multiply(-1);
        }

        return normal;
    }
}

// Main Game Class
class PinballGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.gameState = new GameState();
        this.ball = null;
        this.flippers = [];
        this.walls = [];
        this.bumpers = [];
        this.spinners = [];
        this.dropTargets = [];
        this.ramps = [];

        this.scale = 1;
        this.offsetX = 0;
        this.offsetY = 0;

        this.setupCanvas();
        this.setupGameObjects();
        this.setupEventListeners();
        this.updateUI();

        this.gameLoop();
    }

    setupCanvas() {
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
    }

    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight - 60;

        const scaleX = this.canvas.width / CONFIG.VIRTUAL_WIDTH;
        const scaleY = this.canvas.height / CONFIG.VIRTUAL_HEIGHT;
        this.scale = Math.min(scaleX, scaleY);

        this.offsetX = (this.canvas.width - CONFIG.VIRTUAL_WIDTH * this.scale) / 2;
        this.offsetY = (this.canvas.height - CONFIG.VIRTUAL_HEIGHT * this.scale) / 2;
    }

    setupGameObjects() {
        this.resetBall();
        this.initializeWalls();
        this.initializeGameElements();

        const flipperY = CONFIG.VIRTUAL_HEIGHT - 80;
        this.flippers = [
            new Flipper(CONFIG.VIRTUAL_WIDTH * 0.3, flipperY, true),
            new Flipper(CONFIG.VIRTUAL_WIDTH * 0.7, flipperY, false)
        ];
    }

    initializeWalls() {
        const gameWidth = CONFIG.VIRTUAL_WIDTH;
        const gameHeight = CONFIG.VIRTUAL_HEIGHT;
        const flipperY = gameHeight - 80;
        const leftWallEnd = gameWidth * 0.25;
        const rightWallStart = gameWidth * 0.75;
        const bottomY = gameHeight - 60;

        this.walls = [
            new Wall(5, 5, 5, gameHeight - 100),
            new Wall(gameWidth - 5, 5, gameWidth - 5, gameHeight - 100),
            new Wall(5, 5, gameWidth - 5, 5),
            new Wall(gameWidth * 0.25, gameHeight - 80, gameWidth * 0, flipperY - 20),
            new Wall(gameWidth * 1, flipperY - 20, gameWidth * 0.75, gameHeight - 80),
            new Wall(5, bottomY, leftWallEnd, bottomY),
            new Wall(rightWallStart, bottomY, gameWidth - 5, bottomY)
        ];
    }

    initializeGameElements() {
        // Bumpers
        this.bumpers = [
            new Bumper(CONFIG.VIRTUAL_WIDTH * 0.3, 150, 25),
            new Bumper(CONFIG.VIRTUAL_WIDTH * 0.7, 120, 25),
            new Bumper(CONFIG.VIRTUAL_WIDTH * 0.5, 180, 20)
        ];

        // Spinners
        this.spinners = [
            new Spinner(CONFIG.VIRTUAL_WIDTH * 0.2, 250),
            new Spinner(CONFIG.VIRTUAL_WIDTH * 0.8, 280)
        ];

        // Drop Targets
        this.dropTargets = [
            new DropTarget(CONFIG.VIRTUAL_WIDTH * 0.15, 320),
            new DropTarget(CONFIG.VIRTUAL_WIDTH * 0.85, 350),
            new DropTarget(CONFIG.VIRTUAL_WIDTH * 0.5, 300)
        ];

        // Ramps (changed from green to purple/blue)
        this.ramps = [
            new Ramp([
                new Vector2D(CONFIG.VIRTUAL_WIDTH * 0.1, 380),
                new Vector2D(CONFIG.VIRTUAL_WIDTH * 0.25, 350),
                new Vector2D(CONFIG.VIRTUAL_WIDTH * 0.4, 340),
                new Vector2D(CONFIG.VIRTUAL_WIDTH * 0.55, 350)
            ], 12),
            new Ramp([
                new Vector2D(CONFIG.VIRTUAL_WIDTH * 0.9, 320),
                new Vector2D(CONFIG.VIRTUAL_WIDTH * 0.75, 290),
                new Vector2D(CONFIG.VIRTUAL_WIDTH * 0.6, 280),
                new Vector2D(CONFIG.VIRTUAL_WIDTH * 0.45, 290)
            ], 12)
        ];
    }

    resetBall() {
        this.ball = new Ball(CONFIG.VIRTUAL_WIDTH * 0.6, 50);
        this.ball.velocity = new Vector2D(0, 0);
        this.gameState.ballInPlay = true;
    }

    setupEventListeners() {
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const rect = this.canvas.getBoundingClientRect();
            const screenX = touch.clientX - rect.left;
            this.handleInput(screenX, true);
        });

        this.canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.handleInput(0, false);
        });

        this.canvas.addEventListener('mousedown', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const screenX = e.clientX - rect.left;
            this.handleInput(screenX, true);
        });

        this.canvas.addEventListener('mouseup', () => {
            this.handleInput(0, false);
        });

        document.getElementById('restartBtn').addEventListener('click', () => this.restartGame());
        document.getElementById('gameOverRestart').addEventListener('click', () => this.restartGame());
    }

    handleInput(screenX, isPressed) {
        if (isPressed) {
            if (screenX < this.canvas.width * 0.5) {
                this.flippers[0].activate();
            } else {
                this.flippers[1].activate();
            }
        } else {
            this.flippers[0].deactivate();
            this.flippers[1].deactivate();
        }
    }

    update() {
        if (this.gameState.isGameOver) return;

        const ballLost = this.ball.update();

        this.flippers.forEach(flipper => flipper.update());
        this.bumpers.forEach(bumper => bumper.update());
        this.spinners.forEach(spinner => spinner.update());
        this.dropTargets.forEach(target => target.update());

        this.checkCollisions();

        if (ballLost && this.gameState.ballInPlay) {
            this.gameState.balls--;
            this.gameState.ballInPlay = false;

            if (this.gameState.balls <= 0) {
                this.gameOver();
            } else {
                setTimeout(() => {
                    this.resetBall();
                }, 1000);
            }
        }
    }

    checkCollisions() {
        // Wall collisions
        this.walls.forEach(wall => {
            wall.checkCollision(this.ball);
        });

        // Flipper collisions
        this.flippers.forEach(flipper => {
            if (flipper.checkCollision(this.ball)) {
                this.gameState.updateScore(10);
                this.updateUI();
            }
        });

        // Bumper collisions
        this.bumpers.forEach(bumper => {
            const points = bumper.checkCollision(this.ball);
            if (points > 0) {
                this.gameState.updateScore(points);
                this.updateUI();
            }
        });

        // Spinner collisions
        this.spinners.forEach(spinner => {
            const points = spinner.checkCollision(this.ball);
            if (points > 0) {
                this.gameState.updateScore(points);
                this.updateUI();
            }
        });

        // Drop Target collisions
        this.dropTargets.forEach(target => {
            const points = target.checkCollision(this.ball);
            if (points > 0) {
                this.gameState.updateScore(points);
                this.updateUI();
            }
        });

        // Ramp collisions
        this.ramps.forEach(ramp => {
            ramp.checkCollision(this.ball);
        });
    }

    draw() {
        this.ctx.fillStyle = '#0c0c0c';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.save();
        this.ctx.translate(this.offsetX, this.offsetY);
        this.ctx.scale(this.scale, this.scale);

        const gradient = this.ctx.createLinearGradient(0, 0, 0, CONFIG.VIRTUAL_HEIGHT);
        gradient.addColorStop(0, '#1a1a2e');
        gradient.addColorStop(1, '#0f1419');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, CONFIG.VIRTUAL_WIDTH, CONFIG.VIRTUAL_HEIGHT);

        // Draw all game elements
        this.walls.forEach(wall => wall.draw(this.ctx));
        this.ramps.forEach(ramp => ramp.draw(this.ctx));
        this.bumpers.forEach(bumper => bumper.draw(this.ctx));
        this.spinners.forEach(spinner => spinner.draw(this.ctx));
        this.dropTargets.forEach(target => target.draw(this.ctx));
        this.flippers.forEach(flipper => flipper.draw(this.ctx));

        if (this.gameState.ballInPlay) {
            this.ball.draw(this.ctx);
        }

        this.ctx.restore();
    }

    updateUI() {
        document.getElementById('currentScore').textContent = this.gameState.score.toLocaleString();
        document.getElementById('highScore').textContent = this.gameState.highScore.toLocaleString();
        document.getElementById('ballsLeft').textContent = this.gameState.balls;
    }

    gameOver() {
        this.gameState.isGameOver = true;

        const overlay = document.getElementById('gameOverOverlay');
        const finalScore = document.getElementById('finalScore');
        const newHighScore = document.getElementById('newHighScore');

        finalScore.textContent = this.gameState.score.toLocaleString();

        if (this.gameState.score === this.gameState.highScore && this.gameState.score > 0) {
            newHighScore.style.display = 'block';
        } else {
            newHighScore.style.display = 'none';
        }

        overlay.style.display = 'flex';
    }

    restartGame() {
        this.gameState.reset();
        this.resetBall();

        // Reset all game elements
        this.dropTargets.forEach(target => {
            target.isActive = true;
            target.resetTime = 0;
        });

        this.spinners.forEach(spinner => {
            spinner.angularVelocity = 0;
        });

        this.updateUI();
        document.getElementById('gameOverOverlay').style.display = 'none';
    }

    gameLoop() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.gameLoop());
    }
}

// Initialize game
window.addEventListener('load', () => {
    new PinballGame();
});

// Prevent scrolling and context menu
document.addEventListener('touchmove', (e) => {
    e.preventDefault();
}, { passive: false });

document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
});