
class Ball {
    constructor(x, y) {
        this.position = new Vector2D(x, y);
        this.velocity = new Vector2D(0, 0);
        this.radius = CONFIG.BALL_RADIUS;
        this.previousPosition = new Vector2D(x, y);
    }

    update(deltaTime = CONFIG.FIXED_TIME_STEP) {
        // Сохраняем предыдущую позицию для CCD
        this.previousPosition.x = this.position.x;
        this.previousPosition.y = this.position.y;

        // Применяем гравитацию
        this.velocity.add(new Vector2D(0, CONFIG.GRAVITY * deltaTime * 60));
        
        // Ограничиваем скорость
        this.velocity.clamp(CONFIG.MAX_BALL_SPEED);
        
        // Применяем трение
        this.velocity.multiply(Math.pow(CONFIG.FRICTION, deltaTime * 60));
        
        // Останавливаем мяч если скорость слишком мала
        if (this.velocity.magnitude() < CONFIG.MIN_VELOCITY_THRESHOLD) {
            this.velocity.x = 0;
            this.velocity.y = 0;
        }

        // Continuous Collision Detection - разбиваем движение на подшаги
        const steps = Math.ceil(this.velocity.magnitude() * deltaTime / (this.radius * 0.5));
        const actualSteps = Math.min(steps, CONFIG.MAX_SUB_STEPS);
        
        if (actualSteps > 1) {
            const stepVelocity = this.velocity.copy().multiply(deltaTime / actualSteps);
            
            for (let i = 0; i < actualSteps; i++) {
                this.position.add(stepVelocity);
                if (this.handleWallCollisions()) {
                    return true; // Мяч потерян
                }
            }
        } else {
            // Обычное обновление для медленного движения
            this.position.add(this.velocity.copy().multiply(deltaTime));
            return this.handleWallCollisions();
        }
        
        return false;
    }

    handleWallCollisions() {
        let ballLost = false;
        
        // Левая граница
        if (this.position.x < this.radius) {
            this.position.x = this.radius;
            this.velocity.x = Math.abs(this.velocity.x) * CONFIG.BOUNCE_DAMPING;
        }
        
        // Правая граница
        if (this.position.x > CONFIG.VIRTUAL_WIDTH - this.radius) {
            this.position.x = CONFIG.VIRTUAL_WIDTH - this.radius;
            this.velocity.x = -Math.abs(this.velocity.x) * CONFIG.BOUNCE_DAMPING;
        }
        
        // Верхняя граница
        if (this.position.y < this.radius) {
            this.position.y = this.radius;
            this.velocity.y = Math.abs(this.velocity.y) * CONFIG.BOUNCE_DAMPING;
        }
        
        // Проверка на потерю мяча (низ экрана)
        if (this.position.y > CONFIG.VIRTUAL_HEIGHT + 50) {
            ballLost = true;
        }
        
        return ballLost;
    }

    // Sweep test для проверки коллизий по траектории
    sweepTestCircle(center, radius) {
        const start = this.previousPosition;
        const end = this.position;
        const movement = end.copy().subtract(start);
        
        if (movement.magnitude() < 0.001) {
            // Статическая проверка
            const distance = start.distanceTo(center);
            return distance < (this.radius + radius);
        }
        
        // Найти ближайшую точку на траектории к центру окружности
        const startToCenter = center.copy().subtract(start);
        const projection = startToCenter.dot(movement) / movement.dot(movement);
        const clampedProjection = Math.max(0, Math.min(1, projection));
        
        const closestPoint = start.copy().add(movement.copy().multiply(clampedProjection));
        const distance = closestPoint.distanceTo(center);
        
        return distance < (this.radius + radius);
    }

    // Sweep test для линейных сегментов
    sweepTestLineSegment(lineStart, lineEnd, lineWidth = 0) {
        const start = this.previousPosition;
        const end = this.position;
        
        // Используем более точный алгоритм для движущейся окружности и линии
        const ballMovement = end.copy().subtract(start);
        const lineVector = lineEnd.copy().subtract(lineStart);
        const startToLine = start.copy().subtract(lineStart);
        
        const a = ballMovement.dot(ballMovement);
        const b = 2 * ballMovement.dot(startToLine);
        const c = startToLine.dot(startToLine);
        
        if (a < 0.0001) {
            // Мяч не движется, используем статическую проверку
            const distance = this.distanceToLineSegment(start, lineStart, lineEnd);
            return distance < (this.radius + lineWidth / 2);
        }
        
        const discriminant = b * b - 4 * a * c;
        if (discriminant < 0) return false;
        
        const t1 = (-b - Math.sqrt(discriminant)) / (2 * a);
        const t2 = (-b + Math.sqrt(discriminant)) / (2 * a);
        
        // Проверяем пересечение в диапазоне [0, 1]
        return (t1 >= 0 && t1 <= 1) || (t2 >= 0 && t2 <= 1) || (t1 < 0 && t2 > 1);
    }

    distanceToLineSegment(point, lineStart, lineEnd) {
        const lineVector = lineEnd.copy().subtract(lineStart);
        const pointVector = point.copy().subtract(lineStart);
        
        const lineLength = lineVector.magnitude();
        if (lineLength < 0.0001) {
            return pointVector.magnitude();
        }
        
        const projection = pointVector.dot(lineVector) / (lineLength * lineLength);
        const clampedProjection = Math.max(0, Math.min(1, projection));
        
        const closestPoint = lineStart.copy().add(lineVector.copy().multiply(clampedProjection));
        return point.distanceTo(closestPoint);
    }

    reset() {
        this.position.x = CONFIG.VIRTUAL_WIDTH * 0.51;
        this.position.y = 50;
        this.velocity.x = 0;
        this.velocity.y = 0;
        this.previousPosition.x = this.position.x;
        this.previousPosition.y = this.position.y;
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
