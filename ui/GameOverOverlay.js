
class GameOverOverlay {
    constructor() {
        this.overlay = document.getElementById('gameOverOverlay');
        this.scoreElement = document.getElementById('finalScore');
        this.highScoreElement = document.getElementById('finalHighScore');
        
        // 🎯 НОВЫЕ ЭЛЕМЕНТЫ
        this.farcasterActions = document.getElementById('farcasterActions');
        this.shareButton = document.getElementById('shareScoreBtn');
        this.donateButton = document.getElementById('donateBtn');
        this.addToAppsButton = document.getElementById('addToAppsBtn');
        
        this.setupEventListeners();
    }

    setupEventListeners() {
        // 🎯 Обработчик кнопки доната
        if (this.donateButton) {
            this.donateButton.addEventListener('click', async () => {
                await this.handleDonate();
            });
        }

        // Обработчик кнопки шаринга
        if (this.shareButton) {
            this.shareButton.addEventListener('click', async () => {
                await this.handleShare();
            });
        }

        // Обработчик добавления в избранное
        if (this.addToAppsButton) {
            this.addToAppsButton.addEventListener('click', async () => {
                await this.handleAddToFavorites();
            });
        }
    }

    show(gameState) {
        if (!this.overlay) return;

        this.overlay.style.display = 'flex';
        
        if (this.scoreElement) {
            this.scoreElement.textContent = gameState.score.toLocaleString();
        }
        
        if (this.highScoreElement) {
            this.highScoreElement.textContent = gameState.highScore.toLocaleString();
        }

        // Показываем Farcaster кнопки только в Mini App среде
        this.showFarcasterButtons();
    }

    showFarcasterButtons() {
        if (window.isMiniApp && window.sdk && this.farcasterActions) {
            this.farcasterActions.style.display = 'flex';
            console.log('✅ Farcaster action buttons shown');
        }
    }

    // 🎯 НОВЫЙ МЕТОД ДОНАТА
    async handleDonate() {
        if (!window.farcasterManager) {
            console.warn('FarcasterManager not available');
            return;
        }

        try {
            // Показываем индикатор загрузки
            this.donateButton.textContent = '💫 SENDING...';
            this.donateButton.disabled = true;

            const result = await window.farcasterManager.sendDonation();
            
            if (result.success) {
                this.donateButton.textContent = '✅ DONATED!';
                this.showNotification('Thank you for your donation! 💎', 'success');
                
                // Возвращаем кнопку в исходное состояние через 3 секунды
                setTimeout(() => {
                    this.donateButton.textContent = '💎 DONATE 1 USDC 💎';
                    this.donateButton.disabled = false;
                }, 3000);
            } else {
                this.donateButton.textContent = '❌ FAILED';
                this.showNotification(`Donation failed: ${result.reason}`, 'error');
                
                setTimeout(() => {
                    this.donateButton.textContent = '💎 DONATE 1 USDC 💎';
                    this.donateButton.disabled = false;
                }, 2000);
            }
        } catch (error) {
            console.error('Donation error:', error);
            this.donateButton.textContent = '❌ ERROR';
            this.showNotification('Donation error occurred', 'error');
            
            setTimeout(() => {
                this.donateButton.textContent = '💎 DONATE 1 USDC 💎';
                this.donateButton.disabled = false;
            }, 2000);
        }
    }

    async handleShare() {
        if (window.farcasterManager) {
            await window.farcasterManager.shareScore();
        }
    }

    async handleAddToFavorites() {
        if (window.farcasterManager) {
            const success = await window.farcasterManager.addToFavorites();
            if (success) {
                this.showNotification('App added to favorites! ⭐', 'success');
            }
        }
    }

    showNotification(message, type = 'info') {
        // Простая система уведомлений
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#10B981' : type === 'error' ? '#EF4444' : '#0EA5E9'};
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            z-index: 10000;
            animation: slideIn 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    hide() {
        if (this.overlay) {
            this.overlay.style.display = 'none';
        }
    }
}
