
class SoundManager {
    constructor() {
        this.sounds = {};
        this.soundPools = {};
        this.musicVolume = 0.3;
        this.sfxVolume = 0.5;
        this.currentMusic = null;
        this.enabled = true;
        this.userInteracted = false;
        this.isLoading = false;
        this.isLoaded = false;
        this.loadingPromise = null;

        // Мобильная оптимизация
        this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        this.poolSize = this.isMobile ? 2 : 3;

        // Очередь звуков для воспроизведения после взаимодействия
        this.pendingSounds = [];
        this.pendingMusic = null;

        this.setupUserInteraction();
    }

    setupUserInteraction() {
        const enableAudio = async () => {
            if (this.userInteracted) return;
            
            this.userInteracted = true;
            console.log('User interaction detected, enabling audio...');
            
            // Загружаем звуки если еще не загружены
            if (!this.isLoaded && !this.isLoading) {
                await this.loadAllSounds();
            }

            // Создаем тестовый аудио элемент для разблокировки аудио контекста
            try {
                const testAudio = new Audio();
                testAudio.volume = 0;
                testAudio.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';
                await testAudio.play();
                testAudio.pause();
            } catch (e) {
                console.warn('Failed to unlock audio context:', e);
            }

            // Воспроизводим отложенную музыку
            if (this.pendingMusic) {
                this.playMusic(this.pendingMusic);
                this.pendingMusic = null;
            }

            // Очищаем очередь звуков
            this.pendingSounds = [];

            document.removeEventListener('touchstart', enableAudio);
            document.removeEventListener('touchend', enableAudio);
            document.removeEventListener('click', enableAudio);
            document.removeEventListener('keydown', enableAudio);
        };

        // Добавляем несколько обработчиков для надежности
        document.addEventListener('touchstart', enableAudio, { once: true, passive: true });
        document.addEventListener('touchend', enableAudio, { once: true, passive: true });
        document.addEventListener('click', enableAudio, { once: true });
        document.addEventListener('keydown', enableAudio, { once: true });

        // Автоматическая загрузка звуков (но не воспроизведение)
        setTimeout(() => {
            if (!this.isLoading && !this.isLoaded) {
                this.loadAllSounds();
            }
        }, 100);
    }

    async loadAllSounds() {
        if (this.isLoading || this.isLoaded) return this.loadingPromise;
        
        this.isLoading = true;
        console.log('Starting sound loading...');

        const soundFiles = {
            menu: { url: 'sounds/menu.mp3', type: 'music' },
            level: { url: 'sounds/level.mp3', type: 'music' },
            flipperIn: { url: 'sounds/Flipper_In.mp3', type: 'sfx', pool: true },
            flipperOut: { url: 'sounds/Flipper_Out.mp3', type: 'sfx', pool: true },
            wallHit: { url: 'sounds/wallhit.mp3', type: 'sfx', pool: true },
            bumper: { url: 'sounds/Bamper.mp3', type: 'sfx', pool: true },
            spinner: { url: 'sounds/spinner.mp3', type: 'sfx', pool: true },
            targetHit: { url: 'sounds/Target_hit.mp3', type: 'sfx', pool: true },
            targetIn: { url: 'sounds/Target_in.mp3', type: 'sfx', pool: false },
            newGameLaunch: { url: 'sounds/New_game_launch.mp3', type: 'sfx', pool: false }
        };

        this.loadingPromise = this.loadSoundsSequentially(soundFiles);
        
        try {
            await this.loadingPromise;
            this.isLoading = false;
            this.isLoaded = true;
            console.log('All sounds loaded successfully');
        } catch (error) {
            this.isLoading = false;
            console.warn('Sound loading failed:', error);
        }
        
        return this.loadingPromise;
    }

    async loadSoundsSequentially(soundFiles) {
        const loadPromises = [];

        for (const [key, config] of Object.entries(soundFiles)) {
            loadPromises.push(this.loadSingleSound(key, config));
        }

        await Promise.all(loadPromises);
    }

    loadSingleSound(key, config) {
        return new Promise((resolve) => {
            const audio = new Audio();
            audio.crossOrigin = 'anonymous';
            audio.preload = 'auto';
            audio.muted = false;
            
            // Устанавливаем громкость
            audio.volume = config.type === 'music' ? this.musicVolume : this.sfxVolume;

            const onLoad = () => {
                this.sounds[key] = audio;
                
                // Создаем пул если нужно
                if (config.pool) {
                    this.createSoundPool(key, config.url, config);
                }
                
                console.log(`Loaded sound: ${key}`);
                resolve();
            };

            const onError = () => {
                console.warn(`Failed to load sound: ${config.url}`);
                resolve(); // Продолжаем даже при ошибке
            };

            audio.addEventListener('canplaythrough', onLoad, { once: true });
            audio.addEventListener('error', onError, { once: true });
            
            // На мобильных устройствах может потребоваться задержка
            if (this.isMobile) {
                setTimeout(() => {
                    audio.src = config.url;
                }, 50);
            } else {
                audio.src = config.url;
            }
        });
    }

