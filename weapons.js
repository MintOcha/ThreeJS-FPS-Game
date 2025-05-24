// Weapon system module
import * as THREE from 'three';
import { updateAmmoText } from './ui.js';
import { sounds } from './audio.js';
// Using the global game object for raycaster instead of imports
// Using the global game object for camera instead of imports
import { createBulletTracer, createRocket } from './effects.js';

// Exported weapon state variables
export const WEAPON_RIFLE = 1;
export const WEAPON_SHOTGUN = 2;
export const WEAPON_ROCKET = 3;
export const WEAPON_MELEE = 4;

export let currentWeapon = WEAPON_RIFLE;
export let isReloading = false;
export let isADS = false; // Aiming Down Sights
export let adsTransition = 0; // 0 = hip fire, 1 = fully aimed
export let lastShotTime = 0;
export let isShooting = false; // For full auto
export let reloadTimeoutId;

// Ammo system
export let weapons = {
    [WEAPON_RIFLE]: { 
        name: "Rifle", 
        damage: 37, 
        fireRate: 75, // ms between shots
        spread: 0.05,
        magazineSize: 30,
        currentAmmo: 31,
        reloadTime: 2000, // ms
        automatic: true,
        bulletSpeed: 100,
        bulletModel: null,
        muzzleFlash: null,
        pierce: 3, //hits up to 3 enemies/1 wall and 1 enemy
        // Damage drop-off
        maxRange: 60,   // Max effective range
        minRange: 10,   // Optimal range (full damage)
        minDamagePercent: 0.7 // Minimum damage at max range (40%)
    },
    [WEAPON_SHOTGUN]: { 
        name: "Shotgun", 
        damage: 20, 
        fireRate: 250, 
        spread: 0.15,
        pellets: 12,
        magazineSize: 10,
        currentAmmo: 10,
        reloadTime: 2800,
        automatic: false,
        bulletSpeed: 80,
        bulletModel: null,
        muzzleFlash: null,
        pierce: 2,
        // Damage drop-off
        maxRange: 30,   // Max effective range
        minRange: 5,    // Optimal range (full damage)
        minDamagePercent: 0.6 // Minimum damage at max range (20%)
    },
    [WEAPON_ROCKET]: { 
        name: "Rocket", 
        damage: 350,
        fireRate: 60, 
        spread: 0.01,
        magazineSize: 1,
        currentAmmo: 1,
        reloadTime: 3500,
        automatic: true,
        bulletSpeed: 50,
        bulletModel: null,
        muzzleFlash: null,
        // No drop-off for explosion damage
        maxRange: 100,
        minRange: 0,
        minDamagePercent: 1.0
    },
    [WEAPON_MELEE]: { 
        name: "Melee", 
        damage: 120, 
        fireRate: 300, 
        range: 5,
        magazineSize: Infinity,
        currentAmmo: Infinity,
        automatic: false,
        attackModel: null,
        // No drop-off for melee
        maxRange: 3,
        minRange: 0,
        minDamagePercent: 1.0
    }
};

