
// Wall Class
class Wall {
    constructor(x1, y1, x2, y2, color = '#ff4444', width = 20) {
        this.x1 = x1;
        this.y1 = y1;
        this.x2 = x2;
        this.y2 = y2;
        this.color = color;
        this.width = width;
    }

    draw(ctx) {
        ctx.strokeStyle = this.color;
        ctx.lineWidth = this.width;
        ctx.lineCap = 'round';
        ctx.beginPath();
        
        if (this.type === 'semicircle' || this.type === 'quarter') {
            // Draw arc
            ctx.arc(this.centerX, this.centerY, this.radius, this.startAngle, this.endAngle);
        } else {
            // Draw straight line
            ctx.moveTo(this.x1, this.y1);
            ctx.lineTo(this.x2, this.y2);
        }
        
        ctx.stroke();
    }

    checkCollision(ball) {
        if (this.type === 'semicircle' || this.type === 'quarter') {
            // Handle arc collision
            const dx = ball.position.x - this.centerX;
            const dy = ball.position.y - this.centerY;
            const distanceFromCenter = Math.sqrt(dx * dx + dy * dy);

            // Check if ball is near the arc
            const minDistance = this.radius - this.width / 2 - ball.radius;
            const maxDistance = this.radius + this.width / 2 + ball.radius;

            if (distanceFromCenter >= minDistance && distanceFromCenter <= maxDistance) {
                // Check if ball is within the arc's angle range
                let angle = Math.atan2(dy, dx);
                if (angle < 0) angle += Math.PI * 2;

                let startAngle = this.startAngle;
                let endAngle = this.endAngle;
                if (startAngle < 0) startAngle += Math.PI * 2;
                if (endAngle < 0) endAngle += Math.PI * 2;

                let withinArc = false;
                if (startAngle <= endAngle) {
                    withinArc = angle >= startAngle && angle <= endAngle;
                } else {
                    withinArc = angle >= startAngle || angle <= endAngle;
                }

                if (withinArc) {
                    // Calculate collision based on whether ball is inside or outside the arc
                    const targetRadius = this.radius;
                    const currentDistance = distanceFromCenter;

                    if (Math.abs(currentDistance - targetRadius) < this.width / 2 + ball.radius) {
                        // Collision detected
                        const normal = new Vector2D(dx / distanceFromCenter, dy / distanceFromCenter);
                        
                        // Determine collision type and adjust normal
                        const isInside = currentDistance < targetRadius;
                        if (isInside) {
                            normal.x *= -1;
                            normal.y *= -1;
                        }

                        // Calculate required separation distance
                        const requiredDistance = isInside ? 
                            (targetRadius - this.width / 2 - ball.radius) :
                            (targetRadius + this.width / 2 + ball.radius);
                        
                        const separationDistance = Math.abs(requiredDistance - currentDistance);
                        
                        // Push ball to safe position with minimal margin
                        const safetyMargin = 0.5;
                        
                        if (isInside) {
                            const targetDistance = targetRadius - this.width / 2 - ball.radius - safetyMargin;
                            ball.position.x = this.centerX + normal.x * targetDistance;
                            ball.position.y = this.centerY + normal.y * targetDistance;
                        } else {
                            const targetDistance = targetRadius + this.width / 2 + ball.radius + safetyMargin;
                            ball.position.x = this.centerX + normal.x * targetDistance;
                            ball.position.y = this.centerY + normal.y * targetDistance;
                        }

                        // Reflect velocity only if moving towards surface
                        const dotProduct = ball.velocity.dot(normal);
                        if (dotProduct < 0) {
                            ball.velocity.x -= 2 * dotProduct * normal.x;
                            ball.velocity.y -= 2 * dotProduct * normal.y;
                            ball.velocity.multiply(CONFIG.BOUNCE_DAMPING);
                        }

                        return true;
                    }
                }
            }
        } else {
            // Handle straight line collision
            const distance = distanceToLineSegment(ball.position, new Vector2D(this.x1, this.y1), new Vector2D(this.x2, this.y2));

            if (distance < ball.radius + this.width / 2) {
                const normal = getNormalToLineSegment(ball.position, new Vector2D(this.x1, this.y1), new Vector2D(this.x2, this.y2));

                // Calculate exact separation needed
                const requiredDistance = ball.radius + this.width / 2;
                const separationNeeded = requiredDistance - distance;
                const safetyMargin = 0.5;
                
                // Push ball to safe position
                const totalPush = separationNeeded + safetyMargin;
                ball.position.x += normal.x * totalPush;
                ball.position.y += normal.y * totalPush;

                // Reflect velocity only if moving towards wall
                const dotProduct = ball.velocity.dot(normal);
                if (dotProduct < 0) {
                    ball.velocity.x -= 2 * dotProduct * normal.x;
                    ball.velocity.y -= 2 * dotProduct * normal.y;
                    ball.velocity.multiply(CONFIG.BOUNCE_DAMPING);
                }

                return true;
            }
        }
        return false;
    }
}
