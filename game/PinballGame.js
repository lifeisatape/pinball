// Main Game Class - Simplified for Web Audio
class PinballGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');

        this.levelManager = new LevelManager();
        this.levelSelector = new LevelSelector();
        this.renderer = new GameRenderer(this.canvas);
        this.inputManager = null;
        this.gameState = new GameState();
        this.scorePanel = new ScorePanel();
        this.gameOverOverlay = new GameOverOverlay();
        this.loadingScreen = document.getElementById('loadingScreen');
        this.levelSelectScreen = document.getElementById('levelSelectScreen');

        this.ball = null;
        this.gameStarted = false;
        this.currentLevel = null;

        // Состояние загрузки
        this.loadingState = {
            audio: false,
            sounds: false,
            levels: false
        };

        this.setupEventListeners();
        this.startLoadingProcess();
    }

    async initializeGame() {
        try {
            if (!this.currentLevel) return;

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

        // SoundManager сам обработает активацию аудио
    }

    async startLoadingProcess() {
        this.showLoadingScreen();
        
        // Настраиваем коллбек для отслеживания прогресса
        if (window.soundManager) {
            window.soundManager.setLoadingCallback((type, progress, message) => {
                this.updateLoadingProgress(type, progress, message);
            });
        }

        // Ждем готовности звуков
        window.addEventListener('soundManagerReady', () => {
            console.log('PinballGame: Sound system ready!');
            this.loadingState.sounds = true;
            this.checkLoadingComplete();
        });

        // Загружаем уровни
        await this.loadLevels();
    }

    async loadLevels() {
        this.updateLoadingProgress('levels', 0, 'Loading levels...');
        
        try {
            const levels = await this.levelSelector.getAvailableLevels();
            this.updateLoadingProgress('levels', 100, `Loaded ${levels.length} levels`);
            this.loadingState.levels = true;
            this.checkLoadingComplete();
        } catch (error) {
            console.error('Failed to load levels:', error);
            this.updateLoadingProgress('levels', 100, 'Failed to load levels');
            this.loadingState.levels = true;
            this.checkLoadingComplete();
        }
    }

    updateLoadingProgress(type, progress, message) {
        const statusMap = {
            'audio': 'audioStatus',
            'sounds': 'soundsStatus', 
            'levels': 'levelsStatus'
        };

        const statusElement = document.getElementById(statusMap[type]);
        if (statusElement) {
            if (progress === 100) {
                statusElement.textContent = '✅';
                if (type === 'audio') this.loadingState.audio = true;
            } else if (progress > 0) {
                statusElement.textContent = '🔄';
            } else {
                statusElement.textContent = '❌';
            }
        }

        // Обновляем общий прогресс
        this.updateOverallProgress();
        
        // Обновляем текст загрузки
        const loadingText = document.getElementById('loadingText');
        if (loadingText) {
            loadingText.textContent = message;
        }
    }

    updateOverallProgress() {
        const completed = Object.values(this.loadingState).filter(Boolean).length;
        const total = Object.keys(this.loadingState).length;
        const percentage = Math.round((completed / total) * 100);

        const progressFill = document.getElementById('progressFill');
        const progressPercentage = document.getElementById('loadingPercentage');

        if (progressFill) {
            progressFill.style.width = percentage + '%';
        }

        if (progressPercentage) {
            progressPercentage.textContent = percentage + '%';
        }
    }

    checkLoadingComplete() {
        const allLoaded = Object.values(this.loadingState).every(Boolean);
        
        if (allLoaded) {
            setTimeout(() => {
                this.showLevelSelectScreen();
            }, 1000); // Небольшая задержка для красоты
        }
    }

    showLoadingScreen() {
        this.canvas.style.display = 'none';
        document.querySelector('.score-panel').style.display = 'none';
        this.loadingScreen.style.display = 'flex';
        this.levelSelectScreen.style.display = 'none';
    }

    showLevelSelectScreen() {
        this.loadingScreen.style.display = 'none';
        this.levelSelectScreen.style.display = 'flex';
        
        // Популяция списка уровней
        this.levelSelector.getAvailableLevels().then(levels => {
            this.populateLevelList(levels);
        });
    }

    async showStartScreen() {
        this.showLevelSelectScreen();
        
        // Простое воспроизведение музыки
        if (window.soundManager && window.soundManager.isReady) {
            window.soundManager.playMusic('menu');
        }
    }

    hideStartScreen() {
        this.canvas.style.display = 'block';
        document.querySelector('.score-panel').style.display = 'flex';
        this.levelSelectScreen.style.display = 'none';

        // Простое переключение музыки
        if (window.soundManager && window.soundManager.isReady) {
            window.soundManager.playMusic('level');
            window.soundManager.playSound('newGameLaunch');
        }
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
                document.querySelectorAll('.level-item').forEach(item => {
                    item.classList.remove('selected');
                });

                levelItem.classList.add('selected');
                this.levelSelector.selectLevel(index);
            });

            levelList.appendChild(levelItem);
        });
    }

    update() {
        if (this.gameState.isGameOver) return;

        const ballLost = this.ball.update();

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
        this.currentLevel.walls.forEach(wall => {
            wall.checkCollision(this.ball);
        });

        this.currentLevel.flippers.forEach(flipper => {
            flipper.checkCollision(this.ball);
        });

        // ПРОСТЫЕ вызовы звуков - никаких проверок!
        this.currentLevel.bumpers.forEach(bumper => {
            const points = bumper.checkCollision(this.ball);
            if (points > 0) {
                this.gameState.updateScore(points);
                this.scorePanel.updateScore(this.gameState.score);
                this.scorePanel.updateHighScore(this.gameState.highScore);

                // Просто играем звук
                window.soundManager?.playSound('bumper');
            }
        });

        this.currentLevel.spinners.forEach(spinner => {
            const points = spinner.checkCollision(this.ball);
            if (points > 0) {
                this.gameState.updateScore(points);
                this.scorePanel.updateScore(this.gameState.score);
                this.scorePanel.updateHighScore(this.gameState.highScore);

                window.soundManager?.playSound('spinner');
            }
        });

        this.currentLevel.dropTargets.forEach(target => {
            const points = target.checkCollision(this.ball);
            if (points > 0) {
                this.gameState.updateScore(points);
                this.scorePanel.updateScore(this.gameState.score);
                this.scorePanel.updateHighScore(this.gameState.highScore);

                window.soundManager?.playSound('targetHit');
            }
        });

        this.currentLevel.ramps.forEach(ramp => {
            ramp.checkCollision(this.ball);
        });

        this.currentLevel.tunnels.forEach(tunnel => {
            tunnel.checkCollision(this.ball);
        });
    }

    draw() {
        this.renderer.clear();
        this.renderer.startVirtualRendering();

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
        this.resetBall();
        this.levelManager.resetLevel(this.currentLevel);
        this.gameOverOverlay.hide();
        this.updateUI();
    }

    async showLevelSelect() {
        this.gameStarted = false;
        this.showLevelSelectScreen();
    }

    async loadSelectedLevel(selectedLevel) {
        try {
            this.currentLevel = this.levelManager.loadLevelFromData(selectedLevel.data);
            this.gameState.setCurrentLevel(selectedLevel.name);
            await this.initializeGame();
            console.log(`Loaded level: ${selectedLevel.name}`);
        } catch (error) {
            console.error('Error loading selected level:', error);
            this.currentLevel = await this.levelManager.createDefaultLevel();
            this.gameState.setCurrentLevel('default');
            await this.initializeGame();
        }
    }

    gameLoop() {
        if (this.gameStarted && this.currentLevel) {
            this.update();
            this.draw();
        }
        if (this.gameLoopRunning) {
            requestAnimationFrame(() => this.gameLoop());
        }
    }
}