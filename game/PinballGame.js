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

        // Обработчик для экрана "tap to start"
        this.tapToStartScreen.addEventListener('click', () => {
            this.startLoadingProcess();
        });

        this.tapToStartScreen.addEventListener('touchstart', () => {
            this.startLoadingProcess();
        }, { passive: true });
    }

    setupFarcasterIntegration() {
        console.log('PinballGame: Setting up Farcaster integration...');

        // Ждем готовности Farcaster SDK
        if (window.farcasterManager) {
            window.farcasterManager.onReady((context) => {
                console.log('PinballGame: Farcaster SDK ready', context);

                if (window.farcasterManager.isInFrame()) {
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
        if (context && context.client && context.client.safeAreaInsets) {
            const insets = context.client.safeAreaInsets;
            console.log('PinballGame: Applying safe area insets:', insets);

            document.body.style.paddingTop = insets.top + 'px';
            document.body.style.paddingBottom = insets.bottom + 'px';
            document.body.style.paddingLeft = insets.left + 'px';
            document.body.style.paddingRight = insets.right + 'px';
        }

        // Можно скрыть некоторые кнопки или изменить layout
        const selectLevelBtn = document.getElementById('selectLevelBtn');
        if (selectLevelBtn) {
            selectLevelBtn.style.display = 'none';
        }

        // Добавляем кнопки для Farcaster
        this.addFarcasterButtons();
    }

    addFarcasterButtons() {
        // Добавляем кнопку "Add to Apps" в главное меню
        const tapToStartContent = document.querySelector('.tap-to-start-content');
        if (tapToStartContent && !document.getElementById('addToAppsBtn')) {
            const addButton = document.createElement('button');
            addButton.id = 'addToAppsBtn';
            addButton.className = 'restart-btn';
            addButton.textContent = '⭐ Add to My Apps';
            addButton.style.marginTop = '10px';
            addButton.style.background = 'var(--accent-color, #ff6b35)';

            addButton.addEventListener('click', async () => {
                try {
                    const success = await window.farcasterManager.addToFavorites();
                    if (success) {
                        this.showNotification('Request sent! 🎮', 'success');
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

    displayUserInfo(user) {
        // Показываем информацию о пользователе Farcaster
        const tapToStartContent = document.querySelector('.tap-to-start-content');
        if (tapToStartContent && user.username) {
            // Убираем предыдущую информацию о пользователе
            const existingUserInfo = document.querySelector('#farcaster-user-info');
            if (existingUserInfo) {
                existingUserInfo.remove();
            }

            const userInfo = document.createElement('div');
            userInfo.id = 'farcaster-user-info';
            userInfo.style.cssText = `
                color: var(--accent-color, #ff6b35);
                margin: 15px 0;
                text-align: center;
                font-size: 16px;
            `;

            const welcomeText = `Welcome, @${user.username}! 👋`;
            userInfo.innerHTML = `<p>${welcomeText}</p>`;

            // Добавляем аватар если доступен
            if (user.pfpUrl) {
                const avatar = document.createElement('img');
                avatar.src = user.pfpUrl;
                avatar.style.cssText = `
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    margin-bottom: 10px;
                    border: 2px solid var(--accent-color, #ff6b35);
                `;
                userInfo.insertBefore(avatar, userInfo.firstChild);
            }

            tapToStartContent.insertBefore(userInfo, tapToStartContent.querySelector('h2'));
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

    async startLoadingProcess() {
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

        // Затем активируем аудио с задержкой, увеличенной для deployed версии
        const isDeployed = window.location.hostname.includes('replit.app') || 
                          window.location.hostname.includes('replit.dev') || 
                          window.location.protocol === 'https:';

        const delay = isDeployed ? 1000 : 500; // Больше времени для deployed версии

        setTimeout(async () => {
            if (window.soundManager) {
                await window.soundManager.unlock();
            }
        }, delay);

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
                // В frame окружении сразу переходим к игре
                if (window.farcasterManager && window.farcasterManager.isInFrame()) {
                    console.log('PinballGame: Frame environment - auto-starting first level');
                    this.autoStartFirstLevel();
                } else {
                    this.showLevelSelectScreen();
                }
            }, 1000); // Небольшая задержка для красоты
        }
    }

    async autoStartFirstLevel() {
        try {
            const levels = await this.levelSelector.getAvailableLevels();
            if (levels.length > 0) {
                const firstLevel = levels[0];
                await this.loadSelectedLevel(firstLevel);
                this.showNotification(`Playing ${firstLevel.name}! 🎮`, 'success');
            } else {
                this.showLevelSelectScreen();
            }
        } catch (error) {
            console.error('Failed to auto-start level:', error);
            this.showLevelSelectScreen();
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

        this.renderer.endVirtualRendering();
    }

    updateUI() {
        this.scorePanel.updateAll(this.gameState);
    }

    gameOver() {
        this.gameState.isGameOver = true;
        this.gameOverOverlay.show(this.gameState);

        // В frame окружении предлагаем поделиться результатом
        if (window.farcasterManager && window.farcasterManager.isInFrame()) {
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
}