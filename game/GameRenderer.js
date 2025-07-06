// Game Renderer Class
class GameRenderer {
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
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight - 60;

        const scaleX = this.canvas.width / CONFIG.VIRTUAL_WIDTH;
        const scaleY = this.canvas.height / CONFIG.VIRTUAL_HEIGHT;
        this.scale = Math.min(scaleX, scaleY);

        this.offsetX = (this.canvas.width - CONFIG.VIRTUAL_WIDTH * this.scale) / 2;
        this.offsetY = (this.canvas.height - CONFIG.VIRTUAL_HEIGHT * this.scale) / 2;
    }

    clear() {
        this.ctx.fillStyle = '#0c0c0c';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    startVirtualRendering() {
        this.ctx.save();
        this.ctx.translate(this.offsetX, this.offsetY);
        this.ctx.scale(this.scale, this.scale);

        // Draw background gradient
        const gradient = this.ctx.createLinearGradient(0, 0, 0, CONFIG.VIRTUAL_HEIGHT);
        gradient.addColorStop(0, '#1a1a2e');
        gradient.addColorStop(1, '#0f1419');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, CONFIG.VIRTUAL_WIDTH, CONFIG.VIRTUAL_HEIGHT);
    }

    endVirtualRendering() {
        this.ctx.restore();
    }

    renderBackgroundImage(backgroundImage, opacity) {
        if (!backgroundImage) return;

        this.ctx.save();
        this.ctx.globalAlpha = opacity || 0.5;

        // Calculate scale to fit the image within the game area while maintaining aspect ratio
        const scaleX = CONFIG.VIRTUAL_WIDTH / backgroundImage.width;
        const scaleY = CONFIG.VIRTUAL_HEIGHT / backgroundImage.height;
        const scale = Math.min(scaleX, scaleY);

        const scaledWidth = backgroundImage.width * scale;
        const scaledHeight = backgroundImage.height * scale;
        const offsetX = (CONFIG.VIRTUAL_WIDTH - scaledWidth) / 2;
        const offsetY = (CONFIG.VIRTUAL_HEIGHT - scaledHeight) / 2;

        this.ctx.drawImage(backgroundImage, offsetX, offsetY, scaledWidth, scaledHeight);
        this.ctx.restore();
    }

    renderGameObjects(gameObjects) {
        // Render background image first if available
        if (gameObjects.backgroundImage) {
            this.renderBackgroundImage(gameObjects.backgroundImage, gameObjects.backgroundOpacity);
        }

        gameObjects.walls.forEach(wall => wall.draw(this.ctx));
        gameObjects.ramps.forEach(ramp => ramp.draw(this.ctx));
        gameObjects.tunnels.forEach(tunnel => tunnel.draw(this.ctx));
        gameObjects.bumpers.forEach(bumper => bumper.draw(this.ctx));
        gameObjects.spinners.forEach(spinner => spinner.draw(this.ctx));
        gameObjects.dropTargets.forEach(target => target.draw(this.ctx));
        gameObjects.flippers.forEach(flipper => flipper.draw(this.ctx));
    }

    renderBall(ball, ballInPlay) {
        if (ballInPlay) {
            ball.draw(this.ctx);
        }
    }
}