    createSoundPool(key, url, config) {
        this.soundPools[key] = [];
        
        for (let i = 0; i < this.poolSize; i++) {
            const audio = new Audio();
            audio.crossOrigin = 'anonymous';
            audio.preload = 'auto';
            audio.volume = this.sfxVolume;
            audio.muted = false;
            
            // Задержка для мобильных устройств
            if (this.isMobile) {
                setTimeout(() => {
                    audio.src = url;
                }, 100 + i * 50);
            } else {
                audio.src = url;
            }
            
            this.soundPools[key].push({
                audio: audio,
                playing: false,
                lastUsed: 0
            });
        }
    }

    getAvailableSound(soundName) {
        // Проверяем пул звуков
        if (this.soundPools[soundName]) {
            // Находим свободный звук
            let availableSound = this.soundPools[soundName].find(item => !item.playing);
            
            if (!availableSound) {
                // Если все заняты, берем самый старый
                availableSound = this.soundPools[soundName].reduce((oldest, current) => 
                    current.lastUsed < oldest.lastUsed ? current : oldest
                );
            }
            
            return availableSound;
        }

        // Используем основной звук
        return { 
            audio: this.sounds[soundName], 
            playing: false,
            lastUsed: 0
        };
    }

    async playSound(soundName, options = {}) {
        if (!this.enabled) return;

        // Если пользователь еще не взаимодействовал, сохраняем в очередь
        if (!this.userInteracted) {
            this.pendingSounds.push({ soundName, options });
            return;
        }

        // Ждем загрузки звуков
        if (!this.isLoaded) {
            try {
                await this.loadAllSounds();
            } catch (error) {
                console.warn('Failed to load sounds:', error);
                return;
            }
        }

        const soundItem = this.getAvailableSound(soundName);
        if (!soundItem || !soundItem.audio) {
            console.warn(`Sound not found: ${soundName}`);
            return;
        }

        const audio = soundItem.audio;

        try {
            // Проверяем готовность к воспроизведению
            if (audio.readyState < 2) {
                console.warn(`Sound not ready: ${soundName}`);
                return;
            }

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
            soundItem.lastUsed = Date.now();

            // Воспроизводим
            const playPromise = audio.play();
            
            if (playPromise) {
                playPromise
                    .then(() => {
                        // Сбрасываем флаг по окончании
                        const onEnded = () => {
                            soundItem.playing = false;
                            audio.removeEventListener('ended', onEnded);
                        };
                        audio.addEventListener('ended', onEnded);
                    })
                    .catch((error) => {
                        soundItem.playing = false;
                        console.warn(`Error playing sound ${soundName}:`, error.message || error);
                    });
            }

        } catch (error) {
            soundItem.playing = false;
            console.warn(`Error playing sound ${soundName}:`, error.message || error);
        }
    }

    async playMusic(musicName) {
        if (!this.enabled) return;

        // Если пользователь еще не взаимодействовал, сохраняем отложенную музыку
        if (!this.userInteracted) {
            this.pendingMusic = musicName;
            return;
        }

        // Ждем загрузки звуков
        if (!this.isLoaded) {
            try {
                await this.loadAllSounds();
            } catch (error) {
                console.warn('Failed to load sounds:', error);
                return;
            }
        }

        const music = this.sounds[musicName];
        if (!music) {
            console.warn(`Music not found: ${musicName}`);
            return;
        }

        // Проверяем готовность к воспроизведению
        if (music.readyState < 2) {
            console.warn(`Music not ready: ${musicName}`);
            return;
        }

        this.stopMusic();
        this.currentMusic = music;
        this.currentMusic.currentTime = 0;
        this.currentMusic.volume = this.musicVolume;
        this.currentMusic.loop = true;

        try {
            await this.currentMusic.play();
        } catch (error) {
            console.warn('Failed to play music:', error.message || error);
            this.currentMusic = null;
        }
    }

    stopMusic() {
        if (this.currentMusic) {
            try {
                this.currentMusic.pause();
                this.currentMusic.currentTime = 0;
            } catch (error) {
                console.warn('Error stopping music:', error);
            }
            this.currentMusic = null;
        }
    }

    setMusicVolume(volume) {
        this.musicVolume = Math.max(0, Math.min(1, volume));
        if (this.currentMusic) {
            this.currentMusic.volume = this.musicVolume;
        }

        // Обновляем громкость музыкальных треков
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
                try {
                    sound.pause();
                    sound.currentTime = 0;
                } catch (error) {
                    console.warn('Error stopping sound:', error);
                }
            }
        });

        // Останавливаем звуки из пулов
        Object.values(this.soundPools).forEach(pool => {
            pool.forEach(item => {
                if (item.audio && !item.audio.paused) {
                    try {
                        item.audio.pause();
                        item.audio.currentTime = 0;
                    } catch (error) {
                        console.warn('Error stopping pooled sound:', error);
                    }
                }
                item.playing = false;
            });
        });
    }

    cleanup() {
        this.stopMusic();
        this.stopAllSounds();
    }

    // Проверка готовности звуков
    whenReady() {
        if (this.isLoaded) {
            return Promise.resolve();
        }
        return this.loadAllSounds();
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
