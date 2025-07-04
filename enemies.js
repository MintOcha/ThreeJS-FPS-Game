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
    const enemyMesh = BABYLON.MeshBuilder.CreateBox("enemy", {width: 1, height: 2, depth: 1}, g.scene);
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
    
    // Add physics to enemy using PhysicsAggregate for better Havok compatibility
    const enemyAggregate = new BABYLON.PhysicsAggregate(enemyMesh, BABYLON.PhysicsShapeType.BOX, 
        { mass: 1, restitution: 0.1, friction: 0.8 }, g.scene);
    
    // Set linear damping to prevent sliding
    enemyAggregate.body.setLinearDamping(0.5);
    
    // Lock rotation to prevent tipping over
    enemyAggregate.body.setMassProperties({
        mass: 1,
        inertia: new BABYLON.Vector3(0, 0, 0)
    });
    
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
        lastAttackTime: 0
    };
    
    // Setup collision callbacks using PhysicsAggregate
    enemyAggregate.body.setCollisionCallbackEnabled(true);
    const collisionObservable = enemyAggregate.body.getCollisionObservable();
    collisionObservable.add((collisionEvent) => {
        // Check if colliding with player
        if (collisionEvent.collidedAgainst === g.playerAggregate?.body && enemy.attackCooldown <= 0) {
            if(g.damagePlayer) g.damagePlayer(10);
            enemy.attackCooldown = 1.0;
        }
    });
    
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
        if (!g.camera || !g.playerAggregate) return;
        
        const direction = g.playerAggregate.transformNode.position.subtract(enemy.mesh.position);
        direction.y = 0; // Keep enemy on ground
        direction.normalize();
        
        // Apply force towards player
        const force = direction.scale(enemy.speed * 50); // Scale for physics force
        enemy.aggregate.body.applyForce(force, enemy.mesh.position);
        
        // Make enemy face player
        enemy.mesh.lookAt(new BABYLON.Vector3(g.playerAggregate.transformNode.position.x, enemy.mesh.position.y, g.playerAggregate.transformNode.position.z));
        
        // Check for attack range (collision handles actual damage)
        const distanceToPlayer = BABYLON.Vector3.Distance(enemy.mesh.position, g.playerAggregate.transformNode.position);
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
    if (g.scene && enemy.mesh) {
        enemy.mesh.dispose();
    }
    
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