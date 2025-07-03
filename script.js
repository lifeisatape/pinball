// Configuration
const CONFIG = {
    GRAVITY: 0.3,
    FRICTION: 0.98,
    BOUNCE_DAMPING: 0.8,
    FLIPPER_STRENGTH: 12,
    BALL_RADIUS: 8,
    FLIPPER_LENGTH: 50,
    MAX_BALL_SPEED: 25,
    VIRTUAL_WIDTH: 800,
    VIRTUAL_HEIGHT: 600
};

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

// Ball Class for testing
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

        // Reset if ball goes off screen
        if (this.position.y > CONFIG.VIRTUAL_HEIGHT + 100) {
            this.position.x = CONFIG.VIRTUAL_WIDTH / 2;
            this.position.y = 50;
            this.velocity.x = 0;
            this.velocity.y = 0;
        }
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
    }
}

// Game Objects Classes
class EditorWall {
    constructor(x1, y1, x2, y2, width = 20, color = '#ff4444') {
        this.x1 = x1;
        this.y1 = y1;
        this.x2 = x2;
        this.y2 = y2;
        this.width = width;
        this.color = color;
    }

    draw(ctx, isSelected = false) {
        ctx.strokeStyle = isSelected ? '#ffff00' : this.color;
        ctx.lineWidth = this.width;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(this.x1, this.y1);
        ctx.lineTo(this.x2, this.y2);
        ctx.stroke();
    }

    checkCollision(ball) {
        const distance = this.distanceToLineSegment(ball.position);
        if (distance < ball.radius + this.width / 2) {
            const normal = this.getNormalToLineSegment(ball.position);
            const overlap = ball.radius + this.width / 2 - distance;
            ball.position.x += normal.x * overlap;
            ball.position.y += normal.y * overlap;

            const dotProduct = ball.velocity.dot(normal);
            ball.velocity.x -= 2 * dotProduct * normal.x;
            ball.velocity.y -= 2 * dotProduct * normal.y;
            ball.velocity.multiply(CONFIG.BOUNCE_DAMPING);
        }
    }

    distanceToLineSegment(point) {
        const A = point.x - this.x1;
        const B = point.y - this.y1;
        const C = this.x2 - this.x1;
        const D = this.y2 - this.y1;

        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        let param = lenSq !== 0 ? dot / lenSq : -1;

        let xx, yy;
        if (param < 0) {
            xx = this.x1;
            yy = this.y1;
        } else if (param > 1) {
            xx = this.x2;
            yy = this.y2;
        } else {
            xx = this.x1 + param * C;
            yy = this.y1 + param * D;
        }

        const dx = point.x - xx;
        const dy = point.y - yy;
        return Math.sqrt(dx * dx + dy * dy);
    }

    getNormalToLineSegment(point) {
        const dx = this.x2 - this.x1;
        const dy = this.y2 - this.y1;
        const normal = new Vector2D(-dy, dx).normalize();

        const toPoint = new Vector2D(point.x - this.x1, point.y - this.y1);
        if (normal.dot(toPoint) < 0) {
            normal.multiply(-1);
        }
        return normal;
    }

    isNear(x, y, threshold = 20) {
        const distance = this.distanceToLineSegment(new Vector2D(x, y));
        return distance < threshold;
    }
}

class EditorBumper {
    constructor(x, y, radius = 25, points = 100) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.points = points;
        this.hitAnimation = 0;
    }

    draw(ctx, isSelected = false) {
        if (this.hitAnimation > 0) {
            this.hitAnimation -= 0.1;
        }

        const animRadius = this.radius + this.hitAnimation * 5;

        const gradient = ctx.createRadialGradient(
            this.x - 5, this.y - 5, 0,
            this.x, this.y, animRadius
        );
        gradient.addColorStop(0, '#ffffff');
        gradient.addColorStop(0.3, '#ff4444');
        gradient.addColorStop(1, '#aa0000');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, animRadius, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = isSelected ? '#ffff00' : '#ffffff';
        ctx.lineWidth = isSelected ? 3 : 2;
        ctx.stroke();
    }

    checkCollision(ball) {
        const dx = ball.position.x - this.x;
        const dy = ball.position.y - this.y;
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
        }
    }

    isNear(x, y, threshold = 20) {
        const dx = x - this.x;
        const dy = y - this.y;
        return Math.sqrt(dx * dx + dy * dy) < this.radius + threshold;
    }
}

