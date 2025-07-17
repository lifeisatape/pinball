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
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;

        const scaleX = screenWidth / CONFIG.VIRTUAL_WIDTH;
        const scaleY = screenHeight / CONFIG.VIRTUAL_HEIGHT;
        this.scale = Math.min(scaleX, scaleY);

        const gameAreaWidth = CONFIG.VIRTUAL_WIDTH * this.scale;
        const gameAreaHeight = CONFIG.VIRTUAL_HEIGHT * this.scale;

        this.canvas.width = screenWidth;
        this.canvas.height = gameAreaHeight;

        this.canvas.style.height = `${gameAreaHeight}px`;

        this.offsetX = (this.canvas.width - gameAreaWidth) / 2;
        this.offsetY = this.canvas.height - CONFIG.VIRTUAL_HEIGHT * this.scale;
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

    drawBackgroundImage(backgroundImage, opacity) {
        if (!backgroundImage) return;

        this.ctx.save();
        this.ctx.globalAlpha = opacity || 0.5;

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

    drawOverlayImage(overlayImage, opacity) {
        if (!overlayImage) return;

        this.ctx.save();
        this.ctx.globalAlpha = opacity || 0.7;

        const scaleX = CONFIG.VIRTUAL_WIDTH / overlayImage.width;
        const scaleY = CONFIG.VIRTUAL_HEIGHT / overlayImage.height;
        const scale = Math.min(scaleX, scaleY);

        const scaledWidth = overlayImage.width * scale;
        const scaledHeight = overlayImage.height * scale;
        const offsetX = (CONFIG.VIRTUAL_WIDTH - scaledWidth) / 2;
        const offsetY = (CONFIG.VIRTUAL_HEIGHT - scaledHeight) / 2;

        this.ctx.drawImage(overlayImage, offsetX, offsetY, scaledWidth, scaledHeight);
        this.ctx.restore();
    }

    endVirtualRendering() {
        this.ctx.restore();
    }

    renderGameObjects(gameObjects) {
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