// Enemy system module for Babylon.js

// Function to handle wave cleared state
window.game.waveCleared = function() {
    const g = window.game;
    // Show wave cleared message
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
    const enemyMesh = BABYLON.MeshBuilder.CreateBox(`enemy_${Date.now()}`, {width: 1, height: 2, depth: 1}, g.scene);
    const enemyMaterial = new BABYLON.StandardMaterial("enemyMat", g.scene);
    enemyMaterial.diffuseColor = new BABYLON.Color3(1, 0, 0);
    enemyMesh.material = enemyMaterial;
    
    // Random spawn position away from player (minimum distance of 15)
    let spawnPos = new BABYLON.Vector3();
    do {
        spawnPos.set(
            (Math.random() - 0.5) * 80,
            1,
            (Math.random() - 0.5) * 80
        );
    } while (g.camera && BABYLON.Vector3.Distance(spawnPos, g.camera.position) < 15);
    
    enemyMesh.position.copyFrom(spawnPos);
    
    // Add physics to enemy using PhysicsAggregate with proper dynamic motion
    const enemyAggregate = new BABYLON.PhysicsAggregate(enemyMesh, BABYLON.PhysicsShapeType.BOX, 
        { mass: 1, restitution: 0.1, friction: 0.8 }, g.scene);
    
    // Set motion type to dynamic so enemies can move
    enemyAggregate.body.setMotionType(BABYLON.PhysicsMotionType.DYNAMIC);
    
    // Set linear damping to prevent sliding
    enemyAggregate.body.setLinearDamping(0.5);
    
    // Lock rotation to prevent tipping over
    enemyAggregate.body.setMassProperties({
        mass: 1,
        inertia: new BABYLON.Vector3(0, 0, 0)
    });
    
    // Enable collision callbacks
    enemyAggregate.body.setCollisionCallbackEnabled(true);
    
    // Add to shadow casters
    if (g.shadowGenerator) {
        g.shadowGenerator.addShadowCaster(enemyMesh);
    }
    
    // Calculate health based on wave
    const baseHealth = 100;
    const healthMultiplier = 1 + (g.currentWave - 1) * 0.2; // +20% health per wave
    const health = Math.round(baseHealth * healthMultiplier);
    
    // Create enemy object
    const enemy = {
        id: `enemy-${Date.now()}-${Math.random()}`,
        mesh: enemyMesh,
        aggregate: enemyAggregate,
        velocity: new BABYLON.Vector3(),
        health: health,
        maxHealth: health,
        speed: 0.05,
        attackCooldown: 0,
        lastAttackTime: 0,
        isDead: false // Add isDead flag
    };

    // Create enemy collision object using new collision system
    enemy.collisionObject = g.CollisionManager.createEnemyCollision(
        enemyMesh, 
        enemyAggregate, 
        enemy
    );
    
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
        
        // Move towards player using physics
        if (!g.camera) return;
        
        // Get player position from camera (since player follows camera)
        const playerPosition = g.camera.position;
        
        const direction = playerPosition.subtract(enemy.mesh.position);
        direction.y = 0; // Keep enemy on ground
        
        // Only move if there's a significant distance
        if (direction.length() > 0.1) {
            direction.normalize();
            
            // Apply force towards player
            const force = direction.scale(enemy.speed * 200); // Further increased force
            enemy.aggregate.body.applyForce(force, enemy.mesh.position);
            
            // Make enemy face player
            enemy.mesh.lookAt(new BABYLON.Vector3(playerPosition.x, enemy.mesh.position.y, playerPosition.z));
        }
        
        // Check for attack range (collision handles actual damage)
        const distanceToPlayer = BABYLON.Vector3.Distance(enemy.mesh.position, playerPosition);
        // Attack logic is now handled by collision detection
    }
};

window.game.startNextWave = function() {
    const g = window.game;
    // Increment wave
    g.currentWave++;
    
    // Update wave text
    if (g.waveText) {
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
    console.log(`Damaging enemy ${enemy.id} for ${amount} damage, current health: ${enemy.health}`); // Debug log
    
    // Play hit sound
    if (g.sounds && g.sounds.hit) {
        g.sounds.hit.play();
    }
    
    // Reduce enemy health
    enemy.health -= amount;
    console.log(`Enemy ${enemy.id} health after damage: ${enemy.health}`); // Debug log
    
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
        console.log(`Enemy ${enemy.id} died`); // Debug log
        window.game.killEnemy(enemy); 
    }
};

window.game.killEnemy = function(enemy) {
    const g = window.game;
    if (enemy.isDead) return; // Prevent multiple kills
    enemy.isDead = true; // Set dead flag

    console.log(`Killing enemy ${enemy.id}, health was: ${enemy.health}`); // Debug log
    
    // Remove from scene
    if (g.scene && enemy.mesh) {
        enemy.mesh.dispose();
    }
    
    // Remove Babylon.js GUI health bar if it exists
    if (g.enemyHealthBars && g.enemyHealthBars[enemy.id]) {
        const healthBar = g.enemyHealthBars[enemy.id];
        if (healthBar.texture) {
            healthBar.texture.dispose();
        }
        delete g.enemyHealthBars[enemy.id];
        console.log(`Removed health bar for enemy ${enemy.id}`); // Debug log
    }
    
    // Clear health bar timeout
    if (enemy.healthBarTimeout) {
        clearTimeout(enemy.healthBarTimeout);
    }
    
    // Remove from enemies array
    const index = g.enemies.indexOf(enemy);
    if (index !== -1) {
        g.enemies.splice(index, 1);
    }
    
    // Update enemies remaining
    g.enemiesRemaining--;
    console.log(`Enemies remaining: ${g.enemiesRemaining}`); // Debug log
    
    // Check if wave is cleared
    if (g.enemiesRemaining <= 0) {
        window.game.waveCleared(); 
    }
};