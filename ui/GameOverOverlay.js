
class GameOverOverlay {
    constructor() {
        this.overlay = document.getElementById('gameOverOverlay');
        this.scoreElement = document.getElementById('finalScore');
        this.highScoreElement = document.getElementById('finalHighScore');
        this.levelElement = document.getElementById('levelReached');
        this.shareButton = document.getElementById('shareScoreBtn');
        
        // Проверяем существование элементов
        if (!this.overlay) {
            console.warn('GameOverOverlay: gameOverOverlay element not found');
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
        
        if (this.levelElement) {
            this.levelElement.textContent = gameState.level || 1;
        }

        // Показываем кнопку Share только в Farcaster окружении
        this.showFarcasterButtons();
    }

    showFarcasterButtons() {
        if (window.isMiniApp && window.sdk && this.shareButton) {
            this.shareButton.style.display = 'block';
            console.log('✅ Farcaster share button shown');
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
