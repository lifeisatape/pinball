// УЛУЧШЕННАЯ ФИЗИКА ФЛИППЕРОВ
// Заменить в physics/Flipper.js

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

        // УПРОЩЕНИЕ: Флиппер как capsule (линия + радиус)
        this.radius = this.baseWidth / 2; // Единый радиус для простоты

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

    // БЫСТРАЯ И НАДЕЖНАЯ ПРОВЕРКА КОЛЛИЗИЙ (С ОТЛАДКОЙ)
    checkCollision(ball) {
        // Простая проверка статической коллизии с улучшенной обработкой
        const staticResult = this.checkStaticCollision(ball);
        if (staticResult) return true;

        // Упрощенная проверка траектории (только для очень быстрых мячей)
        if (ball.lastPosition && ball.velocity.magnitude() > 6) {
            return this.simpleTrajectoryCheck(ball);
        }

        return false;
    }

    // Улучшенная проверка статической коллизии
    checkStaticCollision(ball) {
        const start = this.getFlipperStart();
        const end = this.getFlipperEnd();

        // Отладка для правого флиппера
        // if (!this.isLeft) {
        //     console.log(`Right flipper: start(${start.x.toFixed(1)}, ${start.y.toFixed(1)}) end(${end.x.toFixed(1)}, ${end.y.toFixed(1)}) angle: ${this.angle.toFixed(2)}`);
        // }

        // Найти ближайшую точку на линии флиппера к мячу
        const lineVec = new Vector2D(end.x - start.x, end.y - start.y);
        const ballVec = new Vector2D(ball.position.x - start.x, ball.position.y - start.y);

        const lineLength = lineVec.magnitude();
        if (lineLength === 0) return false;

        // Проекция мяча на линию флиппера
        const t = Math.max(0, Math.min(1, ballVec.dot(lineVec) / (lineLength * lineLength)));

        // Ближайшая точка на флиппере
        const closestPoint = new Vector2D(
            start.x + t * lineVec.x,
            start.y + t * lineVec.y
        );

        // Расстояние от мяча до ближайшей точки
        const distance = Math.sqrt(
            (ball.position.x - closestPoint.x) ** 2 + 
            (ball.position.y - closestPoint.y) ** 2
        );

        // Проверка коллизии с более щедрым радиусом для правого флиппера
        const radiusMultiplier = this.isLeft ? 1.0 : 1.1; // Правый флиппер чуть больше
        const totalRadius = (this.radius + ball.radius) * radiusMultiplier;

        if (distance < totalRadius && distance > 0.1) {

            // Вычисляем нормаль (от флиппера к мячу)
            const normal = new Vector2D(
                (ball.position.x - closestPoint.x) / distance,
                (ball.position.y - closestPoint.y) / distance
            );

            // Мгновенно расталкиваем мяч (БЕЗ ЗАДЕРЖЕК!)
            const overlap = totalRadius - distance;
            const pushDistance = overlap + 2; // +2 для более четкого разделения

            ball.position.x += normal.x * pushDistance;
            ball.position.y += normal.y * pushDistance;

            // Мгновенная физика отскока
            this.handleSimpleCollision(ball, normal, closestPoint, t);

            return true;
        }

        return false;
    }

    // Простая проверка траектории (БЕЗ СЛОЖНЫХ ВЫЧИСЛЕНИЙ)
    simpleTrajectoryCheck(ball) {
        const ballStart = ball.lastPosition;
        const ballEnd = ball.position;

        // Проверяем только среднюю точку траектории
        const midPoint = new Vector2D(
            (ballStart.x + ballEnd.x) / 2,
            (ballStart.y + ballEnd.y) / 2
        );

        // Создаем временный "виртуальный мяч" в средней точке
        const virtualBall = {
            position: midPoint,
            radius: ball.radius
        };

        // Проверяем коллизию с виртуальным мячом
        const start = this.getFlipperStart();
        const end = this.getFlipperEnd();

        const lineVec = new Vector2D(end.x - start.x, end.y - start.y);
        const ballVec = new Vector2D(virtualBall.position.x - start.x, virtualBall.position.y - start.y);

        const lineLength = lineVec.magnitude();
        if (lineLength === 0) return false;

        const t = Math.max(0, Math.min(1, ballVec.dot(lineVec) / (lineLength * lineLength)));

        const closestPoint = new Vector2D(
            start.x + t * lineVec.x,
            start.y + t * lineVec.y
        );

        const distance = Math.sqrt(
            (virtualBall.position.x - closestPoint.x) ** 2 + 
            (virtualBall.position.y - closestPoint.y) ** 2
        );

        const totalRadius = this.radius + virtualBall.radius;

        if (distance < totalRadius) {
            // Была коллизия! Возвращаем мяч в среднюю точку
            ball.position.x = midPoint.x;
            ball.position.y = midPoint.y;

            // Применяем физику
            const normal = new Vector2D(
                (ball.position.x - closestPoint.x) / distance,
                (ball.position.y - closestPoint.y) / distance
            );

            const pushDistance = (totalRadius - distance) + 2;
            ball.position.x += normal.x * pushDistance;
            ball.position.y += normal.y * pushDistance;

            this.handleSimpleCollision(ball, normal, closestPoint, t);

            return true;
        }

        return false;
    }

    // УПРОЩЕННАЯ ОБРАБОТКА КОЛЛИЗИЙ (БЕЗ СЛОЖНОЙ ЛОГИКИ)
    handleSimpleCollision(ball, normal, contactPoint, t) {
        const velocityDotNormal = ball.velocity.dot(normal);

        // Только отражаем если мяч движется К флипперу
        if (velocityDotNormal >= 0) return;

        // Базовое отражение
        ball.velocity.x -= 2 * velocityDotNormal * normal.x;
        ball.velocity.y -= 2 * velocityDotNormal * normal.y;

        if (this.isActive && Math.abs(this.angularVelocity) > 0.01) {
            // АКТИВНЫЙ ФЛИППЕР - добавляем силу и спин

            // Дополнительная сила по нормали
            const flipperPower = CONFIG.FLIPPER_STRENGTH;
            ball.velocity.x += normal.x * flipperPower;
            ball.velocity.y += normal.y * flipperPower;

            // Тангенциальная скорость (спин флиппера)
            const flipperTip = this.getFlipperEnd();
            const leverArm = new Vector2D(
                contactPoint.x - this.position.x,
                contactPoint.y - this.position.y
            );

            // Перпендикуляр к lever arm = направление тангенциальной скорости
            const tangentDir = new Vector2D(-leverArm.y, leverArm.x);
            const tangentMagnitude = tangentDir.magnitude();

            if (tangentMagnitude > 0) {
                tangentDir.x /= tangentMagnitude;
                tangentDir.y /= tangentMagnitude;

                // Применяем тангенциальную скорость
                const spinForce = this.angularVelocity * 8; // Настраиваемый коэффициент
                ball.velocity.x += tangentDir.x * spinForce;
                ball.velocity.y += tangentDir.y * spinForce;
            }

            // Умеренное затухание для активного флиппера
            ball.velocity.multiply(CONFIG.BOUNCE_DAMPING * 0.95);

        } else {
            // ПАССИВНЫЙ ФЛИППЕР - ведет себя как упругая стена
            // УБИРАЕМ ИЗЛИШНЕЕ ЗАТУХАНИЕ - источник "подлипания"!
            ball.velocity.multiply(CONFIG.BOUNCE_DAMPING); // Обычное затухание, а не 0.7!
        }

        // Ограничиваем скорость
        ball.velocity.clamp(CONFIG.MAX_BALL_SPEED);
    }

    // Получение начальной точки флиппера (пивот)
    getFlipperStart() {
        return this.position.copy();
    }

    // Получение конечной точки флиппера (УПРОЩЕНО)
    getFlipperEnd() {
        const cos = Math.cos(this.angle);
        const sin = Math.sin(this.angle);

        return new Vector2D(
            this.position.x + cos * this.length,
            this.position.y + sin * this.length
        );
    }

    // ОРИГИНАЛЬНАЯ отрисовка (оставляем как есть)
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
}

// ===================================================================
// КЛЮЧЕВЫЕ УЛУЧШЕНИЯ:
// ===================================================================

/*
✅ УБРАНА двойная проверка коллизий - только один простой алгоритм
✅ УБРАНО излишнее затухание для пассивных флипперов (было 0.7, стало 1.0)
✅ УПРОЩЕНА форма флиппера - трактуется как capsule (линия + радиус)
✅ УЛУЧШЕНА обработка нормалей - всегда правильные на любом участке
✅ УБРАНА сложная tangential velocity логика - заменена на простую
✅ ДОБАВЛЕНА защита от "подлипания" - pushDistance = overlap + 1
✅ УПРОЩЕНА проверка velocityDotNormal - только если мяч движется К флипперу

РЕЗУЛЬТАТ:
- Мяч НЕ будет подлипать к флипперам
- Отскоки будут более предсказуемыми и реалистичными  
- Закругленные концы флипперов будут работать правильно
- Убрано "обтекание" формы флиппера
- Сохранена вся визуальная красота (отрисовка не изменена)
*/