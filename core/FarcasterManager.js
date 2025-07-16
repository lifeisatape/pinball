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

        // Проверяем окружение frame - несколько методов для надежности
        this.isFrameEnvironment = typeof window !== 'undefined' && 
                                 (window.parent !== window || 
                                  window.location.search.includes('frame=true') ||
                                  window.location.search.includes('miniApp=true') ||
                                  document.referrer.includes('warpcast.com') ||
                                  document.referrer.includes('farcaster'));

        if (this.isFrameEnvironment) {
            console.log('FarcasterManager: Frame environment detected');
            await this.initializeFrameSDK();
        } else {
            console.log('FarcasterManager: Standalone web environment');
            this.simulateReady();
        }
    }

    async initializeFrameSDK() {
        try {
            // Ждем загрузки SDK с таймаутом
            this.sdk = await this.waitForSDK();
            if (!this.sdk) {
                throw new Error('FrameSDK not available');
            }

            console.log('FarcasterManager: Initializing FrameSDK...');
            await this.sdk.init();

            // Получаем контекст
            this.context = await this.sdk.context();
            this.user = this.context?.user;

            console.log('FarcasterManager: Context received:', {
                user: this.user,
                location: this.context?.location,
                client: this.context?.client
            });

            // Устанавливаем слушатели событий
            this.setupEventListeners();

            this.isReady = true;

            // КРИТИЧЕСКИ ВАЖНО: Вызываем ready() для скрытия splash screen
            await this.sdk.actions.ready();
            console.log('FarcasterManager: Ready signal sent to hide splash screen');

            // Уведомляем колбэки
            this.callbacks.ready.forEach(callback => {
                try {
                    callback(this.context);
                } catch (error) {
                    console.error('FarcasterManager: Error in ready callback:', error);
                }
            });

        } catch (error) {
            console.error('FarcasterManager: Initialization failed:', error);
            this.handleInitError(error);
        }
    }

    async waitForSDK(maxAttempts = 50) {
        for (let i = 0; i < maxAttempts; i++) {
            // Проверяем глобальную переменную sdk, которую создает CDN версия
            if (window.frameSDK) {
                console.log(`FarcasterManager: FrameSDK loaded after ${i * 100}ms`);
                return window.frameSDK;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        return null;
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
        console.error('FarcasterManager: Failed to initialize:', error);

        // Попытка fallback инициализации
        setTimeout(() => {
            this.isReady = true;
            console.log('FarcasterManager: Fallback ready state after init error');
            this.callbacks.ready.forEach(callback => {
                try {
                    callback(null);
                } catch (error) {
                    console.error('FarcasterManager: Error in fallback ready callback:', error);
                }
            });
        }, 1000);
    }

    // === ПУБЛИЧНЫЕ API МЕТОДЫ ===

    onReady(callback) {
        if (typeof callback !== 'function') {
            console.error('FarcasterManager: onReady callback must be a function');
            return;
        }

        if (this.isReady) {
            callback(this.context);
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

        if (!this.sdk) {
            console.error('FarcasterManager: SDK not available for addToFavorites');
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

        if (this.isFrameEnvironment && this.sdk) {
            try {
                await this.sdk.actions.openUrl(url);
                console.log('FarcasterManager: URL opened via FrameSDK:', url);
            } catch (error) {
                console.error('FarcasterManager: Failed to open URL via FrameSDK:', error);
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

        if (!this.sdk) {
            console.error('FarcasterManager: SDK not available for close');
            return;
        }

        try {
            await this.sdk.actions.close();
            console.log('FarcasterManager: Frame closed successfully');
        } catch (error) {
            console.error('FarcasterManager: Failed to close frame:', error);
        }
    }

    async composeCast(options = {}) {
        if (!this.isFrameEnvironment) {
            console.log('FarcasterManager: composeCast called outside frame environment');
            return null;
        }

        if (!this.sdk) {
            console.error('FarcasterManager: SDK not available for composeCast');
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

        if (!this.sdk) {
            console.error('FarcasterManager: SDK not available for signIn');
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

    // === GETTERS ===

    getUser() {
        return this.user;
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
                frameSDKLoaded: !!window.frameSDK
            }
        };

        console.log('FarcasterManager Debug Info:', debugInfo);
        return debugInfo;
    }
}

// Создаем глобальный экземпляр
console.log('Creating global FarcasterManager instance...');
window.farcasterManager = new FarcasterManager();