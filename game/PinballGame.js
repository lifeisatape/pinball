class PinballGame {
    constructor() {
        console.log('PinballGame: Initializing...');

        // Основные свойства игры
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.isRunning = false;
        this.isPaused = false;
        this.currentLevel = null;
        this.animationId = null;

        // UI элементы
        this.tapToStartScreen = document.getElementById('tapToStartScreen');
        this.loadingScreen = document.getElementById('loadingScreen');
        this.levelSelectScreen = document.getElementById('levelSelectScreen');

        // Инициализируем компоненты
        this.initializeComponents();
        this.setupEventListeners();
        this.setupFarcasterIntegration();

        console.log('PinballGame: Initialization complete');
    }

    initializeComponents() {
        // Инициализация всех игровых компонентов
        this.gameState = new GameState();
        this.inputManager = new InputManager();
        this.levelManager = new LevelManager();
        this.levelSelector = new LevelSelector();
        this.renderer = new GameRenderer(this.canvas, this.ctx);
        this.scorePanel = new ScorePanel();
        this.gameOverOverlay = new GameOverOverlay();
        this.levelSelectOverlay = new LevelSelectOverlay();

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
        if (context?.client?.safeAreaInsets) {
            const insets = context.client.safeAreaInsets;
            console.log('PinballGame: Applying safe area insets:', insets);

            document.body.style.paddingTop = `${insets.top}px`;
            document.body.style.paddingBottom = `${insets.bottom}px`;
            document.body.style.paddingLeft = `${insets.left}px`;
            document.body.style.paddingRight = `${insets.right}px`;
        }

        // Скрываем элементы, не подходящие для frame окружения
        const elementsToHide = [
            '#selectLevelBtn'  // Возможно, добавить другие элементы
        ];

        elementsToHide.forEach(selector => {
            const element = document.querySelector(selector);
            if (element) {
                element.style.display = 'none';
                console.log(`PinballGame: Hidden element ${selector} for frame mode`);
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
        if (!container || document.querySelector(`#${buttonConfig.id}`)) {
            return; // Контейнер не найден или кнопка уже существует
        }

        const button = document.createElement('button');
        button.id = buttonConfig.id;
        button.className = buttonConfig.className;
        button.textContent = buttonConfig.text;
        button.style.marginTop = '10px';

        button.addEventListener('click', buttonConfig.onClick);
        container.appendChild(button);

        console.log(`PinballGame: Added ${buttonConfig.id} button`);
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
                text: `Just scored ${currentScore} points in ${level}! 🎮⚡\n\nPlay the game yourself:`,
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
            color: var(--accent-color);
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
                border: 2px solid var(--accent-color);
            `;
            userInfo.insertBefore(avatar, userInfo.firstChild);
        }

        tapToStartContent.appendChild(userInfo);
        console.log('PinballGame: User info displayed for', user.username);
    }

    logLaunchContext(context) {
        if (!context?.location) return;

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

    showNotification(message, type = 'info') {
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
            { name: 'audio', init: () => this.initializeAudio() },
            { name: 'levels', init: () => this.initializeLevels() },
            { name: 'sounds', init: () => this.initializeSounds() },
            { name: 'input', init: () => this.initializeInput() }
        ];

        for (const system of systems) {
            try {
                console.log(`PinballGame: Initializing ${system.name}...`);
                await system.init();
                this.updateLoadingStatus(system.name, '✅');
            } catch (error) {
                console.error(`PinballGame: Failed to initialize ${system.name}:`, error);
                this.updateLoadingStatus(system.name, '❌');
            }
        }
    }

    updateLoadingStatus(systemName, status) {
        const statusElement = document.getElementById(`${systemName}Status`);
        if (statusElement) {
            statusElement.textContent = status;
        }
    }

    async initializeAudio() {
        if (window.soundManager) {
            await window.soundManager.init();
        }
    }

    async initializeLevels() {
        await this.levelSelector.getAvailableLevels();
    }

    async initializeSounds() {
        if (window.soundManager) {
            await window.soundManager.preloadAllSounds();
        }
    }

    async initializeInput() {
        if (this.inputManager) {
            this.inputManager.initialize();
        }
    }

    async proceedAfterLoading() {
        if (this.loadingScreen) {
            this.loadingScreen.style.display = 'none';
        }

        // В frame окружении сразу загружаем дефолтный уровень
        if (window.farcasterManager && window.farcasterManager.isInFrame()) {
            console.log('PinballGame: