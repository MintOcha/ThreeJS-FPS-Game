// Enemy system module
import * as THREE from 'three';
// Removed imports for showDamageNumber, updateEnemyHealthBar, damagePlayer
// as they will be accessed via window.game

// Using the global game object for scene and camera instead of imports
// Avoid circular imports

// Enemy state variables are now managed on window.game.
// This module's functions will modify window.game.enemies, window.game.currentWave, etc.

// Function to handle wave cleared state
window.game.waveCleared = function() {
    const g = window.game;
    // Show wave cleared message
    // Assuming waveStatusText is initialized and available on g.waveStatusText by ui.js
    if (g.waveStatusText) {
        g.waveStatusText.textContent = `Wave ${g.currentWave} Cleared!`;
        g.waveStatusText.style.display = 'block';
    
        // Hide after delay
        setTimeout(() => {
            if (g.waveStatusText) g.waveStatusText.style.display = 'none';
        }, 3000);
    }
    
    // Start next wave after delay
    g.isWaveTransition = true;
    
    // Wait a bit longer before starting next wave
    setTimeout(() => {
        g.isWaveTransition = false;
        window.game.startNextWave(); 
    }, g.waveDelay);
};

window.game.spawnEnemy = function() {
    const g = window.game;
    // Skip if game is not active
    if (!g.gameActive) return;
    
    // Create enemy mesh
    const enemyGeo = new THREE.BoxGeometry(1, 2, 1);
    const enemyMat = new THREE.MeshStandardMaterial({ color: 0xff0000 });
    const enemyMesh = new THREE.Mesh(enemyGeo, enemyMat);
    
    // Random spawn position away from player (minimum distance of 15)
    let spawnPos = new THREE.Vector3();
    do {
        spawnPos.set(
            (Math.random() - 0.5) * 80,
            1,
            (Math.random() - 0.5) * 80
        );
    } while (g.camera && spawnPos.distanceTo(g.camera.position) < 15); // Check g.camera exists
    
    enemyMesh.position.copy(spawnPos);
    enemyMesh.castShadow = true;
    enemyMesh.receiveShadow = true;
    
    // Calculate health based on wave
    const baseHealth = 100;
    const healthMultiplier = 1 + (g.currentWave - 1) * 0.2; // +20% health per wave
    const health = Math.round(baseHealth * healthMultiplier);
    
    // Add to scene
    g.scene.add(enemyMesh);
    
    // Create enemy object
    const enemy = {
        id: `enemy-${Date.now()}-${Math.random()}`,
        mesh: enemyMesh,
        velocity: new THREE.Vector3(),
        health: health,
        maxHealth: health,
        speed: 0.05, // TODO: Consider making this wave-dependent or part of window.game.config
        attackCooldown: 0,
        lastAttackTime: 0
    };
    
    // Add to enemies array
    g.enemies.push(enemy);
};

