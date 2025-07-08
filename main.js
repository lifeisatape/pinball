
// Initialize game when page loads
window.addEventListener('load', () => {
    new PinballGame();
});

// Prevent scrolling and context menu
document.addEventListener('touchmove', (e) => {
    e.preventDefault();
}, { passive: false });

document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
});
// Main entry point for the pinball game
window.addEventListener('load', () => {
    if (typeof PinballGame !== 'undefined') {
        new PinballGame();
    } else {
        console.error('PinballGame class not found. Check script loading order.');
    }
});

// Prevent touch scrolling and context menu
document.addEventListener('touchmove', (e) => {
    e.preventDefault();
}, { passive: false });

document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
});
