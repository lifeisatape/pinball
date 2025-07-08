
// Vector2D Class
class Vector2D {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }

    add(vector) {
        this.x += vector.x;
        this.y += vector.y;
        return this;
    }

    multiply(scalar) {
        this.x *= scalar;
        this.y *= scalar;
        return this;
    }

    magnitude() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }

    normalize() {
        const mag = this.magnitude();
        if (mag > 0) {
            this.x /= mag;
            this.y /= mag;
        }
        return this;
    }

    copy() {
        return new Vector2D(this.x, this.y);
    }

    dot(vector) {
        return this.x * vector.x + this.y * vector.y;
    }

    clamp(maxLength) {
        const mag = this.magnitude();
        if (mag > maxLength) {
            this.normalize().multiply(maxLength);
        }
        return this;
    }

    subtract(vector) {
        this.x -= vector.x;
        this.y -= vector.y;
        return this;
    }

    distanceTo(vector) {
        const dx = this.x - vector.x;
        const dy = this.y - vector.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    static distance(v1, v2) {
        const dx = v1.x - v2.x;
        const dy = v1.y - v2.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    static lerp(v1, v2, t) {
        return new Vector2D(
            v1.x + (v2.x - v1.x) * t,
            v1.y + (v2.y - v1.y) * t
        );
    }
}
