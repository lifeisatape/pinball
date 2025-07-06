// Main Game Class
class PinballGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');

        // Initialize game systems
        this.gameState = new GameState();
        this.levelManager = new LevelManager();
        this.gameRenderer = new GameRenderer(this.canvas);
        this.scorePanel = new ScorePanel();
        this.gameOverOverlay = new GameOverOverlay();
        this.mainMenu = new MainMenu();
        
        // InputManager will be initialized when level is loaded
        this.inputManager = null;

        this.currentLevel = null;
        this.gameStarted = false;

        // Setup canvas and event listeners
        this.setupCanvas();
        this.setupEventListeners();
        this.setupMenuEventListeners();

        // Show main menu initially
        this.showMainMenu();
    }

    setupEventListeners() {
        // Restart button
        document.getElementById('restartBtn').addEventListener('click', () => {
            this.restartGame();
        });

        // Game over restart button
        document.getElementById('gameOverRestart').addEventListener('click', () => {
            this.restartGame();
        });

        // Handle window resize
        window.addEventListener('resize', () => {
            this.setupCanvas();
        });
    }

    setupMenuEventListeners() {
        // Listen for start game event from main menu
        window.addEventListener('startGame', (e) => {
            const { levelType, levelData } = e.detail;
            this.startGameWithLevel(levelType, levelData);
        });

        // Listen for back to menu event
        window.addEventListener('backToMenu', () => {
            this.backToMenu();
        });
    }

    showMainMenu() {
        this.gameStarted = false;
        this.mainMenu.show();
        // Hide game UI
        document.querySelector('.score-panel').style.display = 'none';
        this.canvas.style.display = 'none';
    }

    hideMainMenu() {
        this.mainMenu.hide();
        // Show game UI
        document.querySelector('.score-panel').style.display = 'flex';
        this.canvas.style.display = 'block';
    }

    startGameWithLevel(levelType, levelData = null) {
        this.hideMainMenu();

        if (levelType === 'default') {
            this.currentLevel = this.levelManager.createDefaultLevel();
        } else if (levelType === 'custom' && levelData) {
            this.currentLevel = this.levelManager.loadLevelFromData(levelData);
        } else {
            // Fallback to default
            this.currentLevel = this.levelManager.createDefaultLevel();
        }

        // Initialize InputManager with the level's flippers
        if (!this.inputManager) {
            this.inputManager = new InputManager(this.canvas, this.currentLevel.flippers);
        }

        this.gameStarted = true;
        this.resetLevel();

        if (!this.gameLoopRunning) {
            this.startGameLoop();
        }
    }

    startGameLoop() {
        this.gameLoopRunning = true;
        const gameLoop = () => {
            if (this.gameStarted) {
                this.update();
                this.render();
            }
            requestAnimationFrame(gameLoop);
        };
        requestAnimationFrame(gameLoop);
    }

    restartGame() {
        this.gameOverOverlay.hide();
        this.gameState.reset();
        this.resetLevel();
        this.scorePanel.updateDisplay(this.gameState);
    }

    backToMenu() {
        this.gameOverOverlay.hide();
        this.showMainMenu();
    }

    setupCanvas() {
        this.canvas.width = CONFIG.VIRTUAL_WIDTH;
        this.canvas.height = CONFIG.VIRTUAL_HEIGHT;

        // Scale canvas to fit window
        const scaleFactor = Math.min(
            window.innerWidth / CONFIG.VIRTUAL_WIDTH,
            window.innerHeight / CONFIG.VIRTUAL_HEIGHT
        );

        this.canvas.style.width = `${CONFIG.VIRTUAL_WIDTH * scaleFactor}px`;
        this.canvas.style.height = `${CONFIG.VIRTUAL_HEIGHT * scaleFactor}px`;
    }

    resetLevel() {
        this.ball = new Ball(CONFIG.VIRTUAL_WIDTH * 0.51, 50);
        this.ball.velocity.x = 0;
        this.ball.velocity.y = 0;
        this.gameState.ballInPlay = true;
        this.gameState.balls = 3;

        this.currentLevel.flippers.forEach(flipper => flipper.reset());
        this.currentLevel.dropTargets.forEach(target => target.reset());

        this.scorePanel.updateDisplay(this.gameState);
    }

    update() {
        if (!this.gameStarted || this.gameState.isGameOver) return;

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
                    this.resetLevel();
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

    render() {
        this.gameRenderer.clear();
        this.gameRenderer.startVirtualRendering();

        this.gameRenderer.renderGameObjects(this.currentLevel);
        this.gameRenderer.renderBall(this.ball, this.gameState.ballInPlay);

        this.gameRenderer.endVirtualRendering();
    }

    gameOver() {
        this.gameState.isGameOver = true;
        this.gameOverOverlay.show(this.gameState);
    }
}