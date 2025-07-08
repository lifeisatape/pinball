// Main Game Class
class PinballGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');

        this.levelManager = new LevelManager();
        this.levelSelector = new LevelSelector();
        this.renderer = new GameRenderer(this.canvas);
        this.inputManager = null; // Will be initialized in initializeGame()
        this.gameState = new GameState();
        this.scorePanel = new ScorePanel();
        this.gameOverOverlay = new GameOverOverlay();
        this.startScreen = document.getElementById('startScreen');

        this.ball = null;
        this.gameStarted = false;
        this.currentLevel = null;
        this.lastTime = 0;
        this.accumulatedTime = 0;

        this.setupEventListeners();
        this.showStartScreen();
    }

    async initializeGame() {
        try {
            // If no level is selected, don't initialize
            if (!this.currentLevel) {
                return;
            }

            this.hideStartScreen();
            this.inputManager = new InputManager(this.canvas, this.currentLevel.flippers);
            this.resetBall();
            this.updateUI();
            this.gameStarted = true;
            
            if (!this.gameLoopRunning) {
                this.gameLoopRunning = true;
                this.gameLoop();
            }
        } catch (error) {
            console.error('Failed to initialize game:', error);
        }
    }

    resetBall() {
        this.ball = new Ball(CONFIG.VIRTUAL_WIDTH * 0.51, 50);
        this.ball.velocity.x = 0;
        this.ball.velocity.y = 0;
        this.gameState.ballInPlay = true;
    }

    setupEventListeners() {
        document.getElementById('restartBtn').addEventListener('click', () => {
            this.restartGame();
        });

        document.getElementById('selectLevelBtn').addEventListener('click', () => {
            this.showLevelSelect();
        });

        document.getElementById('gameOverRestart').addEventListener('click', () => this.restartGame());

        document.getElementById('startLevel').addEventListener('click', () => {
            const selectedLevel = this.levelSelector.getCurrentLevel();
            if (selectedLevel) {
                this.loadSelectedLevel(selectedLevel);
            } else {
                alert('Please select a level first!');
            }
        });
    }

    async showStartScreen() {
        // Hide game elements and show level selection
        this.canvas.style.display = 'none';
        document.querySelector('.score-panel').style.display = 'none';
        
        // Populate level list
        const levels = await this.levelSelector.getAvailableLevels();
        this.populateLevelList(levels);
        
        this.startScreen.style.display = 'flex';
    }

    hideStartScreen() {
        // Show game elements
        this.canvas.style.display = 'block';
        document.querySelector('.score-panel').style.display = 'flex';
        this.startScreen.style.display = 'none';
    }

    populateLevelList(levels) {
        const levelList = document.getElementById('levelList');
        levelList.innerHTML = '';

        levels.forEach((level, index) => {
            const levelItem = document.createElement('div');
            levelItem.className = `level-item ${index === this.levelSelector.currentLevelIndex ? 'selected' : ''}`;
            levelItem.innerHTML = `
                <div class="level-info">
                    <div class="level-name">${level.name}</div>
                    <div class="level-description">${level.description}</div>
                </div>
            `;

            levelItem.addEventListener('click', () => {
                // Remove previous selection
                document.querySelectorAll('.level-item').forEach(item => {
                    item.classList.remove('selected');
                });
                
                // Select new level
                levelItem.classList.add('selected');
                this.levelSelector.selectLevel(index);
            });

            levelList.appendChild(levelItem);
        });
    }

    update(deltaTime = CONFIG.FIXED_TIME_STEP) {
        if (this.gameState.isGameOver) return;

        const ballLost = this.ball.update(deltaTime);

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

        // Draw background image if available
        if (this.currentLevel.backgroundImage) {
            this.renderer.drawBackgroundImage(this.currentLevel.backgroundImage, this.currentLevel.backgroundOpacity);
        }

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
        this.gameState.resetGame();
        this.resetBall(); // Используем resetBall() который устанавливает ballInPlay = true
        this.levelManager.resetLevel(this.currentLevel);
        this.gameOverOverlay.hide();
        this.updateUI(); // Обновляем весь UI включая high score
    }

    async showLevelSelect() {
        // Pause game when showing level select during gameplay
        this.gameStarted = false;
        await this.showStartScreen();
    }

    async loadSelectedLevel(selectedLevel) {
        try {
            // Load the selected level data
            this.currentLevel = this.levelManager.loadLevelFromData(selectedLevel.data);

            // Set current level in game state for high score tracking
            this.gameState.setCurrentLevel(selectedLevel.name);

            // Initialize game with selected level
            await this.initializeGame();

            console.log(`Loaded level: ${selectedLevel.name}`);
        } catch (error) {
            console.error('Error loading selected level:', error);
            // Fallback to default level
            this.currentLevel = await this.levelManager.createDefaultLevel();
            this.gameState.setCurrentLevel('default');
            await this.initializeGame();
        }
    }

    gameLoop(currentTime = 0) {
        if (!this.lastTime) this.lastTime = currentTime;
        
        let deltaTime = (currentTime - this.lastTime) / 1000; // Конвертируем в секунды
        this.lastTime = currentTime;
        
        // Ограничиваем максимальный deltaTime для стабильности
        deltaTime = Math.min(deltaTime, 1/30); // Не более 30 FPS минимум
        
        if (this.gameStarted && this.currentLevel) {
            // Используем фиксированный временной шаг
            this.accumulatedTime = (this.accumulatedTime || 0) + deltaTime;
            
            while (this.accumulatedTime >= CONFIG.FIXED_TIME_STEP) {
                this.update(CONFIG.FIXED_TIME_STEP);
                this.accumulatedTime -= CONFIG.FIXED_TIME_STEP;
            }
            
            this.draw();
        }
        
        if (this.gameLoopRunning) {
            requestAnimationFrame((time) => this.gameLoop(time));
        }
    }
}