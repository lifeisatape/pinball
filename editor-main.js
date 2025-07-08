
// Initialize editor when page loads
window.addEventListener('load', () => {
    if (typeof LevelEditor !== 'undefined') {
        new LevelEditor();
    } else {
        console.error('LevelEditor class not found. Make sure all scripts are loaded properly.');
    }
});
