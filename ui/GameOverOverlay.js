// Game Over Overlay UI Component
class GameOverOverlay {
    constructor() {
        this.overlay = document.getElementById('gameOverOverlay');
        this.finalScoreElement = document.getElementById('finalScore');
        this.newHighScoreElement = document.getElementById('newHighScore');
    }

    show(gameState) {
        this.finalScoreElement.textContent = gameState.score.toLocaleString();

        if (gameState.score === gameState.highScore && gameState.score > 0) {
            this.newHighScoreElement.style.display = 'block';
        } else {
            this.newHighScoreElement.style.display = 'none';
        }

        this.overlay.style.display = 'flex';
    }

    hide() {
        this.overlay.style.display = 'none';
    }
}