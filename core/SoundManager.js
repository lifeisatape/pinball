
// Sound Manager Class
class SoundManager {
    constructor() {
        this.sounds = {};
        this.musicVolume = 0.3;
        this.sfxVolume = 0.5;
        this.currentMusic = null;
        this.enabled = true;
        this.isReady = false;
        this.loadingPromises = [];
        
        this.loadSounds();
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

        // Create loading promises for each sound
        Object.keys(soundFiles).forEach(key => {
            const loadPromise = this.loadSound(key, soundFiles[key]);
            this.loadingPromises.push(loadPromise);
        });

        // Wait for all sounds to load
        Promise.all(this.loadingPromises).then(() => {
            this.isReady = true;
            console.log('All sounds loaded successfully');
        }).catch(error => {
            console.error('Error loading sounds:', error);
            this.isReady = true; // Allow game to continue even if some sounds fail
        });

        // Set music properties
        this.loadingPromises.push(
            Promise.all(this.loadingPromises).then(() => {
                if (this.sounds.menu) {
                    this.sounds.menu.volume = this.musicVolume;
                    this.sounds.menu.loop = true;
                }
                if (this.sounds.level) {
                    this.sounds.level.volume = this.musicVolume;
                    this.sounds.level.loop = true;
                }
            })
        );
    }

    loadSound(key, url) {
        return new Promise((resolve, reject) => {
            const audio = new Audio();
            
            // Set up event listeners before setting src
            audio.addEventListener('canplaythrough', () => {
                this.sounds[key] = audio;
                this.sounds[key].volume = this.sfxVolume;
                resolve();
            }, { once: true });

            audio.addEventListener('error', (e) => {
                console.warn(`Failed to load sound: ${url}`, e);
                // Create a dummy audio object to prevent errors
                this.sounds[key] = {
                    play: () => Promise.resolve(),
                    pause: () => {},
                    currentTime: 0,
                    volume: this.sfxVolume
                };
                resolve(); // Resolve anyway to not block other sounds
            }, { once: true });

            // Configure audio
            audio.preload = 'auto';
            audio.crossOrigin = 'anonymous';
            
            // Set source last to trigger loading
            audio.src = url;
            audio.load();
        });
    }

    // Method to wait for sounds to be ready
    whenReady() {
        return Promise.all(this.loadingPromises);
    }

    playSound(soundName, options = {}) {
        if (!this.enabled || !this.sounds[soundName]) return;

        const sound = this.sounds[soundName];
        
        // Check if sound is ready to play
        if (sound.readyState < 3) {
            console.warn(`Sound ${soundName} not ready yet`);
            return;
        }
        
        // Clone audio for overlapping sounds
        const audioClone = sound.cloneNode();
        audioClone.volume = options.volume !== undefined ? options.volume : sound.volume;
        
        // Play with promise handling
        const playPromise = audioClone.play();
        if (playPromise !== undefined) {
            playPromise.catch(error => {
                console.warn(`Failed to play sound ${soundName}:`, error);
            });
        }

        // Clean up clone after playing
        audioClone.addEventListener('ended', () => {
            audioClone.remove();
        });
    }

    playMusic(musicName) {
        if (!this.enabled || !this.sounds[musicName]) return;

        const music = this.sounds[musicName];
        
        // Check if music is ready
        if (music.readyState < 3) {
            console.warn(`Music ${musicName} not ready yet`);
            // Try again after a short delay
            setTimeout(() => this.playMusic(musicName), 100);
            return;
        }

        // Stop current music if playing
        this.stopMusic();

        this.currentMusic = music;
        this.currentMusic.currentTime = 0;
        
        const playPromise = this.currentMusic.play();
        if (playPromise !== undefined) {
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
        if (this.sounds.menu) this.sounds.menu.volume = this.musicVolume;
        if (this.sounds.level) this.sounds.level.volume = this.musicVolume;
    }

    setSfxVolume(volume) {
        this.sfxVolume = Math.max(0, Math.min(1, volume));
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
        }
    }

    // Method to preload specific sounds for better performance
    preloadSounds(soundNames) {
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

    // Method to play random variation of a sound
    playRandomVariation(baseSoundName, variations = 1) {
        if (variations === 1) {
            this.playSound(baseSoundName);
        } else {
            const randomIndex = Math.floor(Math.random() * variations) + 1;
            this.playSound(`${baseSoundName}${randomIndex}`);
        }
    }

    // Get loading progress (0-1)
    getLoadingProgress() {
        const totalSounds = Object.keys(this.sounds).length;
        const loadedSounds = Object.values(this.sounds).filter(sound => 
            sound && sound.readyState >= 3
        ).length;
        return totalSounds > 0 ? loadedSounds / totalSounds : 0;
    }
}

// Global sound manager instance
window.soundManager = new SoundManager();
