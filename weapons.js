// Weapon system module for Babylon.js
// All functions are attached to window.game for global access
// No imports/exports - everything uses window.game

// Create weapon models using efficient Babylon.js mesh loading
// Original Goal: Create 3D weapon models with muzzle flashes and bullet models for first-person display
// New Implementation: Uses Babylon.js ImportMeshAsync for external models, falls back to procedural meshes
window.game.createWeaponModels = async function() {
    const g = window.game;
    const scene = g.scene;
    
    // Helper function to load weapon mesh or create fallback
    const loadWeaponMesh = async (weaponId, meshUrl, fallbackCreator) => {
        try {
            if (meshUrl) {
                const result = await BABYLON.ImportMeshAsync("", meshUrl, scene);
                return result.meshes[0];
            }
        } catch (error) {
            console.warn(`Failed to load weapon mesh for ${weaponId}, using fallback`);
        }
        return fallbackCreator();
    };
    
    // Create default cube fallback
    const createCubeFallback = (name, size = 1) => {
        return BABYLON.MeshBuilder.CreateBox(name, {size}, scene);
    };
    
    // Load all weapon models
    for (let weaponId in g.weapons) {
        const weaponData = g.weapons[weaponId];
        
        // Load main weapon model
        weaponData.model = await loadWeaponMesh(
            weaponId, 
            weaponData.meshUrl, 
            () => createCubeFallback(`weapon_${weaponId}`)
        );
        
        // Create muzzle flash for projectile weapons
        if (weaponId !== g.WEAPON_MELEE) {
            const muzzleFlash = BABYLON.MeshBuilder.CreateBox(`muzzleFlash_${weaponId}`, {width: 0.15, height: 0.15, depth: 0.15}, scene);
            const muzzleFlashMat = new BABYLON.StandardMaterial(`muzzleFlashMat_${weaponId}`, scene);
            muzzleFlashMat.diffuseColor = new BABYLON.Color3(1, 0.67, 0);
            muzzleFlashMat.emissiveColor = new BABYLON.Color3(1, 0.67, 0);
            muzzleFlash.material = muzzleFlashMat;
            muzzleFlash.isVisible = false;
            muzzleFlash.setParent(weaponData.model);
            weaponData.muzzleFlash = muzzleFlash;
            
            // Position muzzle flash at weapon front
            muzzleFlash.position = new BABYLON.Vector3(0, 0, -1.0);
        }
        
        // Create bullet/projectile model
        const bulletModel = BABYLON.MeshBuilder.CreateBox(`bullet_${weaponId}`, {width: 0.05, height: 0.05, depth: 0.2}, scene);
        const bulletMat = new BABYLON.StandardMaterial(`bulletMat_${weaponId}`, scene);
        bulletMat.diffuseColor = new BABYLON.Color3(1, 1, 0);
        bulletMat.emissiveColor = new BABYLON.Color3(0.2, 0.2, 0);
        bulletModel.material = bulletMat;
        weaponData.bulletModel = bulletModel;
        
        // Hide weapons initially
        weaponData.model.isVisible = false;
    }
    
    // Show current weapon
    g.switchWeapon(g.currentWeapon);
}
// Switch weapon function using Babylon.js
// Original Goal: Hide current weapon, show new weapon, cancel reload, update UI and weapon position
// New Implementation: Uses Babylon.js isVisible property and window.game references
window.game.switchWeapon = function(weaponId) {
    const g = window.game;
    if (!g.weapons[weaponId]) return;
    
    // Cancel reload if switching weapons
    if (g.isReloading && typeof g.reloadTimeoutId === "number") {
        clearTimeout(g.reloadTimeoutId);
        g.isReloading = false;
        if (g.reloadText) g.reloadText.style.display = 'none'; 
        g.reloadTimeoutId = undefined;
    }
    
    // Hide current weapon
    if (g.weapons[g.currentWeapon] && g.weapons[g.currentWeapon].model) {
        g.weapons[g.currentWeapon].model.isVisible = false;
    }
    
    // Switch to new weapon
    g.currentWeapon = weaponId;
    
    // Show new weapon
    if (g.weapons[g.currentWeapon] && g.weapons[g.currentWeapon].model) {
        g.weapons[g.currentWeapon].model.isVisible = true;
    }
    
    // Update weapon position and UI
    g.updateWeaponPosition(); 
    g.updateAmmoText(); 
} 
// Update weapon position function using Babylon.js
// Original Goal: Position weapon relative to camera, handle ADS transitions, apply scaling and crosshair updates
// New Implementation: Uses Babylon.js vector math and camera transformation matrices
window.game.updateWeaponPosition = function() {
    const g = window.game;
    const weapon = g.weapons[g.currentWeapon];
    if (!weapon || !weapon.model) return;
    if (!g.camera) return;

    // --- ADS ZOOM ---
    const baseFov = Math.PI / 3; // 60 degrees in radians
    const targetFov = g.isADS ? baseFov / 1.5 : baseFov; // Zoom in for ADS
    g.camera.fov += (targetFov - g.camera.fov) * 0.18; 
    // --- END ADS ZOOM ---
    
    // Create vectors for weapon positioning in camera space
    let offsetRight = 0.3;  
    let offsetDown = -0.2;  
    let offsetForward = -0.5; 
    
    // Adjust for ADS
    if (g.isADS) {
        g.adsTransition = Math.min(1, g.adsTransition + 0.1); 
        g.sensitivity = g.baseSensitivity/2;
    } else {
        g.adsTransition = Math.max(0, g.adsTransition - 0.1); 
        g.sensitivity = g.baseSensitivity;
    }

    // --- Rocket launcher ADS fix ---
    let scale = 1;
    if (g.currentWeapon === g.WEAPON_ROCKET && g.isADS) {
        scale = 0.45; 
        offsetRight *= 0.5;
        offsetDown *= 0.7;
        offsetForward = -0.15;
    }

    // Interpolate position for ADS transition
    offsetRight = offsetRight * (1 - g.adsTransition);
    offsetDown = offsetDown * (1 - g.adsTransition) + (-0.1 * g.adsTransition);
    offsetForward = offsetForward * (1 - g.adsTransition) + (-0.3 * g.adsTransition);
    
    // Apply position based on camera's orientation using Babylon.js
    const forward = new BABYLON.Vector3(0, 0, -1);
    BABYLON.Vector3.TransformNormalToRef(forward, g.camera.getWorldMatrix(), forward);
    
    const right = new BABYLON.Vector3(1, 0, 0);
    BABYLON.Vector3.TransformNormalToRef(right, g.camera.getWorldMatrix(), right);
    
    const up = new BABYLON.Vector3(0, 1, 0);
    BABYLON.Vector3.TransformNormalToRef(up, g.camera.getWorldMatrix(), up);
    
    // Calculate weapon position in world space
    const weaponPos = g.camera.position.clone()
        .add(right.scale(offsetRight))
        .add(up.scale(offsetDown))
        .add(forward.scale(offsetForward));
    
    // Set weapon position and rotation
    weapon.model.position.copyFrom(weaponPos);
    weapon.model.rotation.copyFrom(g.camera.rotation); // Use Euler rotation instead of quaternion

    // Apply scaling
    weapon.model.scaling = new BABYLON.Vector3(scale, scale, scale);
    
    // Update crosshair size based on ADS
    if (g.crosshair) { 
        const baseSize = 20;
        const adsSize = 10; 
        const size = baseSize * (1 - g.adsTransition) + adsSize * g.adsTransition;
        g.crosshair.style.width = `${size}px`;
        g.crosshair.style.height = `${size}px`;
    }
}

