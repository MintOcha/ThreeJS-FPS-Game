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
    if (!g.gameActive || !g.levelGrid || !g.gridConfig || !g.camera) return;

    const { width: gridWidth, height: gridHeight, tileSize } = g.gridConfig;
    const playerGridPos = worldToGrid(g.camera.position.x, g.camera.position.z);
    if (!playerGridPos) return; // Could not get player grid position

    let spawnGridCol, spawnGridRow;
    let attempts = 0;
    const maxSpawnAttempts = 50; // Prevent infinite loop if no valid spot is found
    const minSpawnDistFromPlayer = 5; // Minimum grid units away from player

    do {
        spawnGridCol = Math.floor(Math.random() * gridWidth);
        spawnGridRow = Math.floor(Math.random() * gridHeight);
        attempts++;
        if (attempts > maxSpawnAttempts) {
            console.warn("Max spawn attempts reached. Spawning enemy at random valid location or failing.");
            // Fallback: find any empty cell if distant spawn fails
            let foundFallback = false;
            for (let r = 0; r < gridHeight; r++) {
                for (let c = 0; c < gridWidth; c++) {
                    if (g.levelGrid[r][c] === 0) {
                        spawnGridCol = c;
                        spawnGridRow = r;
                        foundFallback = true;
                        break;
                    }
                }
                if (foundFallback) break;
            }
            if (!foundFallback) {
                 console.error("Could not find any empty cell to spawn enemy.");
                 return; // No valid spot found at all
            }
            break; // Exit do-while loop
        }
        
        const distToPlayer = Math.sqrt(
            Math.pow(spawnGridCol - playerGridPos.col, 2) + 
            Math.pow(spawnGridRow - playerGridPos.row, 2)
        );

        if (g.levelGrid[spawnGridRow][spawnGridCol] === 0 && distToPlayer >= minSpawnDistFromPlayer) {
            break; // Found a valid spot
        }
    } while (true);
    
    const spawnWorldPos = gridToWorld(spawnGridCol, spawnGridRow);
    if (!spawnWorldPos) {
        console.error("Failed to convert spawn grid position to world position.");
        return;
    }

    // Create enemy mesh
    const enemyGeo = new THREE.BoxGeometry(1, 2, 1); // Standard enemy size
    const enemyMat = new THREE.MeshStandardMaterial({ color: 0xff0000 });
    const enemyMesh = new THREE.Mesh(enemyGeo, enemyMat);

    enemyMesh.position.set(spawnWorldPos.x, 1, spawnWorldPos.z); // Enemy Y position is 1 (half height of 2)
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

// Helper functions for coordinate conversion
function worldToGrid(worldX, worldZ) {
    const g = window.game;
    if (!g.gridConfig) return null; // Grid config not yet available

    const { width, height, tileSize } = g.gridConfig;
    // Convert world coordinates (centered around 0,0) to grid coordinates (top-left 0,0)
    const gridCol = Math.floor((worldX / tileSize) + width / 2);
    const gridRow = Math.floor((worldZ / tileSize) + height / 2);
    
    // Clamp to grid boundaries
    const clampedCol = Math.max(0, Math.min(width - 1, gridCol));
    const clampedRow = Math.max(0, Math.min(height - 1, gridRow));

    return { col: clampedCol, row: clampedRow };
}

function gridToWorld(gridCol, gridRow) {
    const g = window.game;
    if (!g.gridConfig) return null;

    const { width, height, tileSize } = g.gridConfig;
    // Convert grid coordinates (top-left 0,0) to world coordinates (center of tile)
    const worldX = (gridCol - width / 2 + 0.5) * tileSize;
    const worldZ = (gridRow - height / 2 + 0.5) * tileSize;
    
    return { x: worldX, z: worldZ };
}


