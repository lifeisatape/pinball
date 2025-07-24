// Input Manager Class
class InputManager {
    constructor(canvas, flippers) {
        this.canvas = canvas;
        this.flippers = flippers;
        this.activeTouches = new Set();
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Keyboard events
        document.addEventListener('keydown', (e) => {
            // Prevent default arrow key behavior (scrolling)
            if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
                e.preventDefault();
            }

            if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
                this.flippers[0].activate();
            }
            if (e.code === 'ArrowRight' || e.code === 'KeyD') {
                this.flippers[1].activate();
            }
        });

        document.addEventListener('keyup', (e) => {
            if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
                this.flippers[0].deactivate();
            }
            if (e.code === 'ArrowRight' || e.code === 'KeyD') {
                this.flippers[1].deactivate();
            }
        });

        // Touch events
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const rect = this.canvas.getBoundingClientRect();

            // Process all new touches
            for (let i = 0; i < e.touches.length; i++) {
                const touch = e.touches[i];
                const screenX = touch.clientX - rect.left;
                const isLeft = screenX < this.canvas.width * 0.5;

                // Add touch to active set
                this.activeTouches.add(touch.identifier + (isLeft ? '_left' : '_right'));

                // Activate appropriate flipper
                if (isLeft) {
                    this.flippers[0].activate();
                } else {
                    this.flippers[1].activate();
                }
            }
        });

        this.canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            const rect = this.canvas.getBoundingClientRect();

            // Process ended touches
            for (let i = 0; i < e.changedTouches.length; i++) {
                const touch = e.changedTouches[i];
                const screenX = touch.clientX - rect.left;
                const isLeft = screenX < this.canvas.width * 0.5;

                // Remove touch from active set
                this.activeTouches.delete(touch.identifier + (isLeft ? '_left' : '_right'));
            }

            // Check if any touches are still active for each flipper
            let leftActive = false;
            let rightActive = false;

            this.activeTouches.forEach(touchId => {
                if (touchId.endsWith('_left')) leftActive = true;
                if (touchId.endsWith('_right')) rightActive = true;
            });

            // Deactivate flippers that have no active touches
            if (!leftActive) this.flippers[0].deactivate();
            if (!rightActive) this.flippers[1].deactivate();
        });

        // Mouse events
        this.canvas.addEventListener('mousedown', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const screenX = e.clientX - rect.left;
            this.handleInput(screenX, true);
        });

        this.canvas.addEventListener('mouseup', () => {
            this.handleInput(0, false);
        });
    }

    handleInput(screenX, isPressed) {
        if (isPressed) {
            if (screenX < this.canvas.width * 0.5) {
                this.flippers[0].activate();
            } else {
                this.flippers[1].activate();
            }
        } else {
            this.flippers[0].deactivate();
            this.flippers[1].deactivate();
        }
    }
}