class EditorSpinner {
    constructor(x, y, width = 30, height = 8) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.angle = 0;
        this.angularVelocity = 0;
    }

    update() {
        this.angle += this.angularVelocity;
        this.angularVelocity *= 0.95;
    }

    draw(ctx, isSelected = false) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        const gradient = ctx.createLinearGradient(-this.width/2, 0, this.width/2, 0);
        gradient.addColorStop(0, '#4444ff');
        gradient.addColorStop(0.5, '#6666ff');
        gradient.addColorStop(1, '#4444ff');

        ctx.fillStyle = gradient;
        ctx.fillRect(-this.width/2, -this.height/2, this.width, this.height);

        ctx.strokeStyle = isSelected ? '#ffff00' : '#ffffff';
        ctx.lineWidth = isSelected ? 3 : 1;
        ctx.strokeRect(-this.width/2, -this.height/2, this.width, this.height);
        ctx.restore();

        ctx.fillStyle = isSelected ? '#ffff00' : '#ffffff';
        ctx.beginPath();
        ctx.arc(this.x, this.y, 3, 0, Math.PI * 2);
        ctx.fill();
    }

    checkCollision(ball) {
        const cos = Math.cos(this.angle);
        const sin = Math.sin(this.angle);

        const dx = ball.position.x - this.x;
        const dy = ball.position.y - this.y;
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
        }
    }

    isNear(x, y, threshold = 20) {
        const dx = x - this.x;
        const dy = y - this.y;
        return Math.sqrt(dx * dx + dy * dy) < Math.max(this.width, this.height) + threshold;
    }
}

class EditorDropTarget {
    constructor(x, y, width = 15, height = 30) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.isActive = true;
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

    draw(ctx, isSelected = false) {
        if (!this.isActive) return;

        const gradient = ctx.createLinearGradient(
            this.x - this.width/2, this.y,
            this.x + this.width/2, this.y
        );
        gradient.addColorStop(0, '#ff8800');
        gradient.addColorStop(0.5, '#ffaa00');
        gradient.addColorStop(1, '#ff8800');

        ctx.fillStyle = gradient;
        ctx.fillRect(
            this.x - this.width/2,
            this.y - this.height/2,
            this.width,
            this.height
        );

        ctx.strokeStyle = isSelected ? '#ffff00' : '#ffffff';
        ctx.lineWidth = isSelected ? 3 : 1;
        ctx.strokeRect(
            this.x - this.width/2,
            this.y - this.height/2,
            this.width,
            this.height
        );
    }

    checkCollision(ball) {
        if (!this.isActive) return;

        const dx = Math.abs(ball.position.x - this.x);
        const dy = Math.abs(ball.position.y - this.y);

        if (dx < this.width/2 + ball.radius && dy < this.height/2 + ball.radius) {
            this.isActive = false;
            this.resetTime = 300;

            const normalX = ball.position.x < this.x ? -1 : 1;
            ball.velocity.x = Math.abs(ball.velocity.x) * normalX * 1.2;
        }
    }

    isNear(x, y, threshold = 20) {
        const dx = Math.abs(x - this.x);
        const dy = Math.abs(y - this.y);
        return dx < this.width/2 + threshold && dy < this.height/2 + threshold;
    }
}

class EditorFlipper {
    constructor(x, y, isLeft) {
        this.x = x;
        this.y = y;
        this.isLeft = isLeft;
        this.length = CONFIG.FLIPPER_LENGTH;
        this.width = 8;
        this.angle = isLeft ? Math.PI / 8 : -Math.PI / 8;
        this.isActive = false;
    }

    draw(ctx, isSelected = false) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        const gradient = ctx.createLinearGradient(0, -this.width/2, 0, this.width/2);
        gradient.addColorStop(0, '#ff8888');
        gradient.addColorStop(0.5, '#ff6666');
        gradient.addColorStop(1, '#dd4444');

        ctx.fillStyle = gradient;

        const points = [
            [0, -this.width/2],
            [this.length, -this.width/4],
            [this.length, this.width/4],
            [0, this.width/2]
        ];

        ctx.beginPath();
        ctx.moveTo(points[0][0], points[0][1]);
        for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i][0], points[i][1]);
        }
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = isSelected ? '#ffff00' : '#ffffff';
        ctx.lineWidth = isSelected ? 3 : 1.5;
        ctx.stroke();
        ctx.restore();

        // Draw pivot
        ctx.fillStyle = isSelected ? '#ffff00' : '#ffffff';
        ctx.beginPath();
        ctx.arc(this.x, this.y, 5, 0, Math.PI * 2);
        ctx.fill();
    }

    isNear(x, y, threshold = 20) {
        const dx = x - this.x;
        const dy = y - this.y;
        return Math.sqrt(dx * dx + dy * dy) < this.length + threshold;
    }
}

