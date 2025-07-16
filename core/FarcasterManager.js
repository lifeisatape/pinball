
class FarcasterManager {
    constructor() {
        this.isFrameEnvironment = false;
        this.isReady = false;
        this.context = null;
        this.user = null;
        this.callbacks = {
            ready: [],
            contextUpdate: []
        };
        
        this.init();
    }

    async init() {
        // Проверяем, работаем ли мы в Farcaster frame
        if (typeof window !== 'undefined' && window.parent !== window) {
            this.isFrameEnvironment = true;
            console.log('FarcasterManager: Frame environment detected');
            
            try {
                // Инициализируем Farcaster SDK
                if (window.FrameSDK) {
                    await window.FrameSDK.init();
                    this.context = await window.FrameSDK.context();
                    this.user = this.context?.user;
                    this.isReady = true;
                    
                    console.log('FarcasterManager: SDK initialized', {
                        user: this.user,
                        context: this.context
                    });

                    // Уведомляем frame о готовности
                    window.FrameSDK.actions.ready();
                    
                    // Вызываем колбэки готовности
                    this.callbacks.ready.forEach(callback => callback(this.context));
                    
                    // Слушаем обновления контекста
                    window.FrameSDK.on('frameAdded', (context) => {
                        this.context = context;
                        this.callbacks.contextUpdate.forEach(callback => callback(context));
                    });
                }
            } catch (error) {
                console.error('FarcasterManager: Failed to initialize SDK:', error);
            }
        } else {
            console.log('FarcasterManager: Not in frame environment');
            // Симулируем готовность для обычного веб-окружения
            setTimeout(() => {
                this.isReady = true;
                this.callbacks.ready.forEach(callback => callback(null));
            }, 100);
        }
    }

    // Подписка на готовность SDK
    onReady(callback) {
        if (this.isReady) {
            callback(this.context);
        } else {
            this.callbacks.ready.push(callback);
        }
    }

    // Подписка на обновления контекста
    onContextUpdate(callback) {
        this.callbacks.contextUpdate.push(callback);
    }

    // Получение информации о пользователе
    getUser() {
        return this.user;
    }

    // Получение контекста
    getContext() {
        return this.context;
    }

    // Проверка, находимся ли в frame
    isInFrame() {
        return this.isFrameEnvironment;
    }

    // Отправка события в Farcaster
    sendFrameAction(action, data = {}) {
        if (this.isFrameEnvironment && window.FrameSDK) {
            try {
                window.FrameSDK.actions[action](data);
            } catch (error) {
                console.error(`FarcasterManager: Failed to send ${action}:`, error);
            }
        }
    }

    // Открытие URL в Farcaster
    openUrl(url) {
        this.sendFrameAction('openUrl', { url });
    }

    // Закрытие frame
    close() {
        this.sendFrameAction('close');
    }

    // Добавление frame в избранное
    addToFavorites() {
        this.sendFrameAction('addFrame');
    }

    // Получение статуса
    getStatus() {
        return {
            isReady: this.isReady,
            isInFrame: this.isFrameEnvironment,
            hasUser: !!this.user,
            contextLoaded: !!this.context
        };
    }
}

// Создаем глобальный экземпляр
window.farcasterManager = new FarcasterManager();
