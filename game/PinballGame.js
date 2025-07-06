// Main Game Class
class PinballGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.gameState = new GameState();

        this.levelManager = new LevelManager();
        this.currentLevel = this.levelManager.createDefaultLevel();

        this.renderer = new GameRenderer(this.canvas);
        this.inputManager = new InputManager(this.canvas, this.currentLevel.flippers);

        this.scorePanel = new ScorePanel();
        this.gameOverOverlay = new GameOverOverlay();

        this.ball = null;
        this.resetBall();

        this.setupEventListeners();
        this.updateUI();
        this.gameLoop();
    }

    resetBall() {
        this.ball = new Ball(CONFIG.VIRTUAL_WIDTH * 0.51, 50);
        this.ball.velocity.x = 0;
        this.ball.velocity.y = 0;
        this.gameState.ballInPlay = true;
    }

    setupEventListeners() {
        document.getElementById('restartBtn').addEventListener('click', () => this.restartGame());
        document.getElementById('gameOverRestart').addEventListener('click', () => this.restartGame());
    }

    update() {
        if (this.gameState.isGameOver) return;

        const ballLost = this.ball.update();

        // Update all game objects
        this.currentLevel.flippers.forEach(flipper => flipper.update());
        this.currentLevel.bumpers.forEach(bumper => bumper.update());
        this.currentLevel.spinners.forEach(spinner => spinner.update());
        this.currentLevel.dropTargets.forEach(target => target.update());
        this.currentLevel.tunnels.forEach(tunnel => tunnel.update());

        this.checkCollisions();

        if (ballLost && this.gameState.ballInPlay) {
            this.gameState.balls--;
            this.gameState.ballInPlay = false;
            this.scorePanel.updateBalls(this.gameState.balls);

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
        this.currentLevel.walls.forEach(wall => {
            wall.checkCollision(this.ball);
        });

        // Flipper collisions
        this.currentLevel.flippers.forEach(flipper => {
            flipper.checkCollision(this.ball);
        });

        // Bumper collisions
        this.currentLevel.bumpers.forEach(bumper => {
            const points = bumper.checkCollision(this.ball);
            if (points > 0) {
                this.gameState.updateScore(points);
                this.scorePanel.updateScore(this.gameState.score);
                this.scorePanel.updateHighScore(this.gameState.highScore);
            }
        });

        // Spinner collisions
        this.currentLevel.spinners.forEach(spinner => {
            const points = spinner.checkCollision(this.ball);
            if (points > 0) {
                this.gameState.updateScore(points);
                this.scorePanel.updateScore(this.gameState.score);
                this.scorePanel.updateHighScore(this.gameState.highScore);
            }
        });

        // Drop Target collisions
        this.currentLevel.dropTargets.forEach(target => {
            const points = target.checkCollision(this.ball);
            if (points > 0) {
                this.gameState.updateScore(points);
                this.scorePanel.updateScore(this.gameState.score);
                this.scorePanel.updateHighScore(this.gameState.highScore);
            }
        });

        // Ramp collisions
        this.currentLevel.ramps.forEach(ramp => {
            ramp.checkCollision(this.ball);
        });

        // Tunnel collisions
        this.currentLevel.tunnels.forEach(tunnel => {
            tunnel.checkCollision(this.ball);
        });
    }

    draw() {
        this.renderer.clear();
        this.renderer.startVirtualRendering();

        this.renderer.renderGameObjects(this.currentLevel);
        this.renderer.renderBall(this.ball, this.gameState.ballInPlay);

        this.renderer.endVirtualRendering();
    }

    updateUI() {
        this.scorePanel.updateAll(this.gameState);
    }

    gameOver() {
        this.gameState.isGameOver = true;
        this.gameOverOverlay.show(this.gameState);
    }

    restartGame() {
        this.gameState.reset();
        this.resetBall();
        this.levelManager.resetLevel(this.currentLevel);
        this.updateUI();
        this.gameOverOverlay.hide();
    }

    gameLoop() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.gameLoop());
    }
}