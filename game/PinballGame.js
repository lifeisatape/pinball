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
        this.tapToStartScreen = document.getElementById('tapToStartScreen');
        this.loadingScreen = document.getElementById('loadingScreen');
        this.levelSelectScreen = document.getElementById('levelSelectScreen');

        // Collision grid system for improved corner handling
        this.useCollisionGrid = true;
        this.collisionGrid = null;

        this.ball = null;
        this.gameStarted = false;
        this.currentLevel = null;
        this.userHasInteracted = false;

        // Состояние загрузки
        this.loadingState = {
            audio: false,
            sounds: false,
            levels: false
        };

        this.setupEventListeners();
        this.setupFarcasterIntegration();
        this.showTapToStartScreen();
    }

    async initializeGame() {
        try {
            if (!this.currentLevel) return;

            this.hideStartScreen();
            this.inputManager = new InputManager(this.canvas, this.currentLevel.flippers);
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

    setupEventListeners() {
        document.getElementById('restartGame').addEventListener('click', () => {
            this.restartGame();
        });

        document.getElementById('backToMenu').addEventListener('click', () => {
            this.showLevelSelect();
        });

        document.getElementById('startLevel').addEventListener('click', () => {
            const selectedLevel = this.levelSelector.getCurrentLevel();
            if (selectedLevel) {
                this.loadSelectedLevel(selectedLevel);
            } else {
                alert('Please select a level first!');
            }
        });

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
    }

    setupFarcasterIntegration() {
        console.log('PinballGame: Setting up Farcaster integration...');

        // Проверяем готовность Farcaster SDK
        if (window.farcasterIntegration) {
            console.log('PinballGame: FarcasterIntegration available');

            if (window.farcasterIntegration.isInMiniApp) {
                console.log('PinballGame: Running in Mini App environment');

                // В Mini App окружении - адаптируем UI
                const context = window.farcasterIntegration.getContext();
                if (context) {
                    this.adaptUIForFrame(context);
                }

                // Показываем информацию о пользователе если доступна
                const user = window.farcasterIntegration.getUserInfo();
                if (user) {
                    console.log('PinballGame: Farcaster user:', user);
                    this.displayUserInfo(user);
                }
            }
        } else {
            console.warn('PinballGame: FarcasterIntegration not available');
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
                    const success = await window.farcasterIntegration.addToFavorites();
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
                    await window.farcasterIntegration.shareScore(currentScore, level);
                    this.showNotification('Cast created! 📝', 'success');
                } catch (error) {
                    console.error('Failed to share score:', error);
                    this.showNotification('Failed to share score', 'error');
                }
            });

            gameOverContent.appendChild(shareButton);
        }
    }

    displayUserInfo(user) {
        // Показываем информацию о пользователе Farcaster
        const tapToStartContent = document.querySelector('.tap-to-start-content');
        if (!tapToStartContent) return;

        try {
            // ИСПРАВЛЕНО: Убираем проверку на функцию - user уже простой объект
            const userData = user;

            if (!userData) return;

            // ИСПРАВЛЕНО: Данные уже простые свойства, не функции
            const username = userData.username;
            const pfpUrl = userData.pfpUrl;
            const displayName = userData.displayName;

            if (!username) return;

            // Удаляем предыдущий элемент если есть
            const existingUserInfo = document.getElementById('farcasterUserInfo');
            if (existingUserInfo) {
                existingUserInfo.remove();
            }

            // Создаем элемент с информацией о пользователе
            const userInfoElement = document.createElement('div');
            userInfoElement.id = 'farcasterUserInfo';
            userInfoElement.style.cssText = `
                margin-top: 15px;
                padding: 10px;
                background: rgba(0, 0, 0, 0.7);
                border-radius: 8px;
                text-align: center;
                color: #ffffff;
                font-size: 14px;
                border: 1px solid rgba(255, 255, 255, 0.2);
            `;

            let userContent = `<div style="display: flex; align-items: center; justify-content: center; gap: 10px;">`;

            if (pfpUrl) {
                userContent += `<img src="${pfpUrl}" alt="Profile" style="width: 32px; height: 32px; border-radius: 50%; border: 2px solid #fff;">`;
            }

            userContent += `<div>`;
            userContent += `<div style="font-weight: bold;">@${username}</div>`;

            if (displayName && displayName !== username) {
                userContent += `<div style="font-size: 12px; opacity: 0.8;">${displayName}</div>`;
            }

            userContent += `</div></div>`;

            userInfoElement.innerHTML = userContent;
            tapToStartContent.appendChild(userInfoElement);

            console.log('FarcasterManager: User info displayed for', username);
        } catch (error) {
            console.error('FarcasterManager: Error displaying user info:', error);
        }
    }

    showNotification(message, type) {
        type = type || 'info';

        // Создаем уведомление
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 8px;
            z-index: 10000;
            font-size: 14px;
            font-weight: 500;
            max-width: 300px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            transform: translateX(100%);
            transition: transform 0.3s ease;
        `;

        // Цвета в зависимости от типа
        const colors = {
            success: { bg: '#4CAF50', text: '#fff' },
            error: { bg: '#f44336', text: '#fff' },
            info: { bg: '#2196F3', text: '#fff' },
            warning: { bg: '#ff9800', text: '#fff' }
        };

        const color = colors[type] || colors.info;
        notification.style.backgroundColor = color.bg;
        notification.style.color = color.text;
        notification.textContent = message;

        document.body.appendChild(notification);

        // Анимация появления
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 10);

        // Удаление через 3 секунды
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    showTapToStartScreen() {
        this.canvas.style.display = 'none';
        document.querySelector('.score-panel').style.display = 'none';
        this.tapToStartScreen.style.display = 'flex';
        this.loadingScreen.style.display = 'none';
        this.levelSelectScreen.style.display = 'none';
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

    async startLoadingProcess() {
        // ЗАЩИТА ОТ АВТОЗАПУСКА!
        if (!this.userHasInteracted) {
            console.log('PinballGame: Blocking auto-start - user must click TAP TO START first');
            return;
        }

        console.log('PinballGame: Starting loading process...');
        // Скрываем экран "tap to start" и показываем загрузку
        this.tapToStartScreen.style.display = 'none';
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

        // AudioContext уже активирован в activateAudioContext(), сразу запускаем unlock
        setTimeout(async () => {
            try {
                console.log('PinballGame: Starting SoundManager unlock...');

                if (window.soundManager) {
                    await window.soundManager.unlock();
                }

                this.loadingState.audio = true;
                this.updateLoadingProgress('audio', 100, 'Audio system initialized');

                // SoundManager уже готов, просто помечаем как завершенный
                if (window.soundManager && window.soundManager.isReady) {
                    this.loadingState.sounds = true;
                    this.updateLoadingProgress('sounds', 100, 'Sounds ready');
                    this.checkLoadingComplete();
                } else {
                    console.log('Waiting for SoundManager to be ready...');
                    // Слушатель уже настроен выше для события 'soundManagerReady'
                }
            } catch (error) {
                console.error('Error initializing audio:', error);
                this.loadingState.audio = true;
                this.loadingState.sounds = true;
                this.checkLoadingComplete();
            }
        }, 100); // Минимальная задержка

        // Загружаем уровни
        setTimeout(async () => {
            try {
                await this.levelSelector.getAvailableLevels();
                this.loadingState.levels = true;
                this.updateLoadingProgress('levels', 100, 'Levels loaded');
                this.checkLoadingComplete();
            } catch (error) {
                console.error('Error loading levels:', error);
                this.loadingState.levels = true;
                this.checkLoadingComplete();
            }
        }, 500);
    }

    updateLoadingProgress(type, progress, message) {
        const statusElements = {
            audio: 'audioStatus',
            sounds: 'soundsStatus',
            levels: 'levelsStatus'
        };

        const elementId = statusElements[type];
        if (elementId) {
            const element = document.getElementById(elementId);
            if (element) {
                element.textContent = progress >= 100 ? '✅' : '⏳';
            }
        }

        // Если это финальный статус, обновляем состояние загрузки
        if (progress >= 100) {
            if (type === 'audio') {
                this.loadingState.audio = true;
            } else if (type === 'sounds') {
                this.loadingState.sounds = true;
            } else if (type === 'levels') {
                this.loadingState.levels = true;
            } else {
                console.warn('Unknown loading type:', type);
                return '❌';
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

        const progressFill = document.getElementById('loadingBar');
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
                // ВСЕГДА показываем экран выбора уровня - как в оригинале
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

        // Запускаем музыку меню
        if (window.soundManager && window.soundManager.isReady) {
            window.soundManager.playMusic('menu');
        }

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
        // Check grid-based collisions first if enabled
        if (this.useCollisionGrid && this.collisionGrid) {
            this.checkGridBasedCollisions();
        }

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

    draw() {
        this.renderer.clear();
        this.renderer.startVirtualRendering();

        // Draw background image
        if (this.currentLevel.backgroundImage) {
            this.renderer.drawBackgroundImage(this.currentLevel.backgroundImage, this.currentLevel.backgroundOpacity);
        }

        this.renderer.renderGameObjects(this.currentLevel);
        this.renderer.renderBall(this.ball, this.gameState.ballInPlay);

        // Draw overlay image on top of everything
        if (this.currentLevel.overlayImage) {
            this.renderer.drawOverlayImage(this.currentLevel.overlayImage, 1.0);
        }

        // Debug collision grid visualization (change false to true to enable)
        if (this.useCollisionGrid && false) {
            this.drawCollisionGridDebug();
        }

        this.renderer.endVirtualRendering();
    }

    updateUI() {
        this.scorePanel.updateAll(this.gameState);
    }

    gameOver() {
        this.gameState.isGameOver = true;
        this.gameOverOverlay.show(this.gameState);

        // В Mini App окружении предлагаем поделиться результатом
        if (window.farcasterIntegration && window.farcasterIntegration.isInMiniApp) {
            setTimeout(() => {
                this.showNotification('Share your score! 📱', 'info');
            }, 1000);
        }
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

        // Останавливаем игровую музыку и запускаем музыку меню
        if (window.soundManager && window.soundManager.isReady) {
            window.soundManager.stopMusic();
            window.soundManager.playMusic('menu');
        }

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
        this.currentLevel.walls.forEach(wall => {
            this.markWallCells(grid, wall, cellSize, cols, rows);
        });

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
                


    async shareGameResult(score, level) {
                    try {
                        if (window.farcasterIntegration && window.farcasterIntegration.isFarcasterApp) {
                            await window.farcasterIntegration.shareScore(score, level);
                            this.showNotification('Score shared! 📤', 'success');
                        }
                    } catch (error) {
                        console.error('Failed to share score:', error);
                        this.showNotification('Failed to share score', 'error');
                    }
                }

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
}
