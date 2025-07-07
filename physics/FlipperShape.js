
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
                if (minDistance > 0.01) {
                    const centerX = closestX === tipX ? tipX : 0;
                    const centerY = 0;
                    normalX = (localX - centerX) / minDistance;
                    normalY = (localY - centerY) / minDistance;
                } else {
                    // Более точная нормаль для очень близких точек
                    if (Math.abs(localX - tipX) < 0.1) {
                        // На кончике флиппера
                        normalX = this.isLeft ? 1 : -1;
                        normalY = 0;
                    } else {
                        // На основании флиппера
                        normalX = localX > 0 ? 1 : -1;
                        normalY = 0;
                    }
                }
            } else {
                if (minDistance > 0.01) {
                    normalX = (localX - closestX) / minDistance;
                    normalY = (localY - closestY) / minDistance;
                } else {
                    // Более точная нормаль для боковых поверхностей
                    normalX = 0;
                    normalY = localY > 0 ? 1 : -1;
                }
            }

            // Нормализация нормали для большей точности
            const normalLength = Math.sqrt(normalX * normalX + normalY * normalY);
            if (normalLength > 0.01) {
                normalX /= normalLength;
                normalY /= normalLength;
            }

            const worldCos = Math.cos(this.angle);
            const worldSin = Math.sin(this.angle);
            const worldNormalX = worldCos * normalX - worldSin * normalY;
            const worldNormalY = worldSin * normalX + worldCos * normalY;

            return {
                hit: true,
                normal: new Vector2D(worldNormalX, worldNormalY),
                penetration: circle.radius - minDistance + 1.0, // Увеличенное проникновение
                contactPoint: new Vector2D(
                    this.pivot.x + worldCos * closestX - worldSin * closestY,
                    this.pivot.y + worldSin * closestX + worldCos * closestY
                )
            };
        }

        return { hit: false };
    }
}
