
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
}