// Exported weapon-related functions
export function createWeaponModels() {
    // Create simple block-based weapon models
    
    // Rifle model
    const rifleGroup = new THREE.Group();
    
    // Main barrel
    const barrelGeo = new THREE.BoxGeometry(0.1, 0.1, 1);
    const barrelMat = new THREE.MeshStandardMaterial({color: 0x333333});
    const barrel = new THREE.Mesh(barrelGeo, barrelMat);
    barrel.position.set(0, 0, -0.5);
    rifleGroup.add(barrel);
    
    // Body
    const bodyGeo = new THREE.BoxGeometry(0.15, 0.2, 0.4);
    const bodyMat = new THREE.MeshStandardMaterial({color: 0x666666});
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.set(0, -0.05, -0.1);
    rifleGroup.add(body);
    
    // Handle
    const handleGeo = new THREE.BoxGeometry(0.1, 0.25, 0.1);
    const handleMat = new THREE.MeshStandardMaterial({color: 0x444444});
    const handle = new THREE.Mesh(handleGeo, handleMat);
    handle.position.set(0, -0.2, 0.1);
    rifleGroup.add(handle);
    
    // Magazine
    const magGeo = new THREE.BoxGeometry(0.1, 0.2, 0.08);
    const magMat = new THREE.MeshStandardMaterial({color: 0x222222});
    const mag = new THREE.Mesh(magGeo, magMat);
    mag.position.set(0, -0.18, -0.05);
    rifleGroup.add(mag);
    
    // Create muzzle flash (hidden by default)
    const muzzleFlashGeo = new THREE.BoxGeometry(0.15, 0.15, 0.15);
    const muzzleFlashMat = new THREE.MeshBasicMaterial({color: 0xffaa00});
    const muzzleFlash = new THREE.Mesh(muzzleFlashGeo, muzzleFlashMat);
    muzzleFlash.position.set(0, 0, -1.05);
    muzzleFlash.visible = false;
    rifleGroup.add(muzzleFlash);
    
    // Store rifle model and muzzle flash
    weapons[WEAPON_RIFLE].model = rifleGroup;
    weapons[WEAPON_RIFLE].muzzleFlash = muzzleFlash;
    
    // Create bullet model
    const bulletGeo = new THREE.BoxGeometry(0.05, 0.05, 0.2);
    const bulletMat = new THREE.MeshBasicMaterial({color: 0xffff00});
    weapons[WEAPON_RIFLE].bulletModel = new THREE.Mesh(bulletGeo, bulletMat);
    
    // Shotgun model
    const shotgunGroup = new THREE.Group();
    
    // Main barrel (wider)
    const sgBarrelGeo = new THREE.BoxGeometry(0.15, 0.15, 0.9);
    const sgBarrelMat = new THREE.MeshStandardMaterial({color: 0x555555});
    const sgBarrel = new THREE.Mesh(sgBarrelGeo, sgBarrelMat);
    sgBarrel.position.set(0, 0, -0.45);
    shotgunGroup.add(sgBarrel);
    
    // Body
    const sgBodyGeo = new THREE.BoxGeometry(0.2, 0.25, 0.5);
    const sgBodyMat = new THREE.MeshStandardMaterial({color: 0x553311});
    const sgBody = new THREE.Mesh(sgBodyGeo, sgBodyMat);
    sgBody.position.set(0, -0.05, 0);
    shotgunGroup.add(sgBody);
    
    // Handle
    const sgHandleGeo = new THREE.BoxGeometry(0.1, 0.3, 0.12);
    const sgHandleMat = new THREE.MeshStandardMaterial({color: 0x553311});
    const sgHandle = new THREE.Mesh(sgHandleGeo, sgHandleMat);
    sgHandle.position.set(0, -0.25, 0.2);
    shotgunGroup.add(sgHandle);
    
    // Create muzzle flash
    const sgMuzzleFlashGeo = new THREE.BoxGeometry(0.2, 0.2, 0.2);
    const sgMuzzleFlashMat = new THREE.MeshBasicMaterial({color: 0xffaa00});
    const sgMuzzleFlash = new THREE.Mesh(sgMuzzleFlashGeo, sgMuzzleFlashMat);
    sgMuzzleFlash.position.set(0, 0, -0.95);
    sgMuzzleFlash.visible = false;
    shotgunGroup.add(sgMuzzleFlash);
    
    // Store shotgun model and muzzle flash
    weapons[WEAPON_SHOTGUN].model = shotgunGroup;
    weapons[WEAPON_SHOTGUN].muzzleFlash = sgMuzzleFlash;
    weapons[WEAPON_SHOTGUN].bulletModel = new THREE.Mesh(bulletGeo, bulletMat);
    
    // Rocket Launcher model
    const rocketGroup = new THREE.Group();
    
    // Main tube
    const rocketTubeGeo = new THREE.CylinderGeometry(0.2, 0.2, 1.2, 8);
    const rocketTubeMat = new THREE.MeshStandardMaterial({color: 0x333333});
    const rocketTube = new THREE.Mesh(rocketTubeGeo, rocketTubeMat);
    rocketTube.rotation.set(0, 0, Math.PI/2);
    rocketTube.position.set(0, 0, -0.6);
    rocketGroup.add(rocketTube);
    
    // Handle
    const rocketHandleGeo = new THREE.BoxGeometry(0.1, 0.3, 0.15);
    const rocketHandleMat = new THREE.MeshStandardMaterial({color: 0x111111});
    const rocketHandle = new THREE.Mesh(rocketHandleGeo, rocketHandleMat);
    rocketHandle.position.set(0, -0.25, 0.1);
    rocketGroup.add(rocketHandle);
    
    // Rocket muzzle flash
    const rocketMuzzleFlashGeo = new THREE.BoxGeometry(0.3, 0.3, 0.3);
    const rocketMuzzleFlashMat = new THREE.MeshBasicMaterial({color: 0xff5500});
    const rocketMuzzleFlash = new THREE.Mesh(rocketMuzzleFlashGeo, rocketMuzzleFlashMat);
    rocketMuzzleFlash.position.set(0, 0, -1.25);
    rocketMuzzleFlash.visible = false;
    rocketGroup.add(rocketMuzzleFlash);
    
    // Store rocket launcher model
    weapons[WEAPON_ROCKET].model = rocketGroup;
    weapons[WEAPON_ROCKET].muzzleFlash = rocketMuzzleFlash;
    
    // Create rocket model (larger than bullets)
    const rocketModelGeo = new THREE.BoxGeometry(0.1, 0.1, 0.3);
    const rocketModelMat = new THREE.MeshStandardMaterial({color: 0xff0000});
    weapons[WEAPON_ROCKET].bulletModel = new THREE.Mesh(rocketModelGeo, rocketModelMat);
    
    // Melee weapon (bat/club)
    const meleeGroup = new THREE.Group();
    
    // Handle
    const meleeHandleGeo = new THREE.BoxGeometry(0.1, 0.5, 0.1);
    const meleeHandleMat = new THREE.MeshStandardMaterial({color: 0x553311});
    const meleeHandle = new THREE.Mesh(meleeHandleGeo, meleeHandleMat);
    meleeHandle.position.set(0, 0, 0);
    meleeGroup.add(meleeHandle);
    
    // Head
    const meleeHeadGeo = new THREE.BoxGeometry(0.15, 0.2, 0.3);
    const meleeHeadMat = new THREE.MeshStandardMaterial({color: 0x888888});
    const meleeHead = new THREE.Mesh(meleeHeadGeo, meleeHeadMat);
    meleeHead.position.set(0, 0.3, 0);
    meleeGroup.add(meleeHead);
    
    // Store melee model
    weapons[WEAPON_MELEE].model = meleeGroup;
    
    // Create a viewport-fixed scene for weapons
    const weaponViewport = new THREE.Scene();
    
    // Add all weapon models to the scene but hide them initially
    for (let weaponId in weapons) {
        if (weapons[weaponId].model) {
            // Don't initially position the weapons - we'll do that in updateWeaponPosition
            weaponViewport.add(weapons[weaponId].model);
            weapons[weaponId].model.visible = false;
        }
    }
    
    // Store the weapon viewport for rendering
    window.weaponViewport = weaponViewport;
    
    // Show current weapon
    switchWeapon(currentWeapon);
}
export function switchWeapon(weaponId) {
    if (!weapons[weaponId]) return;
    
    if (isReloading && typeof reloadTimeoutId === "number"){
      clearTimeout(reloadTimeoutId);
      isReloading = false;
      reloadText.style.display = 'none';
      reloadTimeoutId = undefined;
    }
    
    // Hide current weapon
    if (weapons[currentWeapon].model) {
        weapons[currentWeapon].model.visible = false;
    }
    
    // Switch to new weapon
    currentWeapon = weaponId;
    
    // Show new weapon
    if (weapons[currentWeapon].model) {
        weapons[currentWeapon].model.visible = true;
    }
    
    // Update weapon position
    updateWeaponPosition();
    
    // Update ammo display
    updateAmmoText();
}
export function updateWeaponPosition() {
    const weapon = weapons[currentWeapon];
    if (!weapon.model) return;

    // --- ADS ZOOM ---
    const targetFov = isADS ? 75 / 1.5 : 75;
    camera.fov += (targetFov - camera.fov) * 0.18; // Smooth zoom
    camera.updateProjectionMatrix();
    // --- END ADS ZOOM ---
    

    // Create vectors for weapon positioning in camera space
    let offsetRight = 0.3;  // Distance right of camera center
    let offsetDown = -0.2;  // Distance below camera center
    let offsetForward = -0.5;  // Distance in front of camera
    
    // Adjust for ADS
    if (isADS) {
        adsTransition = Math.min(1, adsTransition + 0.1); // Smooth transition to ADS
        sensitivity = baseSensitivity/2
    } else {
        adsTransition = Math.max(0, adsTransition - 0.1); // Smooth transition to hip fire
        sensitivity = baseSensitivity
    }

    // --- Rocket launcher ADS fix ---
    let scale = 1;
    if (currentWeapon === WEAPON_ROCKET && isADS) {
        scale = 0.45; // Shrink rocket launcher in ADS
        offsetRight *= 0.5;
        offsetDown *= 0.7;
        offsetForward = -0.15;
    }

    // Interpolate position for ADS transition
    offsetRight = offsetRight * (1 - adsTransition);
    offsetDown = offsetDown * (1 - adsTransition) + (-0.1 * adsTransition);
    offsetForward = offsetForward * (1 - adsTransition) + (-0.3 * adsTransition);
    
    // Apply position based on camera's orientation vectors
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
    
    // Calculate weapon position in world space
    const weaponPos = new THREE.Vector3()
        .addScaledVector(right, offsetRight)
        .addScaledVector(up, offsetDown)
        .addScaledVector(forward, offsetForward)
        .add(camera.position);
    
    // Set weapon position in world space
    weapon.model.position.copy(weaponPos);
    
    // Make weapon face same direction as camera
    weapon.model.quaternion.copy(camera.quaternion);

    // Rocket launcher scale fix
    if (currentWeapon === WEAPON_ROCKET) {
        weapon.model.scale.set(scale, scale, scale);
    } else {
        weapon.model.scale.set(1, 1, 1);
    }
    
    // Update crosshair size based on ADS
    if (crosshair) {
        const baseSize = 20;
        const adsSize = 10; 
        const size = baseSize * (1 - adsTransition) + adsSize * adsTransition;
        crosshair.style.width = `${size}px`;
        crosshair.style.height = `${size}px`;
    }
}

