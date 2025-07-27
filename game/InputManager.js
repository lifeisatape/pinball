// Input Manager Class - ИСПРАВЛЕННАЯ ВЕРСИЯ
class InputManager {
    constructor(canvas, flippers) {
        this.canvas = canvas;
        this.flippers = flippers;
        this.activeTouches = new Map(); // ✅ Изменено: Map вместо Set для хранения позиций
        this.gameActive = false;
        this.setupEventListeners();
    }

    setGameActive(active) {
        this.gameActive = active;
        
        // ✅ НОВОЕ: При деактивации сбрасываем все touches и флипперы
        if (!active) {
            this.activeTouches.clear();
            this.flippers[0].deactivate();
            this.flippers[1].deactivate();
        }
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

        // ✅ ИСПРАВЛЕННЫЕ Touch events
        document.addEventListener('touchstart', (e) => {
            if (!this.gameActive) return;
            
            e.preventDefault();
            
            for (let i = 0; i < e.touches.length; i++) {
                const touch = e.touches[i];
                const screenX = touch.clientX;
                const screenWidth = window.innerWidth;
                const isLeft = screenX < screenWidth * 0.5;

                // ✅ ИСПРАВЛЕНИЕ: Сохраняем исходную позицию каждого touch
                this.activeTouches.set(touch.identifier, isLeft);

                if (isLeft) {
                    this.flippers[0].activate();
                } else {
                    this.flippers[1].activate();
                }
            }
        });

        document.addEventListener('touchend', (e) => {
            if (!this.gameActive) return;
            
            e.preventDefault();
            
            for (let i = 0; i < e.changedTouches.length; i++) {
                const touch = e.changedTouches[i];
                // ✅ ИСПРАВЛЕНИЕ: Удаляем по ID, не зависимо от текущей позиции
                this.activeTouches.delete(touch.identifier);
            }

            // ✅ ИСПРАВЛЕНИЕ: Пересчитываем состояние флипперов
            this.updateFlipperStates();
        });

        // ✅ НОВОЕ: Обработка touchcancel (важно для предотвращения залипания)
        document.addEventListener('touchcancel', (e) => {
            if (!this.gameActive) return;
            
            for (let i = 0; i < e.changedTouches.length; i++) {
                const touch = e.changedTouches[i];
                this.activeTouches.delete(touch.identifier);
            }

            this.updateFlipperStates();
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

    // ✅ НОВЫЙ МЕТОД: Пересчет состояния флипперов на основе активных touches
    updateFlipperStates() {
        let leftActive = false;
        let rightActive = false;

        // Проверяем все активные touches
        for (let isLeft of this.activeTouches.values()) {
            if (isLeft) {
                leftActive = true;
            } else {
                rightActive = true;
            }
        }

        // Устанавливаем состояние флипперов
        if (leftActive) {
            this.flippers[0].activate();
        } else {
            this.flippers[0].deactivate();
        }

        if (rightActive) {
            this.flippers[1].activate();
        } else {
            this.flippers[1].deactivate();
        }
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