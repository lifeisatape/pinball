// Spinner Class
class Spinner {
    constructor(x, y, width = 30, height = 8) {
        this.position = new Vector2D(x, y);
        this.width = width;
        this.height = height;
        this.angle = 0;
        this.angularVelocity = 0;
        this.points = 50;
        this.x = x; // For compatibility
        this.y = y; // For compatibility
    }

    update() {
        this.angle += this.angularVelocity;
        this.angularVelocity *= 0.95;
    }

    checkCollision(ball) {
        const cos = Math.cos(this.angle);
        const sin = Math.sin(this.angle);

        const dx = ball.position.x - this.position.x;
        const dy = ball.position.y - this.position.y;
        const localX = cos * dx + sin * dy;
        const localY = -sin * dx + cos * dy;

        if (Math.abs(localX) < this.width / 2 + ball.radius &&
            Math.abs(localY) < this.height / 2 + ball.radius) {

            const spinDirection = localX > 0 ? 1 : -1;
            this.angularVelocity += spinDirection * 0.3;

            const normal = new Vector2D(
                Math.abs(localX) > Math.abs(localY) ? Math.sign(localX) : 0,
                Math.abs(localY) > Math.abs(localX) ? Math.sign(localY) : 0
            );

            const worldNormalX = cos * normal.x - sin * normal.y;
            const worldNormalY = sin * normal.x + cos * normal.y;

            ball.velocity.x += worldNormalX * CONFIG.SPINNER_BOUNCE_FORCE;
            ball.velocity.y += worldNormalY * CONFIG.SPINNER_BOUNCE_FORCE;

             // Play spinner sound
            window.soundManager.playSound('spinner');

            return this.points;
        }
        return 0;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.position.x, this.position.y);
        ctx.rotate(this.angle);

        const gradient = ctx.createLinearGradient(-this.width/2, 0, this.width/2, 0);
        gradient.addColorStop(0, '#4444ff');
        gradient.addColorStop(0.5, '#6666ff');
        gradient.addColorStop(1, '#4444ff');

        ctx.fillStyle = gradient;
        ctx.fillRect(-this.width/2, -this.height/2, this.width, this.height);

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.strokeRect(-this.width/2, -this.height/2, this.width, this.height);

        ctx.restore();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(this.position.x, this.position.y, 3, 0, Math.PI * 2);
        ctx.fill();
    }
}