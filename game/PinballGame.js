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
        this.levelSelectScreen = document.getElementById('levelSelectScreen');

        this.ball = null;
        this.gameStarted = false;
        this.gameLoopRunning = false;
        this.currentLevel = null;
        this.userHasInteracted = false;

        // ✅ Простое состояние звуков
        this.soundsLoaded = false;

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
        this.tapToStartScreen.addEventListener('click', () => {
            console.log('🎮 User clicked TAP TO START');
            this.userHasInteracted = true;
            this.activateAudioContext();
            this.startGame();
        });

        this.tapToStartScreen.addEventListener('touchstart', () => {
            console.log('🎮 User touched TAP TO START');
            this.userHasInteracted = true;
            this.activateAudioContext();
            this.startGame();
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
        document.getElementById('shareScoreBtn')?.addEventListener('click', () => {
            this.shareScore();
        });

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

    // ✅ Простая активация аудио (НЕ блокирующая)
    activateAudioContext() {
        if (window.soundManager && window.soundManager.audioContext) {
            try {
                console.log('🔊 Activating audio context...');
                // НЕ await - не блокируем игру
                window.soundManager.unlock().catch(error => {
                    console.warn('⚠️ Audio activation failed:', error);
                });
            } catch (error) {
                console.warn('⚠️ Audio activation error:', error);
            }
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

    // ✅ Простое шарение (без сложной логики)
    async shareScore() {
        if (window.sdk && window.sdk.actions && window.sdk.actions.composeCast) {
            try {
                const text = `🎮 I just scored ${this.gameState.score || 0} points and reached level ${this.gameState.level || 1} in Pinball All Stars! Can you beat that? 🚀`;
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
        if (window.sdk && window.sdk.actions && window.sdk.actions.addFrame) {
            try {
                await window.sdk.actions.addFrame();
                console.log('✅ Add to favorites prompted');
                this.showNotification('App added to favorites! ⭐');
            } catch (error) {
                console.error('❌ Error adding to favorites:', error);
                this.showNotification('Failed to add to favorites');


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

            }
        } else {
            console.log('⚠️ Cannot add to favorites - Farcaster not available');
            this.showNotification('Add to favorites not available');
        }
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

    showTapToStartScreen() {
        this.tapToStartScreen.style.display = 'flex';
        this.levelSelectScreen.style.display = 'none';
    }

    showLevelSelect() {
        this.tapToStartScreen.style.display = 'none';
        this.levelSelectScreen.style.display = 'flex';

        // Загружаем и отображаем уровни
        this.levelSelector.getAvailableLevels().then(levels => {
            this.populateLevelList(levels);
        });
    }

    hideStartScreen() {
        this.tapToStartScreen.style.display = 'none';
        this.levelSelectScreen.style.display = 'none';
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
            this.resetBall();
            this.updateUI();
            this.gameStarted = true;

            // Играем звук запуска если доступен
            this.playSound('newGameLaunch');

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
        if (this.currentLevel) {
            this.gameState.reset();
            this.resetBall();
            this.updateUI();
            this.gameOverOverlay.hide();
            this.playSound('newGameLaunch');
        }
    }

    updateUI() {
        if (this.scorePanel) {
            this.scorePanel.update({
                score: this.gameState.score,
                level: this.gameState.level,
                lives: this.gameState.lives
            });
        }
    }

    gameLoop() {
        if (!this.gameStarted || !this.currentLevel) {
            this.gameLoopRunning = false;
            return;
        }

        try {
            // Update physics
            if (this.ball && this.gameState.ballInPlay) {
                this.updatePhysics();
            }

            // Handle input
            if (this.inputManager) {
                this.inputManager.update();
            }

            // Render
            if (this.renderer) {
                this.renderer.render(this.currentLevel, this.ball);
            }

            // Check game state
            this.checkGameState();
        } catch (error) {
            console.error('Game loop error:', error);
        }

        if (this.gameLoopRunning) {
            requestAnimationFrame(() => this.gameLoop());
        }
    }

    updatePhysics() {
        // Simple physics update
        if (this.ball) {
            this.ball.update();

            // Check collisions with walls
            if (this.currentLevel && this.currentLevel.walls) {
                for (const wall of this.currentLevel.walls) {
                    if (this.ball.checkCollision && wall.checkCollision) {
                        if (this.ball.checkCollision(wall)) {
                            this.ball.resolveCollision(wall);
                            this.playSound('wallhit');
                        }
                    }
                }
            }

            // Check if ball is out of bounds
            if (this.ball.y > CONFIG.VIRTUAL_HEIGHT) {
                this.gameState.lives--;
                if (this.gameState.lives > 0) {
                    this.resetBall();
                } else {
                    this.gameOver();
                }
            }
        }
    }

    checkGameState() {
        if (this.gameState.lives <= 0) {
            this.gameOver();
        }
    }

    gameOver() {
        console.log('🎮 Game Over');

        this.gameState.ballInPlay = false;
        this.gameStarted = false;

        // Show game over screen
        this.gameOverOverlay.show({
            finalScore: this.gameState.score,
            levelReached: this.gameState.level
        });

        // Предлагаем поделиться в Farcaster если доступно
        if (window.sdk && window.farcasterContext) {
            setTimeout(() => {
                if (confirm('Share your score on Farcaster?')) {
                    this.shareScore();
                }
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

        if(this.currentLevel) {
            this.currentLevel.flippers.forEach(flipper => flipper.update());
            this.currentLevel.bumpers.forEach(bumper => bumper.update());
            this.currentLevel.spinners.forEach(spinner => spinner.update());
            this.currentLevel.dropTargets.forEach(target => target.update());
            this.currentLevel.tunnels.forEach(tunnel => tunnel.update());
        }

        this.checkCollisions();

        if (ballLost && this.gameState.ballInPlay) {
            this.gameState.lives--;
            this.gameState.ballInPlay = false;
            this.scorePanel.updateBalls(this.gameState.lives);

            if (this.gameState.lives <= 0) {
                this.gameOver();
            } else {
                setTimeout(() => {
                    this.resetBall();
                }, 1000);
            }
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
                this.playSound('bumper');
            }
        });

        this.currentLevel.spinners.forEach(spinner => {
            const points = spinner.checkCollision(this.ball);
            if (points > 0) {
                this.gameState.updateScore(points);
                this.scorePanel.updateScore(this.gameState.score);
                this.scorePanel.updateHighScore(this.gameState.highScore);

                this.playSound('spinner');
            }
        });

        this.currentLevel.dropTargets.forEach(target => {
            const points = target.checkCollision(this.ball);
            if (points > 0) {
                this.gameState.updateScore(points);
                this.scorePanel.updateScore(this.gameState.score);
                this.scorePanel.updateHighScore(this.gameState.highScore);

                this.playSound('targetHit');
            }
        });

        this.currentLevel.ramps.forEach(ramp => {
            ramp.checkCollision(this.ball);
        });

        this.currentLevel.tunnels.forEach(tunnel => {
            tunnel.checkCollision(this.ball);
        });
    }

    setupFarcasterIntegration() {
        console.log('PinballGame: Setting up Farcaster integration...');

        // Ждем готовности Farcaster SDK
        if (window.farcasterManager) {
            window.farcasterManager.onReady((context) => {
                console.log('PinballGame: Farcaster SDK ready', context);

                // ТОЛЬКО если действительно в frame окружении
                if (window.farcasterManager.isInFrame() && context) {
                    // В frame окружении - скрываем некоторые UI элементы
                    this.adaptUIForFrame(context);

                    // Показываем информацию о пользователе если доступна
                    const user = window.farcasterManager.getUser();
                    if (user) {
                        console.log('PinballGame: Farcaster user:', user);
                        this.displayUserInfo(user);
                    }
                }
            });

            // Слушаем обновления контекста
            window.farcasterManager.onContextUpdate((context) => {
                console.log('PinballGame: Farcaster context updated', context);
            });

            // Слушаем события frame
            window.farcasterManager.onFrameAdded(() => {
                console.log('PinballGame: App was added to favorites');
                this.showNotification('Game added to your apps! 🎉', 'success');
            });

            window.farcasterManager.onFrameRemoved(() => {
                console.log('PinballGame: App was removed from favorites');
                this.showNotification('Game removed from apps', 'info');
            });
        } else {
            console.warn('PinballGame: FarcasterManager not available');
        }
    }

    adaptUIForFrame(context) {
        // Адаптируем UI для frame окружения
        console.log('PinballGame: Adapting UI for Farcaster frame');

        // Применяем безопасные отступы если доступны
        try {
            // ИСПРАВЛЕНО: Убираем проверку на функции - в исправленной версии это простые объекты
            const client = context?.client;
            const safeAreaInsets = client?.safeAreaInsets;

            if (safeAreaInsets) {
                console.log('PinballGame: Got safe area insets:', safeAreaInsets);

                // ИСПРАВЛЕНО: Извлекаем простые значения
                const top = safeAreaInsets.top || 0;
                const bottom = safeAreaInsets.bottom || 0;
                const left = safeAreaInsets.left || 0;
                const right = safeAreaInsets.right || 0;

                // Применяем безопасные отступы
                const gameContainer = document.querySelector('.game-container');
                if (gameContainer) {
                    gameContainer.style.paddingTop = `${top}px`;
                    gameContainer.style.paddingBottom = `${bottom}px`;
                    gameContainer.style.paddingLeft = `${left}px`;
                    gameContainer.style.paddingRight = `${right}px`;
                }

                console.log('PinballGame: Applied safe area insets:', { top, bottom, left, right });
            }

            // Скрываем веб-специфичные элементы в frame окружении
            const webOnlyElements = document.querySelectorAll('.web-only');
            webOnlyElements.forEach(element => {
                element.style.display = 'none';
            });

            // Показываем frame-специфичные элементы
            const frameOnlyElements = document.querySelectorAll('.frame-only');
            frameOnlyElements.forEach(element => {
                element.style.display = 'block';
            });

        } catch (error) {
            console.error('PinballGame: Error adapting UI for frame:', error);
        }

        // Добавляем кнопку "Add to Apps" если еще не добавлена
        const tapToStartContent = document.querySelector('.tap-to-start-content');
        if (tapToStartContent && !document.getElementById('addToAppsBtn')) {
            const addButton = document.createElement('button');
            addButton.id = 'addToAppsBtn';
            addButton.className = 'restart-btn';
            addButton.textContent = '⭐ Add to Apps';
            addButton.style.marginTop = '10px';
            addButton.style.background = 'var(--accent-color, #4CAF50)';

            addButton.addEventListener('click', async () => {
                try {
                    const success = await window.farcasterManager.addToFavorites();
                    if (success) {
                        this.showNotification('Added to your apps! 🎮', 'success');
                    } else {
                        this.showNotification('Already in your apps! ⭐', 'info');
                    }
                } catch (error) {
                    console.error('Failed to add to apps:', error);
                    this.showNotification('Failed to add to apps', 'error');
                }
            });

            tapToStartContent.appendChild(addButton);
        }

        // Добавляем кнопку "Share Score" в game over overlay
        const gameOverContent = document.querySelector('.game-over-content');
        if (gameOverContent && !document.getElementById('shareScoreBtn')) {
            const shareButton = document.createElement('button');
            shareButton.id = 'shareScoreBtn';
            shareButton.className = 'restart-btn';
            shareButton.textContent = '📱 Share Score';
            shareButton.style.marginTop = '10px';
            shareButton.style.background = 'var(--accent-color, #ff6b35)';

            shareButton.addEventListener('click', async () => {
                const currentScore = this.gameState ? this.gameState.score : 0;
                const level = this.currentLevel ? this.currentLevel.name : 'Pinball';

                try {
                    await window.farcasterManager.composeCast({
                        text: `Just scored ${currentScore} points in ${level}! 🎮⚡\n\nPlay the game yourself:`,
                        embeds: [window.location.href]
                    });

                    this.showNotification('Cast created! 📝', 'success');
                } catch (error) {
                    console.error('Failed to share score:', error);
                    this.showNotification('Failed to share score', 'error');
                }
            });

            gameOverContent.appendChild(shareButton);
        }
    }
}