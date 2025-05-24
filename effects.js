// Effects module (bullets, explosions, damage numbers)
import * as THREE from 'three';
// Avoid circular imports, use window globals at runtime
// import { weapons, currentWeapon, WEAPON_ROCKET } from './weapons.js';
// Using the global game object for scene, camera and deltaTime instead of imports
// import { damagePlayer } from './player.js';
import { damageEnemy } from './ui.js';

// Exported effects state variables
export let bullets = [];
export let explosions = [];

// We'll expose these constants locally to avoid circular imports
const WEAPON_ROCKET = 3; // Must match weapons.js

// Exported effects-related functions
export function createBulletTracer(direction) {
    const weapon = weapons[currentWeapon];
    
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
        muzzlePosition = new THREE.Vector3().copy(camera.position);
        const forwardOffset = direction.clone().multiplyScalar(muzzleOffset);
        muzzlePosition.add(forwardOffset);
    }
    
    // For tracer effect, make the bullet longer in its movement direction
    if (currentWeapon !== WEAPON_ROCKET) {
        // Scale bullet to be longer for tracer effect
        bullet.scale.z = 3;
    }
    
    // Set bullet position at muzzle
    bullet.position.copy(muzzlePosition);
    
    // Point bullet in direction of travel
    const targetPos = muzzlePosition.clone().add(direction);
    bullet.lookAt(targetPos);
    
    // Add bullet to scene
    scene.add(bullet);
    
    // Store bullet data for animation
    const bulletData = {
        bullet: bullet,
        velocity: direction.clone().multiplyScalar(weapon.bulletSpeed),
        created: Date.now(),
        // Lifetime depends on weapon type
        lifetime: currentWeapon === WEAPON_ROCKET ? 3000 : 1000
    };
    
    bullets.push(bulletData);
}
export function createRocket(position, direction) {
    const weapon = weapons[WEAPON_ROCKET];
    
    // Create rocket mesh
    const rocket = weapon.bulletModel.clone();
    
    // Set position slightly in front of camera
    const rocketStart = direction.clone().multiplyScalar(0.7).add(position);
    rocket.position.copy(rocketStart);
    
    // Orient rocket in direction of travel
    rocket.lookAt(rocketStart.clone().add(direction));
    
    // Add to scene
    scene.add(rocket);
    
    // Store rocket data for animation
    const rocketData = {
        bullet: rocket,
        velocity: direction.clone().multiplyScalar(weapon.bulletSpeed),
        created: Date.now(),
        lifetime: 3000,
        isRocket: true
    };
    
    bullets.push(rocketData);
}
export function createExplosion(position, radius) {
    // Create explosion sphere
    const explosionGeo = new THREE.SphereGeometry(radius, 16, 16);
    const explosionMat = new THREE.MeshBasicMaterial({
        color: 0xff5500,
        transparent: true,
        opacity: 1.0
    });
    const explosion = new THREE.Mesh(explosionGeo, explosionMat);
    explosion.position.copy(position);
    scene.add(explosion);
    
    // Add to explosions array for animation
    explosions.push({
        mesh: explosion,
        created: Date.now(),
        lifetime: 500,
        radius: radius
    });
    
    // Check for enemies in blast radius
    for (const enemy of enemies) {
        const distance = enemy.mesh.position.distanceTo(position);
        if (distance <= radius * 1.5) {
            // Calculate damage based on distance (more damage closer to explosion)
            const damage = Math.round(weapons[WEAPON_ROCKET].damage * (1 - distance / (radius * 1.5)));
            if (damage > 0) {
                damageEnemy(enemy, damage, enemy.mesh.position);
            }
        }
    }
    
    // Check if player is in blast radius (self-damage)
    const playerDistance = camera.position.distanceTo(position);
    if (playerDistance <= radius * 1.2) {
        // Calculate damage based on distance
        const damage = Math.round(20 * (1 - playerDistance / (radius * 1.2)));
        if (damage > 0) {
            damagePlayer(damage);
        }
    }
}
export function createBulletImpact(position, normal) {
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
    scene.add(impact);
    
    // Remove after delay
    setTimeout(() => {
        scene.remove(impact);
        impact.geometry.dispose();
        impact.material.dispose();
    }, 5000);
}
export function updateBullets(deltaTime) {
    // Loop through bullets array in reverse to safely remove items
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        
        // Move bullet
        bullet.bullet.position.add(bullet.velocity.clone().multiplyScalar(deltaTime));
        
        // Check for rocket collision with environment
        if (bullet.isRocket) {
            raycaster.set(bullet.bullet.position, bullet.velocity.clone().normalize());
            const intersects = raycaster.intersectObjects(scene.children, true);
            
            let hitFound = false;
            for (const hit of intersects) {
                // Skip hits on bullets, weapons, etc.
                if (bullets.some(b => b.bullet === hit.object) || 
                    Object.values(weapons).some(w => w.model === hit.object || 
                    (w.model && w.model.children.includes(hit.object)))) {
                    continue;
                }
                
                // Skip hit on self (rocket)
                if (hit.object === bullet.bullet) {
                    continue;
                }
                
                // Explosion at hit point
                createExplosion(hit.point, 5);
                
                // Remove rocket
                scene.remove(bullet.bullet);
                bullets.splice(i, 1);
                
                hitFound = true;
                break;
            }
            
            if (hitFound) continue;
        }
        
        // Check lifetime
        const age = Date.now() - bullet.created;
        if (age > bullet.lifetime) {
            // Handle rocket that expired without hitting anything
            if (bullet.isRocket) {
                createExplosion(bullet.bullet.position, 5);
            }
            
            // Remove bullet
            scene.remove(bullet.bullet);
            bullets.splice(i, 1);
        }
    }
}
export function updateExplosions(deltaTime) {
    for (let i = explosions.length - 1; i >= 0; i--) {
        const explosion = explosions[i];
        
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
            scene.remove(explosion.mesh);
            explosions.splice(i, 1);
        }
    }
}
export function showDamageNumber(amount, position) {
    // Create a div for the damage number
    const damageDiv = document.createElement('div');
    damageDiv.textContent = amount.toString();
    damageDiv.style.position = 'absolute';
    damageDiv.style.color = amount >= 100 ? '#ff0000' : '#ffffff'; // Change this in the future to accomodate headshots
    damageDiv.style.fontWeight = amount >= 50 ? 'bold' : 'normal';
    damageDiv.style.fontSize = `${Math.min(16 + amount/5, 30)}px`;
    damageDiv.style.textShadow = '1px 1px 2px black';
    damageDiv.style.userSelect = 'none';
    damageDiv.style.pointerEvents = 'none';
    
    // Add to damage number container
    document.getElementById('damage-number-container').appendChild(damageDiv);
    
    // Convert 3D position to screen coordinates
    const screenPosition = new THREE.Vector3().copy(position);
    screenPosition.project(camera);
    
    const x = (screenPosition.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-(screenPosition.y * 0.5) + 0.5) * window.innerHeight;
    
    damageDiv.style.left = `${x}px`;
    damageDiv.style.top = `${y}px`;
    
    // Animate and remove after delay
    let opacity = 1;
    let posY = y;
    const floatSpeed = 50; // pixels per second
    const lastUpdate = Date.now();
    
    // Add to damage numbers array for animation
    damageNumbers.push({
        element: damageDiv,
        position: { x, y: posY },
        opacity: opacity,
        created: Date.now(),
        lastUpdate: lastUpdate
    });
}
export function updateDamageNumbers(deltaTime) {
    for (let i = damageNumbers.length - 1; i >= 0; i--) {
        const damageNumber = damageNumbers[i];
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
            damageNumber.element.parentNode.removeChild(damageNumber.element);
            damageNumbers.splice(i, 1);
        }
    }
}
export function updateEnemyHealthBar(enemy) {
    // Create health bar if it doesn't exist
    if (!enemyHealthBars[enemy.id]) {
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
        document.getElementById('enemy-health-bar-container').appendChild(barContainer);
        
        enemyHealthBars[enemy.id] = {
            container: barContainer,
            fill: barFill
        };
    }
    
    // Update health bar fill
    const healthPercent = enemy.health / enemy.maxHealth * 100;
    enemyHealthBars[enemy.id].fill.style.width = `${healthPercent}%`;
    
    // Show health bar
    enemyHealthBars[enemy.id].container.style.visibility = 'visible';
    
    // Hide after delay
    if (enemy.healthBarTimeout) {
        clearTimeout(enemy.healthBarTimeout);
    }
    
    enemy.healthBarTimeout = setTimeout(() => {
        if (enemyHealthBars[enemy.id]) {
            enemyHealthBars[enemy.id].container.style.visibility = 'hidden';
        }
    }, 2000);
}
