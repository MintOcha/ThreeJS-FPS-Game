// Effects module (bullets, explosions, damage numbers)
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d';
// Using the global game object for scene, camera and deltaTime instead of imports
// Removed import for damagePlayer, will use window.game.damagePlayer
// Removed import for damageEnemy, will use window.game.damageEnemy

// The 'bullets' and 'explosions' arrays are now managed on window.game.
// This module's functions will modify window.game.bullets and window.game.explosions directly.

// We'll expose these constants locally to avoid circular imports (though prefer window.game for safety)
const LOCAL_WEAPON_ROCKET = 3; // Must match window.game.WEAPON_ROCKET

// Functions will be assigned to window.game
window.game.createBulletTracer = function(direction) {
    const g = window.game;
    const weapon = g.weapons[g.currentWeapon];
    
    // Create bullet model if defined
    if (!weapon.bulletModel) return;
    
    // Create bullet mesh from model
    const bullet = weapon.bulletModel.clone();
    
    // Calculate muzzle position based on weapon model
    let muzzlePosition;
    let muzzleOffset = 0.7; // Default offset from camera
    
    if (weapon.muzzleFlash) {
        // Get world position of the muzzle
        muzzlePosition = new THREE.Vector3();
        weapon.muzzleFlash.getWorldPosition(muzzlePosition);
        
        // Add slight offset to prevent collision with weapon
        const offsetVector = direction.clone().multiplyScalar(0.1);
        muzzlePosition.add(offsetVector);
    } else {
        // Fallback if no muzzle flash reference
        muzzlePosition = new THREE.Vector3().copy(g.camera.position);
        const forwardOffset = direction.clone().multiplyScalar(muzzleOffset);
        muzzlePosition.add(forwardOffset);
    }
    
    // For tracer effect, make the bullet longer in its movement direction
    if (g.currentWeapon !== g.WEAPON_ROCKET) {
        // Scale bullet to be longer for tracer effect
        bullet.scale.z = 3;
    }
    
    // Set bullet position at muzzle
    bullet.position.copy(muzzlePosition);
    
    // Point bullet in direction of travel
    const targetPos = muzzlePosition.clone().add(direction);
    bullet.lookAt(targetPos);
    
    // Add bullet to scene
    g.scene.add(bullet);
    
    // Store bullet data for animation
    const bulletData = {
        bulletMesh: bullet, // Renamed from 'bullet' to 'bulletMesh'
        // Velocity will be handled by Rapier
        created: Date.now(),
        lifetime: g.currentWeapon === g.WEAPON_ROCKET ? 3000 : 1000, // Rockets handled separately
        isRocket: false,
        weaponId: g.currentWeapon // Store weapon type for damage calculation etc.
    };

    // Create Rapier rigid body for the bullet tracer
    const bulletRadius = 0.025; // Small radius for tracer
    const rigidBodyDesc = RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(muzzlePosition.x, muzzlePosition.y, muzzlePosition.z)
        .setLinvel(direction.x * weapon.bulletSpeed, direction.y * weapon.bulletSpeed, direction.z * weapon.bulletSpeed)
        .setCcdEnabled(true); // Enable CCD for fast-moving objects
    bulletData.rigidBody = g.rapierWorld.createRigidBody(rigidBodyDesc);

    const colliderDesc = RAPIER.ColliderDesc.ball(bulletRadius)
        .setSensor(true) // Tracers are sensors, they detect but don't physically push
        .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);
    bulletData.collider = g.rapierWorld.createCollider(colliderDesc, bulletData.rigidBody);
    bulletData.collider.setUserData({ type: 'bullet', id: `bullet-${Date.now()}-${Math.random()}`, bulletObject: bulletData });
    
    g.bullets.push(bulletData);
};

window.game.createRocket = function(position, direction) {
    const g = window.game;
    const weapon = g.weapons[g.WEAPON_ROCKET]; // Ensure g.WEAPON_ROCKET is correct
    
    // Create rocket mesh
    const rocket = weapon.bulletModel.clone();
    
    // Set position slightly in front of camera
    const rocketStart = direction.clone().multiplyScalar(0.7).add(position);
    rocket.position.copy(rocketStart);
    
    // Orient rocket in direction of travel
    rocket.lookAt(rocketStart.clone().add(direction));
    
    // Add to scene
    g.scene.add(rocket);
    
    // Store rocket data for animation
    const rocketData = {
        bulletMesh: rocket, // Renamed
        // Velocity handled by Rapier
        created: Date.now(),
        lifetime: 3000,
        isRocket: true,
        weaponId: g.WEAPON_ROCKET
    };

    // Create Rapier rigid body for the rocket
    const rocketRadius = 0.1; // Larger than tracer
    const rigidBodyDesc = RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(rocketStart.x, rocketStart.y, rocketStart.z)
        .setLinvel(direction.x * weapon.bulletSpeed, direction.y * weapon.bulletSpeed, direction.z * weapon.bulletSpeed)
        .setCcdEnabled(true);
    rocketData.rigidBody = g.rapierWorld.createRigidBody(rigidBodyDesc);

    // Rockets are not sensors, they should physically interact if desired, or be sensors that trigger explosions.
    // For this implementation, making them sensors that trigger explosions on contact.
    const colliderDesc = RAPIER.ColliderDesc.ball(rocketRadius)
        .setSensor(true)
        .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);
    rocketData.collider = g.rapierWorld.createCollider(colliderDesc, rocketData.rigidBody);
    rocketData.collider.setUserData({ type: 'rocket', id: `rocket-${Date.now()}-${Math.random()}`, bulletObject: rocketData });
    
    g.bullets.push(rocketData);
};

