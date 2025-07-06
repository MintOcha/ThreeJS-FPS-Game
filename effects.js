// Effects module (bullets, explosions, damage numbers) for Babylon.js

window.game.createBulletTracer = function(startPos, direction) {
    const g = window.game;
    const weapon = g.weapons[g.currentWeapon];
    
    // Create bullet model if defined, otherwise create a simple bullet
    let bullet;
    if (weapon.bulletModel) {
        bullet = weapon.bulletModel.createInstance(`tracer_${Date.now()}`);
    } else {
        // Create a simple bullet mesh as fallback
        bullet = BABYLON.MeshBuilder.CreateBox(`tracer_${Date.now()}`,
            {width: 0.05, height: 0.05, depth: 0.2}, g.scene);
        const bulletMat = new BABYLON.StandardMaterial(`tracerMat_${Date.now()}`, g.scene);
        bulletMat.diffuseColor = new BABYLON.Color3(1, 1, 0); // Yellow tracer
        bulletMat.emissiveColor = new BABYLON.Color3(1, 1, 0);
        bullet.material = bulletMat;
    }
    
    // For tracer effect, make the bullet longer in its movement direction
    if (g.currentWeapon !== g.WEAPON_ROCKET) {
        // Scale bullet to be longer for tracer effect
        bullet.scaling.z = 3;
    }
    
    // Set bullet position at the calculated start position
    bullet.position.copyFrom(startPos);
    
    // Point bullet in direction of travel
    const targetPos = startPos.clone().add(direction.scale(10));
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
    const rocket = weapon.bulletModel.clone("rocket");
    
    // Ensure rocket is visible
    rocket.isVisible = true;
    rocket.setEnabled(true);
    
    // Set position slightly in front of camera to avoid immediate collision
    const rocketStart = direction.clone().scale(1.5).add(position);
    rocket.position.copyFrom(rocketStart);
    
    // Orient rocket in direction of travel
    const targetPos = rocketStart.add(direction);
    rocket.lookAt(targetPos);
    
    // Add to scene
    rocket.setParent(null);
    rocket.setEnabled(true);
    
    // Add DYNAMIC physics to rocket for collision detection
    const rocketAggregate = new BABYLON.PhysicsAggregate(rocket, BABYLON.PhysicsShapeType.BOX, 
        { mass: 1, restitution: 0, friction: 0 }, g.scene);
    
    // Set initial velocity for physics-based movement
    const physicsVelocity = direction.clone().scale(weapon.bulletSpeed);
    rocketAggregate.body.setLinearVelocity(physicsVelocity);

    // Create rocket collision object using new collision system
    const rocketCollision = g.CollisionManager.createBulletCollision(rocket, rocketAggregate, {
        isRocket: true,
        created: Date.now(),
        lifetime: 3000
    });
    
    // Store rocket data for animation
    const rocketData = {
        bullet: rocket,
        aggregate: rocketAggregate,
        created: Date.now(),
        lifetime: 3000,
        isRocket: true,
        collisionObject: rocketCollision
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
    // Get player position from either playerController or camera
    let playerPosition;
    if (g.playerController) {
        playerPosition = g.playerController.getPosition();
    } else if (g.playerMesh) {
        playerPosition = g.playerMesh.position;
    } else {
        playerPosition = g.camera.position;
    }
    
    const playerDistance = BABYLON.Vector3.Distance(playerPosition, position);
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
    
    // Initialize bullet impacts array if it doesn't exist
    if (!g.bulletImpacts) g.bulletImpacts = [];
    
    // Clean up old bullet impacts (limit to 50)
    while (g.bulletImpacts.length > 50) {
        const oldImpact = g.bulletImpacts.shift();
        if (oldImpact && !oldImpact.isDisposed()) {
            oldImpact.dispose();
        }
    }
    
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
    
    // Add to impacts array for management
    g.bulletImpacts.push(impact);
    
    // Remove after delay
    setTimeout(() => {
        const index = g.bulletImpacts.indexOf(impact);
        if (index !== -1) g.bulletImpacts.splice(index, 1);
        if (!impact.isDisposed()) impact.dispose();
    }, 5000);
};

window.game.updateBullets = function() {
    const g = window.game;
    const dt = g.engine.getDeltaTime() / 1000;

    // Loop through bullets array in reverse to safely remove items
    for (let i = g.bullets.length - 1; i >= 0; i--) {
        const bulletData = g.bullets[i];

        // For non-physics bullets (tracers), move them manually
        if (!bulletData.isRocket) {
            bulletData.bullet.position.addInPlace(bulletData.velocity.scale(dt));
        }
        
        // Check lifetime
        const age = Date.now() - bulletData.created;
        if (age > bulletData.lifetime) {
            // Handle rocket that expired without hitting anything
            if (bulletData.isRocket) {
                if(g.createExplosion) g.createExplosion(bulletData.bullet.position, 5);
                // Clean up observer
                if (bulletData.collisionObserver) {
                    bulletData.aggregate.body.getCollisionObservable().remove(bulletData.collisionObserver);
                }
            }
            
            // Remove bullet
            if (bulletData.aggregate) bulletData.aggregate.dispose();
            bulletData.bullet.dispose();
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
    
    // Convert 3D position to screen coordinates using proper viewport
    const engine = g.engine;
    const scene = g.scene;
    const camera = g.camera;
    
    const screenPosition = BABYLON.Vector3.Project(
        position,
        BABYLON.Matrix.Identity(),
        scene.getTransformMatrix(),
        camera.viewport.toGlobal(engine.getRenderWidth(), engine.getRenderHeight())
    );
    
    // Ensure coordinates are within screen bounds
    const x = Math.max(0, Math.min(engine.getRenderWidth(), screenPosition.x));
    const y = Math.max(0, Math.min(engine.getRenderHeight(), screenPosition.y));
    
    damageDiv.style.left = `${x - 10}px`; // Center the text
    damageDiv.style.top = `${y - 10}px`;
    
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
    console.log(`Updating health bar for enemy ${enemy.id}, health: ${enemy.health}/${enemy.maxHealth}`); // Debug log
    
    // Create Babylon.js GUI health bar if it doesn't exist
    if (!g.enemyHealthBars[enemy.id]) {
        console.log(`Creating new health bar for enemy ${enemy.id}`); // Debug log
        
        // Create health bar using Babylon.js GUI
        const healthBarTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("healthBarUI_" + enemy.id);
        
        // Create background rectangle
        const background = new BABYLON.GUI.Rectangle("healthBarBg_" + enemy.id);
        background.widthInPixels = 60;
        background.heightInPixels = 8;
        background.cornerRadius = 2;
        background.color = "white";
        background.thickness = 1;
        background.background = "rgba(0, 0, 0, 0.7)";
        
        // Create health fill rectangle
        const healthFill = new BABYLON.GUI.Rectangle("healthBarFill_" + enemy.id);
        healthFill.widthInPixels = 56;
        healthFill.heightInPixels = 6;
        healthFill.cornerRadius = 1;
        healthFill.background = "rgba(255, 50, 50, 0.9)";
        healthFill.color = "transparent";
        healthFill.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
        
        // Add to texture
        healthBarTexture.addControl(background);
        background.addControl(healthFill);
        
        // Store references
        g.enemyHealthBars[enemy.id] = {
            texture: healthBarTexture,
            background: background,
            fill: healthFill,
            isVisible: true,
            lastUpdateTime: Date.now()
        };
    }
    
    const healthBar = g.enemyHealthBars[enemy.id];
    
    // Update health fill width
    const healthPercent = Math.max(0, enemy.health / enemy.maxHealth);
    healthBar.fill.widthInPixels = Math.max(2, 56 * healthPercent);
    
    // Update color based on health
    if (healthPercent > 0.6) {
        healthBar.fill.background = "rgba(50, 255, 50, 0.9)"; // Green
    } else if (healthPercent > 0.3) {
        healthBar.fill.background = "rgba(255, 255, 50, 0.9)"; // Yellow
    } else {
        healthBar.fill.background = "rgba(255, 50, 50, 0.9)"; // Red
    }
    
    // Position health bar above enemy
    const enemyWorldPos = enemy.mesh.position.clone();
    enemyWorldPos.y += 2.5; // Height above enemy (reduced from 3.0)
    
    // Project world position to screen coordinates
    const engine = g.engine;
    const scene = g.scene;
    const camera = g.camera;
    
    const screenPos = BABYLON.Vector3.Project(
        enemyWorldPos,
        BABYLON.Matrix.Identity(),
        scene.getTransformMatrix(),
        camera.viewport.toGlobal(engine.getRenderWidth(), engine.getRenderHeight())
    );
    
    // Ensure coordinates are within screen bounds and position health bar
    const x = Math.max(30, Math.min(engine.getRenderWidth() - 30, screenPos.x));
    const y = Math.max(10, Math.min(engine.getRenderHeight() - 10, screenPos.y));
    
    healthBar.background.leftInPixels = x - 30;
    healthBar.background.topInPixels = y - 4;
    
    // Show health bar
    healthBar.background.isVisible = true;
    healthBar.isVisible = true;
    healthBar.lastUpdateTime = Date.now();
    
    // Hide after delay
    if (enemy.healthBarTimeout) {
        clearTimeout(enemy.healthBarTimeout);
    }
    
    enemy.healthBarTimeout = setTimeout(() => {
        if (g.enemyHealthBars[enemy.id] && g.enemyHealthBars[enemy.id].background) {
            g.enemyHealthBars[enemy.id].background.isVisible = false;
            g.enemyHealthBars[enemy.id].isVisible = false;
        }
    }, 3000);
};