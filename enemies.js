// Enemy system module
import * as THREE from 'three';
import { updateEnemyHealthBar } from 'ui';
import { scene, camera } from 'world';

// Exported enemy state variables
export let enemies = [];
export let currentWave = 0;
export let enemiesRemaining = 0;
export let waveDelay = 5000; // ms
export let isWaveTransition = false;

// Function to handle wave cleared state
export function waveCleared() {
    // Show wave cleared message
    const waveStatusText = document.getElementById('wave-status-text');
    waveStatusText.textContent = `Wave ${currentWave} Cleared!`;
    waveStatusText.style.display = 'block';
    
    // Hide after delay
    setTimeout(() => {
        waveStatusText.style.display = 'none';
    }, 3000);
    
    // Start next wave after delay
    isWaveTransition = true;
    
    // Wait a bit longer before starting next wave
    setTimeout(() => {
        isWaveTransition = false;
        startNextWave();
    }, waveDelay);
}

// Exported enemy-related functions
export function spawnEnemy() {
    // Skip if game is not active
    if (!gameActive) return;
    
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
    } while (spawnPos.distanceTo(camera.position) < 15);
    
    enemyMesh.position.copy(spawnPos);
    enemyMesh.castShadow = true;
    enemyMesh.receiveShadow = true;
    
    // Calculate health based on wave
    const baseHealth = 100;
    const healthMultiplier = 1 + (currentWave - 1) * 0.2; // +20% health per wave
    const health = Math.round(baseHealth * healthMultiplier);
    
    // Add to scene
    scene.add(enemyMesh);
    
    // Create enemy object
    const enemy = {
        id: `enemy-${Date.now()}-${Math.random()}`,
        mesh: enemyMesh,
        velocity: new THREE.Vector3(),
        health: health,
        maxHealth: health,
        speed: 0.05,
        attackCooldown: 0,
        lastAttackTime: 0
    };
    
    // Add to enemies array
    enemies.push(enemy);
}
export function updateEnemies(deltaTime) {
    for (const enemy of enemies) {
        // Update attack cooldown
        if (enemy.attackCooldown > 0) {
            enemy.attackCooldown -= deltaTime;
        }
        
        // Move towards player
        const direction = new THREE.Vector3().subVectors(camera.position, enemy.mesh.position);
        direction.y = 0; // Keep enemy on ground
        direction.normalize();
        
        // Set velocity based on direction and speed
        enemy.velocity.x = direction.x * enemy.speed;
        enemy.velocity.z = direction.z * enemy.speed;
        
        // Apply velocity
        enemy.mesh.position.x += enemy.velocity.x;
        enemy.mesh.position.z += enemy.velocity.z;
        
        // Make enemy face player
        enemy.mesh.lookAt(new THREE.Vector3(camera.position.x, enemy.mesh.position.y, camera.position.z));
        
        // Check for attack range
        const distanceToPlayer = enemy.mesh.position.distanceTo(camera.position);
        if (distanceToPlayer < 1.5 && enemy.attackCooldown <= 0) {
            // Attack player
            damagePlayer(10);
            
            // Set attack cooldown
            enemy.attackCooldown = 1.0; // 1 second between attacks
        }
        
        // Update enemy health bar position if visible
        if (enemyHealthBars[enemy.id] && enemyHealthBars[enemy.id].container.style.visibility !== 'hidden') {
            const screenPos = new THREE.Vector3().copy(enemy.mesh.position);
            screenPos.y += 2.5; // Position above enemy
            screenPos.project(camera);
            
            const x = (screenPos.x * 0.5 + 0.5) * window.innerWidth;
            const y = (-(screenPos.y * 0.5) + 0.5) * window.innerHeight;
            
            enemyHealthBars[enemy.id].container.style.left = `${x - 25}px`; // Center bar
            enemyHealthBars[enemy.id].container.style.top = `${y}px`;
        }
    }
}
export function startNextWave() {
    // Increment wave
    currentWave++;
    
    // Update wave text
    waveText.textContent = `Wave: ${currentWave}`;
    
    // Calculate enemies for this wave
    const enemyCount = Math.min(5 + currentWave * 2, 40); // Cap at 40 enemies
    enemiesRemaining = enemyCount;
    
    // Spawn enemies
    for (let i = 0; i < enemyCount; i++) {
        // Delay spawn to avoid all enemies appearing at once
        setTimeout(() => spawnEnemy(), i * 200);
    }
}


export function damageEnemy(enemy, amount, hitPoint) {
  
    // Play hit sound
  
    sounds.hit.play();
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
export function killEnemy(enemy) {
    // Remove from scene
    scene.remove(enemy.mesh);
    
    // Remove health bar if it exists
    if (enemyHealthBars[enemy.id]) {
        document.getElementById('enemy-health-bar-container').removeChild(enemyHealthBars[enemy.id].container);
        delete enemyHealthBars[enemy.id];
    }
    
    // Remove from enemies array
    const index = enemies.indexOf(enemy);
    if (index !== -1) {
        enemies.splice(index, 1);
    }
    
    // Update enemies remaining
    enemiesRemaining--;
    
    // Check if wave is cleared
    if (enemiesRemaining <= 0) {
        waveCleared();
    }
}