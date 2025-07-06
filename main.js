
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
