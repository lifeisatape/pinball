class SoundManager {
    constructor() {
        this.audioContext = null;
        this.buffers = new Map();
        this.sounds = new Map();
        this.musicVolume = 0.3;
        this.sfxVolume = 0.5;
        this.enabled = true;
        this.isReady = false;
        this.currentMusic = null;
        this.loadingProgress = 0;
        this.loadingCallback = null;
        this.isLoading = false; // Флаг для предотвращения повторной загрузки

        // Кулдаун только для спиннера
        this.spinnerLastPlayed = 0;
        this.spinnerCooldown = 150; // 150ms кулдаун для спиннера

        // Список звуков для предзагрузки
        this.soundFiles = {
            menu: 'sounds/menu.mp3',
            level: 'sounds/level.mp3',
            flipperIn: 'sounds/Flipper_In.mp3',
            flipperOut: 'sounds/Flipper_Out.mp3',
            bumper: 'sounds/Bamper.mp3',
            spinner: 'sounds/spinner.mp3',
            targetHit: 'sounds/Target_hit.mp3',
            targetIn: 'sounds/Target_in.mp3',
            newGameLaunch: 'sounds/New_game_launch.mp3'
        };

        console.log('SoundManager: Created');
        this.init();
    }

    async init() {
        try {
            // Пытаемся создать AudioContext сразу
            this.tryCreateContext();

            // Добавляем множественные события для активации
            const events = ['click', 'touchstart', 'touchend', 'mousedown', 'keydown'];
            const activateAudio = () => {
                this.unlock();
                // Убираем все события после первого срабатывания
                events.forEach(event => {
                    document.removeEventListener(event, activateAudio);
                });
            };

            events.forEach(event => {
                document.addEventListener(event, activateAudio, { 
                    once: false, 
                    passive: true, 
                    capture: true 
                });
            });

        } catch (error) {
            console.warn('SoundManager: Initialization failed:', error);
        }
    }

    tryCreateContext() {
        try {
            if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                console.log('SoundManager: AudioContext created, state:', this.audioContext.state);

                // Если контекст уже running, загружаем звуки сразу
                if (this.audioContext.state === 'running') {
                    this.preloadAllSounds();
                }
            }
        } catch (error) {
            console.warn('SoundManager: Failed to create AudioContext:', error);
        }
    }

    async unlock() {
        // Предотвращаем повторные вызовы
        if (this.isReady || this.isLoading) {
            console.log('SoundManager: Already ready or loading, skipping unlock');
            return;
        }

        console.log('SoundManager: Unlock triggered');
        this.isLoading = true;

        try {
            // Уведомляем о начале инициализации аудио
            if (this.loadingCallback) {
                this.loadingCallback('audio', 0, 'Initializing audio context...');
            }

            // Создаем контекст если его нет
            if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                console.log('SoundManager: AudioContext created in unlock, state:', this.audioContext.state);
            }

            // Резюмируем контекст если нужно
            if (this.audioContext.state === 'suspended') {
                console.log('SoundManager: Resuming suspended AudioContext...');
                if (this.loadingCallback) {
                    this.loadingCallback('audio', 50, 'Resuming audio context...');
                }
                await this.audioContext.resume();
                console.log('SoundManager: AudioContext resumed, state:', this.audioContext.state);
            }

            // Загружаем звуки если контекст готов
            if (this.audioContext.state === 'running') {
                console.log('SoundManager: AudioContext running, loading sounds...');
                
                if (this.loadingCallback) {
                    this.loadingCallback('audio', 100, 'Audio context ready');
                }

                await this.preloadAllSounds();

                this.isReady = true;
                console.log('SoundManager: Ready!');

                // Диспатчим событие готовности
                window.dispatchEvent(new CustomEvent('soundManagerReady'));
            } else {
                console.warn('SoundManager: AudioContext not running, state:', this.audioContext.state);
            }

        } catch (error) {
            console.error('SoundManager: Failed to unlock audio:', error);
            if (this.loadingCallback) {
                this.loadingCallback('audio', 0, 'Failed to initialize audio');
            }
        } finally {
            this.isLoading = false;
        }
    }

    

    async preloadAllSounds() {
        // Проверяем, не загружены ли уже звуки
        if (this.buffers.size > 0) {
            console.log('SoundManager: Sounds already loaded, skipping preload');
            if (this.loadingCallback) {
                this.loadingCallback('sounds', 100, 'Sounds already loaded');
            }
            return;
        }

        console.log('SoundManager: Preloading sounds...');

        const soundEntries = Object.entries(this.soundFiles);
        const totalSounds = soundEntries.length;
        let loadedSounds = 0;

        for (const [name, url] of soundEntries) {
            try {
                const buffer = await this.loadSound(url);
                this.buffers.set(name, buffer);
                loadedSounds++;
                
                this.loadingProgress = Math.round((loadedSounds / totalSounds) * 100);
                
                // Уведомляем о прогрессе
                if (this.loadingCallback) {
                    this.loadingCallback('sounds', this.loadingProgress, `Loading ${name}...`);
                }
                
                console.log(`SoundManager: Loaded ${name} (${loadedSounds}/${totalSounds})`);
            } catch (error) {
                console.warn(`SoundManager: Failed to load ${name}:`, error);
                loadedSounds++;
                this.loadingProgress = Math.round((loadedSounds / totalSounds) * 100);
                
                if (this.loadingCallback) {
                    this.loadingCallback('sounds', this.loadingProgress, `Failed to load ${name}`);
                }
            }
        }

        console.log('SoundManager: All sounds preloaded');
    }

    setLoadingCallback(callback) {
        this.loadingCallback = callback;
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
                return null; // Спиннер на кулдауне
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
                          (['menu', 'level'].includes(name) ? this.musicVolume : this.sfxVolume);
            gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);

            // Настраиваем зацикливание
            source.loop = options.loop || ['menu', 'level'].includes(name);

            // Запускаем воспроизведение
            source.start(0);

            // Сохраняем ссылку для музыки
            if (['menu', 'level'].includes(name)) {
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

    // Простая проверка готовности
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