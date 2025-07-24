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

        this.tapToStartScreen = document.getElementById('tapToStartScreen');
        this.loadingScreen = document.getElementById('loadingScreen');
        this.levelSelectScreen = document.getElementById('levelSelectScreen');

        this.ball = null;
        this.gameStarted = false;
        this.gameLoopRunning = false;
        this.currentLevel = null;
        this.userHasInteracted = false;

        // ✅ Простое состояние звуков
        this.soundsLoaded = false;

        // Состояние загрузки
        this.loadingState = {
            audio: false,
            sounds: false,
            levels: false
        };

        // Collision grid system for improved corner handling
        this.useCollisionGrid = true;
        this.collisionGrid = null;

        console.log('PinballGame: Constructor complete');

        this.setupEventListeners();
        this.showTapToStartScreen();

        // ✅ Загружаем звуки в фоне НЕЗАВИСИМО от готовности игры
        this.loadSoundsInBackground();

        // ✅ Настраиваем Farcaster если доступен
        this.setupSimpleFarcasterIntegration();
    }

    setupEventListeners() {
        // Обработчик для экрана "tap to start"
        this.tapToStartScreen.addEventListener('click', async () => {
            console.log('PinballGame: User clicked TAP TO START');
            this.userHasInteracted = true;
            
            // НЕМЕДЛЕННАЯ активация AudioContext
            await this.activateAudioContext();
            
            this.startLoadingProcess();
        });

        this.tapToStartScreen.addEventListener('touchstart', async () => {
            console.log('PinballGame: User touched TAP TO START');
            this.userHasInteracted = true;
            
            // НЕМЕДЛЕННАЯ активация AudioContext
            await this.activateAudioContext();
            
            this.startLoadingProcess();
        }, { passive: true });

        // Game over controls
        document.getElementById('restartGame').addEventListener('click', () => {
            this.restartGame();
        });

        document.getElementById('backToMenu').addEventListener('click', () => {
            this.showLevelSelect();
        });

        // Level selection
        document.getElementById('startLevel').addEventListener('click', () => {
            const selectedLevel = this.levelSelector.getCurrentLevel();
            if (selectedLevel) {
                this.loadSelectedLevel(selectedLevel);
            } else {
                alert('Please select a level first!');
            }
        });

        // Farcaster buttons
        const shareBtn = document.getElementById('shareScoreBtn');
        if (shareBtn) {
            shareBtn.addEventListener('click', () => {
                this.shareScore();
            });
        }

        document.getElementById('addToAppsBtn')?.addEventListener('click', () => {
            this.addToFavorites();
        });
    }

    // ✅ КРИТИЧНО: Загружаем звуки в фоне (НЕ БЛОКИРУЕМ игру)
    async loadSoundsInBackground() {
        if (window.soundManager) {
            try {
                console.log('🔊 Loading sounds in background (non-blocking)...');

                // НЕ await - не блокируем ready()!
                window.soundManager.preloadAllSounds().then(() => {
                    this.soundsLoaded = true;
                    console.log('✅ Sounds loaded in background');
                }).catch(error => {
                    console.warn('⚠️ Sound loading failed, continuing without audio:', error);
                    this.soundsLoaded = false;
                });

            } catch (error) {
                console.warn('⚠️ Sound manager not available:', error);
            }
        }
    }

    async activateAudioContext() {
        console.log('PinballGame: Activating AudioContext immediately...');
        
        if (!window.soundManager || !window.soundManager.audioContext) {
            console.warn('PinballGame: SoundManager not ready for activation');
            return;
        }

        try {
            const context = window.soundManager.audioContext;
            console.log('PinballGame: AudioContext state before activation:', context.state);

            // Агрессивная активация с двумя попытками
            for (let attempt = 1; attempt <= 2; attempt++) {
                try {
                    await context.resume();
                    console.log(`PinballGame: AudioContext activation attempt ${attempt}, state:`, context.state);
                    
                    if (context.state === 'running') {
                        console.log('PinballGame: AudioContext successfully activated!');
                        return;
                    }
                } catch (error) {
                    console.warn(`PinballGame: AudioContext activation attempt ${attempt} failed:`, error);
                }
                
                // Небольшая пауза между попытками
                if (attempt < 2) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            }

            console.warn('PinballGame: AudioContext activation failed after 2 attempts, state:', context.state);
        } catch (error) {
            console.error('PinballGame: Error during AudioContext activation:', error);
        }
    }

    // ✅ Простая настройка Farcaster (БЕЗ сложного FarcasterManager)
    setupSimpleFarcasterIntegration() {
        if (window.isMiniApp && window.sdk) {
            console.log('🔄 Setting up simple Farcaster integration...');

            // Показываем Farcaster кнопки
            this.showFarcasterButtons();

            // Показываем информацию о пользователе когда контекст загрузится
            if (window.farcasterContext && window.farcasterContext.user) {
                this.displayUserInfo(window.farcasterContext.user);
            } else {
                // Ждем загрузки контекста в фоне
                setTimeout(() => {
                    if (window.farcasterContext && window.farcasterContext.user) {
                        this.displayUserInfo(window.farcasterContext.user);
                    }
                }, 1000);
            }
        }
    }

    showFarcasterButtons() {
        const shareButton = document.getElementById('shareScoreBtn');
        if (shareButton) {
            shareButton.style.display = 'block';
        }

        const addToAppsButton = document.getElementById('addToAppsBtn');
        if (addToAppsButton) {
            addToAppsButton.style.display = 'block';
        }
    }

    displayUserInfo(user) {
        console.log('👤 Displaying user info:', user);

        const userInfo = document.getElementById('farcasterUserInfo');
        if (userInfo) {
            userInfo.innerHTML = `
                <div>Welcome, ${user.displayName || user.username || 'Player'}! 👋</div>
                ${user.pfpUrl ? `<img src="${user.pfpUrl}" width="32" height="32">` : ''}
            `;
            userInfo.style.display = 'block';
        }
    }

    // ✅ Обновленный метод shareScore с красивыми названиями уровней
    async shareScore() {
        if (window.sdk && window.sdk.actions && window.sdk.actions.composeCast) {
            try {
                // Получаем название текущего уровня
                const levelName = this.gameState.currentLevelName || 'Pinball All Stars';
                
                // Создаем более красивое название для шаринга
                let displayLevelName = levelName;
                if (levelName.toLowerCase() === 'degen') {
                    displayLevelName = 'Degen room 🎩';
                } else if (levelName.toLowerCase() === 'farcaster') {
                    displayLevelName = 'Farcaster room 💜';
                }

                const text = `⚪ I just scored ${this.gameState.score || 0} points in ${displayLevelName}! Can you beat that? 🚩 Pinball: all stars ⭐ made by @lifeisatape.eth & @altagers.eth`;
                const url = window.location.origin;

                await window.sdk.actions.composeCast({
                    text: text,
                    embeds: [url]
                });

                console.log('✅ Score shared successfully');
                this.showNotification('Score shared! 🎉');
            } catch (error) {
                console.error('❌ Error sharing score:', error);
                this.showNotification('Failed to share score');
            }
        } else {
            console.log('⚠️ Cannot share - Farcaster not available');
            this.showNotification('Sharing not available');
        }
    }

    // ✅ Простое добавление в избранное
    async addToFavorites() {
        if (window.sdk && window.sdk.actions && window.sdk.actions.addMiniApp) {
            try {
                await window.sdk.actions.addMiniApp();
                console.log('✅ Add to favorites prompted');
                this.showNotification('Added!⭐');
            } catch (error) {
                console.error('❌ Error adding to favorites:', error);
                this.showNotification('Failed to add to favorites');
            }
        } else {
            console.log('⚠️ Cannot add to favorites - Farcaster not available');
            this.showNotification('Add to favorites not available');
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

    // ✅ Простое уведомление
    showNotification(message, type = 'info') {
        console.log(`📢 ${message}`);
        // Можно добавить визуальное уведомление если нужно
    }

    // ✅ Простой запуск игры (СРАЗУ)
    startGame() {
        console.log('🎮 Starting game immediately...');

        this.tapToStartScreen.style.display = 'none';
        this.showLevelSelect();
    }

    async startLoadingProcess() {
        // ЗАЩИТА ОТ АВТОЗАПУСКА!
        if (!this.userHasInteracted) {
            console.log('PinballGame: Blocking auto-start - user must click TAP TO START first');
            return;
        }

        console.log('PinballGame: Starting loading process...');
        // Скрываем экран "tap to start" и показываем загрузку
        this.tapToStartScreen.style.display = 'none';
        this.showLevelSelectScreen();
    }

    showTapToStartScreen() {
        this.tapToStartScreen.style.display = 'flex';
        this.levelSelectScreen.style.display = 'none';
    }

    async showLevelSelect() {
        this.gameStarted = false;

        // ✅ Выключить touch на весь экран
        if (this.inputManager) {
            this.inputManager.setGameActive(false);
        }

        // Останавливаем игровую музыку и запускаем музыку меню
        if (window.soundManager && window.soundManager.isReady) {
            window.soundManager.stopMusic();
            window.soundManager.playMusic('menu');
        }

        this.showLevelSelectScreen();
    }

    showLevelSelectScreen() {
        this.tapToStartScreen.style.display = 'none';
        this.levelSelectScreen.style.display = 'flex';

        // Загружаем и отображаем уровни
        this.levelSelector.getAvailableLevels().then(levels => {
            this.populateLevelList(levels);
        });
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

    async initializeGame() {
        try {
            if (!this.currentLevel) return;

            this.hideStartScreen();
            this.inputManager = new InputManager(this.canvas, this.currentLevel.flippers);
            this.inputManager.setGameActive(true); // ✅ Включить touch на весь экран
            this.resetBall();
            this.updateUI();
            this.gameStarted = true;

            // Initialize collision grid after level is loaded
            if (this.useCollisionGrid && this.currentLevel) {
                console.log('🔍 Creating collision grid...');
                this.collisionGrid = this.createSimpleCollisionGrid();
                console.log('✅ Collision grid ready!');
            }

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

    restartGame() {
        this.gameState.resetGame();
        this.resetBall();
        this.levelManager.resetLevel(this.currentLevel);
        this.gameOverOverlay.hide();
        this.updateUI();
    }

    updateUI() {
        if (this.scorePanel) {
            this.scorePanel.updateAll(this.gameState);
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

    gameOver() {
        console.log('🎮 Game Over! Final Score:', this.gameState.score);
        
        // Обновляем high score
        if (this.gameState.score > this.gameState.highScore) {
            this.gameState.highScore = this.gameState.score;
            localStorage.setItem('pinball-highscore', this.gameState.highScore);
            console.log('🏆 New High Score!', this.gameState.highScore);
        }

        // Останавливаем игру
        this.gameState.isGameOver = true;
        
        // ✅ Выключить touch на весь экран
        if (this.inputManager) {
            this.inputManager.setGameActive(false);
        }
        
        // Показываем overlay
        this.gameOverOverlay.show(this.gameState);
        
        // Показываем Farcaster кнопки если доступны
        this.showFarcasterButtons();

        // В frame окружении предлагаем поделиться результатом
        if (window.farcasterManager && window.farcasterManager.isFrameEnvironment) {
            setTimeout(() => {
                this.showNotification('Share your score! 📱', 'info');
            }, 1000);
        }
    }

    // ✅ Безопасное воспроизведение звуков
    playSound(soundName) {
        if (this.soundsLoaded && window.soundManager && window.soundManager.isReady) {
            try {
                window.soundManager.playSound(soundName);
            } catch (error) {
                console.warn('⚠️ Sound playback failed:', error);
            }
        }
    }

    // Simple Collision Grid System
    createSimpleCollisionGrid() {
        const cellSize = 2; // Простой разумный размер
        const cols = Math.ceil(CONFIG.VIRTUAL_WIDTH / cellSize);  // 40 колонок
        const rows = Math.ceil(CONFIG.VIRTUAL_HEIGHT / cellSize); // 60 строк

        console.log(`🔍 Creating collision grid: ${cols}×${rows} (${cols * rows} cells)`);
        const startTime = performance.now();

        // ПРОСТЫЕ ОБЫЧНЫЕ МАССИВЫ (не типизированные!)
        const grid = [];

        // Initialize grid
        for (let row = 0; row < rows; row++) {
            grid[row] = [];
            for (let col = 0; col < cols; col++) {
                grid[row][col] = {
                    solid: false,
                    dangerLevel: 0,
                    escapeDirection: null
                };
            }
        }

        // Mark wall cells (ПРОСТОЙ СПОСОБ)
        if (this.currentLevel && this.currentLevel.walls) {
            this.currentLevel.walls.forEach(wall => {
                this.markWallCells(grid, wall, cellSize, cols, rows);
            });
        }

        // Compute danger levels (ПРОСТОЙ АЛГОРИТМ)
        this.computeDangerLevels(grid, cols, rows);

        // Compute escape directions (ПРОСТОЙ АЛГОРИТМ)
        this.computeEscapeDirections(grid, cols, rows, cellSize);

        const totalTime = (performance.now() - startTime).toFixed(1);
        console.log(`✅ Collision grid ready in ${totalTime}ms`);

        return {
            grid: grid,
            cellSize: cellSize,
            cols: cols,
            rows: rows,

            checkPosition: (x, y) => {
                const col = Math.floor(x / cellSize);
                const row = Math.floor(y / cellSize);

                if (row >= 0 && row < rows && col >= 0 && col < cols) {
                    return grid[row][col];
                }
                return { solid: false, dangerLevel: 0, escapeDirection: null };
            }
        };
    }



    checkGridBasedCollisions() {
        if (!this.collisionGrid) return;

        const ballInfo = this.collisionGrid.checkPosition(
            this.ball.position.x,
            this.ball.position.y
        );

        // If ball is in dangerous zone - ВЫСОКИЙ ПОРОГ!
        if (ballInfo.dangerLevel > 0.85 && ballInfo.escapeDirection) {
            // Gently guide ball to safety - СЛАБАЯ СИЛА!
            const escapeForce = ballInfo.dangerLevel * 0.3;

            this.ball.velocity.x += ballInfo.escapeDirection.x * escapeForce;
            this.ball.velocity.y += ballInfo.escapeDirection.y * escapeForce;

            console.log(`🚨 Ball in danger zone (${ballInfo.dangerLevel.toFixed(2)}), applying escape force`);
        }
    }

    markWallCells(grid, wall, cellSize, cols, rows) {
        // Простая растеризация стены
        const steps = Math.max(
            Math.abs(wall.x2 - wall.x1),
            Math.abs(wall.y2 - wall.y1)
        ) / cellSize;

        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const x = wall.x1 + (wall.x2 - wall.x1) * t;
            const y = wall.y1 + (wall.y2 - wall.y1) * t;

            const col = Math.floor(x / cellSize);
            const row = Math.floor(y / cellSize);

            // Отмечаем клетку и соседей (для толщины стены)
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    const newRow = row + dr;
                    const newCol = col + dc;

                    if (newRow >= 0 && newRow < rows && newCol >= 0 && newCol < cols) {
                        grid[newRow][newCol].solid = true;
                    }
                }
            }
        }
    }

    computeDangerLevels(grid, cols, rows) {
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                let solidNeighbors = 0;
                let totalNeighbors = 0;

                // Проверяем 3x3 соседей
                for (let dr = -1; dr <= 1; dr++) {
                    for (let dc = -1; dc <= 1; dc++) {
                        if (dr === 0 && dc === 0) continue;

                        const newRow = row + dr;
                        const newCol = col + dc;

                        if (newRow >= 0 && newRow < rows && newCol >= 0 && newCol < cols) {
                            totalNeighbors++;
                            if (grid[newRow][newCol].solid) {
                                solidNeighbors++;
                            }
                        }
                    }
                }

                // Danger level = доля твердых соседей
                grid[row][col].dangerLevel = totalNeighbors > 0 ? solidNeighbors / totalNeighbors : 0;
            }
        }
    }

    computeEscapeDirections(grid, cols, rows, cellSize) {
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                if (grid[row][col].dangerLevel > 0.7) {
                    // Опасная клетка - ищем направление к безопасности
                    let bestDirection = null;
                    let bestSafety = -1;

                    // Проверяем направления (небольшой радиус)
                    for (let dr = -2; dr <= 2; dr++) {
                        for (let dc = -2; dc <= 2; dc++) {
                            if (dr === 0 && dc === 0) continue;

                            const newRow = row + dr;
                            const newCol = col + dc;

                            if (newRow >= 0 && newRow < rows && newCol >= 0 && newCol < cols) {
                                const safety = 1 - grid[newRow][newCol].dangerLevel;
                                if (safety > bestSafety) {
                                    bestSafety = safety;
                                    bestDirection = { x: dc, y: dr };
                                }
                            }
                        }
                    }

                    if (bestDirection) {
                        const length = Math.sqrt(bestDirection.x * bestDirection.x + bestDirection.y * bestDirection.y);
                        grid[row][col].escapeDirection = {
                            x: bestDirection.x / length,
                            y: bestDirection.y / length
                        };
                    }
                }
            }
        }
    }

    drawCollisionGridDebug() {
        if (!this.collisionGrid) return;

        const ctx = this.renderer.ctx;
        if (!ctx) return;

        ctx.save();
        ctx.globalAlpha = 0.3;

        // Draw grid
        for (let row = 0; row < this.collisionGrid.rows; row++) {
            for (let col = 0; col < this.collisionGrid.cols; col++) {
                const cell = this.collisionGrid.grid[row][col];
                const x = col * this.collisionGrid.cellSize;
                const y = row * this.collisionGrid.cellSize;

                if (cell.solid) {
                    ctx.fillStyle = '#ff0000';
                    ctx.fillRect(x, y, this.collisionGrid.cellSize, this.collisionGrid.cellSize);
                } else if (cell.dangerLevel > 0.3) {
                    const intensity = Math.floor(cell.dangerLevel * 255);
                    ctx.fillStyle = `rgb(${intensity}, ${255 - intensity}, 0)`;
                    ctx.fillRect(x, y, this.collisionGrid.cellSize, this.collisionGrid.cellSize);
                }
            }
        }

        ctx.restore();
    }

    draw() {
        this.renderer.clear();
        this.renderer.startVirtualRendering();

        // Draw background image
        if (this.currentLevel && this.currentLevel.backgroundImage) {
            this.renderer.drawBackgroundImage(this.currentLevel.backgroundImage, this.currentLevel.backgroundOpacity);
        }

        this.renderer.renderGameObjects(this.currentLevel);
        this.renderer.renderBall(this.ball, this.gameState.ballInPlay);

        // Draw overlay image on top of everything
        if (this.currentLevel && this.currentLevel.overlayImage) {
            this.renderer.drawOverlayImage(this.currentLevel.overlayImage, 1.0);
        }

        // Debug collision grid visualization (change false to true to enable)
        if (this.useCollisionGrid && false) {
            this.drawCollisionGridDebug();
        }

        this.renderer.endVirtualRendering();
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

    checkGameState() {
        if (this.gameState.balls <= 0) {
            this.gameOver();
        }
    }

    checkCollisions() {
        // Check grid-based collisions first if enabled
        if (this.useCollisionGrid && this.collisionGrid) {
            this.checkGridBasedCollisions();
        }

        if (!this.currentLevel) return;

        // Single pass collision detection with improved corner handling
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

    
}