window.game.updateEnemies = function() {
    const g = window.game;
    const playerCollisionRadius = 0.5; // For enemy pushing player
    const enemyRadius = 0.5;           // For enemy pushing player

    if (!g.camera || !g.levelGrid || !g.gridConfig) return; // Ensure necessary components are loaded

    for (const enemy of g.enemies) {
        // Initialize pathfinding properties if they don't exist
        if (enemy.pathRecalculationTimer === undefined) {
            enemy.pathRecalculationTimer = 0;
            enemy.path = [];
            enemy.lastPlayerGridPos = null; // Store player's last grid pos for recalculation trigger
        }

        enemy.pathRecalculationTimer -= g.deltaTime;

        // Update attack cooldown
        if (enemy.attackCooldown > 0) {
            enemy.attackCooldown -= g.deltaTime;
        }

        const playerWorldPos = g.camera.position;
        const enemyWorldPos = enemy.mesh.position;

        const playerGridPos = worldToGrid(playerWorldPos.x, playerWorldPos.z);
        const enemyGridPos = worldToGrid(enemyWorldPos.x, enemyWorldPos.z);

        if (!playerGridPos || !enemyGridPos) continue; // Conversion failed

        // Path recalculation logic
        let playerMovedSignificantly = false;
        if (enemy.lastPlayerGridPos) {
            if (enemy.lastPlayerGridPos.col !== playerGridPos.col || enemy.lastPlayerGridPos.row !== playerGridPos.row) {
                playerMovedSignificantly = true;
            }
        } else {
            playerMovedSignificantly = true; // First time, calculate path
        }
        
        if (enemy.pathRecalculationTimer <= 0 || playerMovedSignificantly || enemy.path.length === 0) {
            if (g.findPath) {
                enemy.path = g.findPath(enemyGridPos.col, enemyGridPos.row, playerGridPos.col, playerGridPos.row, g.levelGrid);
                enemy.pathRecalculationTimer = 1.0; // Recalculate path every 1 second or if player moves
                enemy.lastPlayerGridPos = playerGridPos;
            }
        }

        let targetWorldPos = null;
        if (enemy.path && enemy.path.length > 0) {
            const nextWaypointGrid = enemy.path[0]; // Path is [col, row]
            targetWorldPos = gridToWorld(nextWaypointGrid[0], nextWaypointGrid[1]);

            if (targetWorldPos) {
                const distanceToWaypointXZ = Math.sqrt(
                    Math.pow(targetWorldPos.x - enemyWorldPos.x, 2) +
                    Math.pow(targetWorldPos.z - enemyWorldPos.z, 2)
                );

                if (distanceToWaypointXZ < enemy.speed * 2 * g.deltaTime + 0.1) { // If close enough to waypoint
                    enemy.path.shift(); // Remove current waypoint
                    if (enemy.path.length > 0) { // If there's a next waypoint
                        const newNextWaypointGrid = enemy.path[0];
                        targetWorldPos = gridToWorld(newNextWaypointGrid[0], newNextWaypointGrid[1]);
                    } else {
                        targetWorldPos = null; // Reached end of path
                    }
                }
            }
        }
        
        let direction = new THREE.Vector3();
        if (targetWorldPos) {
            // Move towards path waypoint
            direction.subVectors(new THREE.Vector3(targetWorldPos.x, enemyWorldPos.y, targetWorldPos.z), enemyWorldPos);
        } else {
            // Fallback: if no path or path ended, move towards player directly (original behavior for short distances)
            // This can be refined, e.g., only if player is very close and visible
            direction.subVectors(playerWorldPos, enemyWorldPos);
        }
        direction.y = 0;
        direction.normalize();

        enemy.velocity.x = direction.x * enemy.speed;
        enemy.velocity.z = direction.z * enemy.speed;

        // Collision with player (pushing logic - simplified from previous)
        const potentialPosition = new THREE.Vector3(
            enemyWorldPos.x + enemy.velocity.x,
            enemyWorldPos.y,
            enemyWorldPos.z + enemy.velocity.z
        );
        const dxPotential = potentialPosition.x - playerWorldPos.x;
        const dzPotential = potentialPosition.z - playerWorldPos.z;
        const distanceToPlayerNextXZ = Math.sqrt(dxPotential * dxPotential + dzPotential * dzPotential);
        const collisionThreshold = playerCollisionRadius + enemyRadius;

        if (distanceToPlayerNextXZ < collisionThreshold) {
            const clampedX = playerWorldPos.x + direction.x * collisionThreshold; // Push along current movement dir
            const clampedZ = playerWorldPos.z + direction.z * collisionThreshold;
            enemy.mesh.position.set(clampedX, enemy.mesh.position.y, clampedZ);
        } else {
            enemy.mesh.position.x += enemy.velocity.x;
            enemy.mesh.position.z += enemy.velocity.z;
        }
        
        // Make enemy face player (or movement direction if preferred)
        enemy.mesh.lookAt(new THREE.Vector3(playerWorldPos.x, enemy.mesh.position.y, playerWorldPos.z));
        
        // Check for attack range (based on direct distance to player)
        const dxActual = enemyWorldPos.x - playerWorldPos.x;
        const dzActual = enemyWorldPos.z - playerWorldPos.z;
        const distanceToPlayerXZ = Math.sqrt(dxActual * dxActual + dzActual * dzActual);

        if (distanceToPlayerXZ < 1.5 && enemy.attackCooldown <= 0) { // Attack range
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