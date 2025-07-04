// Effects module (bullets, explosions, damage numbers) for Babylon.js

window.game.createBulletTracer = function(direction) {
    const g = window.game;
    const weapon = g.weapons[g.currentWeapon];
    
    // Create bullet model if defined
    if (!weapon.bulletModel) return;
    
    // Create bullet mesh from model
    const bullet = weapon.bulletModel.clone();
    
    // Calculate muzzle position based on weapon model
    let muzzlePosition;
    let muzzleOffset = 0.7;
    
    if (weapon.muzzleFlash) {
        // Get world position of the muzzle
        muzzlePosition = weapon.muzzleFlash.getAbsolutePosition();
        
        // Add slight offset to prevent collision with weapon
        const offsetVector = direction.clone().scale(0.1);
        muzzlePosition.addInPlace(offsetVector);
    } else {
        // Fallback if no muzzle flash reference
        muzzlePosition = g.camera.position.clone();
        const forwardOffset = direction.clone().scale(muzzleOffset);
        muzzlePosition.addInPlace(forwardOffset);
    }
    
    // For tracer effect, make the bullet longer in its movement direction
    if (g.currentWeapon !== g.WEAPON_ROCKET) {
        // Scale bullet to be longer for tracer effect
        bullet.scaling.z = 3;
    }
    
    // Set bullet position at muzzle
    bullet.position.copyFrom(muzzlePosition);
    
    // Point bullet in direction of travel
    const targetPos = muzzlePosition.add(direction);
    bullet.lookAt(targetPos);
    
    // Add bullet to scene
    bullet.setParent(null);
    bullet.setEnabled(true);
    
    // Store bullet data for animation
    const bulletData = {
        bullet: bullet,
        velocity: direction.clone().scale(weapon.bulletSpeed),
        created: Date.now(),
        // Lifetime depends on weapon type
        lifetime: g.currentWeapon === g.WEAPON_ROCKET ? 3000 : 1000
    };
    
    g.bullets.push(bulletData);
};

window.game.createRocket = function(position, direction) {
    const g = window.game;
    const weapon = g.weapons[g.WEAPON_ROCKET];
    
    // Create rocket mesh
    const rocket = weapon.bulletModel.clone();
    
    // Set position slightly in front of camera
    const rocketStart = direction.clone().scale(0.7).add(position);
    rocket.position.copyFrom(rocketStart);
    
    // Orient rocket in direction of travel
    const targetPos = rocketStart.add(direction);
    rocket.lookAt(targetPos);
    
    // Add to scene
    rocket.setParent(null);
    rocket.setEnabled(true);
    
    // Store rocket data for animation
    const rocketData = {
        bullet: rocket,
        velocity: direction.clone().scale(weapon.bulletSpeed),
        created: Date.now(),
        lifetime: 3000,
        isRocket: true
    };
    
    g.bullets.push(rocketData);
};

window.game.createExplosion = function(position, radius) {
    const g = window.game;
    // Create explosion sphere
    const explosion = BABYLON.MeshBuilder.CreateSphere("explosion", {diameter: radius * 2, segments: 16}, g.scene);
    const explosionMat = new BABYLON.StandardMaterial("explosionMat", g.scene);
    explosionMat.diffuseColor = new BABYLON.Color3(1, 0.33, 0);
    explosionMat.emissiveColor = new BABYLON.Color3(1, 0.33, 0);
    explosionMat.alpha = 1.0;
    explosion.material = explosionMat;
    explosion.position.copyFrom(position);
    
    // Add to explosions array for animation
    g.explosions.push({
        mesh: explosion,
        created: Date.now(),
        lifetime: 500,
        radius: radius
    });
    
    // Check for enemies in blast radius
    for (const enemy of g.enemies) {
        const distance = BABYLON.Vector3.Distance(enemy.mesh.position, position);
        if (distance <= radius * 1.5) {
            // Calculate damage based on distance (more damage closer to explosion)
            const damage = Math.round(g.weapons[g.WEAPON_ROCKET].damage * (1 - distance / (radius * 1.5)));
            if (damage > 0) {
                if(g.damageEnemy) g.damageEnemy(enemy, damage, enemy.mesh.position);
            }
        }
    }
    
    // Check if player is in blast radius (self-damage)
    const playerDistance = BABYLON.Vector3.Distance(g.camera.position, position);
    if (playerDistance <= radius * 1.2) {
        // Calculate damage based on distance
        const damage = Math.round(20 * (1 - playerDistance / (radius * 1.2)));
        if (damage > 0) {
            if(g.damagePlayer) g.damagePlayer(damage);
        }
    }
};

