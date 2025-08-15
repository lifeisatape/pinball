
// Level Selector Class
class LevelSelector {
    constructor() {
        this.availableLevels = [];
        this.currentLevelIndex = 0;
    }

    async getAvailableLevels() {
        // Получаем список файлов из папки rooms
        const knownLevels = ['hunt.json', 'degen.json', 'farcaster.json']; // Можно расширить
        const levels = [];

        for (const levelFile of knownLevels) {
            try {
                const response = await fetch(`rooms/${levelFile}`);
                if (response.ok) {
                    const levelData = await response.json();
                    levels.push({
                        filename: levelFile,
                        name: levelData.name || levelFile.replace('.json', ''),
                        description: levelData.description || 'special level',
                        data: levelData
                    });
                }
            } catch (error) {
                console.warn(`Could not load level ${levelFile}:`, error);
            }
        }

        this.availableLevels = levels;
        return levels;
    }

    getCurrentLevel() {
        return this.availableLevels[this.currentLevelIndex];
    }

    selectNextLevel() {
        if (this.availableLevels.length > 0) {
            this.currentLevelIndex = (this.currentLevelIndex + 1) % this.availableLevels.length;
        }
        return this.getCurrentLevel();
    }

    selectPreviousLevel() {
        if (this.availableLevels.length > 0) {
            this.currentLevelIndex = (this.currentLevelIndex - 1 + this.availableLevels.length) % this.availableLevels.length;
        }
        return this.getCurrentLevel();
    }

    selectLevel(index) {
        if (index >= 0 && index < this.availableLevels.length) {
            this.currentLevelIndex = index;
            return this.getCurrentLevel();
        }
        return null;
    }
}
