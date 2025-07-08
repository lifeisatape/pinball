
// Sound Manager Class - Optimized for Mobile
class SoundManager {
    constructor() {
        this.sounds = {};
        this.soundPools = {};
        this.musicVolume = 0.3;
        this.sfxVolume = 0.5;
        this.currentMusic = null;
        this.enabled = true;
        this.isReady = false;
        this.loadingPromises = [];
        this.maxPoolSize = 3; // Максимум 3 экземпляра каждого звука
        this.maxConcurrentSounds = 8; // Максимум 8 звуков одновременно
        this.activeSounds = [];
        this.userInteracted = false;
        
        this.setupMobileOptimizations();
        this.loadSounds();
    }

    setupMobileOptimizations() {
        // Детект мобильного устройства
        this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        if (this.isMobile) {
            this.maxPoolSize = 2; // Меньше пула на мобиле
            this.maxConcurrentSounds = 4; // Меньше одновременных звуков
            this.sfxVolume = 0.3; // Тише на мобиле
        }

        // Слушаем первое взаимодействие пользователя
        const enableAudio = () => {
            this.userInteracted = true;
            this.unlockAudioContext();
            document.removeEventListener('touchstart', enableAudio);
            document.removeEventListener('click', enableAudio);
        };
        
        document.addEventListener('touchstart', enableAudio, { once: true });
        document.addEventListener('click', enableAudio, { once: true });
    }

    unlockAudioContext() {
        // Создаем и воспроизводим тихий звук для разблокировки аудио контекста
        const silentAudio = new Audio();
        silentAudio.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQQAAAAAAA==';
        silentAudio.volume = 0;
        silentAudio.play().catch(() => {});
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

        // Приоритетная загрузка важных звуков
        const prioritySounds = ['flipperIn', 'flipperOut', 'bumper'];
        const normalSounds = Object.keys(soundFiles).filter(key => !prioritySounds.includes(key));

        // Загружаем приоритетные звуки сначала
        prioritySounds.forEach(key => {
            if (soundFiles[key]) {
                const loadPromise = this.loadSound(key, soundFiles[key], true);
                this.loadingPromises.push(loadPromise);
            }
        });

        // Загружаем остальные звуки с задержкой
        setTimeout(() => {
            normalSounds.forEach(key => {
                if (soundFiles[key]) {
                    const loadPromise = this.loadSound(key, soundFiles[key], false);
                    this.loadingPromises.push(loadPromise);
                }
            });
        }, 100);

        // Ждем загрузки приоритетных звуков
        Promise.all(this.loadingPromises.slice(0, prioritySounds.length)).then(() => {
            this.isReady = true;
            console.log('Priority sounds loaded');
        });

        // Ждем все звуки
        Promise.all(this.loadingPromises).then(() => {
            console.log('All sounds loaded successfully');
        }).catch(error => {
            console.error('Error loading sounds:', error);
            this.isReady = true;
        });
    }

    loadSound(key, url, isPriority = false) {
        return new Promise((resolve) => {
            const audio = new Audio();
            
            audio.addEventListener('canplaythrough', () => {
                this.sounds[key] = audio;
                this.createSoundPool(key, isPriority);
                resolve();
            }, { once: true });

            audio.addEventListener('error', (e) => {
                console.warn(`Failed to load sound: ${url}`, e);
                this.sounds[key] = this.createDummyAudio();
                this.soundPools[key] = [this.sounds[key]];
                resolve();
            }, { once: true });

            // Оптимизация для мобильных устройств
            if (this.isMobile) {
                audio.preload = 'metadata'; // Только метаданные на мобиле
            } else {
                audio.preload = 'auto';
            }
            
            audio.crossOrigin = 'anonymous';
            audio.src = url;
            audio.load();
        });
    }

    createSoundPool(soundName, isPriority = false) {
        const poolSize = isPriority ? this.maxPoolSize : Math.max(1, Math.floor(this.maxPoolSize / 2));
        this.soundPools[soundName] = [];

        for (let i = 0; i < poolSize; i++) {
            const audioClone = this.sounds[soundName].cloneNode();
            audioClone.volume = ['menu', 'level'].includes(soundName) ? this.musicVolume : this.sfxVolume;
            this.soundPools[soundName].push(audioClone);
        }
    }

    createDummyAudio() {
        return {
            play: () => Promise.resolve(),
            pause: () => {},
            currentTime: 0,
            volume: 0,
            readyState: 4
        };
    }

    whenReady() {
        return Promise.all(this.loadingPromises);
    }

