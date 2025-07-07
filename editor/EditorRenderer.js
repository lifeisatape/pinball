// Editor Renderer Class
class EditorRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.scale = 1;
        this.offsetX = 0;
        this.offsetY = 0;
        this.setupCanvas();
        window.addEventListener('resize', () => this.setupCanvas());
    }

    setupCanvas() {
        const container = this.canvas.parentElement;
        this.canvas.width = container.clientWidth;
        this.canvas.height = container.clientHeight;

        const scaleX = this.canvas.width / CONFIG.VIRTUAL_WIDTH;
        const scaleY = this.canvas.height / CONFIG.VIRTUAL_HEIGHT;
        this.scale = Math.min(scaleX, scaleY);

        this.offsetX = (this.canvas.width - CONFIG.VIRTUAL_WIDTH * this.scale) / 2;
        this.offsetY = (this.canvas.height - CONFIG.VIRTUAL_HEIGHT * this.scale) / 2;
    }

    screenToWorld(screenX, screenY) {
        return {
            x: (screenX - this.offsetX) / this.scale,
            y: (screenY - this.offsetY) / this.scale
        };
    }

    worldToScreen(worldX, worldY) {
        return {
            x: worldX * this.scale + this.offsetX,
            y: worldY * this.scale + this.offsetY
        };
    }

    clear() {
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    startVirtualRendering() {
        this.ctx.save();
        this.ctx.translate(this.offsetX, this.offsetY);
        this.ctx.scale(this.scale, this.scale);

        // Draw background
        const gradient = this.ctx.createLinearGradient(0, 0, 0, CONFIG.VIRTUAL_HEIGHT);
        gradient.addColorStop(0, '#1a1a2e');
        gradient.addColorStop(1, '#0f1419');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, CONFIG.VIRTUAL_WIDTH, CONFIG.VIRTUAL_HEIGHT);
    }

    endVirtualRendering() {
        this.ctx.restore();
    }

    drawGrid(showGrid, gridSize) {
        if (!showGrid) return;

        this.ctx.strokeStyle = '#333';
        this.ctx.lineWidth = 1;

        for (let x = 0; x <= CONFIG.VIRTUAL_WIDTH; x += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, CONFIG.VIRTUAL_HEIGHT);
            this.ctx.stroke();
        }

        for (let y = 0; y <= CONFIG.VIRTUAL_HEIGHT; y += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(CONFIG.VIRTUAL_WIDTH, y);
            this.ctx.stroke();
        }
    }

    drawBackgroundImage(image, opacity) {
        if (!image) return;

        this.ctx.save();
        this.ctx.globalAlpha = opacity;

        // Calculate scale to fit the image within the game area while maintaining aspect ratio
        const scaleX = CONFIG.VIRTUAL_WIDTH / image.width;
        const scaleY = CONFIG.VIRTUAL_HEIGHT / image.height;
        const scale = Math.min(scaleX, scaleY);

        const scaledWidth = image.width * scale;
        const scaledHeight = image.height * scale;
        const offsetX = (CONFIG.VIRTUAL_WIDTH - scaledWidth) / 2;
        const offsetY = (CONFIG.VIRTUAL_HEIGHT - scaledHeight) / 2;

        this.ctx.drawImage(image, offsetX, offsetY, scaledWidth, scaledHeight);
        this.ctx.restore();
    }

    drawGameBoundaries() {
        this.ctx.strokeStyle = '#666';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(0, 0, CONFIG.VIRTUAL_WIDTH, CONFIG.VIRTUAL_HEIGHT);
    }

    drawWalls(walls) {
        walls.forEach(wall => {
            this.ctx.strokeStyle = wall.color;
            this.ctx.lineWidth = wall.width;
            this.ctx.lineCap = 'round';
            this.ctx.beginPath();

            if (wall.type === 'line' || !wall.type) {
                // Draw straight line (backward compatibility)
                this.ctx.moveTo(wall.x1, wall.y1);
                this.ctx.lineTo(wall.x2, wall.y2);
            } else {
                // Draw arc
                this.ctx.arc(wall.centerX, wall.centerY, wall.radius, wall.startAngle, wall.endAngle);
            }

            this.ctx.stroke();
        });
    }

    drawBumpers(bumpers) {
        bumpers.forEach(bumper => {
            const gradient = this.ctx.createRadialGradient(
                bumper.x - 5, bumper.y - 5, 0,
                bumper.x, bumper.y, bumper.radius
            );
            gradient.addColorStop(0, '#ffffff');
            gradient.addColorStop(0.3, '#ff4444');
            gradient.addColorStop(1, '#aa0000');

            this.ctx.fillStyle = gradient;
            this.ctx.beginPath();
            this.ctx.arc(bumper.x, bumper.y, bumper.radius, 0, Math.PI * 2);
            this.ctx.fill();

            this.ctx.strokeStyle = '#ffffff';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
        });
    }

    drawSpinners(spinners) {
        spinners.forEach(spinner => {
            this.ctx.save();
            this.ctx.translate(spinner.x, spinner.y);
            this.ctx.rotate(spinner.angle || 0);

            const gradient = this.ctx.createLinearGradient(-spinner.width/2, 0, spinner.width/2, 0);
            gradient.addColorStop(0, '#4444ff');
            gradient.addColorStop(0.5, '#6666ff');
            gradient.addColorStop(1, '#4444ff');

            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(-spinner.width/2, -spinner.height/2, spinner.width, spinner.height);

            this.ctx.strokeStyle = '#ffffff';
            this.ctx.lineWidth = 1;
            this.ctx.strokeRect(-spinner.width/2, -spinner.height/2, spinner.width, spinner.height);

            this.ctx.restore();

            this.ctx.fillStyle = '#ffffff';
            this.ctx.beginPath();
            this.ctx.arc(spinner.x, spinner.y, 3, 0, Math.PI * 2);
            this.ctx.fill();
        });
    }

    drawDropTargets(dropTargets) {
        dropTargets.forEach(target => {
            if (target.shape === 'circle') {
                const radius = Math.max(target.width, target.height) / 2;
                
                const gradient = this.ctx.createRadialGradient(
                    target.x, target.y, 0,
                    target.x, target.y, radius
                );
                gradient.addColorStop(0, '#ffaa00');
                gradient.addColorStop(0.7, '#ff8800');
                gradient.addColorStop(1, '#cc6600');

                this.ctx.fillStyle = gradient;
                this.ctx.beginPath();
                this.ctx.arc(target.x, target.y, radius, 0, Math.PI * 2);
                this.ctx.fill();

                this.ctx.strokeStyle = '#ffffff';
                this.ctx.lineWidth = 1;
                this.ctx.stroke();
            } else {
                const gradient = this.ctx.createLinearGradient(
                    target.x - target.width/2, target.y,
                    target.x + target.width/2, target.y
                );
                gradient.addColorStop(0, '#ff8800');
                gradient.addColorStop(0.5, '#ffaa00');
                gradient.addColorStop(1, '#ff8800');

                this.ctx.fillStyle = gradient;
                this.ctx.fillRect(
                    target.x - target.width/2,
                    target.y - target.height/2,
                    target.width,
                    target.height
                );

                this.ctx.strokeStyle = '#ffffff';
                this.ctx.lineWidth = 1;
                this.ctx.strokeRect(
                    target.x - target.width/2,
                    target.y - target.height/2,
                    target.width,
                    target.height
                );
            }
        });
    }

    drawTunnels(tunnels) {
        tunnels.forEach(tunnel => {
            this.drawTunnelPortal(tunnel.entryX, tunnel.entryY, tunnel.radius, '#8B00FF', '#4B0082');
            this.drawTunnelPortal(tunnel.exitX, tunnel.exitY, tunnel.radius, '#00FFFF', '#0080FF');

            // Draw connection line
            this.ctx.strokeStyle = '#666666';
            this.ctx.lineWidth = 1;
            this.ctx.setLineDash([5, 5]);
            this.ctx.beginPath();
            this.ctx.moveTo(tunnel.entryX, tunnel.entryY);
            this.ctx.lineTo(tunnel.exitX, tunnel.exitY);
            this.ctx.stroke();
            this.ctx.setLineDash([]);
        });
    }

    drawTunnelPortal(x, y, radius, innerColor, outerColor) {
        // Outer glow
        const gradient = this.ctx.createRadialGradient(
            x, y, 0,
            x, y, radius
        );
        gradient.addColorStop(0, innerColor);
        gradient.addColorStop(0.6, outerColor);
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0.8)');

        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, Math.PI * 2);
        this.ctx.fill();

        // Inner portal
        this.ctx.fillStyle = '#000000';
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius * 0.6, 0, Math.PI * 2);
        this.ctx.fill();

        // Portal edge
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, Math.PI * 2);
        this.ctx.stroke();
    }

    drawFlippers(flippers) {
        flippers.forEach(flipper => {
            this.ctx.fillStyle = '#ff6666';
            this.ctx.strokeStyle = '#ffffff';
            this.ctx.lineWidth = 1.5;

            const length = CONFIG.FLIPPER_LENGTH;
            const width = CONFIG.FLIPPER_WIDTH;
            const angle = flipper.isLeft ? Math.PI / 8 : -Math.PI / 8;

            this.ctx.save();
            this.ctx.translate(flipper.x, flipper.y);
            this.ctx.rotate(angle);

            this.ctx.fillRect(-width/2, 0, width, length);
            this.ctx.strokeRect(-width/2, 0, width, length);

            this.ctx.restore();

            this.ctx.fillStyle = '#ffffff';
            this.ctx.beginPath();
            this.ctx.arc(flipper.x, flipper.y, 5, 0, Math.PI * 2);
            this.ctx.fill();
        });
    }

    drawSelectionHighlight(selectedObject) {
        if (!selectedObject) return;

        this.ctx.strokeStyle = '#00ff00';
        this.ctx.lineWidth = 3;
        this.ctx.setLineDash([5, 5]);

        const obj = selectedObject.object;
        if (selectedObject.type === 'bumper') {
            this.ctx.beginPath();
            this.ctx.arc(obj.x, obj.y, obj.radius + 5, 0, Math.PI * 2);
            this.ctx.stroke();
        } else if (selectedObject.type === 'spinner') {
            this.ctx.strokeRect(obj.x - obj.width/2 - 5, obj.y - obj.height/2 - 5, obj.width + 10, obj.height + 10);
        } else if (selectedObject.type === 'droptarget') {
            this.ctx.strokeRect(obj.x - obj.width/2 - 5, obj.y - obj.height/2 - 5, obj.width + 10, obj.height + 10);
        } else if (selectedObject.type === 'wall') {
            // Highlight the wall line
            this.ctx.beginPath();
            this.ctx.moveTo(obj.x1, obj.y1);
            this.ctx.lineTo(obj.x2, obj.y2);
            this.ctx.stroke();

            // Highlight specific points
            this.ctx.fillStyle = '#00ff00';
            this.ctx.setLineDash([]);

            if (selectedObject.point === 'start' || selectedObject.point === 'whole') {
                this.ctx.beginPath();
                this.ctx.arc(obj.x1, obj.y1, 8, 0, Math.PI * 2);
                this.ctx.fill();
            }

            if (selectedObject.point === 'end' || selectedObject.point === 'whole') {
                this.ctx.beginPath();
                this.ctx.arc(obj.x2, obj.y2, 8, 0, Math.PI * 2);
                this.ctx.fill();
            }

            this.ctx.setLineDash([5, 5]);
        } else if (selectedObject.type === 'tunnel') {
            // Highlight tunnel portals
            this.ctx.setLineDash([]);
            this.ctx.fillStyle = '#00ff00';

            if (selectedObject.point === 'entry') {
                this.ctx.beginPath();
                this.ctx.arc(obj.entryX, obj.entryY, obj.radius + 5, 0, Math.PI * 2);
                this.ctx.stroke();
            } else if (selectedObject.point === 'exit') {
                this.ctx.beginPath();
                this.ctx.arc(obj.exitX, obj.exitY, obj.radius + 5, 0, Math.PI * 2);
                this.ctx.stroke();
            }

            this.ctx.setLineDash([5, 5]);
        }

        // Handle arc walls separately
        if (selectedObject.type === 'wall' && (obj.type === 'semicircle' || obj.type === 'quarter')) {
            // Draw arc selection
            this.ctx.strokeStyle = '#00ff00';
            this.ctx.lineWidth = 3;
            this.ctx.setLineDash([5, 5]);
            this.ctx.beginPath();
            this.ctx.arc(obj.centerX, obj.centerY, obj.radius, obj.startAngle, obj.endAngle);
            this.ctx.stroke();
            this.ctx.setLineDash([]);

            // Draw center point
            this.ctx.fillStyle = '#00ff00';
            this.ctx.beginPath();
            this.ctx.arc(obj.centerX, obj.centerY, 4, 0, Math.PI * 2);
            this.ctx.fill();

            // Draw rotation handles at start and end of arc
            const startX = obj.centerX + Math.cos(obj.startAngle) * obj.radius;
            const startY = obj.centerY + Math.sin(obj.startAngle) * obj.radius;
            const endX = obj.centerX + Math.cos(obj.endAngle) * obj.radius;
            const endY = obj.centerY + Math.sin(obj.endAngle) * obj.radius;

            // Start handle (blue)
            this.ctx.fillStyle = '#0088ff';
            this.ctx.beginPath();
            this.ctx.arc(startX, startY, 6, 0, Math.PI * 2);
            this.ctx.fill();

            // End handle (red)
            this.ctx.fillStyle = '#ff4444';
            this.ctx.beginPath();
            this.ctx.arc(endX, endY, 6, 0, Math.PI * 2);
            this.ctx.fill();
        }

        this.ctx.setLineDash([]);
    }

    drawDrawingPreview(isDrawing, drawStart, mousePos, wallWidth, wallColor, wallMode) {
        if (!isDrawing || !drawStart) return;

        this.ctx.strokeStyle = wallColor;
        this.ctx.lineWidth = wallWidth;
        this.ctx.lineCap = 'round';
        this.ctx.setLineDash([5, 5]);
        this.ctx.beginPath();

        if (wallMode === 'line') {
            this.ctx.moveTo(drawStart.x, drawStart.y);
            this.ctx.lineTo(mousePos.x, mousePos.y);
        } else {
            // Draw arc preview
            const radius = Math.sqrt(
                Math.pow(mousePos.x - drawStart.x, 2) + 
                Math.pow(mousePos.y - drawStart.y, 2)
            );
            const endAngle = wallMode === 'semicircle' ? Math.PI : Math.PI / 2;
            this.ctx.arc(drawStart.x, drawStart.y, radius, 0, endAngle);
        }

        this.ctx.stroke();
        this.ctx.setLineDash([]);
    }

    drawTunnelCreationPreview(tunnelCreationStep, tunnelEntry, mousePos, tunnelRadius) {
        if (tunnelCreationStep !== 1 || !tunnelEntry) return;

        // Draw entry portal
        this.drawTunnelPortal(tunnelEntry.x, tunnelEntry.y, tunnelRadius, '#8B00FF', '#4B0082');

        // Draw preview line to mouse
        this.ctx.strokeStyle = '#666666';
        this.ctx.lineWidth = 1;
        this.ctx.setLineDash([5, 5]);
        this.ctx.beginPath();
        this.ctx.moveTo(tunnelEntry.x, tunnelEntry.y);
        this.ctx.lineTo(mousePos.x, mousePos.y);
        this.ctx.stroke();
        this.ctx.setLineDash([]);

        // Draw preview exit portal
        this.drawTunnelPortal(mousePos.x, mousePos.y, tunnelRadius, '#00FFFF', '#0080FF');
    }
}