window.game.updateEnemies = function() {
    const g = window.game;
    for (const enemy of g.enemies) {
        // Update attack cooldown
        if (enemy.attackCooldown > 0) {
            enemy.attackCooldown -= g.deltaTime;
        }
        
        // Move towards player
        if (!g.camera) return; // Ensure camera is initialized
        const direction = new THREE.Vector3().subVectors(g.camera.position, enemy.mesh.position);
        direction.y = 0; // Keep enemy on ground
        direction.normalize();
        
        // Set velocity based on direction and speed
        enemy.velocity.x = direction.x * enemy.speed;
        enemy.velocity.z = direction.z * enemy.speed;
        
        // Apply velocity
        enemy.mesh.position.x += enemy.velocity.x;
        enemy.mesh.position.z += enemy.velocity.z;
        
        // Make enemy face player
        enemy.mesh.lookAt(new THREE.Vector3(g.camera.position.x, enemy.mesh.position.y, g.camera.position.z));
        
        // Check for attack range
        const distanceToPlayer = enemy.mesh.position.distanceTo(g.camera.position);
        if (distanceToPlayer < 1.5 && enemy.attackCooldown <= 0) {
            // Attack player
            if(window.game.damagePlayer) window.game.damagePlayer(10); 
            
            // Set attack cooldown
            enemy.attackCooldown = 1.0; // 1 second between attacks
        }
        
        // Update enemy health bar position if visible
        // g.enemyHealthBars is managed by ui.js / effects.js, updated via updateEnemyHealthBar
        // The actual rendering/positioning of health bars is handled by updateEnemyHealthBar in effects.js
        // This specific block for direct DOM manipulation can be removed if updateEnemyHealthBar handles it.
        // For now, let's assume updateEnemyHealthBar (from ui.js/effects.js) handles this.
        // if (g.enemyHealthBars && g.enemyHealthBars[enemy.id] && g.enemyHealthBars[enemy.id].container.style.visibility !== 'hidden') {
        //     const screenPos = new THREE.Vector3().copy(enemy.mesh.position);
        //     screenPos.y += 2.5; // Position above enemy
        //     screenPos.project(g.camera);
            
        //     const x = (screenPos.x * 0.5 + 0.5) * window.innerWidth;
        //     const y = (-(screenPos.y * 0.5) + 0.5) * window.innerHeight;
            
        //     g.enemyHealthBars[enemy.id].container.style.left = `${x - 25}px`; // Center bar
        //     g.enemyHealthBars[enemy.id].container.style.top = `${y}px`;
        // }
    }
};

window.game.startNextWave = function() {
    const g = window.game;
    // Increment wave
    g.currentWave++;
    
    // Update wave text
    if (g.waveText) { // Check if waveText is initialized
      g.waveText.textContent = `Wave: ${g.currentWave}`;
    }
    
    // Calculate enemies for this wave
    const enemyCount = Math.min(5 + g.currentWave * 2, 40); // Cap at 40 enemies
    g.enemiesRemaining = enemyCount;
    
    // Spawn enemies
    for (let i = 0; i < enemyCount; i++) {
        // Delay spawn to avoid all enemies appearing at once
        setTimeout(() => window.game.spawnEnemy(), i * 200); 
    }
};


window.game.damageEnemy = function(enemy, amount, hitPoint) {
    const g = window.game;
    // Play hit sound
    if (g.sounds && g.sounds.hit) {
        g.sounds.hit.play();
    }
    // Reduce enemy health
    enemy.health -= amount;
    
    // Show damage number
    if (g.showDamageNumber) { 
        g.showDamageNumber(amount, hitPoint);
    }

    // Update enemy health bar
    if (g.updateEnemyHealthBar) {
        g.updateEnemyHealthBar(enemy);
    }
    
    // Check for death
    if (enemy.health <= 0) {
        window.game.killEnemy(enemy); 
    }
};

window.game.killEnemy = function(enemy) {
    const g = window.game;
    // Remove from scene
    if (g.scene) g.scene.remove(enemy.mesh);
    
    // Remove health bar if it exists
    if (g.enemyHealthBars && g.enemyHealthBars[enemy.id]) {
        const healthBarContainer = document.getElementById('enemy-health-bar-container');
        if (healthBarContainer && g.enemyHealthBars[enemy.id].container.parentNode === healthBarContainer) {
             healthBarContainer.removeChild(g.enemyHealthBars[enemy.id].container);
        }
        delete g.enemyHealthBars[enemy.id];
    }
    
    // Remove from enemies array
    const index = g.enemies.indexOf(enemy);
    if (index !== -1) {
        g.enemies.splice(index, 1);
    }
    
    // Update enemies remaining
    g.enemiesRemaining--;
    
    // Check if wave is cleared
    if (g.enemiesRemaining <= 0) {
        window.game.waveCleared(); 
    }
};

// The comment "...Paste the full function bodies from sketch.js into the stubs above..."
// implies these functions might have been stubs. The provided code seems complete,
// so this comment might be outdated from a previous refactoring step.
// All functions (spawnEnemy, updateEnemies, startNextWave, waveCleared, damageEnemy, killEnemy)
// are present and have been refactored.