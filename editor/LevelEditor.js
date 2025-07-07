// Level Editor Class
class LevelEditor {
    constructor() {
        this.canvas = document.getElementById('editorCanvas');
        this.testCanvas = document.getElementById('testCanvas');

        this.renderer = new EditorRenderer(this.canvas);
        this.tools = new EditorTools();

        this.mousePos = { x: 0, y: 0 };

        // Level data
        this.walls = [];
        this.bumpers = [];
        this.spinners = [];
        this.dropTargets = [];
        this.tunnels = [];
        this.backgroundImage = null;
        this.backgroundOpacity = 0.5;

        // Fixed flipper positions
        this.flippers = [
            { x: CONFIG.VIRTUAL_WIDTH * 0.3, y: CONFIG.VIRTUAL_HEIGHT - 80, isLeft: true },
            { x: CONFIG.VIRTUAL_WIDTH * 0.7, y: CONFIG.VIRTUAL_HEIGHT - 80, isLeft: false }
        ];

        this.testMode = null;
        this.setupEventListeners();
        this.render();
    }

    setupEventListeners() {
        // Tool selection
        document.querySelectorAll('.tool-btn[data-tool]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.tool-btn[data-tool]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.tools.setTool(btn.dataset.tool);
                this.updateModeIndicator();
            });
        });

        // Wall mode selection
        document.querySelectorAll('.wall-mode-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.wall-mode-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.tools.setWallMode(btn.dataset.mode);
                this.updateModeIndicator();
            });
        });

        // Canvas events
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));

        // Background controls
        document.getElementById('loadBackground').addEventListener('click', () => this.loadBackgroundImage());
        document.getElementById('clearBackground').addEventListener('click', () => this.clearBackgroundImage());
        document.getElementById('backgroundOpacity').addEventListener('input', (e) => {
            this.backgroundOpacity = parseFloat(e.target.value);
            this.render();
        });

        // Action buttons
        document.getElementById('testLevel').addEventListener('click', () => this.enterTestMode());
        document.getElementById('clearLevel').addEventListener('click', () => this.clearLevel());
        document.getElementById('saveLevel').addEventListener('click', () => this.saveLevel());
        document.getElementById('loadLevel').addEventListener('click', () => this.loadLevel());

        // Test mode controls
        document.getElementById('exitTest').addEventListener('click', () => this.exitTestMode());
        document.getElementById('resetBall').addEventListener('click', () => this.resetTestBall());
    }

    handleMouseDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        const screenX = e.clientX - rect.left;
        const screenY = e.clientY - rect.top;
        const worldPos = this.tools.snapToGrid(
            this.renderer.screenToWorld(screenX, screenY),
            document.getElementById('snapToGrid').checked,
            parseInt(document.getElementById('gridSize').value)
        );

        if (this.tools.currentTool === 'wall') {
            this.tools.isDrawing = true;
            this.tools.drawStart = worldPos;
        } else if (this.tools.currentTool === 'bumper') {
            const radius = parseInt(document.getElementById('bumperRadius').value);
            this.bumpers.push({
                x: worldPos.x,
                y: worldPos.y,
                radius: radius,
                points: 100
            });
        } else if (this.tools.currentTool === 'spinner') {
            const width = parseInt(document.getElementById('spinnerWidth').value);
            this.spinners.push({
                x: worldPos.x,
                y: worldPos.y,
                width: width,
                height: 8,
                angle: 0,
                points: 50
            });
        } else if (this.tools.currentTool === 'droptarget') {
            const width = parseInt(document.getElementById('dropTargetWidth').value);
            const height = parseInt(document.getElementById('dropTargetHeight').value);
            this.dropTargets.push({
                x: worldPos.x,
                y: worldPos.y,
                width: width,
                height: height,
                isActive: true,
                points: 200
            });
        } else if (this.tools.currentTool === 'tunnel') {
            const radius = parseInt(document.getElementById('tunnelRadius').value);

            if (this.tools.tunnelCreationStep === 0) {
                // First click - place entry
                this.tools.tunnelEntry = worldPos;
                this.tools.tunnelCreationStep = 1;
            } else if (this.tools.tunnelCreationStep === 1) {
                // Second click - place exit and create tunnel
                this.tunnels.push({
                    entryX: this.tools.tunnelEntry.x,
                    entryY: this.tools.tunnelEntry.y,
                    exitX: worldPos.x,
                    exitY: worldPos.y,
                    radius: radius,
                    cooldown: 0,
                    maxCooldown: 60,
                    entryAnimation: 0,
                    exitAnimation: 0
                });

                // Reset tunnel creation state
                this.tools.tunnelCreationStep = 0;
                this.tools.tunnelEntry = null;
            }
        } else if (this.tools.currentTool === 'select') {
            this.tools.selectedObject = this.tools.findObjectAt(worldPos, this.getLevelData());
            if (this.tools.selectedObject) {
                this.tools.startDragging(worldPos, this.tools.selectedObject);
            }
        } else if (this.tools.currentTool === 'delete') {
            const deleted = this.tools.deleteObjectAt(worldPos, {
                walls: this.walls,
                bumpers: this.bumpers,
                spinners: this.spinners,
                dropTargets: this.dropTargets,
                tunnels: this.tunnels
            });
        }

        this.render();
    }

    handleMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        const screenX = e.clientX - rect.left;
        const screenY = e.clientY - rect.top;
        const rawWorldPos = this.renderer.screenToWorld(screenX, screenY);
        const worldPos = this.tools.snapToGrid(
            rawWorldPos,
            document.getElementById('snapToGrid').checked,
            parseInt(document.getElementById('gridSize').value)
        );

        this.mousePos = worldPos;
        document.getElementById('coordinates').textContent = `X: ${Math.round(worldPos.x)}, Y: ${Math.round(worldPos.y)}`;

        // Handle object dragging
        this.tools.updateDragging(worldPos, this.tools.selectedObject);

        this.render();
    }

    handleMouseUp(e) {
        if (this.tools.isDrawing && this.tools.currentTool === 'wall') {
            const rect = this.canvas.getBoundingClientRect();
            const screenX = e.clientX - rect.left;
            const screenY = e.clientY - rect.top;
            const worldPos = this.tools.snapToGrid(
                this.renderer.screenToWorld(screenX, screenY),
                document.getElementById('snapToGrid').checked,
                parseInt(document.getElementById('gridSize').value)
            );

            const width = parseInt(document.getElementById('wallWidth').value);
            const color = document.getElementById('wallColor').value;

            if (this.tools.wallMode === 'line') {
                this.walls.push({
                    x1: this.tools.drawStart.x,
                    y1: this.tools.drawStart.y,
                    x2: worldPos.x,
                    y2: worldPos.y,
                    width: width,
                    color: color,
                    type: 'line'
                });
            } else {
                // Calculate arc parameters
                const centerX = this.tools.drawStart.x;
                const centerY = this.tools.drawStart.y;
                const radius = Math.sqrt(
                    Math.pow(worldPos.x - centerX, 2) + 
                    Math.pow(worldPos.y - centerY, 2)
                );
                
                // Get rotation from UI
                const rotationDegrees = parseInt(document.getElementById('arcRotation').value) || 0;
                const rotationRadians = (rotationDegrees * Math.PI) / 180;
                
                const arcLength = this.tools.wallMode === 'semicircle' ? Math.PI : Math.PI / 2;
                const startAngle = rotationRadians;
                const endAngle = rotationRadians + arcLength;

                this.walls.push({
                    centerX: centerX,
                    centerY: centerY,
                    radius: radius,
                    startAngle: startAngle,
                    endAngle: endAngle,
                    width: width,
                    color: color,
                    type: this.tools.wallMode
                });
            }

            this.tools.isDrawing = false;
            this.tools.drawStart = null;
        }

        // Stop dragging
        this.tools.stopDragging();
        this.render();
    }

    getLevelData() {
        const data = {
            walls: this.walls,
            bumpers: this.bumpers,
            spinners: this.spinners,
            dropTargets: this.dropTargets,
            tunnels: this.tunnels
        };
        
        if (this.backgroundImage) {
            data.background = {
                image: this.backgroundImage.src,
                opacity: this.backgroundOpacity
            };
        }
        
        return data;
    }

    updateModeIndicator() {
        document.getElementById('modeIndicator').textContent = this.tools.getModeText();
    }

    render() {
        this.renderer.clear();
        this.renderer.startVirtualRendering();

        // Draw background image
        if (this.backgroundImage) {
            this.renderer.drawBackgroundImage(this.backgroundImage, this.backgroundOpacity);
        }

        // Draw grid
        this.renderer.drawGrid(
            document.getElementById('showGrid').checked,
            parseInt(document.getElementById('gridSize').value)
        );

        // Draw game boundaries
        this.renderer.drawGameBoundaries();

        // Draw all objects
        this.renderer.drawWalls(this.walls);
        this.renderer.drawBumpers(this.bumpers);
        this.renderer.drawSpinners(this.spinners);
        this.renderer.drawDropTargets(this.dropTargets);
        this.renderer.drawTunnels(this.tunnels);
        this.renderer.drawFlippers(this.flippers);

        // Draw selection highlight
        if (this.tools.selectedObject && this.tools.currentTool === 'select') {
            this.renderer.drawSelectionHighlight(this.tools.selectedObject);
        }

        // Draw current drawing line
        if (this.tools.isDrawing && this.tools.drawStart) {
            const width = parseInt(document.getElementById('wallWidth').value);
            const color = document.getElementById('wallColor').value;
            this.renderer.drawDrawingPreview(this.tools.isDrawing, this.tools.drawStart, this.mousePos, width, color, this.tools.wallMode);
        }

        // Draw tunnel creation preview
        if (this.tools.currentTool === 'tunnel' && this.tools.tunnelCreationStep === 1) {
            const radius = parseInt(document.getElementById('tunnelRadius').value);
            this.renderer.drawTunnelCreationPreview(this.tools.tunnelCreationStep, this.tools.tunnelEntry, this.mousePos, radius);
        }

        this.renderer.endVirtualRendering();
    }

    clearLevel() {
        if (confirm('Clear all objects? This cannot be undone.')) {
            this.walls = [];
            this.bumpers = [];
            this.spinners = [];
            this.dropTargets = [];
            this.tunnels = [];
            this.render();
        }
    }

    saveLevel() {
        const levelData = this.getLevelData();
        const dataStr = JSON.stringify(levelData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);

        const link = document.createElement('a');
        link.href = url;
        link.download = 'pinball_level.json';
        link.click();

        URL.revokeObjectURL(url);
    }

    loadLevel() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';

        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const levelData = JSON.parse(e.target.result);
                        this.walls = levelData.walls || [];
                        this.bumpers = levelData.bumpers || [];
                        this.spinners = levelData.spinners || [];
                        this.dropTargets = levelData.dropTargets || [];
                        this.tunnels = levelData.tunnels || [];
                        
                        if (levelData.background) {
                            this.loadBackgroundFromData(levelData.background);
                        } else {
                            this.backgroundImage = null;
                            this.backgroundOpacity = 0.5;
                        }
                        
                        this.render();
                    } catch (error) {
                        alert('Error loading level file: ' + error.message);
                    }
                };
                reader.readAsText(file);
            }
        };

        input.click();
    }

    enterTestMode() {
        document.getElementById('testModeOverlay').style.display = 'flex';
        this.initTestGame();
    }

    exitTestMode() {
        document.getElementById('testModeOverlay').style.display = 'none';
        if (this.testMode) {
            this.testMode.stop();
            this.testMode = null;
        }
    }

    initTestGame() {
        // Initialize objects with proper properties
        const testBumpers = this.bumpers.map(bumper => ({
            ...bumper,
            hitAnimation: 0
        }));

        const testSpinners = this.spinners.map(spinner => ({
            ...spinner,
            angle: 0,
            angularVelocity: 0
        }));

        const testDropTargets = this.dropTargets.map(target => ({
            ...target,
            isActive: true,
            resetTime: 0
        }));

        // Convert tunnels to test format
        const testTunnels = this.tunnels.map(tunnel => ({
            entry: { x: tunnel.entryX, y: tunnel.entryY },
            exit: { x: tunnel.exitX, y: tunnel.exitY },
            radius: tunnel.radius,
            cooldown: 0,
            maxCooldown: 60,
            entryAnimation: 0,
            exitAnimation: 0
        }));

        const testData = {
            walls: this.walls,
            bumpers: testBumpers,
            spinners: testSpinners,
            dropTargets: testDropTargets,
            tunnels: testTunnels,
            flippers: this.flippers
        };

        if (this.backgroundImage) {
            testData.backgroundImage = this.backgroundImage;
            testData.backgroundOpacity = this.backgroundOpacity;
        }

        this.testMode = new TestMode(this.testCanvas, testData);
    }

    resetTestBall() {
        if (this.testMode) {
            this.testMode.resetBall();
        }
    }

    loadBackgroundImage() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';

        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const img = new Image();
                    img.onload = () => {
                        this.backgroundImage = img;
                        this.render();
                    };
                    img.src = e.target.result;
                };
                reader.readAsDataURL(file);
            }
        };

        input.click();
    }

    clearBackgroundImage() {
        this.backgroundImage = null;
        this.render();
    }

    loadBackgroundFromData(backgroundData) {
        if (backgroundData.image) {
            const img = new Image();
            img.onload = () => {
                this.backgroundImage = img;
                this.backgroundOpacity = backgroundData.opacity || 0.5;
                document.getElementById('backgroundOpacity').value = this.backgroundOpacity;
                this.render();
            };
            img.src = backgroundData.image;
        }
    }
}