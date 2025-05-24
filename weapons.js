// Weapon system module
import * as THREE from 'three';
// ui.js functions will be refactored to use window.game
import { updateAmmoText } from 'ui'; 
// audio.js sounds are on window.game.sounds (no direct import needed)
// effects.js functions will be refactored to use window.game (or attached to window.game)
// For createBulletTracer and createRocket, ensure they also use window.game if they don't already
import { createBulletTracer, createRocket, createBulletImpact } from 'effects'; 
// Removed import for damageEnemy, will use window.game.damageEnemy

// Weapon constants are defined on window.game in main.js.
// These local constants can be used for defining the structure of window.game.weapons below.
export const WEAPON_RIFLE = 1; 
export const WEAPON_SHOTGUN = 2;
export const WEAPON_ROCKET = 3;
export const WEAPON_MELEE = 4;

// Weapon state variables are now managed on window.game.
// This module's functions will modify window.game.currentWeapon, etc.
// export let currentWeapon = WEAPON_RIFLE; // Now window.game.currentWeapon
// export let isReloading = false; // Now window.game.isReloading
// export let isADS = false; // Now window.game.isADS
// export let adsTransition = 0; // Now window.game.adsTransition
// export let lastShotTime = 0; // Now window.game.lastShotTime
// export let isShooting = false; // Now window.game.isShooting
// export let reloadTimeoutId; // Now window.game.reloadTimeoutId

// The 'weapons' object itself is initialized on window.game in main.js.
// This file's createWeaponModels function will populate the .model, .muzzleFlash, .bulletModel properties
// on the existing window.game.weapons[WEAPON_ID] objects.
// The definition of the weapons data structure is in main.js
// export let weapons = { ... } // Structure is defined in main.js, models populated here

