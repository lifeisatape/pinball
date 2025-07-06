
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
        const wallStart = new Vector2D(this.x1, this.y1);
        const wallEnd = new Vector2D(this.x2, this.y2);
        const totalRadius = ball.radius + this.width / 2;
        
        // First: Swept sphere collision detection
        const sweptCollision = this.sweptSphereCollision(ball, wallStart, wallEnd, totalRadius);
        if (sweptCollision.hit) {
            ball.position.x = sweptCollision.safePosition.x;
            ball.position.y = sweptCollision.safePosition.y;
            this.applyCollisionResponse(ball, sweptCollision.normal);
            return true;
        }
        
        // Second: Enhanced trajectory intersection
        const prevPos = ball.prevPosition.copy();
        const currentPos = ball.position.copy();
        
        const trajectoryIntersection = this.findTrajectoryWallIntersection(
            prevPos, currentPos, wallStart, wallEnd, totalRadius
        );
        
        if (trajectoryIntersection.intersects) {
            ball.position.x = trajectoryIntersection.safePosition.x;
            ball.position.y = trajectoryIntersection.safePosition.y;
            this.applyCollisionResponse(ball, trajectoryIntersection.normal);
            return true;
        }
        
        // Third: Standard distance-based collision with stricter margin
        const distance = distanceToLineSegment(ball.position, wallStart, wallEnd);
        
        if (distance < totalRadius) {
            const normal = getNormalToLineSegment(ball.position, wallStart, wallEnd);
            
            // More aggressive push with safety margin
            const overlap = totalRadius - distance;
            const pushDistance = overlap + Math.max(3, ball.velocity.magnitude() * 0.1);
            
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
    
    sweptSphereCollision(ball, wallStart, wallEnd, totalRadius) {
        // Create expanded wall for swept sphere collision
        const wallDir = new Vector2D(wallEnd.x - wallStart.x, wallEnd.y - wallStart.y);
        const wallLength = wallDir.magnitude();
        
        if (wallLength === 0) {
            return { hit: false };
        }
        
        wallDir.normalize();
        const wallNormal = new Vector2D(-wallDir.y, wallDir.x);
        
        // Expand wall by ball radius
        const expandedStart1 = new Vector2D(
            wallStart.x + wallNormal.x * totalRadius,
            wallStart.y + wallNormal.y * totalRadius
        );
        const expandedEnd1 = new Vector2D(
            wallEnd.x + wallNormal.x * totalRadius,
            wallEnd.y + wallNormal.y * totalRadius
        );
        const expandedStart2 = new Vector2D(
            wallStart.x - wallNormal.x * totalRadius,
            wallStart.y - wallNormal.y * totalRadius
        );
        const expandedEnd2 = new Vector2D(
            wallEnd.x - wallNormal.x * totalRadius,
            wallEnd.y - wallNormal.y * totalRadius
        );
        
        // Test ray-line intersection with ball's movement
        const rayStart = ball.prevPosition.copy();
        const rayEnd = ball.position.copy();
        
        // Check intersection with both expanded edges
        const intersect1 = this.rayLineIntersection(rayStart, rayEnd, expandedStart1, expandedEnd1);
        const intersect2 = this.rayLineIntersection(rayStart, rayEnd, expandedStart2, expandedEnd2);
        
        let bestIntersection = null;
        let bestDistance = Infinity;
        
        if (intersect1.hit) {
            const dist = rayStart.distanceTo(intersect1.point);
            if (dist < bestDistance) {
                bestDistance = dist;
                bestIntersection = {
                    point: intersect1.point,
                    normal: wallNormal.copy()
                };
            }
        }
        
        if (intersect2.hit) {
            const dist = rayStart.distanceTo(intersect2.point);
            if (dist < bestDistance) {
                bestDistance = dist;
                bestIntersection = {
                    point: intersect2.point,
                    normal: new Vector2D(-wallNormal.x, -wallNormal.y)
                };
            }
        }
        
        if (bestIntersection) {
            return {
                hit: true,
                safePosition: bestIntersection.point,
                normal: bestIntersection.normal
            };
        }
        
        return { hit: false };
    }
    
    rayLineIntersection(rayStart, rayEnd, lineStart, lineEnd) {
        const rayDir = new Vector2D(rayEnd.x - rayStart.x, rayEnd.y - rayStart.y);
        const lineDir = new Vector2D(lineEnd.x - lineStart.x, lineEnd.y - lineStart.y);
        
        const denominator = rayDir.x * lineDir.y - rayDir.y * lineDir.x;
        
        if (Math.abs(denominator) < 0.0001) {
            return { hit: false }; // Parallel lines
        }
        
        const toLine = new Vector2D(lineStart.x - rayStart.x, lineStart.y - rayStart.y);
        
        const t = (toLine.x * lineDir.y - toLine.y * lineDir.x) / denominator;
        const u = (toLine.x * rayDir.y - toLine.y * rayDir.x) / denominator;
        
        if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
            return {
                hit: true,
                point: new Vector2D(
                    rayStart.x + t * rayDir.x,
                    rayStart.y + t * rayDir.y
                )
            };
        }
        
        return { hit: false };
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
