                        class PinballGame {
                            constructor() {
                                console.log('PinballGame: Initializing...');

                                // Основные свойства игры
                                this.canvas = document.getElementById('gameCanvas');
                                this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
                                this.isRunning = false;
                                this.isPaused = false;
                                this.currentLevel = null;
                                this.animationId = null;

                                // UI элементы
                                this.tapToStartScreen = document.getElementById('tapToStartScreen');
                                this.loadingScreen = document.getElementById('loadingScreen');
                                this.levelSelectScreen = document.getElementById('levelSelectScreen');

                                if (!this.canvas) {
                                    console.error('PinballGame: Canvas element not found');
                                    return;
                                }

                                // Инициализируем компоненты
                                this.initializeComponents();
                                this.setupEventListeners();
                                this.setupFarcasterIntegration();

                                console.log('PinballGame: Initialization complete');
                            }

                            initializeComponents() {
                                // Инициализация всех игровых компонентов
                                try {
                                    this.gameState = window.GameState ? new GameState() : null;
                                    this.inputManager = window.InputManager ? new InputManager() : null;
                                    this.levelManager = window.LevelManager ? new LevelManager() : null;
                                    this.levelSelector = window.LevelSelector ? new LevelSelector() : null;
                                    this.renderer = window.GameRenderer ? new GameRenderer(this.canvas, this.ctx) : null;
                                    this.scorePanel = window.ScorePanel ? new ScorePanel() : null;
                                    this.gameOverOverlay = window.GameOverOverlay ? new GameOverOverlay() : null;
                                    this.levelSelectOverlay = window.LevelSelectOverlay ? new LevelSelectOverlay() : null;
                                } catch (error) {
                                    console.error('PinballGame: Error initializing components:', error);
                                }

                                // Настройка размеров canvas
                                this.resizeCanvas();
                                window.addEventListener('resize', () => this.resizeCanvas());
                            }

                            setupEventListeners() {
                                // Обработчики для основных UI элементов
                                const startButton = document.getElementById('startGameBtn');
                                if (startButton) {
                                    startButton.addEventListener('click', () => {
                                        this.startGame();
                                    });
                                }

                                const selectLevelBtn = document.getElementById('selectLevelBtn');
                                if (selectLevelBtn) {
                                    selectLevelBtn.addEventListener('click', () => {
                                        this.showLevelSelect();
                                    });
                                }

                                const restartBtn = document.getElementById('restartBtn');
                                if (restartBtn) {
                                    restartBtn.addEventListener('click', () => {
                                        this.restartGame();
                                    });
                                }

                                const menuBtn = document.getElementById('menuBtn');
                                if (menuBtn) {
                                    menuBtn.addEventListener('click', () => {
                                        this.showMainMenu();
                                    });
                                }

                                const startLevel = document.getElementById('startLevel');
                                if (startLevel) {
                                    startLevel.addEventListener('click', () => {
                                        this.startSelectedLevel();
                                    });
                                }

                                const backToMenu = document.getElementById('backToMenu');
                                if (backToMenu) {
                                    backToMenu.addEventListener('click', () => {
                                        this.showMainMenu();
                                    });
                                }

                                // Обработчик для экрана "tap to start"
                                if (this.tapToStartScreen) {
                                    this.tapToStartScreen.addEventListener('click', () => {
                                        this.startLoadingProcess();
                                    });

                                    this.tapToStartScreen.addEventListener('touchstart', (e) => {
                                        e.preventDefault();
                                        this.startLoadingProcess();
                                    }, { passive: false });
                                }

                                // Обработчики клавиатуры
                                document.addEventListener('keydown', (e) => {
                                    if (this.inputManager) {
                                        this.inputManager.handleKeyDown(e);
                                    }
                                });

                                document.addEventListener('keyup', (e) => {
                                    if (this.inputManager) {
                                        this.inputManager.handleKeyUp(e);
                                    }
                                });
                            }

                            setupFarcasterIntegration() {
                                console.log('PinballGame: Setting up Farcaster integration...');

                                if (!window.farcasterManager) {
                                    console.warn('PinballGame: FarcasterManager not available');
                                    return;
                                }

                                // Ждем готовности Farcaster SDK
                                window.farcasterManager.onReady((context) => {
                                    console.log('PinballGame: Farcaster ready', context);

                                    if (window.farcasterManager.isInFrame()) {
                                        this.adaptUIForFrame(context);
                                    }

                                    // Показываем информацию о пользователе
                                    const user = window.farcasterManager.getUser();
                                    if (user) {
                                        this.displayUserInfo(user);
                                    }

                                    // Логируем контекст запуска
                                    this.logLaunchContext(context);
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

                                window.farcasterManager.onNotificationsEnabled(() => {
                                    console.log('PinballGame: Notifications enabled');
                                    this.showNotification('Notifications enabled! 🔔', 'success');
                                });

                                window.farcasterManager.onNotificationsDisabled(() => {
                                    console.log('PinballGame: Notifications disabled');
                                    this.showNotification('Notifications disabled', 'info');
                                });
                            }

                            adaptUIForFrame(context) {
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

                                // Скрываем элементы, не подходящие для frame окружения
                                const elementsToHide = [
                                    '#selectLevelBtn'
                                ];

                                elementsToHide.forEach(selector => {
                                    const element = document.querySelector(selector);
                                    if (element) {
                                        element.style.display = 'none';
                                        console.log('PinballGame: Hidden element ' + selector + ' for frame mode');
                                    }
                                });

                                // Добавляем специальные кнопки для frame окружения
                                this.addFrameActionButtons();

                                // Адаптируем размеры под frame
                                this.adaptCanvasForFrame();
                            }

                            addFrameActionButtons() {
                                // Добавляем кнопку "Add to Apps" в главное меню
                                this.addButtonToContainer('.tap-to-start-content', {
                                    id: 'addToAppsBtn',
                                    text: '⭐ Add to My Apps',
                                    className: 'level-btn secondary',
                                    onClick: () => this.handleAddToApps()
                                });

                                // Добавляем кнопку "Share Score" в game over overlay
                                this.addButtonToContainer('.game-over-content', {
                                    id: 'shareScoreBtn',
                                    text: '📱 Share Score',
                                    className: 'level-btn secondary',
                                    onClick: () => this.handleShareScore()
                                });
                            }

                            addButtonToContainer(containerSelector, buttonConfig) {
                                const container = document.querySelector(containerSelector);
                                if (!container || document.querySelector('#' + buttonConfig.id)) {
                                    return; // Контейнер не найден или кнопка уже существует
                                }

                                const button = document.createElement('button');
                                button.id = buttonConfig.id;
                                button.className = buttonConfig.className;
                                button.textContent = buttonConfig.text;
                                button.style.marginTop = '10px';

                                button.addEventListener('click', buttonConfig.onClick);
                                container.appendChild(button);

                                console.log('PinballGame: Added ' + buttonConfig.id + ' button');
                            }

                            async handleAddToApps() {
                                try {
                                    const success = await window.farcasterManager.addToFavorites();
                                    if (success) {
                                        this.showNotification('Request sent! 🎮', 'success');
                                    } else {
                                        this.showNotification('Already in your apps! ⭐', 'info');
                                    }
                                } catch (error) {
                                    console.error('PinballGame: Failed to add to apps:', error);
                                    this.showNotification('Failed to add to apps', 'error');
                                }
                            }

                            async handleShareScore() {
                                const currentScore = this.gameState ? this.gameState.score : 0;
                                const level = this.currentLevel ? this.currentLevel.name : 'Pinball';

                                try {
                                    await window.farcasterManager.composeCast({
                                        text: 'Just scored ' + currentScore + ' points in ' + level + '! 🎮⚡\n\nPlay the game yourself:',
                                        embeds: [window.location.href]
                                    });

                                    this.showNotification('Cast created! 📝', 'success');
                                } catch (error) {
                                    console.error('PinballGame: Failed to share score:', error);
                                    this.showNotification('Failed to share score', 'error');
                                }
                            }

                            adaptCanvasForFrame() {
                                // Адаптируем размеры canvas для frame окружения
                                const container = this.canvas.parentElement;
                                if (container) {
                                    container.style.height = '100vh';
                                    container.style.overflow = 'hidden';
                                }

                                this.resizeCanvas();
                            }

                            displayUserInfo(user) {
                                const tapToStartContent = document.querySelector('.tap-to-start-content');
                                if (!tapToStartContent || !user.username) {
                                    return;
                                }

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

                                const welcomeText = 'Welcome, @' + user.username + '! 👋';
                                userInfo.innerHTML = '<p>' + welcomeText + '</p>';

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

                                tapToStartContent.appendChild(userInfo);
                                console.log('PinballGame: User info displayed for', user.username);
                            }

                            logLaunchContext(context) {
                                if (!context || !context.location) return;

                                const location = context.location;
                                console.log('PinballGame: Launch context:', location);

                                switch (location.type) {
                                    case 'cast_embed':
                                        console.log('PinballGame: Launched from cast embed');
                                        this.showNotification('Launched from cast! 📱', 'info');
                                        break;
                                    case 'notification':
                                        console.log('PinballGame: Launched from notification');
                                        this.showNotification('Welcome back! 🔔', 'success');
                                        break;
                                    case 'launcher':
                                        console.log('PinballGame: Launched from app launcher');
                                        this.showNotification('Launched from apps! 🚀', 'info');
                                        break;
                                    default:
                                        console.log('PinballGame: Unknown launch context');
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

                            async startLoadingProcess() {
                                console.log('PinballGame: Starting loading process...');

                                if (this.tapToStartScreen) {
                                    this.tapToStartScreen.style.display = 'none';
                                }

                                if (this.loadingScreen) {
                                    this.loadingScreen.style.display = 'flex';
                                }

                                try {
                                    // Инициализируем все системы
                                    await this.initializeSystems();

                                    // Ждем небольшую паузу для плавности
                                    await new Promise(resolve => setTimeout(resolve, 500));

                                    // Переходим к выбору уровня или автостарту
                                    await this.proceedAfterLoading();

                                } catch (error) {
                                    console.error('PinballGame: Loading failed:', error);
                                    this.showNotification('Loading failed. Please refresh.', 'error');
                                }
                            }

                            async initializeSystems() {
                                const systems = [
                                    { name: 'engine', init: () => this.initializeEngine() },
                                    { name: 'audio', init: () => this.initializeAudio() },
                                    { name: 'levels', init: () => this.initializeLevels() },
                                    { name: 'sounds', init: () => this.initializeSounds() },
                                    { name: 'input', init: () => this.initializeInput() }
                                ];

                                for (const system of systems) {
                                    try {
                                        console.log('PinballGame: Initializing ' + system.name + '...');
                                        await system.init();
                                        this.updateLoadingStatus(system.name, '✅');
                                    } catch (error) {
                                        console.error('PinballGame: Failed to initialize ' + system.name + ':', error);
                                        this.updateLoadingStatus(system.name, '❌');
                                    }
                                }
                            }

                            updateLoadingStatus(systemName, status) {
                                const statusElement = document.getElementById(systemName + 'Status');
                                if (statusElement) {
                                    statusElement.textContent = status;
                                }
                            }

                            async initializeEngine() {
                                // Инициализация игрового движка
                                return new Promise(resolve => setTimeout(resolve, 300));
                            }

                            async initializeAudio() {
                                if (window.soundManager) {
                                    try {
                                        await window.soundManager.init();
                                    } catch (error) {
                                        console.warn('PinballGame: Audio initialization failed:', error);
                                    }
                                }
                            }

                            async initializeLevels() {
                                if (this.levelSelector) {
                                    try {
                                        await this.levelSelector.getAvailableLevels();
                                    } catch (error) {
                                        console.warn('PinballGame: Levels initialization failed:', error);
                                    }
                                }
                            }

                            async initializeSounds() {
                                if (window.soundManager) {
                                    try {
                                        await window.soundManager.preloadAllSounds();
                                    } catch (error) {
                                        console.warn('PinballGame: Sounds initialization failed:', error);
                                    }
                                }
                            }

                            async initializeInput() {
                                if (this.inputManager) {
                                    try {
                                        this.inputManager.initialize();
                                    } catch (error) {
                                        console.warn('PinballGame: Input initialization failed:', error);
                                    }
                                }
                            }

                            async proceedAfterLoading() {
                                if (this.loadingScreen) {
                                    this.loadingScreen.style.display = 'none';
                                }

                                // В frame окружении сразу загружаем дефолтный уровень
                                if (window.farcasterManager && window.farcasterManager.isInFrame()) {
                                    console.log('PinballGame: Frame environment - auto-starting default level');
                                    await this.loadDefaultLevel();
                                    this.startGame();
                                } else {
                                    // В обычном веб-окружении показываем выбор уровня
                                    console.log('PinballGame: Web environment - showing level select');
                                    this.showLevelSelect();
                                }
                            }

                            async loadDefaultLevel() {
                                try {
                                    if (this.levelSelector) {
                                        const levels = await this.levelSelector.getAvailableLevels();
                                        if (levels.length > 0) {
                                            const defaultLevel = levels[0]; // Берем первый доступный уровень
                                            if (this.levelManager) {
                                                await this.levelManager.loadLevel(defaultLevel.data);
                                            }
                                            this.currentLevel = defaultLevel;
                                            console.log('PinballGame: Default level loaded:', defaultLevel.name);
                                        } else {
                                            throw new Error('No levels available');
                                        }
                                    } else {
                                        // Создаем простой дефолтный уровень если levelSelector недоступен
                                        this.currentLevel = { name: 'Default', data: {} };
                                        console.log('PinballGame: Using default level');
                                    }
                                } catch (error) {
                                    console.error('PinballGame: Failed to load default level:', error);
                                    this.showNotification('Failed to load level', 'error');
                                    // Создаем базовый уровень как fallback
                                    this.currentLevel = { name: 'Basic', data: {} };
                                }
                            }

                            showLevelSelect() {
                                if (this.levelSelectScreen) {
                                    this.levelSelectScreen.style.display = 'flex';
                                }

                                if (this.levelSelectOverlay) {
                                    this.levelSelectOverlay.show();
                                }
                            }

                            hideLevelSelect() {
                                if (this.levelSelectScreen) {
                                    this.levelSelectScreen.style.display = 'none';
                                }

                                if (this.levelSelectOverlay) {
                                    this.levelSelectOverlay.hide();
                                }
                            }

                            showMainMenu() {
                                this.hideLevelSelect();
                                this.hideGameOver();

                                if (this.tapToStartScreen) {
                                    this.tapToStartScreen.style.display = 'flex';
                                }

                                this.isRunning = false;
                                this.isPaused = false;

                                if (this.animationId) {
                                    cancelAnimationFrame(this.animationId);
                                    this.animationId = null;
                                }
                            }

                            hideGameOver() {
                                const gameOverScreen = document.getElementById('gameOverScreen');
                                if (gameOverScreen) {
                                    gameOverScreen.style.display = 'none';
                                }
                            }

                            startSelectedLevel() {
                                // Логика для запуска выбранного уровня
                                this.startGame();
                            }

                            startGame() {
                                console.log('PinballGame: Starting game...');

                                if (!this.currentLevel) {
                                    console.error('PinballGame: Cannot start game - no level loaded');
                                    this.showNotification('No level selected', 'error');
                                    return;
                                }

                                this.hideLevelSelect();
                                this.hideGameOver();
                                this.isRunning = true;
                                this.isPaused = false;

                                // Инициализируем игровое состояние
                                if (this.gameState) {
                                    this.gameState.reset();
                                }

                                // Запускаем игровой цикл
                                this.gameLoop();

                                console.log('PinballGame: Game started successfully');

                                // Уведомляем о старте игры в frame окружении
                                if (window.farcasterManager && window.farcasterManager.isInFrame()) {
                                    this.showNotification('Playing ' + this.currentLevel.name + '! 🎮', 'success');
                                }
                            }

                            gameLoop() {
                                if (!this.isRunning) return;

                                try {
                                    // Обновляем игровую логику
                                    this.update();

                                    // Рендерим кадр
                                    this.render();

                                } catch (error) {
                                    console.error('PinballGame: Error in game loop:', error);
                                    this.pauseGame();
                                    this.showNotification('Game error occurred', 'error');
                                }

                                // Планируем следующий кадр
                                this.animationId = requestAnimationFrame(() => this.gameLoop());
                            }

                            update() {
                                if (this.isPaused) return;

                                // Обновляем все игровые системы
                                if (this.gameState) {
                                    this.gameState.update();
                                }

                                if (this.inputManager) {
                                    this.inputManager.update();
                                }

                                if (this.levelManager) {
                                    this.levelManager.update();
                                }

                                // Проверяем условия окончания игры
                                this.checkGameEnd();
                            }

                            render() {
                                if (!this.renderer) return;

                                // Очищаем canvas
                                this.renderer.clear();

                                // Рендерим игровые объекты
                                if (this.levelManager) {
                                    this.renderer.renderLevel(this.levelManager);
                                }

                                if (this.gameState) {
                                    this.renderer.renderUI(this.gameState);
                                }
                            }

                            checkGameEnd() {
                                if (!this.gameState) return;

                                if (this.gameState.isGameOver && this.gameState.isGameOver()) {
                                    this.endGame();
                                }
                            }

                            endGame() {
                                console.log('PinballGame: Game ended');

                                this.isRunning = false;

                                if (this.animationId) {
                                    cancelAnimationFrame(this.animationId);
                                    this.animationId = null;
                                }

                                // Показываем экран game over
                                const gameOverScreen = document.getElementById('gameOverScreen');
                                if (gameOverScreen) {
                                    gameOverScreen.style.display = 'flex';

                                    // Обновляем финальный счет
                                    const finalScore = document.getElementById('finalScore');
                                    if (finalScore && this.gameState) {
                                        finalScore.textContent = this.gameState.score || 0;
                                    }
                                }

                                // В frame окружении предлагаем поделиться результатом
                                if (window.farcasterManager && window.farcasterManager.isInFrame()) {
                                    setTimeout(() => {
                                        this.showNotification('Share your score! 📱', 'info');
                                    }, 1000);
                                }
                            }

                            pauseGame() {
                                if (!this.isRunning) return;

                                this.isPaused = !this.isPaused;
                                console.log('PinballGame: Game', this.isPaused ? 'paused' : 'resumed');

                                if (this.isPaused) {
                                    this.showNotification('Game paused', 'info');
                                }
                            }

                            restartGame() {
                                console.log('PinballGame: Restarting game...');

                                this.isRunning = false;
                                this.isPaused = false;

                                if (this.animationId) {
                                    cancelAnimationFrame(this.animationId);
                                    this.animationId = null;
                                }

                                // Скрываем overlays
                                this.hideGameOver();

                                // Перезапускаем игру
                                this.startGame();
                            }

                            resizeCanvas() {
                                if (!this.canvas) return;

                                const container = this.canvas.parentElement;
                                if (!container) return;

                                const containerRect = container.getBoundingClientRect();

                                // Устанавливаем размеры canvas
                                this.canvas.width = containerRect.width || 800;
                                this.canvas.height = containerRect.height || 600;

                                // Обновляем стили
                                this.canvas.style.width = this.canvas.width + 'px';
                                this.canvas.style.height = this.canvas.height + 'px';

                                console.log('PinballGame: Canvas resized to ' + this.canvas.width + 'x' + this.canvas.height);
                            }

                            // === ПУБЛИЧНЫЕ МЕТОДЫ ===

                            getGameState() {
                                return this.gameState;
                            }

                            getCurrentLevel() {
                                return this.currentLevel;
                            }

                            getScore() {
                                return this.gameState ? (this.gameState.score || 0) : 0;
                            }

                            getBalls() {
                                return this.gameState ? (this.gameState.balls || 3) : 3;
                            }

                            isGameRunning() {
                                return this.isRunning;
                            }

                            isGamePaused() {
                                return this.isPaused;
                            }

                            // === МЕТОДЫ ДЛЯ ОТЛАДКИ ===

                            getFarcasterStatus() {
                                if (!window.farcasterManager) {
                                    return { available: false };
                                }

                                return {
                                    available: true,
                                    status: window.farcasterManager.getStatus(),
                                    debug: window.farcasterManager.debug()
                                };
                            }

                            debugInfo() {
                                const debugData = {
                                    game: {
                                        isRunning: this.isRunning,
                                        isPaused: this.isPaused,
                                        currentLevel: this.currentLevel ? this.currentLevel.name : null,
                                        score: this.getScore(),
                                        balls: this.getBalls()
                                    },
                                    canvas: {
                                        width: this.canvas ? this.canvas.width : null,
                                        height: this.canvas ? this.canvas.height : null
                                    },
                                    farcaster: this.getFarcasterStatus(),
                                    systems: {
                                        gameState: !!this.gameState,
                                        inputManager: !!this.inputManager,
                                        levelManager: !!this.levelManager,
                                        renderer: !!this.renderer,
                                        soundManager: !!window.soundManager
                                    }
                                };

                                console.log('PinballGame Debug Info:', debugData);
                                return debugData;
                            }

                            // === МЕТОДЫ ДЛЯ ВНЕШНЕГО УПРАВЛЕНИЯ ===

                            forceRestart() {
                                console.log('PinballGame: Force restart requested');
                                this.restartGame();
                            }

                            setLevel(levelData) {
                                if (!levelData) {
                                    console.error('PinballGame: Invalid level data provided');
                                    return false;
                                }

                                try {
                                    if (this.levelManager) {
                                        this.levelManager.loadLevel(levelData);
                                    }
                                    this.currentLevel = levelData;
                                    console.log('PinballGame: Level set successfully:', levelData.name);
                                    return true;
                                } catch (error) {
                                    console.error('PinballGame: Failed to set level:', error);
                                    return false;
                                }
                            }

                            // === ОБРАБОТКА СОБЫТИЙ УНИЧТОЖЕНИЯ ===

                            destroy() {
                                console.log('PinballGame: Destroying game instance...');

                                // Останавливаем игру
                                this.isRunning = false;
                                this.isPaused = false;

                                if (this.animationId) {
                                    cancelAnimationFrame(this.animationId);
                                    this.animationId = null;
                                }

                                // Очищаем event listeners
                                window.removeEventListener('resize', this.resizeCanvas);

                                // Очищаем canvas
                                if (this.ctx) {
                                    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
                                }

                                console.log('PinballGame: Destroyed successfully');
                            }
                        }

                        // Экспорт для глобального использования
                        window.PinballGame = PinballGame;