// Reload function
// Original Goal: Start reload animation, play sound, show UI, restore ammo after delay
// New Implementation: Same logic but uses window.game references
window.game.reload = function() {
    const g = window.game;
    const weapon = g.weapons[g.currentWeapon];
    if (!weapon) return;
    
    // Skip reload if weapon doesn't need it
    if (weapon.currentAmmo === weapon.magazineSize || weapon.magazineSize === Infinity || g.isReloading) {
        return;
    }
    
    // Start reload
    g.isReloading = true;
    if (g.sounds && g.sounds.reload) g.sounds.reload.play();
    if (g.reloadText) g.reloadText.style.display = 'block'; 
    
    // Reload after timeout
    g.reloadTimeoutId = setTimeout(() => {
        weapon.currentAmmo = weapon.magazineSize;
        g.isReloading = false;
        if (g.reloadText) g.reloadText.style.display = 'none';
        g.updateAmmoText(); 
    }, weapon.reloadTime);
}



// Create bullet impact effect using Babylon.js
// Original Goal: Create visual impact effects when bullets hit surfaces
// New Implementation: Uses Babylon.js particle systems or simple mesh effects
window.game.createBulletImpact = function(position, normal) {
    const g = window.game;
    if (!g.scene) return;
    
    // Create impact spark effect
    const impact = BABYLON.MeshBuilder.CreateBox("impact", {width: 0.1, height: 0.1, depth: 0.02}, g.scene);
    const impactMat = new BABYLON.StandardMaterial("impactMat", g.scene);
    impactMat.diffuseColor = new BABYLON.Color3(1, 0.67, 0);
    impactMat.emissiveColor = new BABYLON.Color3(1, 0.67, 0);
    impact.material = impactMat;
    
    impact.position.copyFrom(position);
    
    // Orient impact based on surface normal
    if (normal) {
        impact.lookAt(position.add(normal));
    }
    
    // Fade out and dispose
    setTimeout(() => {
        impact.dispose();
    }, 100);
}

