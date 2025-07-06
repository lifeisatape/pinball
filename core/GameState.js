// Game State
class GameState {
    constructor() {
        this.score = 0;
        this.highScore = parseInt(localStorage.getItem('pinballHighScore')) || 0;
        this.balls = 3;
        this.isGameOver = false;
        this.ballInPlay = false;
    }

    updateScore(points) {
        this.score += points;
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('pinballHighScore', this.highScore.toString());
        }
    }

    reset() {
        this.score = 0;
        this.balls = 3;
        this.isGameOver = false;
        this.ballInPlay = false;
    }
}