// Exported weapon-related functions
export function createWeaponModels() {
    const g = window.game;
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
    const muzzleFlashMesh = new THREE.Mesh(muzzleFlashGeo, muzzleFlashMat); // Renamed to avoid conflict
    muzzleFlashMesh.position.set(0, 0, -1.05);
    muzzleFlashMesh.visible = false;
    rifleGroup.add(muzzleFlashMesh);
    
    // Store rifle model and muzzle flash
    g.weapons[WEAPON_RIFLE].model = rifleGroup; // Use local WEAPON_RIFLE
    g.weapons[WEAPON_RIFLE].muzzleFlash = muzzleFlashMesh;
    
    // Create bullet model
    const bulletGeo = new THREE.BoxGeometry(0.05, 0.05, 0.2);
    const bulletMat = new THREE.MeshBasicMaterial({color: 0xffff00});
    g.weapons[WEAPON_RIFLE].bulletModel = new THREE.Mesh(bulletGeo, bulletMat);
    
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
    const sgMuzzleFlashMesh = new THREE.Mesh(sgMuzzleFlashGeo, sgMuzzleFlashMat); // Renamed
    sgMuzzleFlashMesh.position.set(0, 0, -0.95);
    sgMuzzleFlashMesh.visible = false;
    shotgunGroup.add(sgMuzzleFlashMesh);
    
    // Store shotgun model and muzzle flash
    g.weapons[WEAPON_SHOTGUN].model = shotgunGroup; // Use local WEAPON_SHOTGUN
    g.weapons[WEAPON_SHOTGUN].muzzleFlash = sgMuzzleFlashMesh;
    g.weapons[WEAPON_SHOTGUN].bulletModel = new THREE.Mesh(bulletGeo, bulletMat);
    
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
    const rocketMuzzleFlashMesh = new THREE.Mesh(rocketMuzzleFlashGeo, rocketMuzzleFlashMat); // Renamed
    rocketMuzzleFlashMesh.position.set(0, 0, -1.25);
    rocketMuzzleFlashMesh.visible = false;
    rocketGroup.add(rocketMuzzleFlashMesh);
    
    // Store rocket launcher model
    g.weapons[WEAPON_ROCKET].model = rocketGroup; // Use local WEAPON_ROCKET
    g.weapons[WEAPON_ROCKET].muzzleFlash = rocketMuzzleFlashMesh;
    
    // Create rocket model (larger than bullets)
    const rocketModelGeo = new THREE.BoxGeometry(0.1, 0.1, 0.3);
    const rocketModelMat = new THREE.MeshStandardMaterial({color: 0xff0000});
    g.weapons[WEAPON_ROCKET].bulletModel = new THREE.Mesh(rocketModelGeo, rocketModelMat);
    
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
    g.weapons[WEAPON_MELEE].model = meleeGroup; // Use local WEAPON_MELEE
    
    // Create a viewport-fixed scene for weapons
    const weaponViewport = new THREE.Scene(); // This is a local scene for weapon models
    
    // Add all weapon models to the scene but hide them initially
    for (let weaponIdKey in g.weapons) { // Iterate over g.weapons keys
        // Ensure weaponId is a key of g.weapons and not from prototype chain
        if (Object.prototype.hasOwnProperty.call(g.weapons, weaponIdKey)) {
            const weaponData = g.weapons[weaponIdKey];
            if (weaponData.model) {
                weaponViewport.add(weaponData.model);
                weaponData.model.visible = false;
            }
        }
    }
    
    // Store the weapon viewport for rendering
    window.weaponViewport = weaponViewport; // This is a special global for rendering, not part of g.
    
    // Show current weapon
    switchWeapon(g.currentWeapon); // Uses g.currentWeapon
}
export function switchWeapon(weaponId) {
    const g = window.game;
    if (!g.weapons[weaponId]) return;
    
    if (g.isReloading && typeof g.reloadTimeoutId === "number"){
      clearTimeout(g.reloadTimeoutId);
      g.isReloading = false;
      if (g.reloadText) g.reloadText.style.display = 'none'; 
      g.reloadTimeoutId = undefined;
    }
    
    // Hide current weapon
    if (g.weapons[g.currentWeapon] && g.weapons[g.currentWeapon].model) {
        g.weapons[g.currentWeapon].model.visible = false;
    }
    
    // Switch to new weapon
    g.currentWeapon = weaponId;
    
    // Show new weapon
    if (g.weapons[g.currentWeapon] && g.weapons[g.currentWeapon].model) {
        g.weapons[g.currentWeapon].model.visible = true;
    }
    
    // Update weapon position
    updateWeaponPosition(); 
    
    // Update ammo display
    updateAmmoText(); 
}
export function updateWeaponPosition() {
    const g = window.game;
    const weapon = g.weapons[g.currentWeapon];
    if (!weapon || !weapon.model) return;
    if (!g.camera) return;


    // --- ADS ZOOM ---
    const targetFov = g.isADS ? 75 / 1.5 : 75;
    g.camera.fov += (targetFov - g.camera.fov) * 0.18; 
    g.camera.updateProjectionMatrix();
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
    if (g.currentWeapon === g.WEAPON_ROCKET && g.isADS) { // Use g.WEAPON_ROCKET for comparison
        scale = 0.45; 
        offsetRight *= 0.5;
        offsetDown *= 0.7;
        offsetForward = -0.15;
    }

    // Interpolate position for ADS transition
    offsetRight = offsetRight * (1 - g.adsTransition);
    offsetDown = offsetDown * (1 - g.adsTransition) + (-0.1 * g.adsTransition);
    offsetForward = offsetForward * (1 - g.adsTransition) + (-0.3 * g.adsTransition);
    
    // Apply position based on camera's orientation vectors
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(g.camera.quaternion);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(g.camera.quaternion);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(g.camera.quaternion);
    
    // Calculate weapon position in world space
    const weaponPos = new THREE.Vector3()
        .addScaledVector(right, offsetRight)
        .addScaledVector(up, offsetDown)
        .addScaledVector(forward, offsetForward)
        .add(g.camera.position);
    
    // Set weapon position in world space
    weapon.model.position.copy(weaponPos);
    
    // Make weapon face same direction as camera
    weapon.model.quaternion.copy(g.camera.quaternion);

    // Rocket launcher scale fix
    if (g.currentWeapon === g.WEAPON_ROCKET) { // Use g.WEAPON_ROCKET
        weapon.model.scale.set(scale, scale, scale);
    } else {
        weapon.model.scale.set(1, 1, 1);
    }
    
    // Update crosshair size based on ADS
    if (g.crosshair) { 
        const baseSize = 20;
        const adsSize = 10; 
        const size = baseSize * (1 - g.adsTransition) + adsSize * g.adsTransition;
        g.crosshair.style.width = `${size}px`;
        g.crosshair.style.height = `${size}px`;
    }
}

