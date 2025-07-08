
class SoundManager {
    constructor() {
        this.sounds = {};
        this.soundPools = {};
        this.musicVolume = 0.3;
        this.sfxVolume = 0.5;
        this.currentMusic = null;
        this.enabled = true;
        this.userInteracted = false;
        this.lastPlayTime = {};
        this.loadingPromises = {};

        // Мобильная оптимизация
        this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        this.debounceTime = this.isMobile ? 150 : 50;
        this.maxPoolSize = this.isMobile ? 2 : 3;

        this.setupUserInteraction();
        this.preloadSounds();
    }

    setupUserInteraction() {
        const enableAudio = () => {
            this.userInteracted = true;
            this.initializeAudioContext();
            document.removeEventListener('touchstart', enableAudio);
            document.removeEventListener('click', enableAudio);
        };

        document.addEventListener('touchstart', enableAudio, { once: true });
        document.addEventListener('click', enableAudio, { once: true });
    }

    initializeAudioContext() {
        // Создаем пустой аудио буфер для инициализации контекста
        const silentAudio = new Audio();
        silentAudio.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAAAAAAAAAAAAAAAAAAAZGF0YQQAAAAAAA==';
        silentAudio.volume = 0;
        silentAudio.play().catch(() => {});
    }

    preloadSounds() {
        const soundFiles = {
            // Приоритетные звуки (загружаем сразу)
            flipperIn: { url: 'sounds/Flipper_In.mp3', priority: true, pool: true },
            flipperOut: { url: 'sounds/Flipper_Out.mp3', priority: true, pool: true },
            wallHit: { url: 'sounds/wallhit.mp3', priority: true, pool: true },
            
            // Вторичные звуки (ленивая загрузка)
            menu: { url: 'sounds/menu.mp3', priority: false, pool: false },
            level: { url: 'sounds/level.mp3', priority: false, pool: false },
            bumper: { url: 'sounds/Bamper.mp3', priority: true, pool: true },
            spinner: { url: 'sounds/spinner.mp3', priority: true, pool: true },
            targetHit: { url: 'sounds/Target_hit.mp3', priority: true, pool: true },
            targetIn: { url: 'sounds/Target_in.mp3', priority: false, pool: false },
            newGameLaunch: { url: 'sounds/New_game_launch.mp3', priority: false, pool: false }
        };

        // Загружаем приоритетные звуки сразу
        Object.entries(soundFiles).forEach(([key, config]) => {
            if (config.priority) {
                this.loadSound(key, config);
            } else {
                // Для неприоритетных создаем промис для ленивой загрузки
                this.loadingPromises[key] = () => this.loadSound(key, config);
            }
        });
    }

    loadSound(key, config) {
        if (this.sounds[key]) return Promise.resolve();

        return new Promise((resolve) => {
            const audio = new Audio();
            
            // Оптимизация для мобильных
            if (this.isMobile) {
                audio.preload = 'none';
                audio.load = () => {}; // Отключаем автозагрузку
            } else {
                audio.preload = 'auto';
            }

            audio.crossOrigin = 'anonymous';
            audio.volume = ['menu', 'level'].includes(key) ? this.musicVolume : this.sfxVolume;

            const onLoad = () => {
                this.sounds[key] = audio;
                
                // Создаем пул для частых звуков
                if (config.pool) {
                    this.createSoundPool(key, config.url, config);
                }
                
                resolve();
            };

            const onError = () => {
                console.warn(`Failed to load sound: ${config.url}`);
                resolve(); // Продолжаем даже при ошибке
            };

            audio.addEventListener('canplaythrough', onLoad, { once: true });
            audio.addEventListener('error', onError, { once: true });
            
            audio.src = config.url;
            
            // Форсируем загрузку только если пользователь уже взаимодействовал
            if (this.userInteracted && !this.isMobile) {
                audio.load();
            }
        });
    }

    createSoundPool(key, url, config) {
        if (this.soundPools[key]) return;

        this.soundPools[key] = [];
        
        for (let i = 0; i < this.maxPoolSize; i++) {
            const audio = new Audio();
            audio.preload = this.isMobile ? 'none' : 'auto';
            audio.crossOrigin = 'anonymous';
            audio.volume = this.sfxVolume;
            audio.src = url;
            
            this.soundPools[key].push({
                audio: audio,
                playing: false
            });
        }
    }

    getAvailableSound(soundName) {
        // Проверяем пул звуков
        if (this.soundPools[soundName]) {
            const availableSound = this.soundPools[soundName].find(item => !item.playing);
            if (availableSound) {
                return availableSound;
            }
            // Если все заняты, используем первый и прерываем его
            return this.soundPools[soundName][0];
        }

        // Используем основной звук
        return { audio: this.sounds[soundName], playing: false };
    }

