
// Score Panel UI Component
class ScorePanel {
    constructor() {
        this.scoreElement = document.getElementById('currentScore');
        this.highScoreElement = document.getElementById('highScore');
        this.ballsElement = document.getElementById('ballsLeft');
    }

    updateScore(score) {
        if (this.scoreElement) {
            this.scoreElement.textContent = score.toLocaleString();
        }
    }

    updateHighScore(highScore) {
        if (this.highScoreElement) {
            this.highScoreElement.textContent = highScore.toLocaleString();
        }
    }

    updateBalls(balls) {
        if (this.ballsElement) {
            this.ballsElement.textContent = balls;
        }
    }

    updateAll(gameState) {
        this.updateScore(gameState.score);
        this.updateHighScore(gameState.highScore);
        this.updateBalls(gameState.balls);
    }
}