window.game.createBulletImpact = function(position, normal) {
    const g = window.game;
    // Create a simple impact mark (small disc facing the normal)
    const impact = BABYLON.MeshBuilder.CreateDisc("impact", {radius: 0.05, tessellation: 8}, g.scene);
    const impactMat = new BABYLON.StandardMaterial("impactMat", g.scene);
    impactMat.diffuseColor = new BABYLON.Color3(0.2, 0.2, 0.2);
    impactMat.alpha = 0.8;
    impact.material = impactMat;
    
    // Position slightly above surface to prevent z-fighting
    const offset = normal.clone().scale(0.01);
    impact.position.copyFrom(position.add(offset));
    
    // Orient to face impact normal
    const targetPos = position.add(normal);
    impact.lookAt(targetPos);
    
    // Remove after delay
    setTimeout(() => {
        impact.dispose();
    }, 5000);
};

window.game.updateBullets = function() {
    const g = window.game;
    // Loop through bullets array in reverse to safely remove items
    for (let i = g.bullets.length - 1; i >= 0; i--) {
        const bullet = g.bullets[i];
        
        // Move bullet
        bullet.bullet.position.addInPlace(bullet.velocity.scale(g.deltaTime));
        
        // Check for rocket collision with environment
        if (bullet.isRocket) {
            const ray = new BABYLON.Ray(bullet.bullet.position, bullet.velocity.clone().normalize());
            const hit = g.scene.pickWithRay(ray);
            
            if (hit.hit && hit.distance < 1.0) { // Close hit detection for rockets
                // Skip hits on bullets, weapons, player
                if (hit.pickedMesh === g.playerPhysicsBody || 
                    g.bullets.some(b => b.bullet === hit.pickedMesh) ||
                    Object.values(g.weapons).some(w => w.model && w.model.getChildMeshes().includes(hit.pickedMesh))) {
                    continue;
                }
                
                // Skip hit on self (rocket)
                if (hit.pickedMesh === bullet.bullet) {
                    continue;
                }
                
                // Explosion at hit point
                if(g.createExplosion) g.createExplosion(hit.pickedPoint, 5);
                
                // Remove rocket
                bullet.bullet.dispose();
                g.bullets.splice(i, 1);
                continue;
            }
        }
        
        // Check lifetime
        const age = Date.now() - bullet.created;
        if (age > bullet.lifetime) {
            // Handle rocket that expired without hitting anything
            if (bullet.isRocket) {
                if(g.createExplosion) g.createExplosion(bullet.bullet.position, 5);
            }
            
            // Remove bullet
            bullet.bullet.dispose();
            g.bullets.splice(i, 1);
        }
    }
};

window.game.updateExplosions = function() {
    const g = window.game;
    for (let i = g.explosions.length - 1; i >= 0; i--) {
        const explosion = g.explosions[i];
        
        // Scale explosion
        const age = Date.now() - explosion.created;
        const progress = age / explosion.lifetime;
        
        if (progress < 0.5) {
            // Expand
            const scale = progress * 2;
            explosion.mesh.scaling.setAll(scale);
        } else {
            // Fade out
            explosion.mesh.material.alpha = 1 - ((progress - 0.5) * 2);
        }
        
        // Remove when lifetime is over
        if (progress >= 1) {
            explosion.mesh.dispose();
            g.explosions.splice(i, 1);
        }
    }
};