    async playSound(soundName, options = {}) {
        if (!this.enabled || !this.userInteracted) return;

        // Дебаунс для частых звуков
        const now = Date.now();
        if (this.lastPlayTime[soundName] && now - this.lastPlayTime[soundName] < this.debounceTime) {
            return;
        }
        this.lastPlayTime[soundName] = now;

        // Ленивая загрузка неприоритетных звуков
        if (!this.sounds[soundName] && this.loadingPromises[soundName]) {
            await this.loadingPromises[soundName]();
            delete this.loadingPromises[soundName];
        }

        const soundItem = this.getAvailableSound(soundName);
        if (!soundItem || !soundItem.audio) return;

        const audio = soundItem.audio;

        try {
            // Останавливаем текущее воспроизведение
            if (!audio.paused) {
                audio.pause();
                audio.currentTime = 0;
            }

            // Устанавливаем громкость
            if (options.volume !== undefined) {
                audio.volume = Math.max(0, Math.min(1, options.volume));
            }

            // Помечаем как играющий
            soundItem.playing = true;

            // Воспроизводим
            const playPromise = audio.play();
            
            if (playPromise) {
                playPromise
                    .then(() => {
                        // Сбрасываем флаг по окончании
                        audio.addEventListener('ended', () => {
                            soundItem.playing = false;
                        }, { once: true });
                    })
                    .catch(() => {
                        soundItem.playing = false;
                    });
            }

        } catch (error) {
            soundItem.playing = false;
        }
    }

    async playMusic(musicName) {
        if (!this.enabled || !this.userInteracted) return;

        // Ленивая загрузка музыки
        if (!this.sounds[musicName] && this.loadingPromises[musicName]) {
            await this.loadingPromises[musicName]();
            delete this.loadingPromises[musicName];
        }

        const music = this.sounds[musicName];
        if (!music) return;

        this.stopMusic();
        this.currentMusic = music;
        this.currentMusic.currentTime = 0;
        this.currentMusic.volume = this.musicVolume;
        this.currentMusic.loop = true;

        try {
            await this.currentMusic.play();
        } catch (error) {
            console.warn('Failed to play music:', error);
        }
    }

    stopMusic() {
        if (this.currentMusic) {
            this.currentMusic.pause();
            this.currentMusic.currentTime = 0;
            this.currentMusic = null;
        }
    }

    setMusicVolume(volume) {
        this.musicVolume = Math.max(0, Math.min(1, volume));
        if (this.currentMusic) {
            this.currentMusic.volume = this.musicVolume;
        }

        ['menu', 'level'].forEach(key => {
            if (this.sounds[key]) {
                this.sounds[key].volume = this.musicVolume;
            }
        });
    }

    setSfxVolume(volume) {
        this.sfxVolume = Math.max(0, Math.min(1, volume));

        // Обновляем громкость звуковых эффектов
        Object.keys(this.sounds).forEach(key => {
            if (key !== 'menu' && key !== 'level' && this.sounds[key]) {
                this.sounds[key].volume = this.sfxVolume;
            }
        });

        // Обновляем громкость в пулах
        Object.values(this.soundPools).forEach(pool => {
            pool.forEach(item => {
                item.audio.volume = this.sfxVolume;
            });
        });
    }

    setEnabled(enabled) {
        this.enabled = enabled;
        if (!enabled) {
            this.stopMusic();
            this.stopAllSounds();
        }
    }

    stopAllSounds() {
        // Останавливаем основные звуки
        Object.values(this.sounds).forEach(sound => {
            if (sound && !sound.paused) {
                sound.pause();
                sound.currentTime = 0;
            }
        });

        // Останавливаем звуки из пулов
        Object.values(this.soundPools).forEach(pool => {
            pool.forEach(item => {
                if (item.audio && !item.audio.paused) {
                    item.audio.pause();
                    item.audio.currentTime = 0;
                }
                item.playing = false;
            });
        });
    }

    cleanup() {
        this.stopMusic();
        this.stopAllSounds();
        this.lastPlayTime = {};
    }

    // Проверка готовности (для совместимости)
    whenReady() {
        return Promise.resolve();
    }
}

// Global sound manager instance
window.soundManager = new SoundManager();

// Очистка при закрытии страницы
window.addEventListener('beforeunload', () => {
    if (window.soundManager) {
        window.soundManager.cleanup();
    }
});
