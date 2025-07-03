// Game Configuration
const CONFIG = {
    GRAVITY: 0.3,
    FRICTION: 0.98,
    BOUNCE_DAMPING: 0.8,
    FLIPPER_STRENGTH: 12,
    BALL_RADIUS: 8,
    FLIPPER_LENGTH: 60,
    FLIPPER_WIDTH: 8,
    LAUNCH_POWER: 20,
    MAX_BALL_SPEED: 25, // Максимальная скорость мяча
    // Фиксированные виртуальные размеры игрового поля
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

// Vector2D Class for Physics
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

    // Ограничение максимальной длины вектора
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
        // Apply gravity
        this.velocity.add(new Vector2D(0, CONFIG.GRAVITY));

        // Ограничиваем максимальную скорость
        this.velocity.clamp(CONFIG.MAX_BALL_SPEED);

        // Apply friction
        this.velocity.multiply(CONFIG.FRICTION);

        // Update position
        this.position.add(this.velocity);

        // Boundary collisions - return true if ball is lost
        return this.handleWallCollisions();
    }

    handleWallCollisions() {
        const gameHeight = CONFIG.VIRTUAL_HEIGHT;

        // Шарик потерян если упал слишком низко
        if (this.position.y > gameHeight + 50) {
            return true;
        }

        return false;
    }

    draw(ctx) {
        // Draw main ball
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

        // Ball outline
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();
    }
}

// Овальная форма флиппера для реалистичной коллизии
class FlipperShape {
    constructor(pivotX, pivotY, length, baseWidth, tipWidth, isLeft) {
        this.pivot = new Vector2D(pivotX, pivotY);
        this.length = length;
        this.baseWidth = baseWidth; // Ширина у основания
        this.tipWidth = tipWidth;   // Ширина на конце
        this.isLeft = isLeft;
        this.angle = 0;

        // Создаем опорные точки для овальной формы
        this.updateShape();
    }

    updateShape() {
        const cos = Math.cos(this.angle);
        const sin = Math.sin(this.angle);

        // Создаем точки для овальной формы с закругленными концами
        this.points = [];
        const segments = 12; // Сегменты для основного тела
        const capSegments = 8; // Сегменты для закругленных концов

        // 1. Создаем основное тело флиппера
        const bodyPoints = [];

        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const width = this.baseWidth + (this.tipWidth - this.baseWidth) * t;
            const halfWidth = width / 2;
            const x = this.isLeft ? t * this.length : -t * this.length;

            // Верхняя и нижняя точки тела
            bodyPoints.push({
                top: { x: x, y: -halfWidth },
                bottom: { x: x, y: halfWidth }
            });
        }

        // 2. Добавляем закругленный кончик
        const tipX = this.isLeft ? this.length : -this.length;
        const tipRadius = this.tipWidth / 2;

        // Полукруг на кончике (от нижней точки к верхней)
        for (let i = 0; i <= capSegments; i++) {
            const angle = this.isLeft ? 
                Math.PI/2 - (i / capSegments) * Math.PI : // Левый: снизу вверх
                Math.PI/2 + (i / capSegments) * Math.PI;  // Правый: снизу вверх

            const capX = tipX + Math.cos(angle) * tipRadius;
            const capY = Math.sin(angle) * tipRadius;

            this.points.push({ x: capX, y: capY });
        }

        // 3. Добавляем верхнюю сторону тела (в обратном порядке)
        for (let i = segments - 1; i >= 0; i--) {
            this.points.push(bodyPoints[i].top);
        }

        // 4. Добавляем закругленное основание
        const baseRadius = this.baseWidth / 2;

        // Полукруг у основания (от верхней точки к нижней)
        for (let i = 0; i <= capSegments; i++) {
            const angle = this.isLeft ?
                Math.PI/2 + (i / capSegments) * Math.PI : // Левый: сверху вниз  
                Math.PI/2 - (i / capSegments) * Math.PI;   // Правый: сверху вниз

            const capX = Math.cos(angle) * baseRadius;
            const capY = Math.sin(angle) * baseRadius;

            this.points.push({ x: capX, y: capY });
        }

