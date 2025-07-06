
// Tunnel Class
class Tunnel {
    constructor(entryX, entryY, exitX, exitY, radius = 15) {
        this.entry = new Vector2D(entryX, entryY);
        this.exit = new Vector2D(exitX, exitY);
        this.radius = radius;
        this.cooldown = 0;
        this.maxCooldown = 60; // Prevent immediate re-entry
        this.entryAnimation = 0;
        this.exitAnimation = 0;

        // For compatibility with editor
        this.entryX = entryX;
        this.entryY = entryY;
        this.exitX = exitX;
        this.exitY = exitY;
    }

    update() {
        if (this.cooldown > 0) {
            this.cooldown--;
        }
        if (this.entryAnimation > 0) {
            this.entryAnimation -= 0.05;
        }
        if (this.exitAnimation > 0) {
            this.exitAnimation -= 0.05;
        }
    }

    checkCollision(ball) {
        if (this.cooldown > 0) return false;

        const dx = ball.position.x - this.entry.x;
        const dy = ball.position.y - this.entry.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < ball.radius + this.radius) {
            // Teleport ball to exit
            ball.position.x = this.exit.x;
            ball.position.y = this.exit.y;

            // Preserve velocity with slight boost
            ball.velocity.multiply(1.1);

            // Start animations
            this.entryAnimation = 1;
            this.exitAnimation = 1;

            // Set cooldown
            this.cooldown = this.maxCooldown;

            return true;
        }
        return false;
    }

    draw(ctx) {
        // Draw entry portal
        this.drawPortal(ctx, this.entry, this.entryAnimation, '#8B00FF', '#4B0082');

        // Draw exit portal  
        this.drawPortal(ctx, this.exit, this.exitAnimation, '#00FFFF', '#0080FF');
    }

    drawPortal(ctx, position, animation, innerColor, outerColor) {
        const animRadius = this.radius + animation * 5;

        // Outer glow
        const gradient = ctx.createRadialGradient(
            position.x, position.y, 0,
            position.x, position.y, animRadius
        );
        gradient.addColorStop(0, innerColor);
        gradient.addColorStop(0.6, outerColor);
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0.8)');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(position.x, position.y, animRadius, 0, Math.PI * 2);
        ctx.fill();

        // Inner portal
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(position.x, position.y, this.radius * 0.6, 0, Math.PI * 2);
        ctx.fill();

        // Animated ring
        if (animation > 0) {
            ctx.strokeStyle = innerColor;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(position.x, position.y, this.radius + animation * 10, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Portal edge
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(position.x, position.y, this.radius, 0, Math.PI * 2);
        ctx.stroke();
    }
}
