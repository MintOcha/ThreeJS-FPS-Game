// UI module
// Avoid circular imports for these values which will be passed at runtime
// import { playerHealth } from './player.js';
// import { weapons, currentWeapon } from './weapons.js';
// Using the global game object for scene and camera instead of imports
import { gameOver } from './player.js';

// Exported UI state variables
export let uiContainer;
export let healthBarFill;
export let healthText;
export let ammoText;
export let reloadText;
export let waveText;
export let waveStatusText;
export let gameOverScreen;
export let crosshair;
export let enemyHealthBars = {};
export let damageNumbers = [];

// Function to damage an enemy (called from weapons.js)
export function damageEnemy(enemy, amount, hitPoint) {
    // Play hit sound
    if (window.sounds && window.sounds.hit) {
        window.sounds.hit.play();
    }
    
    // Reduce enemy health
    enemy.health -= amount;
    
    // Show damage number
    showDamageNumber(amount, hitPoint);
    
    // Update enemy health bar
    updateEnemyHealthBar(enemy);
    
    // Check for death
    if (enemy.health <= 0) {
        killEnemy(enemy);
    }
}

// Function to kill an enemy
export function killEnemy(enemy) {
    // Remove from scene
    scene.remove(enemy.mesh);
    
    // Remove health bar if it exists
    if (enemyHealthBars[enemy.id]) {
        document.getElementById('enemy-health-bar-container').removeChild(enemyHealthBars[enemy.id].container);
        delete enemyHealthBars[enemy.id];
    }
    
    // Remove from enemies array
    const index = window.enemies.indexOf(enemy);
    if (index !== -1) {
        window.enemies.splice(index, 1);
    }
    
    // Update enemies remaining
    window.enemiesRemaining--;
    
    // Check if wave is cleared
    if (window.enemiesRemaining <= 0) {
        window.waveCleared();
    }
}

// Exported UI-related functions
export function setupUI() {
    uiContainer = document.getElementById('ui-container');
    healthBarFill = document.getElementById('health-bar-fill');
    healthText = document.getElementById('health-text');
    ammoText = document.getElementById('ammo-text');
    reloadText = document.getElementById('reload-text');
    waveText = document.getElementById('wave-text');
    waveStatusText = document.getElementById('wave-status-text');
    gameOverScreen = document.getElementById('game-over-screen');
    crosshair = document.getElementById('crosshair');
    
    // Initialize health bar
    updateHealthBar();
    
    // Initialize ammo text
    updateAmmoText();
}
export function updateHealthBar() {
    healthBarFill.style.width = `${playerHealth}%`;
    healthText.textContent = `${Math.ceil(playerHealth)} / 100`;
    
    // Change color based on health
    if (playerHealth > 70) {
        healthBarFill.style.backgroundColor = 'rgba(0, 200, 0, 0.9)';
    } else if (playerHealth > 30) {
        healthBarFill.style.backgroundColor = 'rgba(200, 200, 0, 0.9)';
    } else {
        healthBarFill.style.backgroundColor = 'rgba(200, 0, 0, 0.9)';
    }
}
export function updateAmmoText() {
    const weapon = weapons[currentWeapon];
    if (weapon.magazineSize === Infinity) {
        ammoText.textContent = '∞';
    } else {
        ammoText.textContent = `${weapon.currentAmmo} / ${weapon.magazineSize}`;
    }
}
export function updateEnemyHealthBar(enemy) { /* ... */ }
export function showDamageNumber(amount, position) { /* ... */ }

// ...Paste the full function bodies from sketch.js into the stubs above...
