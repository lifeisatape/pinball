
class GameOverOverlay {
    constructor() {
        this.overlay = document.getElementById('gameOverOverlay');
        this.scoreElement = document.getElementById('finalScore');
        this.highScoreElement = document.getElementById('finalHighScore');
        
        // Проверяем существование элементов
        if (!this.overlay) {
            console.warn('GameOverOverlay: gameOverOverlay element not found');
        }
        if (!this.scoreElement) {
            console.warn('GameOverOverlay: finalScore element not found');
        }
        if (!this.highScoreElement) {
            console.warn('GameOverOverlay: finalHighScore element not found');
        }
    }

    show(gameState) {
        if (!this.overlay) {
            console.error('GameOverOverlay: Cannot show overlay - element not found');
            return;
        }

        this.overlay.style.display = 'flex';
        
        if (this.scoreElement) {
            this.scoreElement.textContent = gameState.score.toLocaleString();
        }
        
        if (this.highScoreElement) {
            this.highScoreElement.textContent = gameState.highScore.toLocaleString();
        }
    }

    hide() {
        if (!this.overlay) {
            console.error('GameOverOverlay: Cannot hide overlay - element not found');
            return;
        }
        
        this.overlay.style.display = 'none';
    }
}
