class SoundManager {
    constructor() {
        this.audioContext = null;
        this.buffers = new Map();
        this.sounds = new Map();
        this.musicVolume = 0.7;
        this.sfxVolume = 0.3;
        this.enabled = true;
        this.isReady = false;
        this.currentMusic = null;

        // Кулдаун только для спиннера
        this.spinnerLastPlayed = 0;
        this.spinnerCooldown = 150; // 150ms кулдаун для спиннера

        // Список звуков для предзагрузки
        this.soundFiles = {
            menu: 'sounds/menu.mp3',
            level: 'sounds/level.mp3',
            hunt: 'sounds/hunt.mp3',
            flipperIn: 'sounds/Flipper_In.mp3',
            flipperOut: 'sounds/Flipper_Out.mp3',
            bumper: 'sounds/Bamper.mp3',
            spinner: 'sounds/spinner.mp3',
            targetHit: 'sounds/Target_hit.mp3',
            targetIn: 'sounds/Target_in.mp3',
            newGameLaunch: 'sounds/New_game_launch.mp3',
            wallhit: 'sounds/wallhit.mp3'
        };

        console.log('SoundManager: Created');
        this.init();
    }

    async init() {
        try {
            // Создаем AudioContext
            this.tryCreateContext();

            // ✅ НЕ ждем активации - будет активирован через пользовательское взаимодействие
        } catch (error) {
            console.warn('SoundManager: Initialization failed:', error);
        }
    }

    tryCreateContext() {
        try {
            if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                console.log('SoundManager: AudioContext created, state:', this.audioContext.state);

                // Если контекст уже running, начинаем загрузку
                if (this.audioContext.state === 'running') {
                    this.preloadAllSounds();
                }
            }
        } catch (error) {
            console.warn('SoundManager: Failed to create AudioContext:', error);
        }
    }

    // ✅ Упрощенная активация
    async unlock() {
        console.log('SoundManager: Starting unlock process...');

        try {
            // Создаем контекст если его нет
            if (!this.audioContext) {
                this.tryCreateContext();
            }

            // Активируем контекст
            if (this.audioContext.state === 'suspended') {
                console.log('SoundManager: Resuming suspended AudioContext...');
                await this.audioContext.resume();
                console.log('SoundManager: AudioContext resumed, state:', this.audioContext.state);
            }

            // Начинаем загрузку звуков если контекст готов
            if (this.audioContext.state === 'running') {
                console.log('SoundManager: AudioContext running, loading sounds...');

                // ✅ НЕ блокируем - загружаем в фоне
                if (!this.isReady && this.buffers.size === 0) {
                    this.preloadAllSounds();
                }
            }

        } catch (error) {
            console.error('SoundManager: Failed to unlock audio:', error);
            // ✅ НЕ блокируем игру - просто отключаем звук
            this.enabled = false;
        }
    }

    // ✅ Простая загрузка звуков (БЕЗ колбэков загрузки)
    async preloadAllSounds() {
        // Проверяем, не загружены ли уже звуки
        if (this.buffers.size > 0) {
            console.log('SoundManager: Sounds already loaded');
            return;
        }

        console.log('SoundManager: Preloading sounds...');

        const soundEntries = Object.entries(this.soundFiles);
        let loadedSounds = 0;

        // Загружаем все звуки параллельно
        const loadPromises = soundEntries.map(async ([name, url]) => {
            try {
                const buffer = await this.loadSound(url);
                this.buffers.set(name, buffer);
                loadedSounds++;
                console.log(`SoundManager: Loaded ${name} (${loadedSounds}/${soundEntries.length})`);
                return true;
            } catch (error) {
                console.warn(`SoundManager: Failed to load ${name}:`, error);
                return false;
            }
        });

        // Ждем загрузки всех звуков (или их неудачи)
        await Promise.allSettled(loadPromises);

        console.log('SoundManager: Sound loading complete');
        this.isReady = true;

        // Уведомляем систему о готовности
        window.dispatchEvent(new CustomEvent('soundManagerReady'));
    }

    async loadSound(url) {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
        return audioBuffer;
    }

    playSound(name, options = {}) {
        if (!this.enabled || !this.isReady || !this.audioContext) {
            return null;
        }

        // Проверяем кулдаун только для спиннера
        if (name === 'spinner') {
            const now = Date.now();
            if (now - this.spinnerLastPlayed < this.spinnerCooldown) {
                return null;
            }
            this.spinnerLastPlayed = now;
        }

        const buffer = this.buffers.get(name);
        if (!buffer) {
            console.warn(`SoundManager: Sound ${name} not found`);
            return null;
        }

        try {
            // Создаем источник звука
            const source = this.audioContext.createBufferSource();
            const gainNode = this.audioContext.createGain();

            source.buffer = buffer;
            source.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            // Настраиваем громкость
            const volume = options.volume !== undefined ? options.volume : 
                          (['menu', 'level', 'hunt'].includes(name) ? this.musicVolume : this.sfxVolume);
            gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);

            // Настраиваем зацикливание
            source.loop = options.loop || ['menu', 'level', 'hunt'].includes(name);

            // Запускаем воспроизведение
            source.start(0);

            // Сохраняем ссылку для музыки
            if (['menu', 'level', 'hunt'].includes(name)) {
                this.stopMusic(); // Останавливаем предыдущую музыку
                this.currentMusic = { source, gainNode };
            }

            return { source, gainNode };

        } catch (error) {
            console.warn(`SoundManager: Error playing ${name}:`, error);
            return null;
        }
    }

    playMusic(name) {
        return this.playSound(name, { loop: true });
    }

    stopMusic() {
        if (this.currentMusic) {
            try {
                this.currentMusic.source.stop();
            } catch (error) {
                // Игнорируем ошибки остановки
            }
            this.currentMusic = null;
        }
    }

    setMusicVolume(volume) {
        this.musicVolume = Math.max(0, Math.min(1, volume));

        // Обновляем текущую музыку
        if (this.currentMusic) {
            this.currentMusic.gainNode.gain.setValueAtTime(
                this.musicVolume, 
                this.audioContext.currentTime
            );
        }
    }

    setSfxVolume(volume) {
        this.sfxVolume = Math.max(0, Math.min(1, volume));
    }

    setEnabled(enabled) {
        this.enabled = enabled;
        if (!enabled) {
            this.stopMusic();
        }
    }

    getStatus() {
        return {
            isReady: this.isReady,
            enabled: this.enabled,
            contextState: this.audioContext?.state || 'none',
            buffersLoaded: this.buffers.size,
            totalSounds: Object.keys(this.soundFiles).length
        };
    }

    destroy() {
        this.stopMusic();

        if (this.audioContext) {
            this.audioContext.close();
        }

        this.buffers.clear();
        this.sounds.clear();
    }
}

// Создаем глобальный экземпляр
if (!window.soundManager) {
    window.soundManager = new SoundManager();
}