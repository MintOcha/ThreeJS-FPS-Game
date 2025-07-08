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
    
    // Clear any existing wave timer
    if (g.waveTimer) {
        clearTimeout(g.waveTimer);
        g.waveTimer = null;
    }
    
    // Start next wave timer immediately (30 seconds)
    g.isWaveTransition = true;
    g.waveStartTime = Date.now();
    
    g.waveTimer = setTimeout(() => {
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
    
    // Find a safe spawn position in the backrooms maze
    let spawnPos = new BABYLON.Vector3();
    let attempts = 0;
    const maxAttempts = 50;
    
    if (g.lastGeneratedMaze) {
        // Try to spawn in open areas of the maze
        const openCells = [];
        for (let row = 0; row < g.lastGeneratedMaze.length; row++) {
            for (let col = 0; col < g.lastGeneratedMaze[row].length; col++) {
                if (g.lastGeneratedMaze[row][col].isPath) {
                    openCells.push(g.lastGeneratedMaze[row][col]);
                }
            }
        }
        
        if (openCells.length > 0) {
            let validSpawn = false;
            do {
                const randomCell = openCells[Math.floor(Math.random() * openCells.length)];
                spawnPos.set(randomCell.x, 1, randomCell.y);
                
                // Ensure minimum distance from player
                const distanceFromPlayer = g.camera ? BABYLON.Vector3.Distance(spawnPos, g.camera.position) : 100;
                validSpawn = distanceFromPlayer >= 15;
                attempts++;
            } while (!validSpawn && attempts < maxAttempts);
        }
    }
    
    // Fallback to random position if maze spawn failed
    if (attempts >= maxAttempts) {
        do {
            spawnPos.set(
                (Math.random() - 0.5) * 80,
                1,
                (Math.random() - 0.5) * 80
            );
            attempts++;
        } while (g.camera && BABYLON.Vector3.Distance(spawnPos, g.camera.position) < 15 && attempts < maxAttempts * 2);
    }
    
    enemyMesh.position.copyFrom(spawnPos);
    
    // Add physics to enemy using PhysicsAggregate with proper dynamic motion
    const enemyAggregate = new BABYLON.PhysicsAggregate(enemyMesh, BABYLON.PhysicsShapeType.BOX, 
        { mass: 1, restitution: 0.1, friction: 0.8 }, g.scene);
    
    // Set motion type to dynamic so enemies can move
    enemyAggregate.body.setMotionType(BABYLON.PhysicsMotionType.DYNAMIC);
    
    // Set linear damping to prevent sliding (reduced for better responsiveness)
    enemyAggregate.body.setLinearDamping(0.2);
    
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
        isDead: false, // Add isDead flag
        // Pathfinding properties
        path: [],
        pathIndex: 0,
        lastPathUpdate: Date.now() - Math.random() * 800, // Random initial offset
        pathUpdateInterval: 800 + Math.random() * 400, // Stagger updates (800-1200ms)
        currentTarget: null,
        stuckTimer: 0,
        lastPosition: new BABYLON.Vector3(),
        stuckThreshold: 0.1,
        stuckTimeout: 3000 // 3 seconds before recalculating path
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
        
        // Move towards player using pathfinding
        if (!g.camera) return;
        
        // Get player position from camera (since player follows camera)
        const playerPosition = g.camera.position;
        const currentTime = Date.now();
        
        // Check if enemy is stuck
        const currentPosition = enemy.mesh.position;
        const distanceMoved = BABYLON.Vector3.Distance(currentPosition, enemy.lastPosition);
        
        if (distanceMoved < enemy.stuckThreshold) {
            enemy.stuckTimer += g.deltaTime;
        } else {
            enemy.stuckTimer = 0;
            enemy.lastPosition.copyFrom(currentPosition);
        }
        
        // Update path if needed (interval-based or if stuck)
        const shouldUpdatePath = (
            currentTime - enemy.lastPathUpdate > enemy.pathUpdateInterval ||
            enemy.stuckTimer > enemy.stuckTimeout ||
            enemy.path.length === 0
        );
        
        if (shouldUpdatePath && g.PathfindingManager) {
            const newPath = g.PathfindingManager.findPath(currentPosition, playerPosition);
            if (newPath.length > 0) {
                enemy.path = newPath;
                enemy.pathIndex = 0;
                enemy.lastPathUpdate = currentTime;
                enemy.stuckTimer = 0;
                
                // Debug visualization if enabled
                if (g.PathfindingManager.debugVisualizationEnabled) {
                    g.PathfindingManager.debugVisualizePath(enemy.path, enemy.id);
                }
            }
        }
        
        // Follow the path
        if (enemy.path.length > 0 && enemy.pathIndex < enemy.path.length) {
            const targetWaypoint = enemy.path[enemy.pathIndex];
            const direction = targetWaypoint.clone().subtract(currentPosition);
            direction.y = 0; // Keep enemy on ground
            
            const distanceToWaypoint = direction.length();
            
            // Check if reached current waypoint
            if (distanceToWaypoint < 1.5) {
                enemy.pathIndex++;
                // If reached end of path, clear it to trigger recalculation
                if (enemy.pathIndex >= enemy.path.length) {
                    enemy.path = [];
                    enemy.pathIndex = 0;
                }
            } else {
                // Move towards waypoint
                direction.normalize();
                
                // Apply force towards waypoint
                const force = direction.scale(enemy.speed * 400);
                enemy.aggregate.body.applyForce(force, new BABYLON.Vector3(0, 0, 0));
                
                // Make enemy face movement direction
                enemy.mesh.lookAt(new BABYLON.Vector3(
                    currentPosition.x + direction.x,
                    enemy.mesh.position.y,
                    currentPosition.z + direction.z
                ));
            }
        } else {
            // Fallback to direct movement if no path available
            const direction = playerPosition.clone().subtract(currentPosition);
            direction.y = 0; // Keep enemy on ground
            
            // Only move if there's a significant distance
            if (direction.length() > 0.1) {
                direction.normalize();
                
                // Apply reduced force for direct movement (fallback)
                const force = direction.scale(enemy.speed * 300);
                enemy.aggregate.body.applyForce(force, new BABYLON.Vector3(0, 0, 0));
                
                // Make enemy face player
                enemy.mesh.lookAt(new BABYLON.Vector3(playerPosition.x, enemy.mesh.position.y, playerPosition.z));
            }
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
    
    // Calculate enemies for this wave - more aggressive scaling
    const enemyCount = Math.min(3 + g.currentWave * 3, 50); // Start with 6, add 3 per wave, cap at 50
    g.enemiesRemaining = enemyCount;
    
    console.log(`Starting Wave ${g.currentWave} with ${enemyCount} enemies`);
    
    // Spawn enemies with staggered timing
    for (let i = 0; i < enemyCount; i++) {
        // Delay spawn to avoid all enemies appearing at once
        setTimeout(() => {
            if (g.gameActive) { // Only spawn if game is still active
                window.game.spawnEnemy();
            }
        }, i * 150); // Slightly faster spawn rate
    }
    
    // Start automatic wave timer for next wave (regardless of completion)
    g.waveStartTime = Date.now();
    
    // Clear any existing timer
    if (g.waveTimer) {
        clearTimeout(g.waveTimer);
    }
    
    // Set timer for next wave
    g.waveTimer = setTimeout(() => {
        if (g.gameActive) {
            window.game.startNextWave();
        }
    }, g.waveDelay);
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
    
    // Clear pathfinding data
    if (enemy.path) {
        enemy.path = [];
    }
    
    // Clear debug visualization for this enemy
    if (g.PathfindingManager && g.pathDebugMarkers && g.pathDebugMarkers[enemy.id]) {
        g.pathDebugMarkers[enemy.id].forEach(marker => marker.dispose());
        delete g.pathDebugMarkers[enemy.id];
    }
    
    // Remove from enemies array
    const index = g.enemies.indexOf(enemy);
    if (index !== -1) {
        g.enemies.splice(index, 1);
    }
    
    // Update enemies remaining
    g.enemiesRemaining--;
    console.log(`Enemies remaining: ${g.enemiesRemaining}`); // Debug log
    
    // Check if wave is cleared (optional - waves continue automatically)
    if (g.enemiesRemaining <= 0) {
        // Show wave cleared message but don't reset timer
        if (g.waveStatusText) {
            g.waveStatusText.textContent = `Wave ${g.currentWave} Cleared!`;
            g.waveStatusText.style.display = 'block';
        
            // Hide after delay
            setTimeout(() => {
                if (g.waveStatusText) g.waveStatusText.style.display = 'none';
            }, 2000);
        }
    }
};