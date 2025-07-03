// Game Configuration
const CONFIG = {
    GRAVITY: 0.3,
    FRICTION: 0.98,
    BOUNCE_DAMPING: 0.8,
    FLIPPER_STRENGTH: 15,
    BALL_RADIUS: 8,
    FLIPPER_LENGTH: 70,
    FLIPPER_WIDTH: 8,
    LAUNCH_POWER: 20,
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

// Flipper Class
class Flipper {
    constructor(x, y, isLeft) {
        this.position = new Vector2D(x, y);
        this.isLeft = isLeft;
        this.angle = isLeft ? Math.PI / 6 : -Math.PI / 6;
        this.targetAngle = this.angle;
        this.restAngle = this.angle;
        this.activeAngle = isLeft ? -Math.PI / 4 : Math.PI / 4;
        this.length = CONFIG.FLIPPER_LENGTH;
        this.width = CONFIG.FLIPPER_WIDTH;
        this.isActive = false;
        this.angularVelocity = 0;
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
        const angleDiff = this.targetAngle - this.angle;
        this.angularVelocity = angleDiff * 0.3;
        this.angle += this.angularVelocity;

        // Clamp angle
        if (this.isLeft) {
            this.angle = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.angle));
        } else {
            this.angle = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.angle));
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.position.x, this.position.y);
        ctx.rotate(this.angle);

        const startX = this.isLeft ? 0 : -this.length;
        const endX = this.isLeft ? this.length : 0;

        // Flipper
        ctx.fillStyle = '#4444ff';
        ctx.fillRect(startX, -this.width/2, this.length, this.width);

        // Flipper outline
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.strokeRect(startX, -this.width/2, this.length, this.width);

        ctx.restore();

        // Pivot point
        ctx.fillStyle = '#00ff00';
        ctx.beginPath();
        ctx.arc(this.position.x, this.position.y, 4, 0, Math.PI * 2);
        ctx.fill();
    }

    checkCollision(ball) {
        let startX, startY, endX, endY;

        if (this.isLeft) {
            startX = this.position.x;
            startY = this.position.y;
            endX = this.position.x + Math.cos(this.angle) * this.length;
            endY = this.position.y + Math.sin(this.angle) * this.length;
        } else {
            startX = this.position.x + Math.cos(this.angle + Math.PI) * this.length;
            startY = this.position.y + Math.sin(this.angle + Math.PI) * this.length;
            endX = this.position.x;
            endY = this.position.y;
        }

        const distance = this.distanceToLineSegment(ball.position, new Vector2D(startX, startY), new Vector2D(endX, endY));

        if (distance < ball.radius + this.width / 2) {
            const normal = this.getNormalToLineSegment(ball.position, new Vector2D(startX, startY), new Vector2D(endX, endY));

            // Move ball away from flipper
            ball.position.x += normal.x * (ball.radius + this.width / 2 - distance + 1);
            ball.position.y += normal.y * (ball.radius + this.width / 2 - distance + 1);

            // Reflect velocity
            const dotProduct = ball.velocity.x * normal.x + ball.velocity.y * normal.y;
            ball.velocity.x -= 2 * dotProduct * normal.x;
            ball.velocity.y -= 2 * dotProduct * normal.y;

            // Add flipper force when active
            if (this.isActive) {
                const flipperForce = CONFIG.FLIPPER_STRENGTH;
                ball.velocity.x += normal.x * flipperForce;
                ball.velocity.y += normal.y * flipperForce;
            }

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
        if (normal.x * toPoint.x + normal.y * toPoint.y < 0) {
            normal.multiply(-1);
        }

        return normal;
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
        ctx.beginPath();
        ctx.moveTo(this.x1, this.y1);
        ctx.lineTo(this.x2, this.y2);
        ctx.stroke();
    }

    checkCollision(ball) {
        // Вычисляем расстояние от центра шарика до линии
        const distance = this.distanceToLineSegment(ball.position, new Vector2D(this.x1, this.y1), new Vector2D(this.x2, this.y2));
        
        if (distance < ball.radius + this.width / 2) {
            // Получаем нормаль к стене
            const normal = this.getNormalToLineSegment(ball.position, new Vector2D(this.x1, this.y1), new Vector2D(this.x2, this.y2));
            
            // Выталкиваем шарик из стены
            const overlap = ball.radius + this.width / 2 - distance + 1;
            ball.position.x += normal.x * overlap;
            ball.position.y += normal.y * overlap;
            
            // Отражаем скорость
            const dotProduct = ball.velocity.x * normal.x + ball.velocity.y * normal.y;
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
        if (normal.x * toPoint.x + normal.y * toPoint.y < 0) {
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
        // Start ball in center, ready to drop
        this.ball = new Ball(CONFIG.VIRTUAL_WIDTH / 2, 50);
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