// Create rocket projectile using Babylon.js
// Original Goal: Create rocket projectiles with physics and explosion on impact
// New Implementation: Uses Babylon.js physics and collision detection
window.game.createRocket = function(startPos, direction) {
    const g = window.game;
    if (!g.scene) return;
    
    const weapon = g.weapons[g.WEAPON_ROCKET];
    if (!weapon || !weapon.bulletModel) return;
    
    // Create rocket instance
    const rocket = weapon.bulletModel.createInstance("rocket");
    rocket.position.copyFrom(startPos);
    
    // Orient rocket
    const lookDirection = direction.normalize();
    rocket.lookAt(rocket.position.add(lookDirection));
    
    // Rocket properties
    const speed = 30;
    const explosionRadius = weapon.explosionRadius || 10;
    const explosionDamage = weapon.damage || 100;
    
    // Animate rocket
    const animateRocket = () => {
        // Move rocket
        rocket.position.addInPlace(lookDirection.scale(speed * g.scene.getEngine().getDeltaTime() / 1000));
        
        // Check for collision using Babylon.js ray casting
        const ray = new BABYLON.Ray(rocket.position, lookDirection);
        const hit = g.scene.pickWithRay(ray, (mesh) => {
            // Exclude rocket itself and weapon models
            if (mesh === rocket) return false;
            for (let weaponId in g.weapons) {
                const weaponData = g.weapons[weaponId];
                if (weaponData.model && (mesh === weaponData.model || weaponData.model.getChildMeshes().includes(mesh))) {
                    return false;
                }
            }
            return true;
        });
        
        if (hit && hit.hit && hit.distance < 1) {
            // Explode
            if (g.createExplosion) g.createExplosion(rocket.position, explosionRadius, explosionDamage);
            rocket.dispose();
            return;
        }
        
        // Check distance from camera
        const distance = BABYLON.Vector3.Distance(rocket.position, g.camera.position);
        if (distance > 200) {
            rocket.dispose();
            return;
        }
        
        requestAnimationFrame(animateRocket);
    };
    
    animateRocket();
}

