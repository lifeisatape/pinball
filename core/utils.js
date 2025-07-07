// Utility functions for collision detection
function distanceToLineSegment(point, lineStart, lineEnd) {
    const A = point.x - lineStart.x;
    const B = point.y - lineStart.y;
    const C = lineEnd.x - lineStart.x;
    const D = lineEnd.y - lineStart.y;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;

    if (lenSq === 0) {
        return Math.sqrt(A * A + B * B);
    }

    let param = dot / lenSq;

    // Не ограничиваем param для правильной обработки концов
    const xx = lineStart.x + param * C;
    const yy = lineStart.y + param * D;

    const dx = point.x - xx;
    const dy = point.y - yy;
    return Math.sqrt(dx * dx + dy * dy);
}

function getNormalToLineSegment(point, lineStart, lineEnd) {
    const A = point.x - lineStart.x;
    const B = point.y - lineStart.y;
    const C = lineEnd.x - lineStart.x;
    const D = lineEnd.y - lineStart.y;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;

    if (lenSq === 0) {
        const dist = Math.sqrt(A * A + B * B);
        return new Vector2D(A / dist, B / dist);
    }

    let param = dot / lenSq;

    // Определяем ближайшую точку на отрезке
    let closestX, closestY;
    if (param < 0) {
        // Ближе к началу отрезка
        closestX = lineStart.x;
        closestY = lineStart.y;
    } else if (param > 1) {
        // Ближе к концу отрезка
        closestX = lineEnd.x;
        closestY = lineEnd.y;
    } else {
        // На отрезке
        closestX = lineStart.x + param * C;
        closestY = lineStart.y + param * D;
    }

    const dx = point.x - closestX;
    const dy = point.y - closestY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist === 0) {
        // Если точка совпадает с ближайшей точкой, используем перпендикуляр к отрезку
        const lineLength = Math.sqrt(lenSq);
        return new Vector2D(-D / lineLength, C / lineLength);
    }

    return new Vector2D(dx / dist, dy / dist);
}