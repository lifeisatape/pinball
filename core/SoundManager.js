
// Sound Manager Class
class SoundManager {
    constructor() {
        this.sounds = {};
        this.musicVolume = 0.3;
        this.sfxVolume = 0.5;
        this.currentMusic = null;
        this.enabled = true;
        
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

        Object.keys(soundFiles).forEach(key => {
            this.sounds[key] = new Audio(soundFiles[key]);
            this.sounds[key].volume = this.sfxVolume;
            
            // Preload audio
            this.sounds[key].preload = 'auto';
            
            // Handle loading errors
            this.sounds[key].onerror = () => {
                console.warn(`Failed to load sound: ${soundFiles[key]}`);
            };
        });

        // Set music volume for background tracks
        this.sounds.menu.volume = this.musicVolume;
        this.sounds.level.volume = this.musicVolume;
        this.sounds.menu.loop = true;
        this.sounds.level.loop = true;
    }

    playSound(soundName, options = {}) {
        if (!this.enabled || !this.sounds[soundName]) return;

        const sound = this.sounds[soundName];
        
        // Reset sound to beginning
        sound.currentTime = 0;
        
        // Apply volume override if specified
        if (options.volume !== undefined) {
            sound.volume = options.volume;
        }
        
        // Play with promise handling for better browser compatibility
        const playPromise = sound.play();
        if (playPromise !== undefined) {
            playPromise.catch(error => {
                console.warn(`Failed to play sound ${soundName}:`, error);
            });
        }
    }

    playMusic(musicName) {
        if (!this.enabled || !this.sounds[musicName]) return;

        // Stop current music if playing
        this.stopMusic();

        this.currentMusic = this.sounds[musicName];
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
        this.sounds.menu.volume = this.musicVolume;
        this.sounds.level.volume = this.musicVolume;
    }

    setSfxVolume(volume) {
        this.sfxVolume = Math.max(0, Math.min(1, volume));
        Object.keys(this.sounds).forEach(key => {
            if (key !== 'menu' && key !== 'level') {
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

    // Method to play random variation of a sound (useful for repeated sounds)
    playRandomVariation(baseSoundName, variations = 1) {
        if (variations === 1) {
            this.playSound(baseSoundName);
        } else {
            const randomIndex = Math.floor(Math.random() * variations) + 1;
            this.playSound(`${baseSoundName}${randomIndex}`);
        }
    }
}

// Global sound manager instance
window.soundManager = new SoundManager();
