class FarcasterManager {
    constructor() {
        this.isFrameEnvironment = false;
        this.isReady = false;
        this.context = null;
        this.user = null;
        this.sdk = null;
        this.readyCalled = false; // Флаг чтобы избежать двойного вызова
        this.callbacks = {
            ready: [],
            contextUpdate: [],
            frameAdded: [],
            frameRemoved: [],
            notificationsEnabled: [],
            notificationsDisabled: []
        };

        // НЕ вызываем init() в конструкторе - будем вызывать явно
    }

    async initialize() {
        console.log('FarcasterManager: Initializing...');

        // Проверяем окружение Mini App
        const isMiniAppEnvironment = this.detectMiniAppEnvironment();

        if (!isMiniAppEnvironment) {
            console.log('⏭️ Not in Mini App environment, skipping Farcaster initialization');
            this.simulateReady();
            return;
        }

        try {
            // Сначала проверяем предзагруженный SDK (для web)
            if (window.sdk) {
                console.log('🔄 Using pre-loaded window.sdk...');
                this.sdk = window.sdk;
                this.isFrameEnvironment = true;
                console.log('✅ Pre-loaded SDK found');
            } else {
                // Загружаем SDK через import (для случаев без предзагрузки)
                console.log('🔄 Loading Farcaster SDK via import...');
                const { sdk } = await import('https://esm.sh/@farcaster/frame-sdk');
                this.sdk = sdk;
                this.isFrameEnvironment = true;
                console.log('✅ Farcaster SDK loaded via import');
            }

            // КРИТИЧЕСКИ ВАЖНО: ВСЕГДА вызываем ready() независимо от платформы
            await this.callReadyEarly();

            // Затем настраиваем остальные функции
            await this.setupMiniAppFeatures();

        } catch (error) {
            console.error('❌ Error loading Farcaster SDK:', error);
            this.isFrameEnvironment = false;
            this.simulateReady();
        }
    }

    detectMiniAppEnvironment() {
        // Улучшенное определение окружения Mini App
        const hasParent = window.parent !== window;
        const hasFrameReferrer = document.referrer.includes('warpcast.com') || 
                                document.referrer.includes('farcaster');
        const hasWindowSdk = typeof window.sdk !== 'undefined';
        const userAgent = navigator.userAgent || '';
        const isMobileApp = userAgent.includes('Warpcast') || userAgent.includes('Farcaster');

        const isMiniApp = hasParent || hasFrameReferrer || hasWindowSdk || isMobileApp;

        console.log('🔍 Environment detection:', {
            hasParent,
            hasFrameReferrer,
            hasWindowSdk,
            isMobileApp,
            isMiniApp,
            userAgent: userAgent.substring(0, 100),
            windowSdkType: typeof window.sdk,
            windowSdkExists: !!window.sdk
        });

        return isMiniApp;
    }