        // 5. Добавляем нижнюю сторону тела
        for (let i = 1; i <= segments; i++) {
            this.points.push(bodyPoints[i].bottom);
        }

        // 6. Переводим все точки в мировые координаты
        this.worldPoints = this.points.map(point => {
            const worldX = this.pivot.x + cos * point.x - sin * point.y;
            const worldY = this.pivot.y + sin * point.x + cos * point.y;
            return new Vector2D(worldX, worldY);
        });
    }

    // Проверка коллизии с окружностью (овальная форма с закругленными концами)
    intersectsCircle(circle) {
        // Переводим в локальную систему координат
        const cos = Math.cos(-this.angle);
        const sin = Math.sin(-this.angle);
        const dx = circle.position.x - this.pivot.x;
        const dy = circle.position.y - this.pivot.y;

        const localX = cos * dx - sin * dy;
        const localY = sin * dx + cos * dy;

        // Проверяем коллизию с основным телом флиппера
        let t = 0;
        let closestX = 0;
        let closestY = 0;
        let minDistance = Infinity;
        let isEndCap = false;

        // 1. Проверяем коллизию с основным телом
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

        // 2. Проверяем коллизию с закругленным кончиком
        const tipX = this.isLeft ? this.length : -this.length;
        const tipRadius = this.tipWidth / 2;
        const tipDistance = Math.sqrt((localX - tipX) * (localX - tipX) + localY * localY);

        if (tipDistance < minDistance && tipDistance <= tipRadius) {
            // Коллизия с кончиком
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

        // 3. Проверяем коллизию с закругленным основанием
        const baseRadius = this.baseWidth / 2;
        const baseDistance = Math.sqrt(localX * localX + localY * localY);

        if (baseDistance < minDistance && baseDistance <= baseRadius) {
            // Коллизия с основанием
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

        // Проверяем, есть ли коллизия
        if (minDistance <= circle.radius) {
            // Вычисляем нормаль
            let normalX, normalY;

            if (isEndCap) {
                // Для закругленных концов используем радиальную нормаль
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
                // Для основного тела используем перпендикулярную нормаль
                if (minDistance > 0.1) {
                    normalX = (localX - closestX) / minDistance;
                    normalY = (localY - closestY) / minDistance;
                } else {
                    normalX = 0;
                    normalY = localY > 0 ? 1 : -1;
                }
            }

            // Переводим нормаль в мировые координаты
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

        // Уменьшенные углы поворота для более реалистичной физики
        this.restAngle = isLeft ? Math.PI / 8 : -Math.PI / 8; // 22.5°
        this.activeAngle = isLeft ? -Math.PI / 6 : Math.PI / 6; // 30°

        this.angle = this.restAngle;
        this.targetAngle = this.angle;
        this.length = CONFIG.FLIPPER_LENGTH;
        this.baseWidth = CONFIG.FLIPPER_WIDTH * 1.5; // Ширина у основания
        this.tipWidth = CONFIG.FLIPPER_WIDTH * 0.8;  // Ширина на конце
        this.isActive = false;
        this.angularVelocity = 0;
        this.lastAngle = this.angle;

        // Создаем овальную форму флиппера
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
        this.angularVelocity = angleDiff * 0.4; // Увеличена скорость реакции
        this.angle += this.angularVelocity;

        // Clamp angle
        const minAngle = Math.min(this.restAngle, this.activeAngle);
        const maxAngle = Math.max(this.restAngle, this.activeAngle);
        this.angle = Math.max(minAngle, Math.min(maxAngle, this.angle));

        // Обновляем форму
        this.updateShape();
    }

    draw(ctx) {
        // Рисуем овальный флиппер
        if (this.shape.points.length === 0) return;

        ctx.save();

        // Создаем градиент для 3D эффекта
        const cos = Math.cos(this.angle);
        const sin = Math.sin(this.angle);
        const midX = this.position.x + cos * (this.length / 2);
        const midY = this.position.y + sin * (this.length / 2);

        // Основной градиент флиппера
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

        // Рисуем контур флиппера с закругленными концами
        ctx.fillStyle = gradient;
        ctx.beginPath();

        if (this.shape.worldPoints && this.shape.worldPoints.length > 0) {
            ctx.moveTo(this.shape.worldPoints[0].x, this.shape.worldPoints[0].y);

            for (let i = 1; i < this.shape.worldPoints.length; i++) {
                ctx.lineTo(this.shape.worldPoints[i].x, this.shape.worldPoints[i].y);
            }

            ctx.closePath();
            ctx.fill();

            // Добавляем блестящий ободок
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Добавляем внутренний свет
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

        // Точка поворота с металлическим эффектом
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

        // Ободок точки поворота
        ctx.strokeStyle = '#222222';
        ctx.lineWidth = 1;
        ctx.stroke();
    }

    checkCollision(ball) {
        const collision = this.shape.intersectsCircle(ball);

        if (collision.hit) {
            // ПОЛНОЕ выталкивание мяча + небольшой запас
            const pushDistance = collision.penetration + 2; // Гарантируем полное разделение
            ball.position.x += collision.normal.x * pushDistance;
            ball.position.y += collision.normal.y * pushDistance;

            // Вычисляем скорость флиппера в точке контакта
            const currentAngularVelocity = this.angle - this.lastAngle;

            // Вектор от центра поворота до точки контакта
            const contactOffset = new Vector2D(
                collision.contactPoint.x - this.position.x,
                collision.contactPoint.y - this.position.y
            );

            // Тангенциальная скорость флиппера в точке контакта
            const tangentialVelocity = new Vector2D(
                -contactOffset.y * currentAngularVelocity * 10, // Увеличиваем влияние вращения
                contactOffset.x * currentAngularVelocity * 10
            );

            // Если мяч движется "в" флиппер, отражаем его
            const velocityDotNormal = ball.velocity.dot(collision.normal);
            if (velocityDotNormal < 0) {
                // Отражение скорости мяча
                ball.velocity.x -= 2 * velocityDotNormal * collision.normal.x;
                ball.velocity.y -= 2 * velocityDotNormal * collision.normal.y;
            }

            // Добавляем силу флиппера
            if (this.isActive && Math.abs(currentAngularVelocity) > 0.01) {
                // Нормальная сила - отталкиваем от флиппера
                const normalForce = CONFIG.FLIPPER_STRENGTH;
                ball.velocity.x += collision.normal.x * normalForce;
                ball.velocity.y += collision.normal.y * normalForce;

                // Тангенциальная сила от вращения флиппера
                ball.velocity.x += tangentialVelocity.x;
                ball.velocity.y += tangentialVelocity.y;
            } else {
                // Даже когда флиппер неактивен, отталкиваем мяч
                const minForce = CONFIG.FLIPPER_STRENGTH * 0.1;
                ball.velocity.x += collision.normal.x * minForce;
                ball.velocity.y += collision.normal.y * minForce;
            }

            // Применяем затухание и ограничиваем скорость
            ball.velocity.multiply(CONFIG.BOUNCE_DAMPING);
            ball.velocity.clamp(CONFIG.MAX_BALL_SPEED);

            return true;
        }

        return false;
    }
}

// Wall Class for unified wall definition
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

            // Более плавное выталкивание
            const overlap = ball.radius + this.width / 2 - distance;
            const pushDistance = overlap * 0.8; // Уменьшенная сила выталкивания
            ball.position.x += normal.x * pushDistance;
            ball.position.y += normal.y * pushDistance;

            // Отражаем скорость
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

// Game Class
class PinballGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.gameState = new GameState();
        this.ball = null;
        this.flippers = [];
        this.walls = [];

        // Параметры масштабирования
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

    screenToGame(screenX, screenY) {
        return {
            x: (screenX - this.offsetX) / this.scale,
            y: (screenY - this.offsetY) / this.scale
        };
    }

    setupGameObjects() {
        this.resetBall();
        this.initializeWalls();

        // Create flippers
        const flipperY = CONFIG.VIRTUAL_HEIGHT - 80;
        this.flippers = [
            new Flipper(CONFIG.VIRTUAL_WIDTH * 0.3, flipperY, true),   // Left flipper
            new Flipper(CONFIG.VIRTUAL_WIDTH * 0.7, flipperY, false)   // Right flipper  
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
            // Outer walls
            new Wall(5, 5, 5, gameHeight - 100), // Left wall
            new Wall(gameWidth - 5, 5, gameWidth - 5, gameHeight - 100), // Right wall
            new Wall(5, 5, gameWidth - 5, 5), // Top wall

            // Наклонные стенки возле флипперов
            new Wall(gameWidth * 0.25, gameHeight - 80, gameWidth * 0, flipperY - 20), // Left slope
            new Wall(gameWidth * 1, flipperY - 20, gameWidth * 0.75, gameHeight - 80), // Right slope

            // Bottom walls (горизонтальные части)
            new Wall(5, bottomY, leftWallEnd, bottomY), // Left bottom wall
            new Wall(rightWallStart, bottomY, gameWidth - 5, bottomY) // Right bottom wall
        ];
    }

    resetBall() {
        // Start ball slightly right of center, ready to drop
        this.ball = new Ball(CONFIG.VIRTUAL_WIDTH * 0.6, 50);
        this.ball.velocity = new Vector2D(0, 0);
        this.gameState.ballInPlay = true;
    }

    setupEventListeners() {
        // Touch controls
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

        // Mouse controls
        this.canvas.addEventListener('mousedown', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const screenX = e.clientX - rect.left;

            this.handleInput(screenX, true);
        });

        this.canvas.addEventListener('mouseup', () => {
            this.handleInput(0, false);
        });

        // Restart button
        document.getElementById('restartBtn').addEventListener('click', () => this.restartGame());
        document.getElementById('gameOverRestart').addEventListener('click', () => this.restartGame());
    }

    handleInput(screenX, isPressed) {
        if (isPressed) {
            // Left flipper
            if (screenX < this.canvas.width * 0.5) {
                this.flippers[0].activate();
            }
            // Right flipper
            else {
                this.flippers[1].activate();
            }
        } else {
            // Release flippers
            this.flippers[0].deactivate();
            this.flippers[1].deactivate();
        }
    }

    update() {
        if (this.gameState.isGameOver) return;

        // Update ball
        const ballLost = this.ball.update();

        // Update flippers
        this.flippers.forEach(flipper => flipper.update());

        // Check collisions
        this.checkCollisions();

        // Check if ball is lost
        if (ballLost && this.gameState.ballInPlay) {
            this.gameState.balls--;
            this.gameState.ballInPlay = false;

            if (this.gameState.balls <= 0) {
                this.gameOver();
            } else {
                // Reset ball after a delay
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
                // Add small score for flipper hits
                this.gameState.updateScore(10);
                this.updateUI();
            }
        });
    }

    draw() {
        // Clear canvas
        this.ctx.fillStyle = '#0c0c0c';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Apply transformation
        this.ctx.save();
        this.ctx.translate(this.offsetX, this.offsetY);
        this.ctx.scale(this.scale, this.scale);

        // Draw virtual game area background
        const gradient = this.ctx.createLinearGradient(0, 0, 0, CONFIG.VIRTUAL_HEIGHT);
        gradient.addColorStop(0, '#1a1a2e');
        gradient.addColorStop(1, '#0f1419');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, CONFIG.VIRTUAL_WIDTH, CONFIG.VIRTUAL_HEIGHT);

        // Draw walls
        this.drawWalls();

        // Draw game objects
        this.flippers.forEach(flipper => flipper.draw(this.ctx));

        if (this.gameState.ballInPlay) {
            this.ball.draw(this.ctx);
        }

        this.ctx.restore();
    }

    drawWalls() {
        this.walls.forEach(wall => wall.draw(this.ctx));
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
        this.updateUI();

        document.getElementById('gameOverOverlay').style.display = 'none';
    }

    gameLoop() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.gameLoop());
    }
}

// Initialize game when page loads
window.addEventListener('load', () => {
    new PinballGame();
});

// Prevent scrolling on mobile
document.addEventListener('touchmove', (e) => {
    e.preventDefault();
}, { passive: false });

// Prevent context menu
document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
});