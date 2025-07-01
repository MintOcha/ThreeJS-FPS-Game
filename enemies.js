// Enemy system module
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d';
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

    // Create Rapier rigid body and collider for the enemy
    const enemySize = { x: 1, y: 2, z: 1 }; // Matches BoxGeometry
    const rigidBodyDesc = RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(spawnPos.x, spawnPos.y, spawnPos.z)
        .setLinvel(0, 0, 0) // Initial velocity
        .setCanSleep(false); // Keep enemies active
    const enemyRigidBody = g.rapierWorld.createRigidBody(rigidBodyDesc);

    const colliderDesc = RAPIER.ColliderDesc.cuboid(enemySize.x / 2, enemySize.y / 2, enemySize.z / 2)
        .setRestitution(0.1)
        .setFriction(0.5)
        .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS); // To detect collisions
    const enemyCollider = g.rapierWorld.createCollider(colliderDesc, enemyRigidBody);
    
    // Create enemy object
    const enemy = {
        id: `enemy-${Date.now()}-${Math.random()}`,
        mesh: enemyMesh,
        rigidBody: enemyRigidBody, // Store Rapier body
        collider: enemyCollider,   // Store Rapier collider
        health: health,
        maxHealth: health,
        speed: 2.0, // Adjusted speed for Rapier's velocity system (units/second)
        attackCooldown: 0,
        lastAttackTime: 0
    };
    enemyCollider.setUserData({ type: 'enemy', id: enemy.id, enemyObject: enemy }); // For collision identification
    
    // Add to enemies array
    g.enemies.push(enemy);
};

window.game.updateEnemies = function() {
    const g = window.game;
    for (const enemy of g.enemies) {
        if (!enemy.rigidBody) continue;

        // Update attack cooldown
        if (enemy.attackCooldown > 0) {
            enemy.attackCooldown -= g.deltaTime;
        }
        
        // Move towards player using Rapier physics
        if (!g.playerRigidBody) return; // Ensure player physics body is initialized

        const enemyPos = enemy.rigidBody.translation();
        const playerPos = g.playerRigidBody.translation();

        const direction = new THREE.Vector3(playerPos.x - enemyPos.x, 0, playerPos.z - enemyPos.z);
        direction.normalize(); // Keep enemy on ground for movement calculation
        
        // Set linear velocity for the enemy's rigid body
        const desiredVelocity = new RAPIER.Vector3(direction.x * enemy.speed, enemy.rigidBody.linvel().y, direction.z * enemy.speed);
        enemy.rigidBody.setLinvel(desiredVelocity, true);
        
        // Synchronize Three.js mesh with Rapier rigid body
        const currentPosition = enemy.rigidBody.translation();
        enemy.mesh.position.set(currentPosition.x, currentPosition.y, currentPosition.z);
        
        // Make enemy face player (visual only, physics rotation might be handled differently if needed)
        enemy.mesh.lookAt(new THREE.Vector3(playerPos.x, enemy.mesh.position.y, playerPos.z));
        
        // Check for attack range (using Rapier positions) - This is now handled by Rapier collision events in main.js
        // const distanceToPlayer = Math.sqrt(
        //     Math.pow(playerPos.x - enemyPos.x, 2) +
        //     Math.pow(playerPos.y - enemyPos.y, 2) + // Consider Y distance for attack range
        //     Math.pow(playerPos.z - enemyPos.z, 2)
        // );

        // if (distanceToPlayer < 1.8 && enemy.attackCooldown <= 0) { // Slightly increased range
        //     // Attack player - Handled by collision event
        //     // if(window.game.damagePlayer) window.game.damagePlayer(10);
            
        //     // Set attack cooldown - Handled by collision event
        //     // enemy.attackCooldown = 1.0; // 1 second between attacks
        // }
        
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

    // Remove Rapier rigid body and collider
    if (enemy.rigidBody) {
        g.rapierWorld.removeRigidBody(enemy.rigidBody);
    }
    // Note: Colliders associated with the rigid body are typically removed automatically.
    // If not, or if collider is managed separately:
    // if (enemy.collider) {
    //     g.rapierWorld.removeCollider(enemy.collider, false); // false if it's attached to a body being removed
    // }
    
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