    playSound(soundName, options = {}) {
        if (!this.enabled || !this.userInteracted || !this.soundPools[soundName]) return;

        // Ограничиваем количество одновременных звуков
        if (this.activeSounds.length >= this.maxConcurrentSounds) {
            this.stopOldestSound();
        }

        // Получаем свободный аудио объект из пула
        const audioPool = this.soundPools[soundName];
        let availableAudio = audioPool.find(audio => audio.paused || audio.ended);
        
        if (!availableAudio) {
            // Если нет свободных, используем первый из пула
            availableAudio = audioPool[0];
            availableAudio.currentTime = 0;
        }

        availableAudio.volume = options.volume !== undefined ? options.volume : availableAudio.volume;

        const playPromise = availableAudio.play();
        if (playPromise) {
            playPromise.catch(error => {
                console.warn(`Failed to play sound ${soundName}:`, error);
            });
        }

        // Добавляем в список активных звуков
        this.activeSounds.push({
            audio: availableAudio,
            startTime: Date.now(),
            name: soundName
        });

        // Убираем из активных когда закончится
        availableAudio.addEventListener('ended', () => {
            this.removeFromActiveSounds(availableAudio);
        }, { once: true });

        // Автоматически убираем длинные звуки
        setTimeout(() => {
            this.removeFromActiveSounds(availableAudio);
        }, 5000);
    }

    stopOldestSound() {
        if (this.activeSounds.length === 0) return;
        
        // Находим самый старый звук (не музыку)
        const oldestSound = this.activeSounds
            .filter(sound => sound.name !== 'menu' && sound.name !== 'level')
            .sort((a, b) => a.startTime - b.startTime)[0];
            
        if (oldestSound) {
            oldestSound.audio.pause();
            oldestSound.audio.currentTime = 0;
            this.removeFromActiveSounds(oldestSound.audio);
        }
    }

    removeFromActiveSounds(audio) {
        this.activeSounds = this.activeSounds.filter(sound => sound.audio !== audio);
    }

    playMusic(musicName) {
        if (!this.enabled || !this.userInteracted || !this.sounds[musicName]) return;

        const music = this.sounds[musicName];
        
        if (music.readyState < 3) {
            setTimeout(() => this.playMusic(musicName), 200);
            return;
        }

        this.stopMusic();
        this.currentMusic = music;
        this.currentMusic.currentTime = 0;
        this.currentMusic.volume = this.musicVolume;
        this.currentMusic.loop = true;
        
        const playPromise = this.currentMusic.play();
        if (playPromise) {
            playPromise.catch(error => {
                console.warn(`Failed to play music ${musicName}:`, error);
            });
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
    }

    setSfxVolume(volume) {
        this.sfxVolume = Math.max(0, Math.min(1, volume));
        Object.keys(this.soundPools).forEach(key => {
            if (key !== 'menu' && key !== 'level') {
                this.soundPools[key].forEach(audio => {
                    audio.volume = this.sfxVolume;
                });
            }
        });
    }

    setEnabled(enabled) {
        this.enabled = enabled;
        if (!enabled) {
            this.stopMusic();
            this.activeSounds.forEach(sound => {
                sound.audio.pause();
                sound.audio.currentTime = 0;
            });
            this.activeSounds = [];
        }
    }

    preloadSounds(soundNames) {
        if (!this.userInteracted) return Promise.resolve();
        
        const promises = soundNames.map(name => {
            if (this.sounds[name] && this.sounds[name].readyState < 3) {
                return new Promise(resolve => {
                    this.sounds[name].addEventListener('canplaythrough', resolve, { once: true });
                });
            }
            return Promise.resolve();
        });
        return Promise.all(promises);
    }

    getLoadingProgress() {
        const totalSounds = Object.keys(this.sounds).length;
        const loadedSounds = Object.values(this.sounds).filter(sound => 
            sound && sound.readyState >= 3
        ).length;
        return totalSounds > 0 ? loadedSounds / totalSounds : 0;
    }

    // Очистка ресурсов для мобильных устройств
    cleanup() {
        this.stopMusic();
        this.activeSounds.forEach(sound => {
            sound.audio.pause();
            sound.audio.currentTime = 0;
        });
        this.activeSounds = [];
    }
}

// Global sound manager instance
window.soundManager = new SoundManager();

// Очистка при закрытии страницы на мобиле
window.addEventListener('beforeunload', () => {
    if (window.soundManager) {
        window.soundManager.cleanup();
    }
});
