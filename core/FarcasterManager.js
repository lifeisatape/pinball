class FarcasterManager {
    constructor() {
        this.isFrameEnvironment = false;
        this.isReady = false;
        this.context = null;
        this.user = null;
        this.sdk = null;
        this.callbacks = {
            ready: [],
            contextUpdate: [],
            frameAdded: [],
            frameRemoved: [],
            notificationsEnabled: [],
            notificationsDisabled: []
        };

        this.init();
    }

    async init() {
        console.log('FarcasterManager: Initializing...');

        // ИСПРАВЛЕНО: Проверяем window.isMiniApp как в рабочем примере
        if (!window.isMiniApp) {
            console.log('⏭️ Not in Mini App environment, skipping Farcaster initialization');
            this.simulateReady();
            return;
        }

        try {
            console.log('🔄 Initializing Farcaster integration...');

            // ИСПРАВЛЕНО: Ждем правильный SDK - window.sdk, а не window.miniAppSDK
            const sdk = await this.waitForSDK();
            this.sdk = sdk;

            // ИСПРАВЛЕНО: Если SDK загрузился - значит мы в Mini App окружении
            // Игнорируем ненадежную проверку sdk.isInMiniApp()
            this.isFrameEnvironment = true;
            console.log('✅ Farcaster SDK initialized successfully');

            // Получаем контекст
            try {
                console.log('📋 Farcaster context received');

                // КРИТИЧЕСКИ ВАЖНО: Вызываем ready() НЕМЕДЛЕННО после получения контекста
                await this.notifyAppReady();
                console.log('🎉 Ready called immediately after context');

                // Безопасное получение пользователя
                try {
                    const user = this.context.user;
                    this.user = user;
                    console.log('👤 User info:', {
                        fid: user?.fid,
                        username: user?.username,
                        displayName: user?.displayName
                    });
                } catch (userError) {
                    console.log('ℹ️ User data not immediately available');
                    this.user = null;
                }
            } catch (error) {
                console.log('⚠️ Could not get context:', error.message);
            }

            await this.setupMiniAppFeatures();
        } catch (error) {
            console.error('❌ Error initializing Farcaster SDK:', error);
            this.isFrameEnvironment = false;
            this.simulateReady();
        }
    }

    async waitForSDK() {
        let attempts = 0;
        const maxAttempts = 50; // 5 секунд

        while (attempts < maxAttempts) {
            // ИСПРАВЛЕНО: Ищем window.sdk, а не window.miniAppSDK
            if (window.sdk && typeof window.sdk.actions === 'object') {
                console.log(`FarcasterManager: SDK loaded after ${attempts * 100}ms`);
                return window.sdk;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        throw new Error('SDK not loaded within timeout');
    }

    async setupMiniAppFeatures() {
        try {
            // Устанавливаем слушатели событий
            this.setupEventListeners();

            // Ждем готовности UI перед вызовом ready()
            await new Promise(resolve => {
                requestAnimationFrame(() => {
                    setTimeout(resolve, 500); // Даем время на рендеринг
                });
            });

            this.isReady = true;

            // КРИТИЧЕСКИ ВАЖНО: Вызываем ready() для скрытия splash screen
            await this.notifyAppReady();

            // Уведомляем колбэки
            this.callbacks.ready.forEach(callback => {
                try {
                    callback(this.context);
                } catch (error) {
                    console.error('FarcasterManager: Error in ready callback:', error);
                }
            });

            console.log('🎉 Mini App features setup complete');
        } catch (error) {
            console.error('Error setting up Mini App features:', error);
        }
    }

    // ИСПРАВЛЕНО: Отдельный метод для ready() как в рабочем примере
    async notifyAppReady() {
        if (this.isFrameEnvironment && this.sdk && this.sdk.actions && this.sdk.actions.ready) {
            try {
                await this.sdk.actions.ready({
                    disableNativeGestures: false
                });
                console.log('🎉 Farcaster splash screen dismissed');
            } catch (error) {
                console.error('❌ Failed to dismiss splash screen:', error);
            }
        }
    }

    setupEventListeners() {
        if (!this.sdk) return;

        try {
            this.sdk.on('frameAdded', (data) => {
                console.log('FarcasterManager: Frame added event:', data);
                this.callbacks.frameAdded.forEach(callback => {
                    try {
                        callback(data);
                    } catch (error) {
                        console.error('FarcasterManager: Error in frameAdded callback:', error);
                    }
                });
            });

            this.sdk.on('frameRemoved', (data) => {
                console.log('FarcasterManager: Frame removed event:', data);
                this.callbacks.frameRemoved.forEach(callback => {
                    try {
                        callback(data);
                    } catch (error) {
                        console.error('FarcasterManager: Error in frameRemoved callback:', error);
                    }
                });
            });

            this.sdk.on('notificationsEnabled', (data) => {
                console.log('FarcasterManager: Notifications enabled event:', data);
                this.callbacks.notificationsEnabled.forEach(callback => {
                    try {
                        callback(data);
                    } catch (error) {
                        console.error('FarcasterManager: Error in notificationsEnabled callback:', error);
                    }
                });
            });

            this.sdk.on('notificationsDisabled', (data) => {
                console.log('FarcasterManager: Notifications disabled event:', data);
                this.callbacks.notificationsDisabled.forEach(callback => {
                    try {
                        callback(data);
                    } catch (error) {
                        console.error('FarcasterManager: Error in notificationsDisabled callback:', error);
                    }
                });
            });

        } catch (error) {
            console.error('FarcasterManager: Failed to setup event listeners:', error);
        }
    }

    simulateReady() {
        // Для обычного веб-окружения
        setTimeout(() => {
            this.isReady = true;
            console.log('FarcasterManager: Simulated ready state for web environment');
            this.callbacks.ready.forEach(callback => {
                try {
                    callback(null);
                } catch (error) {
                    console.error('FarcasterManager: Error in simulated ready callback:', error);
                }
            });
        }, 100);
    }

    handleInitError(error) {
        console.error('FarcasterManager: Initialization failed, falling back to web mode:', error);
        this.isFrameEnvironment = false;
        this.simulateReady();
    }

    // === CALLBACK REGISTRATION ===

    onReady(callback) {
        if (typeof callback !== 'function') {
            console.error('FarcasterManager: onReady callback must be a function');
            return;
        }

        if (this.isReady) {
            // Если уже готов, вызываем сразу
            setTimeout(() => callback(this.context), 0);
        } else {
            this.callbacks.ready.push(callback);
        }
    }

    onContextUpdate(callback) {
        if (typeof callback !== 'function') {
            console.error('FarcasterManager: onContextUpdate callback must be a function');
            return;
        }
        this.callbacks.contextUpdate.push(callback);
    }

    onFrameAdded(callback) {
        if (typeof callback !== 'function') {
            console.error('FarcasterManager: onFrameAdded callback must be a function');
            return;
        }
        this.callbacks.frameAdded.push(callback);
    }

    onFrameRemoved(callback) {
        if (typeof callback !== 'function') {
            console.error('FarcasterManager: onFrameRemoved callback must be a function');
            return;
        }
        this.callbacks.frameRemoved.push(callback);
    }

    onNotificationsEnabled(callback) {
        if (typeof callback !== 'function') {
            console.error('FarcasterManager: onNotificationsEnabled callback must be a function');
            return;
        }
        this.callbacks.notificationsEnabled.push(callback);
    }

    onNotificationsDisabled(callback) {
        if (typeof callback !== 'function') {
            console.error('FarcasterManager: onNotificationsDisabled callback must be a function');
            return;
        }
        this.callbacks.notificationsDisabled.push(callback);
    }

    // === FRAME ACTIONS ===

    async addToFavorites() {
        if (!this.isFrameEnvironment) {
            console.log('FarcasterManager: addToFavorites called outside frame environment');
            return false;
        }

        if (!this.sdk || !this.sdk.actions) {
            console.error('FarcasterManager: SDK actions not available for addToFavorites');
            return false;
        }

        try {
            await this.sdk.actions.addFrame();
            console.log('FarcasterManager: Add frame action triggered successfully');
            return true;
        } catch (error) {
            console.error('FarcasterManager: Failed to add frame:', error);
            return false;
        }
    }

    async openUrl(url) {
        if (!url) {
            console.error('FarcasterManager: openUrl called without URL');
            return;
        }

        if (this.isFrameEnvironment && this.sdk && this.sdk.actions) {
            try {
                await this.sdk.actions.openUrl(url);
                console.log('FarcasterManager: URL opened via MiniApp SDK:', url);
            } catch (error) {
                console.error('FarcasterManager: Failed to open URL via SDK:', error);
                // Fallback to regular window.open
                window.open(url, '_blank');
            }
        } else {
            window.open(url, '_blank');
        }
    }

    async close() {
        if (!this.isFrameEnvironment) {
            console.log('FarcasterManager: close called outside frame environment');
            return;
        }

        if (!this.sdk || !this.sdk.actions) {
            console.error('FarcasterManager: SDK actions not available for close');
            return;
        }

        try {
            await this.sdk.actions.close();
            console.log('FarcasterManager: Frame closed successfully');
        } catch (error) {
            console.error('FarcasterManager: Failed to close frame:', error);
        }
    }

    // ИСПРАВЛЕНО: Добавляем методы из рабочего примера
    async shareScore(score, level) {
        if (!this.isFrameEnvironment || !this.sdk || !this.sdk.actions || !this.sdk.actions.composeCast) return;

        try {
            const text = `🚀 I just scored ${score || 0} points and reached level ${level || 1} in Pinball All Stars! Can you beat that? 🎮💥`;
            const url = window.location.origin;

            await this.sdk.actions.composeCast({
                text: text,
                embeds: [url]
            });
        } catch (error) {
            console.error('Error sharing score:', error);
        }
    }

    async composeCast(options = {}) {
        if (!this.isFrameEnvironment) {
            console.log('FarcasterManager: composeCast called outside frame environment');
            return null;
        }

        if (!this.sdk || !this.sdk.actions) {
            console.error('FarcasterManager: SDK actions not available for composeCast');
            return null;
        }

        try {
            const result = await this.sdk.actions.composeCast(options);
            console.log('FarcasterManager: Cast composed successfully:', result);
            return result;
        } catch (error) {
            console.error('FarcasterManager: Failed to compose cast:', error);
            return null;
        }
    }

    async signIn(nonce) {
        if (!this.isFrameEnvironment) {
            console.log('FarcasterManager: signIn called outside frame environment');
            return null;
        }

        if (!this.sdk || !this.sdk.actions) {
            console.error('FarcasterManager: SDK actions not available for signIn');
            return null;
        }

        if (!nonce) {
            console.error('FarcasterManager: signIn called without nonce');
            return null;
        }

        try {
            const result = await this.sdk.actions.signIn({ nonce });
            console.log('FarcasterManager: Sign in successful');
            return result;
        } catch (error) {
            console.error('FarcasterManager: Failed to sign in:', error);
            return null;
        }
    }

    // ИСПРАВЛЕНО: Добавляем метод для доната через sendToken
    async sendDonation(amount = '1000000') { // По умолчанию 1 USDC
        if (!this.isFrameEnvironment || !this.sdk || !this.sdk.actions || !this.sdk.actions.sendToken) {
            console.log('Farcaster SDK недоступен для доната');
            return { success: false, reason: 'sdk_unavailable' };
        }

        try {
            const result = await this.sdk.actions.sendToken({
                token: 'eip155:8453/erc20:0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // Base USDC
                amount: amount, // 1 USDC = 1000000 (6 decimals)
                recipientAddress: '0x7Ea45b01EECaE066f37500c92B10421937571f75'
            });

            if (result.success) {
                console.log('Донат успешно отправлен:', result.send.transaction);
                return result;
            } else {
                console.log('Ошибка при донате:', result.error);
                return result;
            }
        } catch (error) {
            console.error('Ошибка при отправке доната:', error);
            return { success: false, reason: 'send_failed', error: error.message };
        }
    }

    // === GETTERS ===

    getUser() {
        return this.user;
    }

    // ИСПРАВЛЕНО: Добавляем метод getUserInfo как в рабочем примере
    getUserInfo() {
        if (this.isFrameEnvironment && this.context && this.context.user) {
            const user = this.context.user;
            return {
                fid: user.fid || null,
                username: user.username || null,
                displayName: user.displayName || null,
                pfpUrl: user.pfpUrl || null
            };
        }
        return null;
    }

    getContext() {
        return this.context;
    }

    isInFrame() {
        return this.isFrameEnvironment;
    }

    getStatus() {
        return {
            isReady: this.isReady,
            isInFrame: this.isFrameEnvironment,
            hasUser: !!this.user,
            contextLoaded: !!this.context,
            sdkAvailable: !!this.sdk,
            userFid: this.user?.fid,
            username: this.user?.username,
            clientFid: this.context?.client?.clientFid,
            isAppAdded: this.context?.client?.added
        };
    }

    // === УТИЛИТЫ ===

    getSafeAreaInsets() {
        return this.context?.client?.safeAreaInsets || {
            top: 0,
            bottom: 0,
            left: 0,
            right: 0
        };
    }

    getNotificationDetails() {
        return this.context?.client?.notificationDetails;
    }

    canSendNotifications() {
        return !!(this.context?.client?.notificationDetails?.token);
    }

    getLocationContext() {
        return this.context?.location;
    }

    isLaunchedFromCast() {
        return this.context?.location?.type === 'cast_embed';
    }

    isLaunchedFromNotification() {
        return this.context?.location?.type === 'notification';
    }

    isLaunchedFromLauncher() {
        return this.context?.location?.type === 'launcher';
    }

    // === DEBUG ===

    debug() {
        const debugInfo = {
            status: this.getStatus(),
            context: this.context,
            callbacks: Object.keys(this.callbacks).reduce((acc, key) => {
                acc[key] = this.callbacks[key].length;
                return acc;
            }, {}),
            environment: {
                userAgent: navigator.userAgent,
                referrer: document.referrer,
                search: window.location.search,
                isIframe: window.parent !== window,
                isMiniApp: !!window.isMiniApp,
                sdkLoaded: !!window.sdk
            }
        };

        console.log('FarcasterManager Debug Info:', debugInfo);
        return debugInfo;
    }
}

// Создаем глобальный экземпляр
console.log('Creating global FarcasterIntegration instance...');
window.farcasterIntegration = new FarcasterManager();