// Level Editor Class
class LevelEditor {
    constructor() {
        this.canvas = document.getElementById('editorCanvas');
        this.ctx = this.canvas.getContext('2d');

        this.isEditMode = true;
        this.currentTool = 'wall';
        this.isDrawing = false;
        this.drawStart = null;
        this.selectedObject = null;

        // Game objects
        this.walls = [];
        this.bumpers = [];
        this.spinners = [];
        this.dropTargets = [];
        this.flippers = [];

        // Test mode
        this.ball = null;
        this.keys = {};

        this.setupCanvas();
        this.setupEventListeners();
        this.setupToolProperties();
        this.gameLoop();
    }

    setupCanvas() {
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
    }

    resizeCanvas() {
        const rect = this.canvas.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;

        const scaleX = this.canvas.width / CONFIG.VIRTUAL_WIDTH;
        const scaleY = this.canvas.height / CONFIG.VIRTUAL_HEIGHT;
        this.scale = Math.min(scaleX, scaleY);

        this.offsetX = (this.canvas.width - CONFIG.VIRTUAL_WIDTH * this.scale) / 2;
        this.offsetY = (this.canvas.height - CONFIG.VIRTUAL_HEIGHT * this.scale) / 2;
    }

    worldToScreen(x, y) {
        return {
            x: x * this.scale + this.offsetX,
            y: y * this.scale + this.offsetY
        };
    }

    screenToWorld(x, y) {
        return {
            x: (x - this.offsetX) / this.scale,
            y: (y - this.offsetY) / this.scale
        };
    }

