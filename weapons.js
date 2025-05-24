// Weapon system module
import * as THREE from 'three';
// ui.js functions will be refactored to use window.game
import { updateAmmoText } from 'ui'; 
// audio.js sounds are on window.game.sounds (no direct import needed)
// effects.js functions will be refactored to use window.game (or attached to window.game)
// For createBulletTracer and createRocket, ensure they also use window.game if they don't already
import { createBulletTracer, createRocket, createBulletImpact } from 'effects'; 
import { damageEnemy } from 'enemies';

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
                        damageEnemy(enemy, Math.round(damage), hit.point); // Direct call

                        if (piercedObjects >= pierceCount) {
                            break; 
                        }
                    } else {
                        createBulletImpact(hit.point, hit.face.normal); // Direct call
                        if (piercedObjects >= pierceCount) {
                            break; 
                        }
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
                    damageEnemy(enemy, weapon.damage, hit.point); // Direct call
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
