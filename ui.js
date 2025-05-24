// UI module
// Using the global game object for scene and camera instead of imports
import { gameOver } from './player.js'; // gameOver uses window.game internally

// UI element references are now stored on window.game after setupUI is called.
// No need to export them here.
// window.game.enemyHealthBars and window.game.damageNumbers are initialized in main.js
// and managed by effects.js

// NOTE: The functions damageEnemy, killEnemy, updateEnemyHealthBar, showDamageNumber
// have their primary implementations in enemies.js or effects.js.
// The versions previously in ui.js were either stubs or less complete.
// They are removed here to prevent duplication and ensure the centralized versions are used
// via window.game.damageEnemy, window.game.killEnemy etc.

// Exported UI-related functions
export function setupUI() {
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
    updateHealthBar(); // Uses window.game
    
    // Initialize ammo text
    updateAmmoText(); // Uses window.game
}
export function updateHealthBar() {
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
}
export function updateAmmoText() {
    const g = window.game;
    if (!g.ammoText || !g.weapons || typeof g.currentWeapon === 'undefined') return; // Ensure elements & game state ready

    const weapon = g.weapons[g.currentWeapon];
    if (!weapon) return;

    if (weapon.magazineSize === Infinity) {
        g.ammoText.textContent = '∞';
    } else {
        g.ammoText.textContent = `${weapon.currentAmmo} / ${weapon.magazineSize}`;
    }
}

// Stubs for updateEnemyHealthBar and showDamageNumber are removed.
// Their definitive versions are in effects.js and should be called via window.game.

// The comment "...Paste the full function bodies from sketch.js into the stubs above..."
// is outdated. The core UI functions (setupUI, updateHealthBar, updateAmmoText) are complete.
