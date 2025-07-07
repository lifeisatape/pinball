// Level Manager Class
class LevelManager {
    constructor() {
        this.currentLevel = null;
    }

    async createDefaultLevel() {
        try {
            const response = await fetch('rooms/degen.json');
            const levelData = await response.json();
            return this.loadLevelFromData(levelData);
        } catch (error) {
            console.error('Error loading degen.json, falling back to built-in level:', error);
            // Fallback to original default level
            return {
                walls: this.createDefaultWalls(),
                flippers: this.createDefaultFlippers(),
                bumpers: this.createDefaultBumpers(),
                spinners: this.createDefaultSpinners(),
                dropTargets: this.createDefaultDropTargets(),
                ramps: this.createDefaultRamps(),
                tunnels: this.createDefaultTunnels()
            };
        }
    }

    createDefaultWalls() {
        const gameWidth = CONFIG.VIRTUAL_WIDTH;
        const gameHeight = CONFIG.VIRTUAL_HEIGHT;

        return [
            new Wall(5, 5, 5, gameHeight - 100),
            new Wall(gameWidth - 5, 5, gameWidth - 5, gameHeight - 100),
            new Wall(5, 5, gameWidth - 5, 5),
            new Wall(gameWidth * 0.25, gameHeight - 80, gameWidth * 0, gameHeight - 100),
            new Wall(gameWidth * 1, gameHeight - 100, gameWidth * 0.75, gameHeight - 80)
        ];
    }

    createDefaultFlippers() {
        const flipperY = CONFIG.VIRTUAL_HEIGHT - 80;
        return [
            new Flipper(CONFIG.VIRTUAL_WIDTH * 0.3, flipperY, true),
            new Flipper(CONFIG.VIRTUAL_WIDTH * 0.7, flipperY, false)
        ];
    }

    createDefaultBumpers() {
        return [
            new Bumper(CONFIG.VIRTUAL_WIDTH * 0.3, 150, 25),
            new Bumper(CONFIG.VIRTUAL_WIDTH * 0.7, 120, 25),
            new Bumper(CONFIG.VIRTUAL_WIDTH * 0.5, 180, 20)
        ];
    }

    createDefaultSpinners() {
        return [
            new Spinner(CONFIG.VIRTUAL_WIDTH * 0.2, 250),
            new Spinner(CONFIG.VIRTUAL_WIDTH * 0.8, 280)
        ];
    }

    createDefaultDropTargets() {
        return [
            new DropTarget(CONFIG.VIRTUAL_WIDTH * 0.15, 320),
            new DropTarget(CONFIG.VIRTUAL_WIDTH * 0.85, 350),
            new DropTarget(CONFIG.VIRTUAL_WIDTH * 0.5, 300)
        ];
    }

    createDefaultRamps() {
        return []; // No ramps in default level
    }

    createDefaultTunnels() {
        return []; // No tunnels in default level
    }

    loadLevelFromData(levelData) {
        const level = {
            walls: [],
            flippers: this.createDefaultFlippers(), // Always use default flippers
            bumpers: [],
            spinners: [],
            dropTargets: [],
            ramps: [],
            tunnels: [],
            backgroundImage: null,
            backgroundOpacity: 0.5
        };

        // Load walls
        if (levelData.walls) {
            level.walls = levelData.walls.map(wallData => {
                const wall = new Wall(wallData.x1, wallData.y1, wallData.x2, wallData.y2, wallData.color, wallData.width);
                
                // Add arc properties if they exist
                if (wallData.type === 'semicircle' || wallData.type === 'quarter') {
                    wall.type = wallData.type;
                    wall.centerX = wallData.centerX;
                    wall.centerY = wallData.centerY;
                    wall.radius = wallData.radius;
                    wall.startAngle = wallData.startAngle;
                    wall.endAngle = wallData.endAngle;
                }
                
                return wall;
            });
        }

        // Load bumpers
        if (levelData.bumpers) {
            level.bumpers = levelData.bumpers.map(bumperData => 
                new Bumper(bumperData.x, bumperData.y, bumperData.radius)
            );
        }

        // Load spinners
        if (levelData.spinners) {
            level.spinners = levelData.spinners.map(spinnerData => 
                new Spinner(spinnerData.x, spinnerData.y, spinnerData.width, spinnerData.height)
            );
        }

        // Load drop targets
        if (levelData.dropTargets) {
            level.dropTargets = levelData.dropTargets.map(targetData => 
                new DropTarget(targetData.x, targetData.y, targetData.width, targetData.height)
            );
        }

        // Load tunnels
        if (levelData.tunnels) {
            level.tunnels = levelData.tunnels.map(tunnelData => 
                new Tunnel(tunnelData.entryX, tunnelData.entryY, tunnelData.exitX, tunnelData.exitY, tunnelData.radius)
            );
        }

        // Load background image
        if (levelData.background && levelData.background.image) {
            const img = new Image();
            img.onload = () => {
                level.backgroundImage = img;
            };
            img.src = levelData.background.image;
            level.backgroundOpacity = levelData.background.opacity || 0.5;
        }

        return level;
    }

    resetLevel(level) {
        // Reset all game elements to initial state
        level.dropTargets.forEach(target => {
            target.isActive = true;
            target.resetTime = 0;
        });

        level.spinners.forEach(spinner => {
            spinner.angularVelocity = 0;
        });

        level.bumpers.forEach(bumper => {
            bumper.hitAnimation = 0;
        });

        level.tunnels.forEach(tunnel => {
            tunnel.cooldown = 0;
            tunnel.entryAnimation = 0;
            tunnel.exitAnimation = 0;
        });
    }
}