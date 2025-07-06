// Utility functions
function distanceToLineSegment(point, lineStart, lineEnd) {
    const A = point.x - lineStart.x;
    const B = point.y - lineStart.y;
    const C = lineEnd.x - lineStart.x;
    const D = lineEnd.y - lineStart.y;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    
    // Если длина линии равна 0, возвращаем расстояние до точки
    if (lenSq === 0) {
        return Math.sqrt(A * A + B * B);
    }
    
    let param = dot / lenSq;
    
    // Ограничиваем параметр в пределах сегмента
    param = Math.max(0, Math.min(1, param));

    const xx = lineStart.x + param * C;
    const yy = lineStart.y + param * D;

    const dx = point.x - xx;
    const dy = point.y - yy;
    return Math.sqrt(dx * dx + dy * dy);
}

function getNormalToLineSegment(point, lineStart, lineEnd) {
    const dx = lineEnd.x - lineStart.x;
    const dy = lineEnd.y - lineStart.y;
    
    // Если линия имеет нулевую длину, возвращаем нормаль к точке
    if (dx === 0 && dy === 0) {
        const toPoint = new Vector2D(point.x - lineStart.x, point.y - lineStart.y);
        return toPoint.normalize();
    }
    
    const normal = new Vector2D(-dy, dx).normalize();

    // Находим ближайшую точку на линии
    const A = point.x - lineStart.x;
    const B = point.y - lineStart.y;
    const C = lineEnd.x - lineStart.x;
    const D = lineEnd.y - lineStart.y;
    
    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    const param = Math.max(0, Math.min(1, dot / lenSq));
    
    const closestX = lineStart.x + param * C;
    const closestY = lineStart.y + param * D;
    
    const toPoint = new Vector2D(point.x - closestX, point.y - closestY);
    if (toPoint.magnitude() > 0) {
        return toPoint.normalize();
    }
    
    // Если точка лежит на линии, используем перпендикуляр
    if (normal.dot(toPoint) < 0) {
        normal.multiply(-1);
    }

    return normal;
}