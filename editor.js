class LevelEditor {
    constructor() {
        this.canvas = document.getElementById('editorCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.currentTool = 'wall';
        this.isDrawing = false;
        this.selectedObject = null;
        
        // Level data
        this.walls = [];
        this.bumpers = [];
        this.bounceZones = [];
        
        // Drawing state
        this.startPoint = null;
        this.currentPath = [];
        
        this.setupCanvas();
        this.setupEventListeners();
        this.render();
    }
    
    setupCanvas() {
        const resize = () => {
            const container = this.canvas.parentElement;
            this.canvas.width = container.clientWidth - 20;
            this.canvas.height = container.clientHeight - 150; // Account for instructions
            this.render();
        };
        
        resize();
        window.addEventListener('resize', resize);
    }
    
    setupEventListeners() {
        // Tool selection
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentTool = e.target.dataset.tool;
                this.selectedObject = null;
                this.updatePropertiesPanel();
            });
        });
        
        // Canvas events
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        
        // Action buttons
        document.getElementById('clearAll').addEventListener('click', () => this.clearAll());
        document.getElementById('saveLevel').addEventListener('click', () => this.saveLevel());
        document.getElementById('loadLevel').addEventListener('click', () => this.loadLevel());
        document.getElementById('testLevel').addEventListener('click', () => this.testLevel());
    }
    
    getMousePos(e) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    }
    
    handleMouseDown(e) {
        const pos = this.getMousePos(e);
        
        switch (this.currentTool) {
            case 'wall':
                this.startWall(pos);
                break;
            case 'bumper':
                this.placeBumper(pos);
                break;
            case 'bounce':
                this.startBounceZone(pos);
                break;
            case 'delete':
                this.deleteObject(pos);
                break;
        }
    }
    
    handleMouseMove(e) {
        if (!this.isDrawing) return;
        
        const pos = this.getMousePos(e);
        
        if (this.currentTool === 'wall') {
            this.currentPath.push(pos);
            this.render();
        } else if (this.currentTool === 'bounce') {
            this.render();
            // Draw preview rectangle
            this.ctx.strokeStyle = '#feca57';
            this.ctx.lineWidth = 2;
            this.ctx.setLineDash([5, 5]);
            this.ctx.strokeRect(
                this.startPoint.x,
                this.startPoint.y,
                pos.x - this.startPoint.x,
                pos.y - this.startPoint.y
            );
            this.ctx.setLineDash([]);
        }
    }
    
    handleMouseUp(e) {
        if (!this.isDrawing) return;
        
        const pos = this.getMousePos(e);
        
        if (this.currentTool === 'wall' && this.currentPath.length > 1) {
            this.walls.push({
                id: Date.now(),
                points: [...this.currentPath],
                color: '#ff4444',
                width: 6
            });
        } else if (this.currentTool === 'bounce') {
            const width = pos.x - this.startPoint.x;
            const height = pos.y - this.startPoint.y;
            
            if (Math.abs(width) > 10 && Math.abs(height) > 10) {
                this.bounceZones.push({
                    id: Date.now(),
                    x: Math.min(this.startPoint.x, pos.x),
                    y: Math.min(this.startPoint.y, pos.y),
                    width: Math.abs(width),
                    height: Math.abs(height),
                    power: parseInt(document.getElementById('bouncePower').value),
                    color: '#feca57'
                });
            }
        }
        
        this.isDrawing = false;
        this.currentPath = [];
        this.startPoint = null;
        this.render();
    }
    
    startWall(pos) {
        this.isDrawing = true;
        this.currentPath = [pos];
        this.startPoint = pos;
    }
    
    placeBumper(pos) {
        const points = parseInt(document.getElementById('bumperPoints').value);
        const colors = ['#ff6b6b', '#4ecdc4', '#feca57', '#ff9ff3', '#54a0ff'];
        const color = colors[Math.floor(Math.random() * colors.length)];
        
        this.bumpers.push({
            id: Date.now(),
            x: pos.x,
            y: pos.y,
            radius: 25,
            points: points,
            color: color
        });
        
        this.render();
    }
    
    startBounceZone(pos) {
        this.isDrawing = true;
        this.startPoint = pos;
    }
    
    deleteObject(pos) {
        // Check bumpers
        for (let i = this.bumpers.length - 1; i >= 0; i--) {
            const bumper = this.bumpers[i];
            const dist = Math.sqrt(Math.pow(pos.x - bumper.x, 2) + Math.pow(pos.y - bumper.y, 2));
            if (dist <= bumper.radius) {
                this.bumpers.splice(i, 1);
                this.render();
                return;
            }
        }
        
        // Check bounce zones
        for (let i = this.bounceZones.length - 1; i >= 0; i--) {
            const zone = this.bounceZones[i];
            if (pos.x >= zone.x && pos.x <= zone.x + zone.width &&
                pos.y >= zone.y && pos.y <= zone.y + zone.height) {
                this.bounceZones.splice(i, 1);
                this.render();
                return;
            }
        }
        
        // Check walls
        for (let i = this.walls.length - 1; i >= 0; i--) {
            const wall = this.walls[i];
            for (let j = 0; j < wall.points.length - 1; j++) {
                const p1 = wall.points[j];
                const p2 = wall.points[j + 1];
                const dist = this.distanceToLineSegment(pos, p1, p2);
                if (dist <= wall.width / 2 + 5) {
                    this.walls.splice(i, 1);
                    this.render();
                    return;
                }
            }
        }
    }
    
    distanceToLineSegment(point, lineStart, lineEnd) {
        const A = point.x - lineStart.x;
        const B = point.y - lineStart.y;
        const C = lineEnd.x - lineStart.x;
        const D = lineEnd.y - lineStart.y;

        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        let param = -1;
        if (lenSq !== 0) {
            param = dot / lenSq;
        }

        let xx, yy;
        if (param < 0) {
            xx = lineStart.x;
            yy = lineStart.y;
        } else if (param > 1) {
            xx = lineEnd.x;
            yy = lineEnd.y;
        } else {
            xx = lineStart.x + param * C;
            yy = lineStart.y + param * D;
        }

        const dx = point.x - xx;
        const dy = point.y - yy;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    render() {
        // Clear canvas with proper background
        this.ctx.fillStyle = '#0c0c0c';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw grid
        this.drawGrid();
        
        // Draw walls
        this.walls.forEach(wall => this.drawWall(wall));
        
        // Draw bumpers
        this.bumpers.forEach(bumper => this.drawBumper(bumper));
        
        // Draw bounce zones
        this.bounceZones.forEach(zone => this.drawBounceZone(zone));
        
        // Draw current path for walls
        if (this.isDrawing && this.currentTool === 'wall' && this.currentPath.length > 0) {
            this.ctx.strokeStyle = '#ff4444';
            this.ctx.lineWidth = 6;
            this.ctx.lineCap = 'round';
            this.ctx.lineJoin = 'round';
            this.ctx.beginPath();
            this.ctx.moveTo(this.currentPath[0].x, this.currentPath[0].y);
            for (let i = 1; i < this.currentPath.length; i++) {
                this.ctx.lineTo(this.currentPath[i].x, this.currentPath[i].y);
            }
            this.ctx.stroke();
        }
        
        // Draw default flipper positions
        this.drawFlipperGuides();
    }
    
    drawGrid() {
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        this.ctx.lineWidth = 1;
        
        const gridSize = 20;
        
        for (let x = 0; x <= this.canvas.width; x += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
        }
        
        for (let y = 0; y <= this.canvas.height; y += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }
    }
    
    drawWall(wall) {
        if (wall.points.length < 2) return;
        
        this.ctx.strokeStyle = wall.color;
        this.ctx.lineWidth = wall.width;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        
        this.ctx.beginPath();
        this.ctx.moveTo(wall.points[0].x, wall.points[0].y);
        for (let i = 1; i < wall.points.length; i++) {
            this.ctx.lineTo(wall.points[i].x, wall.points[i].y);
        }
        this.ctx.stroke();
    }
    
    drawBumper(bumper) {
        // Main bumper
        const gradient = this.ctx.createRadialGradient(
            bumper.x - bumper.radius * 0.3, bumper.y - bumper.radius * 0.3, 0,
            bumper.x, bumper.y, bumper.radius
        );
        gradient.addColorStop(0, '#ffffff');
        gradient.addColorStop(0.3, bumper.color);
        gradient.addColorStop(1, bumper.color + '80');
        
        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.arc(bumper.x, bumper.y, bumper.radius, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Outline
        this.ctx.strokeStyle = '#fff';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        
        // Points text
        this.ctx.fillStyle = '#fff';
        this.ctx.font = 'bold 12px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(bumper.points.toString(), bumper.x, bumper.y);
    }
    
    drawBounceZone(zone) {
        // Semi-transparent fill
        this.ctx.fillStyle = zone.color + '40';
        this.ctx.fillRect(zone.x, zone.y, zone.width, zone.height);
        
        // Border
        this.ctx.strokeStyle = zone.color;
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 5]);
        this.ctx.strokeRect(zone.x, zone.y, zone.width, zone.height);
        this.ctx.setLineDash([]);
        
        // Label
        this.ctx.fillStyle = '#fff';
        this.ctx.font = 'bold 10px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(`BOUNCE ${zone.power}`, zone.x + zone.width/2, zone.y + zone.height/2);
    }
    
    drawFlipperGuides() {
        const flipperY = this.canvas.height - 60;
        const leftX = this.canvas.width * 0.2 + 15;
        const rightX = this.canvas.width * 0.8 - 15;
        
        // Draw flipper anchor points
        this.ctx.fillStyle = '#00ff0080';
        this.ctx.beginPath();
        this.ctx.arc(leftX, flipperY, 8, 0, Math.PI * 2);
        this.ctx.arc(rightX, flipperY, 8, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Labels
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '10px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('LEFT FLIPPER', leftX, flipperY + 20);
        this.ctx.fillText('RIGHT FLIPPER', rightX, flipperY + 20);
    }
    
    clearAll() {
        if (confirm('Clear all objects? This cannot be undone.')) {
            this.walls = [];
            this.bumpers = [];
            this.bounceZones = [];
            this.selectedObject = null;
            this.render();
            this.updatePropertiesPanel();
        }
    }
    
    saveLevel() {
        const levelData = {
            walls: this.walls,
            bumpers: this.bumpers,
            bounceZones: this.bounceZones,
            version: '1.0',
            created: new Date().toISOString()
        };
        
        const dataStr = JSON.stringify(levelData, null, 2);
        const dataBlob = new Blob([dataStr], {type: 'application/json'});
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = 'pinball-level.json';
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
                        this.bounceZones = levelData.bounceZones || [];
                        this.selectedObject = null;
                        this.render();
                        this.updatePropertiesPanel();
                        alert('Level loaded successfully!');
                    } catch (error) {
                        alert('Error loading level file: ' + error.message);
                    }
                };
                reader.readAsText(file);
            }
        };
        
        input.click();
    }
    
    testLevel() {
        if (this.walls.length === 0 && this.bumpers.length === 0 && this.bounceZones.length === 0) {
            alert('Create some objects first before testing!');
            return;
        }
        
        // Export level data without scaling - use actual canvas coordinates
        const levelData = {
            walls: this.walls,
            bumpers: this.bumpers,
            bounceZones: this.bounceZones,
            editorWidth: this.canvas.width,
            editorHeight: this.canvas.height
        };
        
        localStorage.setItem('customLevel', JSON.stringify(levelData));
        
        // Open game in new tab/window
        window.open('index.html?custom=true', '_blank');
    }
    
    updatePropertiesPanel() {
        const panel = document.getElementById('objectProperties');
        
        if (!this.selectedObject) {
            panel.innerHTML = '<p>Select an object to edit its properties</p>';
            return;
        }
        
        // Will implement object property editing in next update
        panel.innerHTML = '<p>Object properties will be available soon</p>';
    }
}

// Initialize editor when page loads
document.addEventListener('DOMContentLoaded', () => {
    new LevelEditor();
});