window.game.createExplosion = function(position, radius) {
    const g = window.game;
    // Create explosion sphere
    const explosionGeo = new THREE.SphereGeometry(radius, 16, 16);
    const explosionMat = new THREE.MeshBasicMaterial({
        color: 0xff5500,
        transparent: true,
        opacity: 1.0
    });
    const explosion = new THREE.Mesh(explosionGeo, explosionMat);
    explosion.position.copy(position);
    g.scene.add(explosion);
    
    // Add to explosions array for animation
    g.explosions.push({
        mesh: explosion,
        created: Date.now(),
        lifetime: 500,
        radius: radius
    });
    
    // Check for enemies in blast radius
    for (const enemy of g.enemies) {
        const distance = enemy.mesh.position.distanceTo(position);
        if (distance <= radius * 1.5) {
            // Calculate damage based on distance (more damage closer to explosion)
            const damage = Math.round(g.weapons[g.WEAPON_ROCKET].damage * (1 - distance / (radius * 1.5)));
            if (damage > 0) {
                if(g.damageEnemy) g.damageEnemy(enemy, damage, enemy.mesh.position);
            }
        }
    }
    
    // Check if player is in blast radius (self-damage)
    const playerDistance = g.camera.position.distanceTo(position);
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
    const impactGeo = new THREE.CircleGeometry(0.05, 8);
    const impactMat = new THREE.MeshBasicMaterial({
        color: 0x333333,
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide
    });
    const impact = new THREE.Mesh(impactGeo, impactMat);
    
    // Position slightly above surface to prevent z-fighting
    const offset = normal.clone().multiplyScalar(0.01);
    impact.position.copy(position).add(offset);
    
    // Orient to face impact normal
    impact.lookAt(position.clone().add(normal));
    
    // Add to scene
    g.scene.add(impact);
    
    // Remove after delay
    setTimeout(() => {
        g.scene.remove(impact);
        impact.geometry.dispose();
        impact.material.dispose();
    }, 5000);
};

window.game.updateBullets = function() {
    const g = window.game;
    // Loop through bullets array in reverse to safely remove items
    for (let i = g.bullets.length - 1; i >= 0; i--) {
        const bulletData = g.bullets[i];
        
        // Synchronize Three.js mesh with Rapier rigid body
        if (bulletData.rigidBody && bulletData.bulletMesh) {
            const physPos = bulletData.rigidBody.translation();
            bulletData.bulletMesh.position.set(physPos.x, physPos.y, physPos.z);
            // Optional: Synchronize rotation if bullets aren't always aligned with velocity
            // const physRot = bulletData.rigidBody.rotation();
            // bulletData.bulletMesh.quaternion.set(physRot.x, physRot.y, physRot.z, physRot.w);
        }
        
        // Check lifetime (Rapier doesn't handle this directly for bullets)
        const age = Date.now() - bulletData.created;
        if (age > bulletData.lifetime) {
            if (bulletData.isRocket) {
                // Create explosion if rocket expires
                const pos = bulletData.rigidBody ? bulletData.rigidBody.translation() : bulletData.bulletMesh.position;
                if(g.createExplosion) g.createExplosion(new THREE.Vector3(pos.x, pos.y, pos.z), 5);
            }
            
            // Remove bullet (mesh and Rapier body)
            if (bulletData.bulletMesh) g.scene.remove(bulletData.bulletMesh);
            if (bulletData.rigidBody) g.rapierWorld.removeRigidBody(bulletData.rigidBody);
            g.bullets.splice(i, 1);
        }
        // Collision detection and removal on hit will be handled by the main game loop's
        // drainCollisionEvents callback. This function now primarily handles visual sync and lifetime.
    }
};

