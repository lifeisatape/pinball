// Game State
class GameState {
    constructor() {
        this.score = 0;
        this.highScore = 0;
        this.balls = 3;
        this.isGameOver = false;
        this.ballInPlay = false;
        this.currentLevelName = null;
    }

    setCurrentLevel(levelName) {
        this.currentLevelName = levelName;
        this.loadHighScoreForLevel();
    }

    loadHighScoreForLevel() {
        if (this.currentLevelName) {
            const key = `pinballHighScore_${this.currentLevelName}`;
            this.highScore = parseInt(localStorage.getItem(key)) || 0;
        } else {
            this.highScore = 0;
        }
    }

    updateScore(points) {
        this.score += points;
        if (this.score > this.highScore) {
            this.highScore = this.score;
            if (this.currentLevelName) {
                const key = `pinballHighScore_${this.currentLevelName}`;
                localStorage.setItem(key, this.highScore.toString());
            }
        }
    }

    reset() {
        this.score = 0;
        this.balls = 3;
        this.isGameOver = false;
        this.ballInPlay = false;
        // Не сбрасываем highScore - он остается для текущего уровня
    }

    resetGame() {
        this.reset();
    }
}