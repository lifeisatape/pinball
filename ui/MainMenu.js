
// Main Menu UI Component
class MainMenu {
    constructor() {
        this.overlay = null;
        this.createMenuOverlay();
        this.setupEventListeners();
    }

    createMenuOverlay() {
        this.overlay = document.createElement('div');
        this.overlay.className = 'main-menu-overlay';
        this.overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            z-index: 1000;
            font-family: Arial, sans-serif;
        `;

        this.overlay.innerHTML = `
            <div class="menu-content" style="text-align: center; color: white;">
                <h1 style="font-size: 3rem; margin-bottom: 2rem; text-shadow: 2px 2px 4px rgba(0,0,0,0.5);">
                    🎯 PINBALL GAME
                </h1>
                
                <div class="menu-buttons" style="display: flex; flex-direction: column; gap: 1rem; align-items: center;">
                    <button id="defaultLevelBtn" class="menu-btn" style="
                        padding: 1rem 2rem;
                        font-size: 1.2rem;
                        background: #4CAF50;
                        color: white;
                        border: none;
                        border-radius: 8px;
                        cursor: pointer;
                        transition: all 0.3s ease;
                        min-width: 200px;
                        box-shadow: 0 4px 8px rgba(0,0,0,0.3);
                    ">
                        🎮 Play Default Level
                    </button>
                    
                    <button id="customLevelBtn" class="menu-btn" style="
                        padding: 1rem 2rem;
                        font-size: 1.2rem;
                        background: #2196F3;
                        color: white;
                        border: none;
                        border-radius: 8px;
                        cursor: pointer;
                        transition: all 0.3s ease;
                        min-width: 200px;
                        box-shadow: 0 4px 8px rgba(0,0,0,0.3);
                    ">
                        🎨 Play Custom Level
                    </button>
                    
                    <button id="editorBtn" class="menu-btn" style="
                        padding: 1rem 2rem;
                        font-size: 1.2rem;
                        background: #FF9800;
                        color: white;
                        border: none;
                        border-radius: 8px;
                        cursor: pointer;
                        transition: all 0.3s ease;
                        min-width: 200px;
                        box-shadow: 0 4px 8px rgba(0,0,0,0.3);
                    ">
                        🛠️ Level Editor
                    </button>
                </div>
                
                <div class="level-info" style="margin-top: 2rem; max-width: 400px;">
                    <p style="color: #ccc; font-size: 0.9rem;">
                        Choose your adventure! Play the default level, load a custom level, or create your own in the editor.
                    </p>
                </div>
            </div>
        `;

        // Add hover effects
        const style = document.createElement('style');
        style.textContent = `
            .menu-btn:hover {
                transform: translateY(-2px) !important;
                box-shadow: 0 6px 12px rgba(0,0,0,0.4) !important;
            }
            .menu-btn:active {
                transform: translateY(0) !important;
            }
        `;
        document.head.appendChild(style);

        document.body.appendChild(this.overlay);
    }

    setupEventListeners() {
        document.getElementById('defaultLevelBtn').addEventListener('click', () => {
            this.startGame('default');
        });

        document.getElementById('customLevelBtn').addEventListener('click', () => {
            this.loadCustomLevel();
        });

        document.getElementById('editorBtn').addEventListener('click', () => {
            this.openEditor();
        });
    }

    startGame(levelType, levelData = null) {
        this.hide();
        // Dispatch custom event to start the game
        window.dispatchEvent(new CustomEvent('startGame', { 
            detail: { levelType, levelData } 
        }));
    }

    loadCustomLevel() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const levelData = JSON.parse(e.target.result);
                        this.startGame('custom', levelData);
                    } catch (error) {
                        alert('Error loading level file: ' + error.message);
                    }
                };
                reader.readAsText(file);
            }
        };
        input.click();
    }

    openEditor() {
        window.open('editor.html', '_blank');
    }

    show() {
        this.overlay.style.display = 'flex';
    }

    hide() {
        this.overlay.style.display = 'none';
    }

    destroy() {
        if (this.overlay && this.overlay.parentNode) {
            this.overlay.parentNode.removeChild(this.overlay);
        }
    }
}
