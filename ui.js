// UI module
// Using the global game object for scene and camera instead of imports
// Removed import for gameOver, will use window.game.gameOver if needed (though not called in this file)

// UI element references are now stored on window.game after setupUI is called.
// No need to export them here.
// window.game.enemyHealthBars and window.game.damageNumbers are initialized in main.js
// and managed by effects.js

// NOTE: The functions damageEnemy, killEnemy, updateEnemyHealthBar, showDamageNumber
// have their primary implementations in enemies.js or effects.js.
// The versions previously in ui.js were either stubs or less complete.
// They are removed here to prevent duplication and ensure the centralized versions are used
// via window.game.damageEnemy, window.game.killEnemy etc.

// UI functions assigned to window.game
window.game.setupUI = function() {
    const g = window.game;
    g.uiContainer = document.getElementById('ui-container');
    g.healthBarFill = document.getElementById('health-bar-fill');
    g.healthText = document.getElementById('health-text');
    g.ammoText = document.getElementById('ammo-text');
    g.reloadText = document.getElementById('reload-text');
    g.waveText = document.getElementById('wave-text');
    g.waveStatusText = document.getElementById('wave-status-text');
    g.gameOverScreen = document.getElementById('game-over-screen');
    g.crosshair = document.getElementById('crosshair');
    
    // Initialize health bar
    if(g.updateHealthBar) g.updateHealthBar();
    
    // Initialize ammo text
    if(g.updateAmmoText) g.updateAmmoText();
};

window.game.updateHealthBar = function() {
    const g = window.game;
    if (!g.healthBarFill || !g.healthText) return; // Ensure elements are loaded

    g.healthBarFill.style.width = `${g.playerHealth}%`;
    g.healthText.textContent = `${Math.ceil(g.playerHealth)} / 100`;
    
    // Change color based on health
    if (g.playerHealth > 70) {
        g.healthBarFill.style.backgroundColor = 'rgba(0, 200, 0, 0.9)';
    } else if (g.playerHealth > 30) {
        g.healthBarFill.style.backgroundColor = 'rgba(200, 200, 0, 0.9)';
    } else {
        g.healthBarFill.style.backgroundColor = 'rgba(200, 0, 0, 0.9)';
    }
};

window.game.updateAmmoText = function() {
    const g = window.game;
    if (!g.ammoText || !g.weapons || typeof g.currentWeapon === 'undefined') return;

    const weapon = g.weapons[g.currentWeapon];
    if (!weapon) return;

    if (weapon.magazineSize === Infinity) {
        g.ammoText.textContent = '∞';
    } else {
        g.ammoText.textContent = `${weapon.currentAmmo} / ${weapon.magazineSize}`;
    }
};

window.game.updateWaveText = function() {
    const g = window.game;
    if (!g.waveText) return;
    g.waveText.textContent = `Wave: ${g.currentWave}`;
};

window.game.updateWaveStatusText = function(text) {
    const g = window.game;
    if (!g.waveStatusText) return;
    g.waveStatusText.textContent = text;
};

window.game.showReloadText = function() {
    const g = window.game;
    if (!g.reloadText) return;
    g.reloadText.style.display = 'block';
};

window.game.hideReloadText = function() {
    const g = window.game;
    if (!g.reloadText) return;
    g.reloadText.style.display = 'none';
};

window.game.showGameOver = function() {
    const g = window.game;
    if (!g.gameOverScreen) return;
    g.gameOverScreen.style.display = 'flex';
    // Release pointer lock
    document.exitPointerLock();
};

window.game.hideGameOver = function() {
    const g = window.game;
    if (!g.gameOverScreen) return;
    g.gameOverScreen.style.display = 'none';
};