export function reload() {
    const weapon = weapons[currentWeapon];
    
    // Skip reload if weapon doesn't need it
    if (weapon.currentAmmo === weapon.magazineSize || weapon.magazineSize === Infinity || isReloading) {
        return;
    }
    
    // Start reload
    isReloading = true;
    sounds.reload.play()
    reloadText.style.display = 'block';
    
    // Reload after timeout
    reloadTimeoutId = setTimeout(() => {
        weapon.currentAmmo = weapon.magazineSize;
        isReloading = false;
        reloadText.style.display = 'none';
        updateAmmoText();
    }, weapon.reloadTime);
}
export function shoot() {
    const weapon = weapons[currentWeapon];

    // Auto-Reload if gun has no ammo
    if (weapon.currentAmmo <= 0 && weapon.magazineSize !== Infinity) { // Added check for Infinity ammo
       reload();
       return false; // Don't shoot if we just initiated a reload due to empty mag
    }

    // Check if player can shoot (ammo, reload, cooldown)
    const now = Date.now();
    if (isReloading || weapon.currentAmmo <= 0 || now - lastShotTime < weapon.fireRate) {
        return false;
    }

    // Set last shot time for fire rate control
    lastShotTime = now;
    
    // play shoot.mp3
    sounds.shoot.play()

    // Handle different weapon types
    switch (currentWeapon) {
        case WEAPON_RIFLE:
        case WEAPON_SHOTGUN:
            // Show muzzle flash
            if (weapon.muzzleFlash) {
                weapon.muzzleFlash.visible = true;
                // Hide muzzle flash after a short time
                setTimeout(() => {
                   if (weapon.muzzleFlash) weapon.muzzleFlash.visible = false; // Added check if muzzleFlash still exists
                }, 50);
            }

            // Calculate number of shots (pellets for shotgun)
            const shots = currentWeapon === WEAPON_SHOTGUN ? weapon.pellets : 1;

            // *** OUTER LOOP ***
            for (let i = 0; i < shots; i++) { // Uses 'i' for pellet count
                // Calculate spread
                const spread = weapon.spread * (isADS ? 0.4 : 1.0); // Reduced spread when aiming
                const spreadX = (Math.random() - 0.5) * spread;
                const spreadY = (Math.random() - 0.5) * spread;

                // Create raycaster for bullet
                raycaster.setFromCamera(new THREE.Vector2(spreadX, spreadY), camera);

                // Create bullet visualization (tracer)
                createBulletTracer(raycaster.ray.direction);

                // Check for hits
                const intersects = raycaster.intersectObjects(scene.children, true);
                let pierceCount = typeof weapon.pierce === 'number' ? weapon.pierce : 1; // How many objects can be pierced (min 1)
                let piercedObjects = 0;

                // *** INNER LOOP - CORRECTED VARIABLE ***
                for (let j = 0; j < intersects.length; j++){ // Uses 'j' for intersections
                    let hit = intersects[j];

                    // Skip hits on bullets, weapons, player camera itself, explosions, etc.
                    if (hit.object === camera || // Don't hit self
                        bullets.some(b => b.bullet === hit.object) ||
                        explosions.some(e => e.mesh === hit.object) ||
                        Object.values(weapons).some(w => w.model && (w.model === hit.object || w.model.children.includes(hit.object))))
                    {
                        continue; // Ignore this intersection
                    }

                    piercedObjects++; // Count this valid object intersection

                    // Check if enemy was hit
                    const enemy = enemies.find(e => e.mesh === hit.object);
                    if (enemy) {
                        // Calculate distance to enemy
                        const distance = camera.position.distanceTo(hit.point);

                        // Apply damage drop-off
                        let damage = weapon.damage;
                        if (distance > weapon.minRange && weapon.maxRange > weapon.minRange) { // Avoid division by zero
                            const dropOffFactor = Math.min(1, Math.max(0, (distance - weapon.minRange) / (weapon.maxRange - weapon.minRange)));
                            damage *= (1 - dropOffFactor * (1 - weapon.minDamagePercent));
                        }

                        // Apply damage to enemy
                        damageEnemy(enemy, Math.round(damage), hit.point);

                        // If we hit an enemy, check if we should stop piercing
                        if (piercedObjects >= pierceCount) {
                            break; // Stop checking intersections for this pellet
                        }
                        // If piercing continues, don't create an impact mark here
                    } else {
                        // Hit effect for environment (bullet mark)
                        createBulletImpact(hit.point, hit.face.normal);

                        // If we hit the environment, check if we should stop piercing
                        if (piercedObjects >= pierceCount) {
                            break; // Stop checking intersections for this pellet
                        }
                    }
                } // End inner loop (intersections)
            } // End outer loop (pellets)

            // Decrease ammo
            weapon.currentAmmo--;
            updateAmmoText();

            // Auto reload when empty (unless infinite)
            if (weapon.currentAmmo <= 0 && weapon.magazineSize !== Infinity) {
                reload();
            }
            break; // End Rifle/Shotgun case

        case WEAPON_ROCKET:
            // Show muzzle flash
            if (weapon.muzzleFlash) {
                weapon.muzzleFlash.visible = true;
                setTimeout(() => {
                   if (weapon.muzzleFlash) weapon.muzzleFlash.visible = false;
                }, 100);
            }

            // Create rocket
            const rocketDirection = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
            createRocket(camera.position.clone(), rocketDirection); // Ensure position is cloned

            // Decrease ammo
            weapon.currentAmmo--;
            updateAmmoText();

            // Auto reload when empty
            if (weapon.currentAmmo <= 0) {
                reload();
            }
            break;

        case WEAPON_MELEE:
            // Melee attack - check for enemies in range
            const meleeDirection = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
            raycaster.set(camera.position, meleeDirection);

            // Melee attack animation (simplified - original animation logic kept)
             const meleeModel = weapon.model;
             if (meleeModel && !meleeModel.isAnimating) { // Added flag to prevent re-triggering animation
                 meleeModel.isAnimating = true; // Set flag
                 const originalRotation = meleeModel.rotation.clone();
                 const swingDuration = weapon.fireRate * 0.8; // Animation duration based on fire rate

                 // Simple swing back and forth using Euler angles (example)
                 let startTime = performance.now();
                 function animateSwing(currentTime) {
                     const elapsed = currentTime - startTime;
                     const progress = Math.min(elapsed / swingDuration, 1);

                     // Simple quadratic ease-in-out for swing arc
                     const swingProgress = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;

                     // Apply rotation (example: swing down and right)
                     const maxAngleX = -Math.PI / 4;
                     const maxAngleZ = Math.PI / 6;
                     meleeModel.rotation.x = originalRotation.x + maxAngleX * swingProgress;
                     meleeModel.rotation.z = originalRotation.z + maxAngleZ * swingProgress;


                     if (progress < 1) {
                         requestAnimationFrame(animateSwing);
                     } else {
                         meleeModel.rotation.copy(originalRotation); // Reset rotation
                         meleeModel.isAnimating = false; // Clear flag
                     }
                 }
                 requestAnimationFrame(animateSwing);
             }


            // Check for melee hits
            const meleeRange = weapon.range;
            const meleeHits = raycaster.intersectObjects(scene.children, true);
            let hitEnemyThisSwing = false; // Prevent hitting multiple enemies with one swing easily

            for (const hit of meleeHits) {
                // Only consider hits within range
                if (hit.distance > meleeRange) continue;

                // Skip hits on non-enemy objects like weapons, bullets etc.
                if (hit.object === camera ||
                    bullets.some(b => b.bullet === hit.object) ||
                    explosions.some(e => e.mesh === hit.object) ||
                    Object.values(weapons).some(w => w.model && (w.model === hit.object || w.model.children.includes(hit.object))))
                {
                    continue;
                }

                // Check if enemy was hit
                const enemy = enemies.find(e => e.mesh === hit.object);
                if (enemy && !hitEnemyThisSwing) {
                    // Apply damage to enemy
                    damageEnemy(enemy, weapon.damage, hit.point);
                    hitEnemyThisSwing = true; // Mark that we hit something

                    // Add knockback effect to enemy
                    const knockbackForce = new THREE.Vector3().copy(meleeDirection).multiplyScalar(0.5);
                    // Add velocity safely (check if velocity exists)
                     if (enemy.velocity) {
                         enemy.velocity.add(knockbackForce);
                     } else {
                         enemy.velocity = knockbackForce; // Initialize if needed
                     }

                    break; // Typically, melee hits the first target in range
                }
            }
            break; // End Melee case
    } // End switch statement

    return true; // Shot was attempted (even if it hit nothing)
}