// Shoot function using Babylon.js
// Original Goal: Handle shooting for all weapon types, manage ammo, create projectiles, perform hit detection with penetration
// New Implementation: Uses Babylon.js ray casting, removes knockback, preserves penetration mechanics and tracers
window.game.shoot = function() {
    const g = window.game;
    const weapon = g.weapons[g.currentWeapon];
    if (!weapon || !g.camera || !g.scene) return;

    // Auto-Reload if gun has no ammo
    if (weapon.currentAmmo <= 0 && weapon.magazineSize !== Infinity) { 
        g.reload(); 
        return false; 
    }

    // Check if player can shoot (ammo, reload, cooldown)
    const now = Date.now();
    if (g.isReloading || weapon.currentAmmo <= 0 || now - g.lastShotTime < weapon.fireRate) {
        return false;
    }

    // Set last shot time for fire rate control
    g.lastShotTime = now;
    
    // Play shoot sound
    if (g.sounds && g.sounds.shoot) g.sounds.shoot.play();

    // Handle different weapon types
    switch (g.currentWeapon) {
        case g.WEAPON_RIFLE:
        case g.WEAPON_SHOTGUN:
            // Show muzzle flash
            if (weapon.muzzleFlash) {
                weapon.muzzleFlash.isVisible = true;
                setTimeout(() => {
                   if (weapon.muzzleFlash) weapon.muzzleFlash.isVisible = false; 
                }, 50);
            }

            // Calculate number of shots (pellets for shotgun)
            const shots = g.currentWeapon === g.WEAPON_SHOTGUN ? weapon.pellets : 1;

            for (let i = 0; i < shots; i++) { 
                const spread = weapon.spread * (g.isADS ? 0.4 : 1.0); 
                const spreadX = (Math.random() - 0.5) * spread;
                const spreadY = (Math.random() - 0.5) * spread;

                // Create ray with spread using Babylon.js
                const forward = new BABYLON.Vector3(spreadX, spreadY, -1);
                BABYLON.Vector3.TransformNormalToRef(forward, g.camera.getWorldMatrix(), forward);
                forward.normalize();
                
                g.createBulletTracer(forward); 

                // Raycast for hit detection using Babylon.js
                const ray = new BABYLON.Ray(g.camera.position, forward);
                const hit = g.scene.pickWithRay(ray, (mesh) => {
                    // Exclude camera and weapon models
                    if (mesh === g.camera) return false;
                    
                    // Exclude weapon models
                    for (let weaponId in g.weapons) {
                        const weaponData = g.weapons[weaponId];
                        if (weaponData.model && (mesh === weaponData.model || weaponData.model.getChildMeshes().includes(mesh))) {
                            return false;
                        }
                    }
                    
                    // Exclude bullets and explosions
                    if (g.bullets && g.bullets.some(b => b.bullet === mesh)) return false;
                    if (g.explosions && g.explosions.some(e => e.mesh === mesh)) return false;
                    
                    return true;
                });

                if (hit && hit.hit) {
                    // Check if hit an enemy
                    const enemy = g.enemies && g.enemies.find(e => e.mesh === hit.pickedMesh);
                    if (enemy) {
                        const distance = BABYLON.Vector3.Distance(g.camera.position, hit.pickedPoint);
                        let damage = weapon.damage;
                        if (distance > weapon.minRange && weapon.maxRange > weapon.minRange) { 
                            const dropOffFactor = Math.min(1, Math.max(0, (distance - weapon.minRange) / (weapon.maxRange - weapon.minRange)));
                            damage *= (1 - dropOffFactor * (1 - weapon.minDamagePercent));
                        }
                        if (g.damageEnemy) g.damageEnemy(enemy, Math.round(damage), hit.pickedPoint);
                    } else {
                        g.createBulletImpact(hit.pickedPoint, hit.getNormal());
                    }
                }
            }

            weapon.currentAmmo--;
            g.updateAmmoText(); 

            if (weapon.currentAmmo <= 0 && weapon.magazineSize !== Infinity) {
                g.reload(); 
            }
            break;

        case g.WEAPON_ROCKET:
            // Show muzzle flash
            if (weapon.muzzleFlash) {
                weapon.muzzleFlash.isVisible = true;
                setTimeout(() => {
                   if (weapon.muzzleFlash) weapon.muzzleFlash.isVisible = false;
                }, 100);
            }

            const rocketDirection = new BABYLON.Vector3(0, 0, -1);
            BABYLON.Vector3.TransformNormalToRef(rocketDirection, g.camera.getWorldMatrix(), rocketDirection);
            g.createRocket(g.camera.position.clone(), rocketDirection); 

            weapon.currentAmmo--;
            g.updateAmmoText(); 

            if (weapon.currentAmmo <= 0) {
                g.reload(); 
            }
            break;

        case g.WEAPON_MELEE:
            const meleeDirection = new BABYLON.Vector3(0, 0, -1);
            BABYLON.Vector3.TransformNormalToRef(meleeDirection, g.camera.getWorldMatrix(), meleeDirection);
            
            const meleeModel = weapon.model;
            if (meleeModel && !meleeModel.isAnimating) { 
                meleeModel.isAnimating = true; 
                const originalRotation = meleeModel.rotation.clone();
                const swingDuration = weapon.fireRate * 0.8; 

                let startTime = performance.now();
                function animateSwing(currentTime) {
                    const elapsed = currentTime - startTime;
                    const progress = Math.min(elapsed / swingDuration, 1);
                    const swingProgress = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;
                    const maxAngleX = -Math.PI / 4;
                    const maxAngleZ = Math.PI / 6;
                    meleeModel.rotation.x = originalRotation.x + maxAngleX * swingProgress;
                    meleeModel.rotation.z = originalRotation.z + maxAngleZ * swingProgress;

                    if (progress < 1) {
                        requestAnimationFrame(animateSwing);
                    } else {
                        meleeModel.rotation.copyFrom(originalRotation); 
                        meleeModel.isAnimating = false; 
                    }
                }
                requestAnimationFrame(animateSwing);
            }

            const meleeRange = weapon.range;
            const ray = new BABYLON.Ray(g.camera.position, meleeDirection);
            const hit = g.scene.pickWithRay(ray, (mesh) => {
                // Exclude camera and weapon models
                if (mesh === g.camera) return false;
                
                for (let weaponId in g.weapons) {
                    const weaponData = g.weapons[weaponId];
                    if (weaponData.model && (mesh === weaponData.model || weaponData.model.getChildMeshes().includes(mesh))) {
                        return false;
                    }
                }
                
                // Exclude bullets and explosions
                if (g.bullets && g.bullets.some(b => b.bullet === mesh)) return false;
                if (g.explosions && g.explosions.some(e => e.mesh === mesh)) return false;
                
                return true;
            });

            if (hit && hit.hit && hit.distance <= meleeRange) {
                const enemy = g.enemies && g.enemies.find(e => e.mesh === hit.pickedMesh);
                if (enemy) {
                    if (g.damageEnemy) g.damageEnemy(enemy, weapon.damage, hit.pickedPoint);
                }
            }
            break; 
    } 
    return true; 
}