    setupEventListeners() {
        // Mode buttons
        document.getElementById('editMode').addEventListener('click', () => this.setMode(true));
        document.getElementById('testMode').addEventListener('click', () => this.setMode(false));

        // Tool selection
        document.getElementById('toolSelect').addEventListener('change', (e) => {
            this.currentTool = e.target.value;
            this.updateInfoText();
            this.updatePropertyPanels();
        });

        // Action buttons
        document.getElementById('clearAll').addEventListener('click', () => this.clearAll());
        document.getElementById('saveLevel').addEventListener('click', () => this.saveLevel());
        document.getElementById('loadLevel').addEventListener('click', () => this.loadLevel());

        // Canvas events
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));

        // Keyboard events for test mode
        document.addEventListener('keydown', (e) => {
            this.keys[e.key.toLowerCase()] = true;
            if (e.key === ' ' && !this.isEditMode) {
                e.preventDefault();
                this.resetBall();
            }
        });

        document.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
        });
    }

    setupToolProperties() {
        // Wall properties
        document.getElementById('wallWidth').addEventListener('input', (e) => {
            if (this.selectedObject instanceof EditorWall) {
                this.selectedObject.width = parseInt(e.target.value);
            }
        });

        document.getElementById('wallColor').addEventListener('input', (e) => {
            if (this.selectedObject instanceof EditorWall) {
                this.selectedObject.color = e.target.value;
            }
        });

        // Bumper properties
        document.getElementById('bumperRadius').addEventListener('input', (e) => {
            if (this.selectedObject instanceof EditorBumper) {
                this.selectedObject.radius = parseInt(e.target.value);
            }
        });

        document.getElementById('bumperPoints').addEventListener('input', (e) => {
            if (this.selectedObject instanceof EditorBumper) {
                this.selectedObject.points = parseInt(e.target.value);
            }
        });

        this.updatePropertyPanels();
    }

    setMode(isEdit) {
        this.isEditMode = isEdit;

        document.getElementById('editMode').classList.toggle('active', isEdit);
        document.getElementById('testMode').classList.toggle('active', !isEdit);
        document.body.classList.toggle('test-mode', !isEdit);

        if (!isEdit) {
            this.resetBall();
            this.selectedObject = null;
        }

        this.updateInfoText();
    }

    updateInfoText() {
        const info = document.getElementById('modeInfo');
        if (!this.isEditMode) {
            info.textContent = 'Arrow keys to control flippers, Space to reset ball';
        } else {
            switch (this.currentTool) {
                case 'wall':
                    info.textContent = 'Click and drag to draw walls';
                    break;
                case 'bumper':
                    info.textContent = 'Click to place bumpers';
                    break;
                case 'spinner':
                    info.textContent = 'Click to place spinners';
                    break;
                case 'dropTarget':
                    info.textContent = 'Click to place drop targets';
                    break;
                case 'flipper':
                    info.textContent = 'Click to place flippers';
                    break;
                case 'delete':
                    info.textContent = 'Click on objects to delete them';
                    break;
            }
        }
    }

    updatePropertyPanels() {
        const panels = ['wallProperties', 'bumperProperties', 'flipperProperties'];
        panels.forEach(panel => {
            document.getElementById(panel).style.display = 'none';
        });

        if (this.currentTool === 'wall') {
            document.getElementById('wallProperties').style.display = 'block';
        } else if (this.currentTool === 'bumper') {
            document.getElementById('bumperProperties').style.display = 'block';
        } else if (this.currentTool === 'flipper') {
            document.getElementById('flipperProperties').style.display = 'block';
        }
    }

    handleMouseDown(e) {
        if (!this.isEditMode) return;

        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const world = this.screenToWorld(mouseX, mouseY);

        if (this.currentTool === 'wall') {
            this.isDrawing = true;
            this.drawStart = world;
        } else if (this.currentTool === 'delete') {
            this.deleteObjectAt(world.x, world.y);
        } else {
            this.placeObject(world.x, world.y);
        }
    }

    handleMouseMove(e) {
        if (!this.isEditMode || !this.isDrawing || this.currentTool !== 'wall') return;

        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        this.currentMousePos = this.screenToWorld(mouseX, mouseY);
    }

    handleMouseUp(e) {
        if (!this.isEditMode || !this.isDrawing || this.currentTool !== 'wall') return;

        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const world = this.screenToWorld(mouseX, mouseY);

        if (this.drawStart) {
            const width = parseInt(document.getElementById('wallWidth').value);
            const color = document.getElementById('wallColor').value;

            this.walls.push(new EditorWall(
                this.drawStart.x, this.drawStart.y,
                world.x, world.y,
                width, color
            ));
        }

        this.isDrawing = false;
        this.drawStart = null;
        this.currentMousePos = null;
    }

    placeObject(x, y) {
        switch (this.currentTool) {
            case 'bumper':
                const radius = parseInt(document.getElementById('bumperRadius').value);
                const points = parseInt(document.getElementById('bumperPoints').value);
                this.bumpers.push(new EditorBumper(x, y, radius, points));
                break;
            case 'spinner':
                this.spinners.push(new EditorSpinner(x, y));
                break;
            case 'dropTarget':
                this.dropTargets.push(new EditorDropTarget(x, y));
                break;
            case 'flipper':
                const isLeft = document.getElementById('flipperSide').value === 'left';
                this.flippers.push(new EditorFlipper(x, y, isLeft));
                break;
        }
    }

    deleteObjectAt(x, y) {
        const allObjects = [
            ...this.walls,
            ...this.bumpers,
            ...this.spinners,
            ...this.dropTargets,
            ...this.flippers
        ];

        for (let obj of allObjects) {
            if (obj.isNear(x, y)) {
                if (this.walls.includes(obj)) {
                    this.walls.splice(this.walls.indexOf(obj), 1);
                } else if (this.bumpers.includes(obj)) {
                    this.bumpers.splice(this.bumpers.indexOf(obj), 1);
                } else if (this.spinners.includes(obj)) {
                    this.spinners.splice(this.spinners.indexOf(obj), 1);
                } else if (this.dropTargets.includes(obj)) {
                    this.dropTargets.splice(this.dropTargets.indexOf(obj), 1);
                } else if (this.flippers.includes(obj)) {
                    this.flippers.splice(this.flippers.indexOf(obj), 1);
                }
                break;
            }
        }
    }

    clearAll() {
        this.walls = [];
        this.bumpers = [];
        this.spinners = [];
        this.dropTargets = [];
        this.flippers = [];
        this.selectedObject = null;
    }

    saveLevel() {
        const levelData = {
            walls: this.walls,
            bumpers: this.bumpers,
            spinners: this.spinners,
            dropTargets: this.dropTargets,
            flippers: this.flippers
        };

        const dataStr = JSON.stringify(levelData, null, 2);
        const dataBlob = new Blob([dataStr], {type: 'application/json'});
        const url = URL.createObjectURL(dataBlob);

        const link = document.createElement('a');
        link.href = url;
        link.download = 'pinball_level.json';
        link.click();

        URL.revokeObjectURL(url);
    }

    loadLevel() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';

        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const levelData = JSON.parse(e.target.result);
                        this.loadLevelData(levelData);
                    } catch (error) {
                        alert('Error loading level file: ' + error.message);
                    }
                };
                reader.readAsText(file);
            }
        };

        input.click();
    }

    loadLevelData(levelData) {
        this.clearAll();

        if (levelData.walls) {
            this.walls = levelData.walls.map(w => 
                new EditorWall(w.x1, w.y1, w.x2, w.y2, w.width, w.color));
        }

        if (levelData.bumpers) {
            this.bumpers = levelData.bumpers.map(b => 
                new EditorBumper(b.x, b.y, b.radius, b.points));
        }

        if (levelData.spinners) {
            this.spinners = levelData.spinners.map(s => 
                new EditorSpinner(s.x, s.y, s.width, s.height));
        }

        if (levelData.dropTargets) {
            this.dropTargets = levelData.dropTargets.map(d => 
                new EditorDropTarget(d.x, d.y, d.width, d.height));
        }

        if (levelData.flippers) {
            this.flippers = levelData.flippers.map(f => 
                new EditorFlipper(f.x, f.y, f.isLeft));
        }
    }

    resetBall() {
        this.ball = new Ball(CONFIG.VIRTUAL_WIDTH / 2, 50);
    }

    update() {
        if (!this.isEditMode) {
            // Test mode updates
            if (this.ball) {
                this.ball.update();

                // Check collisions with all objects
                this.walls.forEach(wall => wall.checkCollision(this.ball));
                this.bumpers.forEach(bumper => bumper.checkCollision(this.ball));
                this.spinners.forEach(spinner => {
                    spinner.update();
                    spinner.checkCollision(this.ball);
                });
                this.dropTargets.forEach(target => {
                    target.update();
                    target.checkCollision(this.ball);
                });

                // Simple flipper control
                this.flippers.forEach(flipper => {
                    if ((flipper.isLeft && this.keys['arrowleft']) || 
                        (!flipper.isLeft && this.keys['arrowright'])) {
                        flipper.isActive = true;
                        flipper.angle = flipper.isLeft ? -Math.PI / 6 : Math.PI / 6;
                    } else {
                        flipper.isActive = false;
                        flipper.angle = flipper.isLeft ? Math.PI / 8 : -Math.PI / 8;
                    }
                });
            }
        }
    }

    draw() {
        this.ctx.fillStyle = '#0c0c0c';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.save();
        this.ctx.translate(this.offsetX, this.offsetY);
        this.ctx.scale(this.scale, this.scale);

        // Draw background
        const gradient = this.ctx.createLinearGradient(0, 0, 0, CONFIG.VIRTUAL_HEIGHT);
        gradient.addColorStop(0, '#1a1a2e');
        gradient.addColorStop(1, '#0f1419');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, CONFIG.VIRTUAL_WIDTH, CONFIG.VIRTUAL_HEIGHT);

        // Draw grid in edit mode
        if (this.isEditMode) {
            this.ctx.strokeStyle = '#333333';
            this.ctx.lineWidth = 1;
            const gridSize = 50;

            for (let x = 0; x <= CONFIG.VIRTUAL_WIDTH; x += gridSize) {
                this.ctx.beginPath();
                this.ctx.moveTo(x, 0);
                this.ctx.lineTo(x, CONFIG.VIRTUAL_HEIGHT);
                this.ctx.stroke();
            }

            for (let y = 0; y <= CONFIG.VIRTUAL_HEIGHT; y += gridSize) {
                this.ctx.beginPath();
                this.ctx.moveTo(0, y);
                this.ctx.lineTo(CONFIG.VIRTUAL_WIDTH, y);
                this.ctx.stroke();
            }
        }

        // Draw all objects
        this.walls.forEach(wall => wall.draw(this.ctx, wall === this.selectedObject));
        this.bumpers.forEach(bumper => bumper.draw(this.ctx, bumper === this.selectedObject));
        this.spinners.forEach(spinner => spinner.draw(this.ctx, spinner === this.selectedObject));
        this.dropTargets.forEach(target => target.draw(this.ctx, target === this.selectedObject));
        this.flippers.forEach(flipper => flipper.draw(this.ctx, flipper === this.selectedObject));

        //        // Draw current wall being drawn
        if (this.isDrawing && this.drawStart && this.currentMousePos) {
            const width = parseInt(document.getElementById('wallWidth').value);
            const color = document.getElementById('wallColor').value;

            this.ctx.strokeStyle = color;
            this.ctx.lineWidth = width;
            this.ctx.lineCap = 'round';
            this.ctx.globalAlpha = 0.7;
            this.ctx.beginPath();
            this.ctx.moveTo(this.drawStart.x, this.drawStart.y);
            this.ctx.lineTo(this.currentMousePos.x, this.currentMousePos.y);
            this.ctx.stroke();
            this.ctx.globalAlpha = 1.0;
        }

        // Draw ball in test mode
        if (!this.isEditMode && this.ball) {
            this.ball.draw(this.ctx);
        }

        this.ctx.restore();
    }

    gameLoop() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.gameLoop());
    }
}

// Initialize editor
window.addEventListener('load', () => {
    new LevelEditor();
});