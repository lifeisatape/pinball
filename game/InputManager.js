// Input Manager Class
class InputManager {
    constructor(canvas, flippers) {
        this.canvas = canvas;
        this.flippers = flippers;
        this.activeTouches = new Set();
        this.gameActive = false; // ✅ НОВОЕ: флаг активности игры
        this.setupEventListeners();
    }

    // ✅ Добавьте методы управления
    setGameActive(active) {
        this.gameActive = active;
    }

    setupEventListeners() {
        // Keyboard events (без изменений)
        document.addEventListener('keydown', (e) => {
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

        // ✅ НОВОЕ: Touch events на весь document (но работают только во время игры)
        document.addEventListener('touchstart', (e) => {
            if (!this.gameActive) return; // ✅ Работает только во время игры
            
            e.preventDefault();
            
            for (let i = 0; i < e.touches.length; i++) {
                const touch = e.touches[i];
                const screenX = touch.clientX;
                const screenWidth = window.innerWidth;
                const isLeft = screenX < screenWidth * 0.5;

                this.activeTouches.add(touch.identifier + (isLeft ? '_left' : '_right'));

                if (isLeft) {
                    this.flippers[0].activate();
                } else {
                    this.flippers[1].activate();
                }
            }
        });

        document.addEventListener('touchend', (e) => {
            if (!this.gameActive) return; // ✅ Работает только во время игры
            
            e.preventDefault();
            
            for (let i = 0; i < e.changedTouches.length; i++) {
                const touch = e.changedTouches[i];
                const screenX = touch.clientX;
                const screenWidth = window.innerWidth;
                const isLeft = screenX < screenWidth * 0.5;

                this.activeTouches.delete(touch.identifier + (isLeft ? '_left' : '_right'));
            }

            // Check if any touches are still active for each flipper
            let leftActive = false;
            let rightActive = false;

            this.activeTouches.forEach(touchId => {
                if (touchId.endsWith('_left')) leftActive = true;
                if (touchId.endsWith('_right')) rightActive = true;
            });

            if (!leftActive) this.flippers[0].deactivate();
            if (!rightActive) this.flippers[1].deactivate();
        });

        // Mouse events (оставляем на canvas как было)
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