window.game.showDamageNumber = function(amount, position) {
    const g = window.game;
    // Create a div for the damage number
    const damageDiv = document.createElement('div');
    damageDiv.textContent = amount.toString();
    damageDiv.style.position = 'absolute';
    damageDiv.style.color = amount >= 100 ? '#ff0000' : '#ffffff';
    damageDiv.style.fontWeight = amount >= 50 ? 'bold' : 'normal';
    damageDiv.style.fontSize = `${Math.min(16 + amount / 5, 30)}px`;
    damageDiv.style.textShadow = '1px 1px 2px black';
    damageDiv.style.userSelect = 'none';
    damageDiv.style.pointerEvents = 'none';
    
    // Add to damage number container
    document.getElementById('damage-number-container').appendChild(damageDiv);
    
    // Convert 3D position to screen coordinates
    const screenPosition = BABYLON.Vector3.Project(
        position,
        BABYLON.Matrix.Identity(),
        g.scene.getTransformMatrix(),
        g.camera.viewport.toGlobal(g.engine.getRenderWidth(), g.engine.getRenderHeight())
    );
    
    const x = screenPosition.x;
    const y = screenPosition.y;
    
    damageDiv.style.left = `${x}px`;
    damageDiv.style.top = `${y}px`;
    
    const lastUpdate = Date.now();
    
    // Add to damage numbers array for animation
    g.damageNumbers.push({
        element: damageDiv,
        position: { x, y: y },
        opacity: 1,
        created: Date.now(),
        lastUpdate: lastUpdate
    });
};

window.game.updateDamageNumbers = function() {
    const g = window.game;
    for (let i = g.damageNumbers.length - 1; i >= 0; i--) {
        const damageNumber = g.damageNumbers[i];
        const now = Date.now();
        const age = now - damageNumber.created;
        const dt = (now - damageNumber.lastUpdate) / 1000;
        
        // Float upward
        damageNumber.position.y -= 50 * dt;
        
        // Fade out
        damageNumber.opacity = Math.max(0, 1 - (age / 1000));
        
        // Update DOM element
        damageNumber.element.style.top = `${damageNumber.position.y}px`;
        damageNumber.element.style.opacity = damageNumber.opacity;
        
        // Update last update time
        damageNumber.lastUpdate = now;
        
        // Remove if fully faded
        if (damageNumber.opacity <= 0 || age > 1000) {
            if (damageNumber.element.parentNode) {
                damageNumber.element.parentNode.removeChild(damageNumber.element);
            }
            g.damageNumbers.splice(i, 1);
        }
    }
};

window.game.updateEnemyHealthBar = function(enemy) {
    const g = window.game;
    // Create health bar if it doesn't exist
    if (!g.enemyHealthBars[enemy.id]) {
        const barContainer = document.createElement('div');
        barContainer.style.position = 'absolute';
        barContainer.style.width = '50px';
        barContainer.style.height = '5px';
        barContainer.style.backgroundColor = 'rgba(0,0,0,0.5)';
        barContainer.style.border = '1px solid rgba(255,255,255,0.3)';
        barContainer.style.pointerEvents = 'none';
        
        const barFill = document.createElement('div');
        barFill.style.position = 'absolute';
        barFill.style.top = '0';
        barFill.style.left = '0';
        barFill.style.height = '100%';
        barFill.style.backgroundColor = 'rgba(255,50,50,0.8)';
        barFill.style.width = '100%';
        
        barContainer.appendChild(barFill);
        const containerElement = document.getElementById('enemy-health-bar-container');
        if (containerElement) {
            containerElement.appendChild(barContainer);
        }
        
        g.enemyHealthBars[enemy.id] = {
            container: barContainer,
            fill: barFill
        };
    }
    
    // Update health bar fill
    const healthPercent = enemy.health / enemy.maxHealth * 100;
    g.enemyHealthBars[enemy.id].fill.style.width = `${healthPercent}%`;
    
    // Show health bar
    g.enemyHealthBars[enemy.id].container.style.visibility = 'visible';
    
    // Position health bar above enemy
    const enemyWorldPos = enemy.mesh.position.clone();
    enemyWorldPos.y += 2.5;
    
    const screenPosition = BABYLON.Vector3.Project(
        enemyWorldPos,
        BABYLON.Matrix.Identity(),
        g.scene.getTransformMatrix(),
        g.camera.viewport.toGlobal(g.engine.getRenderWidth(), g.engine.getRenderHeight())
    );
    
    g.enemyHealthBars[enemy.id].container.style.left = `${screenPosition.x - 25}px`;
    g.enemyHealthBars[enemy.id].container.style.top = `${screenPosition.y}px`;
    
    // Hide after delay
    if (enemy.healthBarTimeout) {
        clearTimeout(enemy.healthBarTimeout);
    }
    
    enemy.healthBarTimeout = setTimeout(() => {
        if (g.enemyHealthBars[enemy.id]) {
            g.enemyHealthBars[enemy.id].container.style.visibility = 'hidden';
        }
    }, 2000);
};