// This function will be called from the main game loop's collision handler
window.game.handleBulletCollision = function(bulletData, otherCollider) {
    const g = window.game;
    const otherUserData = otherCollider ? g.rapierWorld.getCollider(otherCollider).userData : null;

    if (bulletData.isRocket) {
        const pos = bulletData.rigidBody ? bulletData.rigidBody.translation() : bulletData.bulletMesh.position;
        if(g.createExplosion) g.createExplosion(new THREE.Vector3(pos.x, pos.y, pos.z), 5);
    } else {
        // Regular bullet hit
        if (otherUserData && otherUserData.type === 'enemy') {
            const enemy = otherUserData.enemyObject; // Assuming enemyObject is stored in userData
            if (enemy) {
                const weaponStats = g.weapons[bulletData.weaponId];
                const hitPoint = bulletData.rigidBody ? bulletData.rigidBody.translation() : bulletData.bulletMesh.position;
                // Simplified damage calculation for now, can be expanded with range/pierce later
                if(g.damageEnemy) g.damageEnemy(enemy, weaponStats.damage, new THREE.Vector3(hitPoint.x, hitPoint.y, hitPoint.z));
            }
        } else if (otherUserData && otherUserData.type !== 'player' && otherUserData.type !== 'bullet' && otherUserData.type !== 'rocket') {
            // Hit a wall or other static object
            const hitPos = bulletData.rigidBody ? bulletData.rigidBody.translation() : bulletData.bulletMesh.position;
            // For impact normal, we'd need raycasting from bullet's previous to current pos,
            // or get contact normal from Rapier event if available and detailed enough.
            // For simplicity, using a default normal for now or skipping if normal isn't easily available.
            // const contact = g.rapierWorld.contactPair(bulletData.collider.handle, otherCollider.handle);
            // if(contact && contact.manifolds.length > 0) {
            //    const normal = contact.manifolds[0].normal();
            //    if(g.createBulletImpact) g.createBulletImpact(new THREE.Vector3(hitPos.x, hitPos.y, hitPos.z), new THREE.Vector3(normal.x, normal.y, normal.z));
            // } else {
               if(g.createBulletImpact) g.createBulletImpact(new THREE.Vector3(hitPos.x, hitPos.y, hitPos.z), new THREE.Vector3(0,1,0)); // Placeholder normal
            // }
        }
    }

    // Remove bullet after collision
    const index = g.bullets.indexOf(bulletData);
    if (index > -1) {
        if (bulletData.bulletMesh) g.scene.remove(bulletData.bulletMesh);
        if (bulletData.rigidBody) g.rapierWorld.removeRigidBody(bulletData.rigidBody);
        g.bullets.splice(index, 1);
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
            explosion.mesh.scale.set(scale, scale, scale);
        } else {
            // Fade out
            explosion.mesh.material.opacity = 1 - ((progress - 0.5) * 2);
        }
        
        // Remove when lifetime is over
        if (progress >= 1) {
            g.scene.remove(explosion.mesh);
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
    damageDiv.style.color = amount >= 100 ? '#ff0000' : '#ffffff'; // Change this in the future to accommodate headshots
    damageDiv.style.fontWeight = amount >= 50 ? 'bold' : 'normal';
    damageDiv.style.fontSize = `${Math.min(16 + amount / 5, 30)}px`;
    damageDiv.style.textShadow = '1px 1px 2px black';
    damageDiv.style.userSelect = 'none';
    damageDiv.style.pointerEvents = 'none';
    
    // Add to damage number container
    document.getElementById('damage-number-container').appendChild(damageDiv);
    
    // Convert 3D position to screen coordinates
    const screenPosition = new THREE.Vector3().copy(position);
    screenPosition.project(g.camera);
    
    const x = (screenPosition.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-(screenPosition.y * 0.5) + 0.5) * window.innerHeight;
    
    damageDiv.style.left = `${x}px`;
    damageDiv.style.top = `${y}px`;
    
    // Animate and remove after delay
    // let opacity = 1; // opacity is part of damageNumber object
    // let posY = y; // position.y is part of damageNumber object
    // const floatSpeed = 50; // pixels per second - not used directly here anymore
    const lastUpdate = Date.now();
    
    // Add to damage numbers array for animation
    g.damageNumbers.push({
        element: damageDiv,
        position: { x, y: y }, // Use the calculated y
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
        const dt = (now - damageNumber.lastUpdate) / 1000; // seconds
        
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
            if (damageNumber.element.parentNode) { // Check if still in DOM
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
        barContainer.style.width = '50px'; // Standardized width
        barContainer.style.height = '5px'; // Standardized height
        barContainer.style.backgroundColor = 'rgba(0,0,0,0.5)'; // Standardized background
        barContainer.style.border = '1px solid rgba(255,255,255,0.3)'; // Standardized border
        barContainer.style.pointerEvents = 'none'; // Standardized pointer events
        
        const barFill = document.createElement('div');
        barFill.style.position = 'absolute';
        barFill.style.top = '0';
        barFill.style.left = '0';
        barFill.style.height = '100%';
        barFill.style.backgroundColor = 'rgba(255,50,50,0.8)'; // Standardized fill color
        barFill.style.width = '100%'; // Start full
        
        barContainer.appendChild(barFill);
        const containerElement = document.getElementById('enemy-health-bar-container');
        if (containerElement) { // Ensure container exists
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
    
    // Hide after delay
    if (enemy.healthBarTimeout) {
        clearTimeout(enemy.healthBarTimeout);
    }
    
    enemy.healthBarTimeout = setTimeout(() => {
        if (g.enemyHealthBars[enemy.id]) { // Check if it still exists
            g.enemyHealthBars[enemy.id].container.style.visibility = 'hidden';
        }
    }, 2000);
};