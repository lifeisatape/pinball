class SoundManager {
    constructor() {
        this.sounds = {};
        this.musicVolume = 0.3;
        this.sfxVolume = 0.5;
        this.currentMusic = null;
        this.enabled = true;
        this.userInteracted = false;
        this.lastPlayTime = {};

        // Простой дебаунс для мобильных устройств
        this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        this.debounceTime = this.isMobile ? 100 : 50;

        this.setupUserInteraction();
        this.loadSounds();
    }

    setupUserInteraction() {
        const enableAudio = () => {
            this.userInteracted = true;
            document.removeEventListener('touchstart', enableAudio);
            document.removeEventListener('click', enableAudio);
        };

        document.addEventListener('touchstart', enableAudio, { once: true });
        document.addEventListener('click', enableAudio, { once: true });
    }

    loadSounds() {
        const soundFiles = {
            menu: 'sounds/menu.mp3',
            flipperIn: 'sounds/Flipper_In.mp3',
            flipperOut: 'sounds/Flipper_Out.mp3',
            level: 'sounds/level.mp3',
            bumper: 'sounds/Bamper.mp3',
            spinner: 'sounds/spinner.mp3',
            targetHit: 'sounds/Target_hit.mp3',
            targetIn: 'sounds/Target_in.mp3',
            wallHit: 'sounds/wallhit.mp3',
            newGameLaunch: 'sounds/New_game_launch.mp3'
        };

        Object.keys(soundFiles).forEach(key => {
            this.loadSound(key, soundFiles[key]);
        });
    }

    loadSound(key, url) {
        const audio = new Audio();
        audio.preload = this.isMobile ? 'none' : 'metadata';
        audio.crossOrigin = 'anonymous';
        audio.src = url;

        // Устанавливаем громкость сразу
        audio.volume = ['menu', 'level'].includes(key) ? this.musicVolume : this.sfxVolume;

        audio.addEventListener('error', () => {
            console.warn(`Failed to load sound: ${url}`);
        });

        this.sounds[key] = audio;
    }

    playSound(soundName, options = {}) {
        if (!this.enabled || !this.userInteracted || !this.sounds[soundName]) return;

        const sound = this.sounds[soundName];

        // Простой дебаунс
        const now = Date.now();
        if (this.lastPlayTime[soundName] && now - this.lastPlayTime[soundName] < this.debounceTime) {
            return;
        }
        this.lastPlayTime[soundName] = now;

        // Прерываем текущее воспроизведение и начинаем заново
        sound.currentTime = 0;

        if (options.volume !== undefined) {
            sound.volume = options.volume;
        }

        // Простое воспроизведение без Promise обработки
        sound.play().catch(() => {
            // Игнорируем ошибки воспроизведения
        });
    }

    playMusic(musicName) {
        if (!this.enabled || !this.userInteracted || !this.sounds[musicName]) return;

        const music = this.sounds[musicName];

        this.stopMusic();
        this.currentMusic = music;
        this.currentMusic.currentTime = 0;
        this.currentMusic.volume = this.musicVolume;
        this.currentMusic.loop = true;

        this.currentMusic.play().catch(() => {
            // Игнорируем ошибки воспроизведения
        });
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

        // Обновляем громкость музыкальных звуков
        ['menu', 'level'].forEach(key => {
            if (this.sounds[key]) {
                this.sounds[key].volume = this.musicVolume;
            }
        });
    }

    setSfxVolume(volume) {
        this.sfxVolume = Math.max(0, Math.min(1, volume));

        // Обновляем громкость всех звуковых эффектов
        Object.keys(this.sounds).forEach(key => {
            if (key !== 'menu' && key !== 'level' && this.sounds[key]) {
                this.sounds[key].volume = this.sfxVolume;
            }
        });
    }

    setEnabled(enabled) {
        this.enabled = enabled;
        if (!enabled) {
            this.stopMusic();
            // Останавливаем все звуки
            Object.values(this.sounds).forEach(sound => {
                if (sound && !sound.paused) {
                    sound.pause();
                    sound.currentTime = 0;
                }
            });
        }
    }

    // Простая проверка готовности
    whenReady() {
        return Promise.resolve();
    }

    // Очистка ресурсов
    cleanup() {
        this.stopMusic();
        Object.values(this.sounds).forEach(sound => {
            if (sound && !sound.paused) {
                sound.pause();
                sound.currentTime = 0;
            }
        });
        this.lastPlayTime = {};
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