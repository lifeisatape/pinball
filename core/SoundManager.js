
class SoundManager {
    constructor() {
        this.audioContext = null;
        this.sounds = {};
        this.musicVolume = 0.3;
        this.sfxVolume = 0.5;
        this.currentMusic = null;
        this.enabled = true;
        this.userInteracted = false;
        this.loadingPromises = new Map();
        
        // Priority sounds that should load first
        this.prioritySounds = ['flipperIn', 'flipperOut', 'wallHit'];
        
        this.initializeAudioContext();
        this.setupEventListeners();
        this.loadPrioritySounds();
    }

    initializeAudioContext() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            console.log('AudioContext initialized');
        } catch (error) {
            console.warn('AudioContext not supported, falling back to HTML5 Audio');
            this.audioContext = null;
        }
    }

    setupEventListeners() {
        const enableAudioOnInteraction = () => {
            if (!this.userInteracted) {
                this.userInteracted = true;
                console.log('User interaction detected, enabling audio...');
                
                if (this.audioContext && this.audioContext.state === 'suspended') {
                    this.audioContext.resume();
                }
                
                this.loadAllSounds();
            }
        };

        // Listen for various user interaction events
        ['click', 'touchstart', 'keydown'].forEach(event => {
            document.addEventListener(event, enableAudioOnInteraction, { once: true });
        });
    }

    async loadPrioritySounds() {
        const prioritySoundFiles = {
            flipperIn: 'sounds/Flipper_In.mp3',
            flipperOut: 'sounds/Flipper_Out.mp3',
            wallHit: 'sounds/wallhit.mp3'
        };

        console.log('Starting sound loading...');
        
        for (const [key, path] of Object.entries(prioritySoundFiles)) {
            await this.loadSound(key, path);
        }
        
        console.log('Priority sounds loaded');
    }

    async loadAllSounds() {
        const allSoundFiles = {
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

        // Load remaining sounds that aren't already loaded
        const loadPromises = [];
        for (const [key, path] of Object.entries(allSoundFiles)) {
            if (!this.sounds[key]) {
                loadPromises.push(this.loadSound(key, path));
            }
        }

        await Promise.all(loadPromises);
        console.log('All sounds loaded successfully');
    }

    async loadSound(name, path) {
        if (this.loadingPromises.has(name)) {
            return this.loadingPromises.get(name);
        }

        const loadPromise = this.audioContext ? 
            this.loadSoundWithWebAudio(name, path) : 
            this.loadSoundWithHTMLAudio(name, path);

        this.loadingPromises.set(name, loadPromise);
        
        try {
            await loadPromise;
            console.log(`Loaded sound: ${name}`);
        } catch (error) {
            console.warn(`Failed to load sound ${name}:`, error);
        }

        return loadPromise;
    }

    async loadSoundWithWebAudio(name, path) {
        try {
            const response = await fetch(path);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
            
            this.sounds[name] = {
                type: 'webaudio',
                buffer: audioBuffer,
                volume: name === 'menu' || name === 'level' ? this.musicVolume : this.sfxVolume,
                loop: name === 'menu' || name === 'level',
                source: null
            };
        } catch (error) {
            // Fallback to HTML5 Audio
            await this.loadSoundWithHTMLAudio(name, path);
        }
    }

    async loadSoundWithHTMLAudio(name, path) {
        return new Promise((resolve, reject) => {
            const audio = new Audio(path);
            audio.preload = 'auto';
            audio.volume = name === 'menu' || name === 'level' ? this.musicVolume : this.sfxVolume;
            audio.loop = name === 'menu' || name === 'level';

            audio.oncanplaythrough = () => {
                this.sounds[name] = {
                    type: 'html5',
                    audio: audio,
                    volume: audio.volume,
                    loop: audio.loop
                };
                resolve();
            };

            audio.onerror = () => {
                reject(new Error(`Failed to load ${path}`));
            };

            audio.load();
        });
    }

    playSound(soundName, options = {}) {
        if (!this.enabled || !this.sounds[soundName]) return;

        const sound = this.sounds[soundName];
        
        if (sound.type === 'webaudio') {
            this.playWebAudioSound(soundName, sound, options);
        } else {
            this.playHTML5Sound(sound, options);
        }
    }

    playWebAudioSound(soundName, sound, options) {
        if (!this.audioContext || this.audioContext.state !== 'running') return;

        try {
            // Stop previous instance if playing
            if (sound.source) {
                sound.source.stop();
            }

            const source = this.audioContext.createBufferSource();
            const gainNode = this.audioContext.createGain();
            
            source.buffer = sound.buffer;
            source.loop = sound.loop;
            
            const volume = options.volume !== undefined ? options.volume : sound.volume;
            gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
            
            source.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            source.start();
            sound.source = source;

            // Clean up reference when sound ends
            source.onended = () => {
                if (sound.source === source) {
                    sound.source = null;
                }
            };
        } catch (error) {
            console.warn(`Error playing sound ${soundName}:`, error);
        }
    }

    playHTML5Sound(sound, options) {
        try {
            const audio = sound.audio;
            audio.currentTime = 0;
            
            if (options.volume !== undefined) {
                audio.volume = options.volume;
            }
            
            const playPromise = audio.play();
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    console.warn('HTML5 audio play failed:', error);
                });
            }
        } catch (error) {
            console.warn('Error with HTML5 audio:', error);
        }
    }

    playMusic(musicName) {
        if (!this.enabled || !this.sounds[musicName]) return;

        this.stopMusic();
        this.currentMusic = this.sounds[musicName];
        this.playSound(musicName);
    }

    stopMusic() {
        if (!this.currentMusic) return;

        if (this.currentMusic.type === 'webaudio' && this.currentMusic.source) {
            this.currentMusic.source.stop();
            this.currentMusic.source = null;
        } else if (this.currentMusic.type === 'html5') {
            this.currentMusic.audio.pause();
            this.currentMusic.audio.currentTime = 0;
        }

        this.currentMusic = null;
    }

    setMusicVolume(volume) {
        this.musicVolume = Math.max(0, Math.min(1, volume));
        
        ['menu', 'level'].forEach(musicName => {
            if (this.sounds[musicName]) {
                this.sounds[musicName].volume = this.musicVolume;
                if (this.sounds[musicName].type === 'html5') {
                    this.sounds[musicName].audio.volume = this.musicVolume;
                }
            }
        });
    }

    setSfxVolume(volume) {
        this.sfxVolume = Math.max(0, Math.min(1, volume));
        
        Object.keys(this.sounds).forEach(key => {
            if (key !== 'menu' && key !== 'level' && this.sounds[key]) {
                this.sounds[key].volume = this.sfxVolume;
                if (this.sounds[key].type === 'html5') {
                    this.sounds[key].audio.volume = this.sfxVolume;
                }
            }
        });
    }

    setEnabled(enabled) {
        this.enabled = enabled;
        if (!enabled) {
            this.stopMusic();
        }
    }

    playRandomVariation(baseSoundName, variations = 1) {
        if (variations === 1) {
            this.playSound(baseSoundName);
        } else {
            const randomIndex = Math.floor(Math.random() * variations) + 1;
            this.playSound(`${baseSoundName}${randomIndex}`);
        }
    }

    // Cleanup method
    destroy() {
        this.stopMusic();
        
        Object.values(this.sounds).forEach(sound => {
            if (sound.type === 'webaudio' && sound.source) {
                sound.source.stop();
            } else if (sound.type === 'html5') {
                sound.audio.pause();
            }
        });

        if (this.audioContext) {
            this.audioContext.close();
        }

        this.sounds = {};
    }
}

// Global sound manager instance
window.soundManager = new SoundManager();