export function reload() {
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
        updateAmmoText(); 
    }, weapon.reloadTime);
}
export function shoot() {
    const g = window.game;
    const weapon = g.weapons[g.currentWeapon];
    if (!weapon || !g.camera || !g.raycaster || !g.scene) return;


    // Auto-Reload if gun has no ammo
    if (weapon.currentAmmo <= 0 && weapon.magazineSize !== Infinity) { 
       reload(); 
       return false; 
    }

    // Check if player can shoot (ammo, reload, cooldown)
    const now = Date.now();
    if (g.isReloading || weapon.currentAmmo <= 0 || now - g.lastShotTime < weapon.fireRate) {
        return false;
    }

    // Set last shot time for fire rate control
    g.lastShotTime = now;
    
    // play shoot.mp3
    if (g.sounds && g.sounds.shoot) g.sounds.shoot.play();

    // Handle different weapon types
    switch (g.currentWeapon) {
        case g.WEAPON_RIFLE:     // Use g.WEAPON_RIFLE
        case g.WEAPON_SHOTGUN:   // Use g.WEAPON_SHOTGUN
            // Show muzzle flash
            if (weapon.muzzleFlash) {
                weapon.muzzleFlash.visible = true;
                setTimeout(() => {
                   if (weapon.muzzleFlash) weapon.muzzleFlash.visible = false; 
                }, 50);
            }

            // Calculate number of shots (pellets for shotgun)
            const shots = g.currentWeapon === g.WEAPON_SHOTGUN ? weapon.pellets : 1;

            for (let i = 0; i < shots; i++) { 
                const spread = weapon.spread * (g.isADS ? 0.4 : 1.0); 
                const spreadX = (Math.random() - 0.5) * spread;
                const spreadY = (Math.random() - 0.5) * spread;

                g.raycaster.setFromCamera(new THREE.Vector2(spreadX, spreadY), g.camera);
                createBulletTracer(g.raycaster.ray.direction); 

                const intersects = g.raycaster.intersectObjects(g.scene.children, true); 
                let pierceCount = typeof weapon.pierce === 'number' ? weapon.pierce : 1; 
                let piercedObjects = 0;

                for (let j = 0; j < intersects.length; j++){ 
                    let hit = intersects[j];

                    if (hit.object === g.camera || 
                        (g.bullets && g.bullets.some(b => b.bullet === hit.object)) ||
                        (g.explosions && g.explosions.some(e => e.mesh === hit.object)) ||
                        Object.values(g.weapons).some(w => w.model && (w.model === hit.object || w.model.children.includes(hit.object))))
                    {
                        continue; 
                    }

                    piercedObjects++; 

                    const enemy = g.enemies && g.enemies.find(e => e.mesh === hit.object); 
                    if (enemy) {
                        const distance = g.camera.position.distanceTo(hit.point);
                        let damage = weapon.damage;
                        if (distance > weapon.minRange && weapon.maxRange > weapon.minRange) { 
                            const dropOffFactor = Math.min(1, Math.max(0, (distance - weapon.minRange) / (weapon.maxRange - weapon.minRange)));
                            damage *= (1 - dropOffFactor * (1 - weapon.minDamagePercent));
                        }
                        if(window.game.damageEnemy) window.game.damageEnemy(enemy, Math.round(damage), hit.point);

                        if (piercedObjects >= pierceCount) {
                            break; 
                        }
                    } else {
                        createBulletImpact(hit.point, hit.face.normal); // This is already imported and called directly
                        if (piercedObjects >= pierceCount) {
                            break; 
                    }
                } 
            } 

            weapon.currentAmmo--;
            updateAmmoText(); 

            if (weapon.currentAmmo <= 0 && weapon.magazineSize !== Infinity) {
                reload(); 
            }
            break; 

        case g.WEAPON_ROCKET: // Use g.WEAPON_ROCKET
            if (weapon.muzzleFlash) {
                weapon.muzzleFlash.visible = true;
                setTimeout(() => {
                   if (weapon.muzzleFlash) weapon.muzzleFlash.visible = false;
                }, 100);
            }

            const rocketDirection = new THREE.Vector3(0, 0, -1).applyQuaternion(g.camera.quaternion);
            createRocket(g.camera.position.clone(), rocketDirection); 

            weapon.currentAmmo--;
            updateAmmoText(); 

            if (weapon.currentAmmo <= 0) {
                reload(); 
            }
            break;

        case g.WEAPON_MELEE: // Use g.WEAPON_MELEE
            const meleeDirection = new THREE.Vector3(0, 0, -1).applyQuaternion(g.camera.quaternion);
            g.raycaster.set(g.camera.position, meleeDirection);

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
                         meleeModel.rotation.copy(originalRotation); 
                         meleeModel.isAnimating = false; 
                     }
                 }
                 requestAnimationFrame(animateSwing);
             }

            const meleeRange = weapon.range;
            const meleeHits = g.raycaster.intersectObjects(g.scene.children, true); 
            let hitEnemyThisSwing = false; 

            for (const hit of meleeHits) {
                if (hit.distance > meleeRange) continue;

                if (hit.object === g.camera ||
                    (g.bullets && g.bullets.some(b => b.bullet === hit.object)) ||
                    (g.explosions && g.explosions.some(e => e.mesh === hit.object)) ||
                    Object.values(g.weapons).some(w => w.model && (w.model === hit.object || w.model.children.includes(hit.object))))
                {
                    continue;
                }

                const enemy = g.enemies && g.enemies.find(e => e.mesh === hit.object); 
                if (enemy && !hitEnemyThisSwing) {
                    if(window.game.damageEnemy) window.game.damageEnemy(enemy, weapon.damage, hit.point);
                    hitEnemyThisSwing = true; 

                    const knockbackForce = new THREE.Vector3().copy(meleeDirection).multiplyScalar(0.5);
                     if (enemy.velocity) {
                         enemy.velocity.add(knockbackForce);
                     } else {
                         enemy.velocity = knockbackForce; 
                     }
                    break; 
                }
            }
            break; 
    } 
    return true; 
}
// The weapon definitions (damage, fireRate, etc.) are already on window.game.weapons,
// as initialized in main.js. createWeaponModels here only adds models.
// So, the large 'export let weapons = { ... }' structure is removed from this file.
export function createWeaponModels() {
    const g = window.game;
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