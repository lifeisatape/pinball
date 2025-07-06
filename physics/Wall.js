
// Wall Class with improved collision detection
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
        ctx.moveTo(this.x1, this.y1);
        ctx.lineTo(this.x2, this.y2);
        ctx.stroke();
    }

    checkCollision(ball) {
        // Continuous collision detection - check path from previous to current position
        const prevPos = new Vector2D(
            ball.position.x - ball.velocity.x,
            ball.position.y - ball.velocity.y
        );
        
        const currentPos = ball.position.copy();
        
        // Check if ball trajectory intersects with wall
        const wallStart = new Vector2D(this.x1, this.y1);
        const wallEnd = new Vector2D(this.x2, this.y2);
        
        // Find the closest point on ball's trajectory to the wall
        const trajectoryIntersection = this.findTrajectoryWallIntersection(
            prevPos, currentPos, wallStart, wallEnd, ball.radius + this.width / 2
        );
        
        if (trajectoryIntersection.intersects) {
            // Move ball to safe position
            ball.position.x = trajectoryIntersection.safePosition.x;
            ball.position.y = trajectoryIntersection.safePosition.y;
            
            // Apply collision response
            this.applyCollisionResponse(ball, trajectoryIntersection.normal);
            return true;
        }
        
        // Fallback to distance-based collision detection
        const distance = distanceToLineSegment(ball.position, wallStart, wallEnd);
        
        if (distance < ball.radius + this.width / 2) {
            const normal = getNormalToLineSegment(ball.position, wallStart, wallEnd);
            
            // Push ball out of wall with extra margin
            const overlap = ball.radius + this.width / 2 - distance;
            const pushDistance = overlap + 2; // Extra margin to prevent tunneling
            
            ball.position.x += normal.x * pushDistance;
            ball.position.y += normal.y * pushDistance;
            
            this.applyCollisionResponse(ball, normal);
            return true;
        }
        
        return false;
    }
    
    findTrajectoryWallIntersection(prevPos, currentPos, wallStart, wallEnd, totalRadius) {
        // Calculate wall direction and normal
        const wallDir = new Vector2D(wallEnd.x - wallStart.x, wallEnd.y - wallStart.y);
        const wallLength = wallDir.magnitude();
        
        if (wallLength === 0) {
            return { intersects: false };
        }
        
        wallDir.normalize();
        const wallNormal = new Vector2D(-wallDir.y, wallDir.x);
        
        // Calculate trajectory direction
        const trajectory = new Vector2D(currentPos.x - prevPos.x, currentPos.y - prevPos.y);
        const trajectoryLength = trajectory.magnitude();
        
        if (trajectoryLength === 0) {
            return { intersects: false };
        }
        
        // Check if trajectory is parallel to wall
        const denominator = trajectory.x * wallNormal.x + trajectory.y * wallNormal.y;
        
        if (Math.abs(denominator) < 0.001) {
            return { intersects: false };
        }
        
        // Calculate intersection point
        const toWallStart = new Vector2D(wallStart.x - prevPos.x, wallStart.y - prevPos.y);
        const numerator = toWallStart.x * wallNormal.x + toWallStart.y * wallNormal.y;
        
        const t = numerator / denominator;
        
        // Check if intersection is within trajectory segment
        if (t < 0 || t > 1) {
            return { intersects: false };
        }
        
        // Calculate intersection point
        const intersectionPoint = new Vector2D(
            prevPos.x + trajectory.x * t,
            prevPos.y + trajectory.y * t
        );
        
        // Check if intersection point is within wall segment
        const wallParam = this.getWallParameter(intersectionPoint, wallStart, wallEnd);
        
        if (wallParam < 0 || wallParam > 1) {
            return { intersects: false };
        }
        
        // Calculate distance from intersection to wall
        const distanceToWall = Math.abs(
            (intersectionPoint.x - wallStart.x) * wallNormal.x +
            (intersectionPoint.y - wallStart.y) * wallNormal.y
        );
        
        if (distanceToWall > totalRadius) {
            return { intersects: false };
        }
        
        // Calculate safe position
        const safePosition = new Vector2D(
            intersectionPoint.x - wallNormal.x * totalRadius,
            intersectionPoint.y - wallNormal.y * totalRadius
        );
        
        return {
            intersects: true,
            safePosition: safePosition,
            normal: wallNormal.copy()
        };
    }
    
    getWallParameter(point, wallStart, wallEnd) {
        const wallVector = new Vector2D(wallEnd.x - wallStart.x, wallEnd.y - wallStart.y);
        const pointVector = new Vector2D(point.x - wallStart.x, point.y - wallStart.y);
        
        const wallLengthSq = wallVector.x * wallVector.x + wallVector.y * wallVector.y;
        
        if (wallLengthSq === 0) {
            return 0;
        }
        
        return (pointVector.x * wallVector.x + pointVector.y * wallVector.y) / wallLengthSq;
    }
    
    applyCollisionResponse(ball, normal) {
        // Ensure normal is pointing away from wall
        if (ball.velocity.dot(normal) > 0) {
            normal.x = -normal.x;
            normal.y = -normal.y;
        }
        
        // Calculate reflection
        const dotProduct = ball.velocity.dot(normal);
        
        if (dotProduct < 0) {
            ball.velocity.x -= 2 * dotProduct * normal.x;
            ball.velocity.y -= 2 * dotProduct * normal.y;
            ball.velocity.multiply(CONFIG.BOUNCE_DAMPING);
        }
    }
}
