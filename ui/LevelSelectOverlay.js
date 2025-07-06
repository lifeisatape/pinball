
// Level Select Overlay Class
class LevelSelectOverlay {
    constructor(levelSelector, onLevelSelected) {
        this.levelSelector = levelSelector;
        this.onLevelSelected = onLevelSelected;
        this.overlay = null;
        this.createOverlay();
    }

    createOverlay() {
        this.overlay = document.createElement('div');
        this.overlay.className = 'level-select-overlay';
        this.overlay.innerHTML = `
            <div class="level-select-content">
                <h2>SELECT LEVEL</h2>
                <div class="level-list" id="levelList">
                    <!-- Levels will be populated here -->
                </div>
                <div class="level-select-controls">
                    <button class="level-btn" id="cancelLevel">CANCEL</button>
                    <button class="level-btn primary" id="startLevel">START GAME</button>
                </div>
            </div>
        `;

        document.body.appendChild(this.overlay);
        this.setupEventListeners();
    }

    setupEventListeners() {
        document.getElementById('cancelLevel').addEventListener('click', () => {
            this.hide();
        });

        document.getElementById('startLevel').addEventListener('click', () => {
            const selectedLevel = this.levelSelector.getCurrentLevel();
            if (selectedLevel && this.onLevelSelected) {
                this.onLevelSelected(selectedLevel);
                this.hide();
            }
        });
    }

    async show() {
        const levels = await this.levelSelector.getAvailableLevels();
        this.populateLevelList(levels);
        this.overlay.style.display = 'flex';
    }

    hide() {
        this.overlay.style.display = 'none';
    }

    populateLevelList(levels) {
        const levelList = document.getElementById('levelList');
        levelList.innerHTML = '';

        levels.forEach((level, index) => {
            const levelItem = document.createElement('div');
            levelItem.className = `level-item ${index === this.levelSelector.currentLevelIndex ? 'selected' : ''}`;
            levelItem.innerHTML = `
                <div class="level-info">
                    <div class="level-name">${level.name}</div>
                    <div class="level-description">${level.description}</div>
                </div>
            `;

            levelItem.addEventListener('click', () => {
                // Remove previous selection
                document.querySelectorAll('.level-item').forEach(item => {
                    item.classList.remove('selected');
                });
                
                // Select new level
                levelItem.classList.add('selected');
                this.levelSelector.selectLevel(index);
            });

            levelList.appendChild(levelItem);
        });
    }
}
