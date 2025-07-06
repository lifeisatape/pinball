
// Ball Class with enhanced collision detection
class Ball {
    constructor(x, y) {
        this.position = new Vector2D(x, y);
        this.velocity = new Vector2D(0, 0);
        this.radius = CONFIG.BALL_RADIUS;
        this.prevPosition = new Vector2D(x, y);
    }

    update() {
        // Store previous position for continuous collision detection
        this.prevPosition.x = this.position.x;
        this.prevPosition.y = this.position.y;
        
        this.velocity.add(new Vector2D(0, CONFIG.GRAVITY));
        this.velocity.clamp(CONFIG.MAX_BALL_SPEED);
        this.velocity.multiply(CONFIG.FRICTION);
        
        // More aggressive sub-stepping for high-speed collisions
        const speed = this.velocity.magnitude();
        // Use smaller step size for better collision detection
        const steps = Math.max(1, Math.ceil(speed / (this.radius * 0.25)));
        
        const stepVelocity = new Vector2D(
            this.velocity.x / steps,
            this.velocity.y / steps
        );
        
        for (let i = 0; i < steps; i++) {
            // Store position before step
            const beforeStep = this.position.copy();
            
            this.position.add(stepVelocity);
            
            if (this.handleWallCollisions()) {
                return true; // Ball lost
            }
            
            // Additional safety check: ensure we didn't move too far
            const stepDistance = beforeStep.distanceTo(this.position);
            if (stepDistance > this.radius) {
                // If step was too large, interpolate more carefully
                const safeSteps = Math.ceil(stepDistance / (this.radius * 0.1));
                const safeStepVelocity = new Vector2D(
                    stepVelocity.x / safeSteps,
                    stepVelocity.y / safeSteps
                );
                
                // Reset to before step and take smaller steps
                this.position.x = beforeStep.x;
                this.position.y = beforeStep.y;
                
                for (let j = 0; j < safeSteps; j++) {
                    this.position.add(safeStepVelocity);
                    if (this.handleWallCollisions()) {
                        return true;
                    }
                }
            }
        }
        
        return false;
    }

    handleWallCollisions() {
        let velocityChanged = false;
        
        // Left boundary
        if (this.position.x < this.radius) {
            this.position.x = this.radius;
            if (this.velocity.x < 0) {
                this.velocity.x *= -CONFIG.BOUNCE_DAMPING;
                velocityChanged = true;
            }
        }
        
        // Right boundary
        if (this.position.x > CONFIG.VIRTUAL_WIDTH - this.radius) {
            this.position.x = CONFIG.VIRTUAL_WIDTH - this.radius;
            if (this.velocity.x > 0) {
                this.velocity.x *= -CONFIG.BOUNCE_DAMPING;
                velocityChanged = true;
            }
        }
        
        // Top boundary
        if (this.position.y < this.radius) {
            this.position.y = this.radius;
            if (this.velocity.y < 0) {
                this.velocity.y *= -CONFIG.BOUNCE_DAMPING;
                velocityChanged = true;
            }
        }
        
        // Bottom boundary (ball lost)
        return this.position.y > CONFIG.VIRTUAL_HEIGHT + 50;
    }

    draw(ctx) {
        const gradient = ctx.createRadialGradient(
            this.position.x - 3, this.position.y - 3, 0,
            this.position.x, this.position.y, this.radius
        );
        gradient.addColorStop(0, '#ffffff');
        gradient.addColorStop(0.3, '#ffff80');
        gradient.addColorStop(1, '#ffcc00');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();
    }
}