    async callReadyEarly() {
        if (this.readyCalled) {
            console.log('⚠️ Ready already called, skipping');
            return;
        }

        let attempts = 0;
        const maxAttempts = 10; // Увеличиваем количество попыток для мобильных

        console.log('🚀 Starting ready() call process...');

        while (attempts < maxAttempts && !this.readyCalled) {
            try {
                console.log(`🚀 Calling ready() (attempt ${attempts + 1}/${maxAttempts})...`);

                // Проверяем готовность SDK более тщательно
                if (!this.sdk) {
                    console.log('⚠️ SDK not available, waiting...');
                    await new Promise(resolve => setTimeout(resolve, 200));
                    attempts++;
                    continue;
                }

                if (!this.sdk.actions) {
                    console.log('⚠️ SDK actions not available, waiting...');
                    await new Promise(resolve => setTimeout(resolve, 200));
                    attempts++;
                    continue;
                }

                if (typeof this.sdk.actions.ready !== 'function') {
                    console.log('⚠️ SDK ready function not available, waiting...');
                    await new Promise(resolve => setTimeout(resolve, 200));
                    attempts++;
                    continue;
                }

                // Вызываем ready() с дополнительными опциями для мобильных
                await this.sdk.actions.ready({
                    disableNativeGestures: false
                });

                this.readyCalled = true;
                console.log('✅ Ready() call successful - splash screen should be dismissed');
                return;

            } catch (error) {
                console.warn(`⚠️ Ready() attempt ${attempts + 1} failed:`, error.message);
                console.warn('Error details:', error);
                attempts++;

                if (attempts < maxAttempts) {
                    // Прогрессивное увеличение задержки
                    const delay = 200 + (attempts * 300);
                    console.log(`⏳ Retrying ready() in ${delay}ms...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                } else {
                    console.error('❌ Failed to call ready() after all attempts');
                    console.error('This may cause issues on mobile devices with splash screens');
                }
            }
        }
    }

    async setupMiniAppFeatures() {
        try {
            this.setupEventListeners();

            // Получаем контекст - с обработкой Proxy объектов
            try {
                this.context = await this.sdk.context;
                console.log('📋 Farcaster context received');

                // Безопасная работа с пользователем
                if (this.context && this.context.user) {
                    this.user = this.context.user;

                    // Правильное обращение к Proxy объектам
                    try {
                        const userInfo = {
                            fid: await this.resolveValue(this.user.fid),
                            username: await this.resolveValue(this.user.username),
                            displayName: await this.resolveValue(this.user.displayName)
                        };
                        console.log('👤 User info:', userInfo);
                    } catch (userError) {
                        console.log('⚠️ Could not resolve user details:', userError.message);
                    }
                }
            } catch (contextError) {
                console.log('⚠️ Could not get context:', contextError.message);
            }

            this.isReady = true;

            // Уведомляем колбэки о готовности
            this.notifyReadyCallbacks();

            console.log('🎉 Mini App features setup complete');
        } catch (error) {
            console.error('Error setting up Mini App features:', error);
            this.simulateReady();
        }
    }

    // Безопасная работа с Proxy объектами от Farcaster SDK
    async resolveValue(value) {
        if (value === null || value === undefined) {
            return value;
        }

        // Если это Proxy функция, вызываем её
        if (typeof value === 'function') {
            return await value();
        }

        // Если это Promise, ждём результата
        if (value && typeof value.then === 'function') {
            return await value;
        }

        return value;
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

            console.log('📡 Farcaster event listeners setup complete');
        } catch (error) {
            console.error('FarcasterManager: Error setting up event listeners:', error);
        }
    }

    notifyReadyCallbacks() {
        this.callbacks.ready.forEach(callback => {
            try {
                callback(this.context);
            } catch (error) {
                console.error('FarcasterManager: Error in ready callback:', error);
            }
        });
    }

    simulateReady() {
        console.log('🔄 Simulating ready state for non-frame environment');
        this.isReady = true;
        this.notifyReadyCallbacks();
    }

    // Безопасные методы для получения информации о контексте
    async getSafeAreaInsets() {
        try {
            if (!this.context?.client?.safeAreaInsets) {
                return { top: 0, bottom: 0, left: 0, right: 0 };
            }

            const insets = this.context.client.safeAreaInsets;
            return {
                top: await this.resolveValue(insets.top) || 0,
                bottom: await this.resolveValue(insets.bottom) || 0,
                left: await this.resolveValue(insets.left) || 0,
                right: await this.resolveValue(insets.right) || 0
            };
        } catch (error) {
            console.error('Error getting safe area insets:', error);
            return { top: 0, bottom: 0, left: 0, right: 0 };
        }
    }

    async getUserInfo() {
        try {
            if (!this.user) {
                return null;
            }

            return {
                fid: await this.resolveValue(this.user.fid),
                username: await this.resolveValue(this.user.username),
                displayName: await this.resolveValue(this.user.displayName),
                pfpUrl: await this.resolveValue(this.user.pfpUrl)
            };
        } catch (error) {
            console.error('Error getting user info:', error);
            return null;
        }
    }

    // Публичные методы API (без изменений)
    isInFrame() {
        return this.isFrameEnvironment;
    }

    getContext() {
        return this.context;
    }

    getUser() {
        return this.user;
    }

    onReady(callback) {
        if (this.isReady) {
            try {
                callback(this.context);
            } catch (error) {
                console.error('FarcasterManager: Error in immediate ready callback:', error);
            }
        } else {
            this.callbacks.ready.push(callback);
        }
    }

    onFrameAdded(callback) {
        this.callbacks.frameAdded.push(callback);
    }

    onFrameRemoved(callback) {
        this.callbacks.frameRemoved.push(callback);
    }

    onNotificationsEnabled(callback) {
        this.callbacks.notificationsEnabled.push(callback);
    }

    onNotificationsDisabled(callback) {
        this.callbacks.notificationsDisabled.push(callback);
    }

    async addFrame() {
        if (this.sdk && this.sdk.actions && this.sdk.actions.addFrame) {
            try {
                await this.sdk.actions.addFrame();
                console.log('✅ Add frame action completed');
            } catch (error) {
                console.error('❌ Add frame action failed:', error);
                throw error;
            }
        } else {
            console.warn('⚠️ Add frame action not available');
        }
    }

    async close() {
        if (this.sdk && this.sdk.actions && this.sdk.actions.close) {
            try {
                await this.sdk.actions.close();
                console.log('✅ Close action completed');
            } catch (error) {
                console.error('❌ Close action failed:', error);
                throw error;
            }
        } else {
            console.warn('⚠️ Close action not available');
        }
    }

    async openUrl(url) {
        if (this.sdk && this.sdk.actions && this.sdk.actions.openUrl) {
            try {
                await this.sdk.actions.openUrl(url);
                console.log('✅ Open URL action completed:', url);
            } catch (error) {
                console.error('❌ Open URL action failed:', error);
                throw error;
            }
        } else {
            console.warn('⚠️ Open URL action not available');
            // Fallback для обычного браузера
            window.open(url, '_blank');
        }
    }
}

// Создаем глобальный экземпляр
console.log('🚀 Creating FarcasterManager instance...');
window.farcasterIntegration = new FarcasterManager();

// Инициализируем сразу
window.farcasterIntegration.initialize().then(() => {
    console.log('🎉 FarcasterManager initialization complete');
}).catch(error => {
    console.error('❌ FarcasterManager initialization failed:', error);
});