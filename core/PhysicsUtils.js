
// Physics Utilities for improved collision detection
class PhysicsUtils {
    // Непрерывная детекция коллизий между движущейся окружностью и статической окружностью
    static sweepSphereVsSphere(movingCenter, movingRadius, movingVelocity, staticCenter, staticRadius, deltaTime) {
        const relativeVelocity = movingVelocity.copy();
        const relativePosition = movingCenter.copy().subtract(staticCenter);
        
        const a = relativeVelocity.dot(relativeVelocity);
        const b = 2 * relativePosition.dot(relativeVelocity);
        const c = relativePosition.dot(relativePosition) - Math.pow(movingRadius + staticRadius, 2);
        
        const discriminant = b * b - 4 * a * c;
        
        if (discriminant < 0) return null; // Нет пересечения
        
        const t1 = (-b - Math.sqrt(discriminant)) / (2 * a);
        const t2 = (-b + Math.sqrt(discriminant)) / (2 * a);
        
        // Возвращаем время первого пересечения в диапазоне [0, deltaTime]
        const firstHit = Math.min(t1, t2);
        if (firstHit >= 0 && firstHit <= deltaTime) {
            return {
                time: firstHit,
                position: movingCenter.copy().add(relativeVelocity.copy().multiply(firstHit))
            };
        }
        
        return null;
    }
    
    // Проверка пересечения движущейся окружности с линейным сегментом
    static sweepSphereVsLineSegment(sphereCenter, sphereRadius, velocity, lineStart, lineEnd, deltaTime) {
        const lineVector = lineEnd.copy().subtract(lineStart);
        const sphereToLineStart = sphereCenter.copy().subtract(lineStart);
        
        const a = velocity.dot(velocity);
        const b = 2 * velocity.dot(sphereToLineStart);
        const c = sphereToLineStart.dot(sphereToLineStart) - sphereRadius * sphereRadius;
        
        if (Math.abs(a) < 0.0001) {
            // Сфера не движется относительно линии
            const distance = PhysicsUtils.distancePointToLineSegment(sphereCenter, lineStart, lineEnd);
            return distance <= sphereRadius ? { time: 0, position: sphereCenter.copy() } : null;
        }
        
        const discriminant = b * b - 4 * a * c;
        if (discriminant < 0) return null;
        
        const sqrtDiscriminant = Math.sqrt(discriminant);
        const t1 = (-b - sqrtDiscriminant) / (2 * a);
        const t2 = (-b + sqrtDiscriminant) / (2 * a);
        
        const times = [t1, t2].filter(t => t >= 0 && t <= deltaTime);
        if (times.length === 0) return null;
        
        const hitTime = Math.min(...times);
        const hitPosition = sphereCenter.copy().add(velocity.copy().multiply(hitTime));
        
        // Проверяем, что точка попадания находится на сегменте линии
        const projection = PhysicsUtils.projectPointOnLineSegment(hitPosition, lineStart, lineEnd);
        const distanceToSegment = hitPosition.distanceTo(projection);
        
        if (distanceToSegment <= sphereRadius) {
            return { time: hitTime, position: hitPosition, hitPoint: projection };
        }
        
        return null;
    }
    
    // Расстояние от точки до линейного сегмента
    static distancePointToLineSegment(point, lineStart, lineEnd) {
        const lineVector = lineEnd.copy().subtract(lineStart);
        const pointVector = point.copy().subtract(lineStart);
        
        const lineLength = lineVector.magnitude();
        if (lineLength < 0.0001) {
            return pointVector.magnitude();
        }
        
        const projection = pointVector.dot(lineVector) / (lineLength * lineLength);
        const clampedProjection = Math.max(0, Math.min(1, projection));
        
        const closestPoint = lineStart.copy().add(lineVector.copy().multiply(clampedProjection));
        return point.distanceTo(closestPoint);
    }
    
    // Проекция точки на линейный сегмент
    static projectPointOnLineSegment(point, lineStart, lineEnd) {
        const lineVector = lineEnd.copy().subtract(lineStart);
        const pointVector = point.copy().subtract(lineStart);
        
        const lineLength = lineVector.magnitude();
        if (lineLength < 0.0001) {
            return lineStart.copy();
        }
        
        const projection = pointVector.dot(lineVector) / (lineLength * lineLength);
        const clampedProjection = Math.max(0, Math.min(1, projection));
        
        return lineStart.copy().add(lineVector.copy().multiply(clampedProjection));
    }
    
    // Разделение двух пересекающихся окружностей
    static separateCircles(center1, radius1, center2, radius2, separationFactor = 1.0) {
        const distance = center1.distanceTo(center2);
        const minDistance = radius1 + radius2;
        
        if (distance < minDistance && distance > 0.0001) {
            const overlap = minDistance - distance;
            const separationDistance = overlap * separationFactor + CONFIG.COLLISION_TOLERANCE;
            
            const direction = center1.copy().subtract(center2).normalize();
            const separation = direction.multiply(separationDistance * 0.5);
            
            return {
                separation1: separation.copy(),
                separation2: separation.copy().multiply(-1)
            };
        }
        
        return null;
    }
    
    // Отражение вектора относительно нормали
    static reflect(vector, normal) {
        const dotProduct = vector.dot(normal);
        return vector.copy().subtract(normal.copy().multiply(2 * dotProduct));
    }
    
    // Проверка, движется ли объект в сторону поверхности
    static isApproaching(velocity, normal) {
        return velocity.dot(normal) < 0;
    }
}
