class FarcasterManager {
    constructor() {
        this.sdk = null;
        this.context = null;
        this.isInMiniApp = false;
        this.isFarcasterApp = false;
        this.user = null;

        this.init();
    }

    async init() {
        console.log('FarcasterManager: Initializing...');

        // Точно такая же проверка как в FlowersOnMars
        if (!window.isMiniApp) {
            console.log('⏭️ Not in Mini App environment, skipping Farcaster initialization');
            return; // НЕ вызывать simulateReady()
        }

        try {
            console.log('🔄 Initializing Farcaster integration...');

            const sdk = await this.waitForSDK();
            this.sdk = sdk;

            // УПРОЩЕННАЯ проверка окружения (как в FlowersOnMars)
            let isInMiniAppEnv = true;
            try {
                if (typeof sdk.isInMiniApp === 'function') {
                    isInMiniAppEnv = await sdk.isInMiniApp();
                    console.log('🔍 SDK environment check:', isInMiniAppEnv);
                }
            } catch (error) {
                console.log('⚠️ Could not verify environment with SDK:', error);
            }

            if (isInMiniAppEnv) {
                this.isInMiniApp = true;
                this.isFarcasterApp = true;
                console.log('✅ Farcaster SDK initialized successfully');

                // Получить контекст
                try {
                    this.context = await sdk.context;
                    console.log('📋 Farcaster context received');

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

                // Вызвать setupMiniAppFeatures (БЕЗ ready() внутри)
                await this.setupMiniAppFeatures();
            } else {
                console.log('⚠️ SDK reports not in Mini App environment');
            }
        } catch (error) {
            console.error('❌ Error initializing Farcaster SDK:', error);
            this.isInMiniApp = false;
        }
    }

    async waitForSDK() {
        let attempts = 0;
        const maxAttempts = 50; // 5 секунд

        while (attempts < maxAttempts) {
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
            // Ждем готовности UI перед вызовом ready()
            await new Promise(resolve => {
                requestAnimationFrame(() => {
                    setTimeout(resolve, 500); // Даем время на рендеринг
                });
            });
            console.log('🎉 Mini App features setup complete');
        } catch (error) {
            console.error('Error setting up Mini App features:', error);
        }
    }

    async notifyAppReady() {
        if (this.isInMiniApp && this.sdk && this.sdk.actions && this.sdk.actions.ready) {
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

    // === FRAME ACTIONS ===

    async addToFavorites() {
        if (!this.isInMiniApp || !this.sdk || !this.sdk.actions) {
            console.log('FarcasterManager: addToFavorites called outside frame environment');
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

        if (this.isInMiniApp && this.sdk && this.sdk.actions) {
            try {
                await this.sdk.actions.openUrl(url);
                console.log('FarcasterManager: URL opened via MiniApp SDK:', url);
            } catch (error) {
                console.error('FarcasterManager: Failed to open URL via SDK:', error);
                window.open(url, '_blank');
            }
        } else {
            window.open(url, '_blank');
        }
    }

    async close() {
        if (!this.isInMiniApp || !this.sdk || !this.sdk.actions) {
            console.log('FarcasterManager: close called outside frame environment');
            return;
        }

        try {
            await this.sdk.actions.close();
            console.log('FarcasterManager: Frame closed successfully');
        } catch (error) {
            console.error('FarcasterManager: Failed to close frame:', error);
        }
    }

    async shareScore(score, level) {
        if (!this.isInMiniApp || !this.sdk || !this.sdk.actions || !this.sdk.actions.composeCast) return;

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
        if (!this.isInMiniApp || !this.sdk || !this.sdk.actions) {
            console.log('FarcasterManager: composeCast called outside frame environment');
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
        if (!this.isInMiniApp || !this.sdk || !this.sdk.actions) {
            console.log('FarcasterManager: signIn called outside frame environment');
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

    async sendDonation(amount = '1000000') {
        if (!this.isInMiniApp || !this.sdk || !this.sdk.actions || !this.sdk.actions.sendToken) {
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

    getUserInfo() {
        if (this.isInMiniApp && this.context && this.context.user) {
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

    getStatus() {
        return {
            isInMiniApp: this.isInMiniApp,
            isFarcasterApp: this.isFarcasterApp,
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

// Создаем глобальный экземпляр с новым именем
console.log('Creating global FarcasterIntegration instance...');
window.farcasterIntegration = new FarcasterManager();