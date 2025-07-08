
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
        this.isInitialized = false;
        
        // Priority sounds that should load first
        this.prioritySounds = ['flipperIn', 'flipperOut', 'wallHit'];
        
        // Mobile detection
        this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        this.setupEventListeners();
        this.loadPrioritySounds();
    }

    initializeAudioContext() {
        if (this.audioContext) return;
        
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            console.log('AudioContext initialized, state:', this.audioContext.state);
            
            // For mobile, we need to resume context after user interaction
            if (this.audioContext.state === 'suspended') {
                console.log('AudioContext is suspended, will resume after user interaction');
            }
        } catch (error) {
            console.warn('AudioContext not supported, falling back to HTML5 Audio');
            this.audioContext = null;
        }
    }

    setupEventListeners() {
        const eventTypes = ['click', 'touchstart', 'touchend', 'mousedown', 'keydown'];
        
        const enableAudioOnInteraction = async () => {
            if (!this.userInteracted) {
                console.log('User interaction detected, enabling audio...');
                this.userInteracted = true;
                
                // Initialize AudioContext if not done yet
                if (!this.audioContext) {
                    this.initializeAudioContext();
                }
                
                // Resume AudioContext if suspended (critical for mobile)
                if (this.audioContext && this.audioContext.state === 'suspended') {
                    try {
                        await this.audioContext.resume();
                        console.log('AudioContext resumed, state:', this.audioContext.state);
                    } catch (error) {
                        console.warn('Failed to resume AudioContext:', error);
                    }
                }
                
                // Load all sounds after user interaction
                await this.loadAllSounds();
                this.isInitialized = true;
                
                // Remove event listeners after first interaction
                eventTypes.forEach(event => {
                    document.removeEventListener(event, enableAudioOnInteraction);
                });
            }
        };

        // Add multiple event listeners for better mobile support
        eventTypes.forEach(event => {
            document.addEventListener(event, enableAudioOnInteraction, { 
                once: false, 
                passive: true 
            });
        });
        
        // Also listen for specific game interactions
        document.addEventListener('keydown', enableAudioOnInteraction, { once: true });
        document.addEventListener('touchstart', enableAudioOnInteraction, { once: true });
    }

    async loadPrioritySounds() {
        const prioritySoundFiles = {
            flipperIn: 'sounds/Flipper_In.mp3',
            flipperOut: 'sounds/Flipper_Out.mp3',
            wallHit: 'sounds/wallhit.mp3'
        };

        console.log('Starting sound loading...');
        
        for (const [key, path] of Object.entries(prioritySoundFiles)) {
            try {
                await this.loadSound(key, path);
            } catch (error) {
                console.warn(`Failed to load priority sound ${key}:`, error);
            }
        }
        
        console.log('Priority sounds loaded');
    }

    async loadAllSounds() {
        if (!this.userInteracted) {
            console.log('Waiting for user interaction before loading sounds...');
            return;
        }
        
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

        try {
            await Promise.all(loadPromises);
            console.log('All sounds loaded successfully');
        } catch (error) {
            console.warn('Some sounds failed to load:', error);
        }
    }

    async loadSound(name, path) {
        if (this.loadingPromises.has(name)) {
            return this.loadingPromises.get(name);
        }

        const loadPromise = this.audioContext && this.userInteracted ? 
            this.loadSoundWithWebAudio(name, path) : 
            this.loadSoundWithHTMLAudio(name, path);

        this.loadingPromises.set(name, loadPromise);
        
        try {
            await loadPromise;
            console.log(`Loaded sound: ${name}`);
        } catch (error) {
            console.warn(`Failed to load sound ${name}:`, error);
            // Try fallback method
            try {
                await this.loadSoundWithHTMLAudio(name, path);
                console.log(`Loaded sound with fallback: ${name}`);
            } catch (fallbackError) {
                console.error(`Complete failure loading sound ${name}:`, fallbackError);
            }
        }

        return loadPromise;
    }

    async loadSoundWithWebAudio(name, path) {
        try {
            const response = await fetch(path);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
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
            console.warn(`WebAudio loading failed for ${name}, trying HTML5:`, error);
            throw error; // Re-throw to trigger fallback
        }
    }

    async loadSoundWithHTMLAudio(name, path) {
        return new Promise((resolve, reject) => {
            const audio = new Audio();
            audio.preload = 'auto';
            audio.volume = name === 'menu' || name === 'level' ? this.musicVolume : this.sfxVolume;
            audio.loop = name === 'menu' || name === 'level';
            
            // Critical for mobile - set crossOrigin
            audio.crossOrigin = 'anonymous';
            
            const onLoad = () => {
                this.sounds[name] = {
                    type: 'html5',
                    audio: audio,
                    volume: audio.volume,
                    loop: audio.loop
                };
                cleanup();
                resolve();
            };

            const onError = () => {
                cleanup();
                reject(new Error(`Failed to load ${path}`));
            };

            const cleanup = () => {
                audio.removeEventListener('canplaythrough', onLoad);
                audio.removeEventListener('error', onError);
                audio.removeEventListener('loadeddata', onLoad);
            };

            audio.addEventListener('canplaythrough', onLoad);
            audio.addEventListener('loadeddata', onLoad); // Fallback event
            audio.addEventListener('error', onError);
            
            audio.src = path;
            audio.load();
        });
    }

    playSound(soundName, options = {}) {
        if (!this.enabled || !this.sounds[soundName]) {
            console.warn(`Sound not available: ${soundName}`);
            return;
        }

        // Ensure we have user interaction before playing
        if (!this.userInteracted) {
            console.warn('Cannot play sound without user interaction');
            return;
        }

        const sound = this.sounds[soundName];
        
        try {
            if (sound.type === 'webaudio') {
                this.playWebAudioSound(soundName, sound, options);
            } else {
                this.playHTML5Sound(sound, options);
            }
        } catch (error) {
            console.warn(`Error playing sound ${soundName}:`, error);
        }
    }

    playWebAudioSound(soundName, sound, options) {
        if (!this.audioContext || this.audioContext.state !== 'running') {
            console.warn('AudioContext not ready, state:', this.audioContext?.state);
            return;
        }

        try {
            // Stop previous instance if playing
            if (sound.source) {
                try {
                    sound.source.stop();
                } catch (e) {
                    // Ignore errors when stopping
                }
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
            console.warn(`Error playing WebAudio sound ${soundName}:`, error);
        }
    }

    playHTML5Sound(sound, options) {
        try {
            const audio = sound.audio;
            
            // For mobile, we need to handle play() promise
            audio.currentTime = 0;
            
            if (options.volume !== undefined) {
                audio.volume = options.volume;
            }
            
            const playPromise = audio.play();
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    console.warn('HTML5 audio play failed:', error);
                    // On mobile, sometimes we need to try again
                    if (this.isMobile) {
                        setTimeout(() => {
                            audio.play().catch(e => {
                                console.warn('Retry HTML5 audio play failed:', e);
                            });
                        }, 100);
                    }
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
            try {
                this.currentMusic.source.stop();
            } catch (e) {
                // Ignore errors when stopping
            }
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
                try {
                    sound.source.stop();
                } catch (e) {
                    // Ignore errors when stopping
                }
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

// Global sound manager instance - only create if not exists
if (!window.soundManager) {
    window.soundManager = new SoundManager();
}
