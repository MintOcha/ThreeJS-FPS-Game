// Player module for movement, controls, health, and player state
import * as THREE from 'three';
// Avoid circular imports at module level
// import { updateWeaponPosition, switchWeapon, reload, WEAPON_RIFLE, WEAPON_SHOTGUN, WEAPON_ROCKET, WEAPON_MELEE } from './weapons.js';
import { updateHealthBar, updateAmmoText } from './ui.js';
import { sounds } from './audio.js';
// Using the global game object for scene and camera instead of imports

// All player-related functions use the global game object
// Exported player-related functions (stubs for easy copy-paste)
export function createPlayer() {
    // Player is just a camera with collision detection
    const g = window.game;
    g.player = g.camera;
    
    // Initialize player movement variables
    g.playerVelocity = new THREE.Vector3(0, 0, 0);
    g.playerDirection = new THREE.Vector3(0, 0, 0);
    
    // Set up player controls (movement handled in keyDown/keyUp)
    g.moveForward = g.moveBackward = g.moveLeft = g.moveRight = false;
}
export function setupControls() {
    document.addEventListener('keydown', onKeyDown, false);
    document.addEventListener('keyup', onKeyUp, false);
    document.addEventListener('mousedown', onMouseDown, false);
    document.addEventListener('mouseup', onMouseUp, false);
    document.addEventListener('mousemove', onMouseMove, false);
    
    // Lock pointer when clicking on the game
    const g = window.game;
    g.renderer.domElement.addEventListener('click', function() {
        if (g.gameActive && !g.isPaused) {
            g.renderer.domElement.requestPointerLock();
        }
    });
    
    // Handle pointer lock changes
    document.addEventListener('pointerlockchange', () => {
        if (document.pointerLockElement === renderer.domElement) {
            // Pointer locked, game is active
            document.addEventListener('mousemove', updateCameraRotation, false);
        } else {
            // Pointer unlocked, pause game if it was active
            document.removeEventListener('mousemove', updateCameraRotation, false);
            if (gameActive && !isPaused) {
                pauseGame();
            }
        }
    });
    
    // Setup play button
    document.getElementById('play-button').addEventListener('click', startGame);
}
export function updateCameraRotation(event) {
    if (!gameActive || isPaused) return;
    
    const movementX = event.movementX || 0;
    const movementY = event.movementY || 0;
    
    // Store the current pitch angle
    let pitch = 0;
    
    // Extract current pitch angle from quaternion
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    pitch = Math.asin(forward.y);
    
    // Apply horizontal rotation (yaw) around Y axis
    camera.rotateOnWorldAxis(new THREE.Vector3(0, 1, 0), -movementX * sensitivity);
    
    // Calculate new pitch with limits
    const newPitch = Math.max(-Math.PI/2 + 0.05, Math.min(Math.PI/2 - 0.05, pitch - movementY * sensitivity));
    const pitchDelta = newPitch - pitch;
    
    // Apply vertical rotation (pitch) around local X axis
    camera.rotateX(pitchDelta);
    
    // Update weapon position to follow camera rotation
    updateWeaponPosition();
}
export function startGame() {
    // Hide home screen
    document.getElementById('home-screen').style.display = 'none';
    
    // Show game UI
    document.getElementById('ui-container').style.display = 'block';
    document.getElementById('wave-text').style.display = 'block';
    document.getElementById('crosshair').style.display = 'block';
    
    // Lock pointer
    renderer.domElement.requestPointerLock();
    
    // Set game state to active
    gameActive = true;
    isPaused = false;
    
    // Start first wave
    startNextWave();
    
    // Reset player stats
    playerHealth = 100;
    updateHealthBar();
    updateAmmoText();
}
export function pauseGame() {
    if (!gameActive) return;
    
    isPaused = true;
    document.exitPointerLock();
}
export function resumeGame() {
    if (!gameActive) return;
    
    isPaused = false;
    renderer.domElement.requestPointerLock();
}
export function gameOver() {
    gameActive = false;
    document.getElementById('game-over-screen').style.display = 'flex';
    document.exitPointerLock();
}
export function onKeyDown(event) {
    if (!gameActive) return;
    
    switch (event.code) {
        case 'KeyW':
            moveForward = true;
            break;
        case 'KeyS':
            moveBackward = true;
            break;
        case 'KeyA':
            moveLeft = true;
            break;
        case 'KeyD':
            moveRight = true;
            break;
        case 'ShiftLeft':
        case 'ShiftRight':
            isSprinting = true;
            break;
        case 'KeyC':
            if (!isSliding && !isJumping) {
                startSlide();
            }
            break;
        case 'Space':
            if (!isJumping) {
                jump();
            }
            break;
        case 'KeyR':
            reload();
            break;
        case 'Digit1':
            switchWeapon(WEAPON_RIFLE);
            break;
        case 'Digit2':
            switchWeapon(WEAPON_SHOTGUN);
            break;
        case 'Digit3':
            switchWeapon(WEAPON_ROCKET);
            break;
        case 'Digit4':
            switchWeapon(WEAPON_MELEE);
            break;
        case 'Escape':
            if (isPaused) resumeGame();
            else pauseGame();
            break;
    }
}
export function onKeyUp(event) {
    if (!gameActive) return;
    
    switch (event.code) {
        case 'KeyW':
            moveForward = false;
            break;
        case 'KeyS':
            moveBackward = false;
            break;
        case 'KeyA':
            moveLeft = false;
            break;
        case 'KeyD':
            moveRight = false;
            break;
        case 'ShiftLeft':
        case 'ShiftRight':
            isSprinting = false;
            break;
    }
}
export function onMouseDown(event) {
    if (!gameActive || isPaused) return;
    
    switch (event.button) {
        case 0: // Left mouse button
            if (weapons[currentWeapon].automatic) {
                isShooting = true;
            } else {
                shoot();
            }
            break;
        case 2: // Right mouse button
            isADS = true;
            updateWeaponPosition(); // Update position for ADS
            break;
    }
}
export function onMouseUp(event) {
    if (!gameActive) return;
    
    switch (event.button) {
        case 0: // Left mouse button
            isShooting = false;
            break;
        case 2: // Right mouse button
            isADS = false;
            updateWeaponPosition(); // Update position for normal view
            break;
    }
}
export function onMouseMove(event) {
    // This is only used for shooting raycasting, not camera rotation
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
}
export function startSlide() {
    if (isSliding) return;
    
    isSliding = true;
    slideTimer = 0;
    
    // Variables for slide camera effects
    let cameraForwardTilt = 0;
    let cameraSideTilt = 0;
    
    // Smooth transition to slide height
    const startHeight = camera.position.y;
    const targetHeight = 0.6; // Lower height for more dramatic slide effect
    const transitionTime = 150; // ms, slightly longer for smoother transition
    
    // Apply direction-aware slide boost
    const slideBoost = 3.5; // Increased boost for faster slides
    
    // Use camera's forward direction for sliding
    const slideDirection = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    slideDirection.y = 0; // Keep on ground plane
    slideDirection.normalize();
    
    // Apply direction from movement keys if pressing any
    if (moveForward || moveBackward || moveLeft || moveRight) {
        // Create movement vector from input
        const moveVector = new THREE.Vector3(
            (moveRight ? 1 : 0) - (moveLeft ? 1 : 0),
            0,
            (moveBackward ? 1 : 0) - (moveForward ? 1 : 0)
        );
        
        // Convert to world space
        if (moveVector.length() > 0) {
            moveVector.normalize();
            moveVector.applyQuaternion(camera.quaternion);
            moveVector.y = 0;
            moveVector.normalize();
            
            // Use this direction instead
            slideDirection.copy(moveVector);
            
            // Calculate camera tilt based on direction (side tilt when sliding left/right)
            if (moveLeft) cameraSideTilt = 0.1;
            else if (moveRight) cameraSideTilt = -0.1;
        }
    }
    
    // Forward camera tilt for sliding
    cameraForwardTilt = 0.15;
    
    // Initial camera and position when starting slide
    const initialCameraQuaternion = camera.quaternion.clone();
    
    // Create smooth transition for camera height and tilt
    const startTime = Date.now();
    const slideTransition = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / transitionTime, 1);
        
        // Smooth easing function (ease-out)
        const easeProgress = 1 - Math.pow(1 - progress, 3); // Cubic ease-out for smoother feel
        
        // Transition height
        camera.position.y = startHeight - (startHeight - targetHeight) * easeProgress;
        
        // Apply camera tilt effects smoothly
        if (progress < 1) {
            // Create tilt quaternion
            const tiltQuaternion = new THREE.Quaternion().setFromEuler(
                new THREE.Euler(
                    cameraForwardTilt * easeProgress, // Forward tilt
                    0,
                    cameraSideTilt * easeProgress // Side tilt
                )
            );
            
            // Apply to camera
            camera.quaternion.copy(initialCameraQuaternion.clone().multiply(tiltQuaternion));
        }
        
        if (progress >= 1) {
            clearInterval(slideTransition);
        }
    }, 16);
    
    // Apply velocity in slide direction
    playerVelocity.x = slideDirection.x * slideBoost;
    playerVelocity.z = slideDirection.z * slideBoost;
}
export function endSlide() { 
  if (!isSliding) return;

  // Store current position and initial slide roll value
  const startHeight = camera.position.y;
  const initialRollValue = getQuaternionRoll(camera.quaternion);
  const targetHeight = 1.7; // Normal player height
  const transitionTime = 180; // ms

  // Create smooth transition to standing
  const startTime = Date.now();
  const endSlideTransition = setInterval(() => {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / transitionTime, 1);

    // Smooth easing function (ease-out quad)
    const easeProgress = 1 - Math.pow(1 - progress, 2);

    // Transition height
    camera.position.y = startHeight + (targetHeight - startHeight) * easeProgress;

    // --- Only remove the roll component while preserving current look direction ---
    // Get current orientation
    const currentEuler = new THREE.Euler().setFromQuaternion(camera.quaternion, 'YXZ');
    
    // Calculate how much roll to remove based on progress
    const remainingRoll = initialRollValue * (1 - easeProgress);
    
    // Apply the new roll value while keeping current pitch and yaw
    currentEuler.z = remainingRoll;
    
    // Update camera quaternion with the new orientation
    camera.quaternion.setFromEuler(currentEuler);
    // --- End rotation handling ---

    if (progress >= 1) {
      clearInterval(endSlideTransition);
      // Ensure final state is set exactly
      camera.position.y = targetHeight;
      
      // Force zero roll but keep current pitch and yaw
      const finalEuler = new THREE.Euler().setFromQuaternion(camera.quaternion, 'YXZ');
      finalEuler.z = 0;
      camera.quaternion.setFromEuler(finalEuler);
      
      isSliding = false;
    }
  }, 16); // Roughly 60fps interval
}
export function getQuaternionRoll(quaternion) {
  // Convert quaternion to Euler angles using YXZ order (typical for FPS cameras)
  const euler = new THREE.Euler().setFromQuaternion(quaternion, 'YXZ');
  return euler.z;
}
export function jump() {
    if (isJumping) return;
    
    isJumping = true;
    jumpForce = 0.15;
}

export function checkPlayerCollision(pos) {
    const radius = 0.4; // horizontal collision radius
    const playerHeight = 1.7; // eye height above ground
    for (const obj of scene.children) {
        if (obj.geometry && obj.geometry.type === 'BoxGeometry') {
            const box = new THREE.Box3().setFromObject(obj);
            // Only check collision if vertical ranges overlap
            const playerMinY = pos.y - playerHeight;
            const playerMaxY = pos.y;
            if (box.min.y > playerMaxY || box.max.y < playerMinY) continue;
            // Check overlap in XZ plane only
            if (pos.x + radius > box.min.x && pos.x - radius < box.max.x &&
                pos.z + radius > box.min.z && pos.z - radius < box.max.z) {
                return true;
            }
        }
    }
    return false;
}
export function updatePlayer(deltaTime) {
    // Reset player direction
    playerDirection.x = 0;
    playerDirection.z = 0;
    
    // Calculate forward/backward/left/right direction
    if (moveForward) {
        playerDirection.z = -1;
    } else if (moveBackward) {
        playerDirection.z = 1;
    }
    
    if (moveLeft) {
        playerDirection.x = -1;
    } else if (moveRight) {
        playerDirection.x = 1;
    }
    
    // Normalize direction vector to prevent faster diagonal movement
    if (playerDirection.length() > 0) {
        playerDirection.normalize();
    }
    
    // Create a movement vector that's relative to where we're looking
    const moveVector = new THREE.Vector3(playerDirection.x, 0, playerDirection.z);
    moveVector.applyQuaternion(camera.quaternion);
    moveVector.y = 0; // Keep movement on the ground plane
    
    // Set movement speed based on player state
    let speed = 5.0; // Base speed
    
    if (isSliding) {
        // Update slide timer
        slideTimer += deltaTime;
        
        // End slide after duration
        if (slideTimer >= 0.7 || isJumping) { // Extended slide duration
            endSlide();
            jump();
        } else {
            // Improved slide curve with better feel - less abrupt deceleration
            const slideProgress = slideTimer / 0.7;
            speed = 10.0 * Math.pow(1 - slideProgress, 1.5); // Smoother deceleration curve
        }
    } else if (isSprinting) {
        speed = 8.0; // Sprint speed
    }
    
    // Apply movement to velocity
    playerVelocity.x = moveVector.x * speed * deltaTime;
    playerVelocity.z = moveVector.z * speed * deltaTime;
    
    // Handle jumping and gravity
    if (isJumping) {
        // Apply jump force and gravity
        jumpForce -= 0.5 * deltaTime; // Gravity
        playerVelocity.y = jumpForce;
        
        // Check ground collision
        if (camera.position.y + playerVelocity.y <= 1.7) {
            // Land on ground
            camera.position.y = 1.7;
            playerVelocity.y = 0;
            jumpForce = 0;
            isJumping = false;
        }
    }
    
    // --- COLLISION HANDLING: resolve axes separately ---
    const currPos = camera.position.clone();
    const dx = playerVelocity.x;
    const dz = playerVelocity.z;
    // X axis
    const xPos = currPos.clone().add(new THREE.Vector3(dx, 0, 0));
    if (!checkPlayerCollision(xPos)) {
        camera.position.x = xPos.x;
    }
    // Z axis
    const zPos = currPos.clone().add(new THREE.Vector3(0, 0, dz));
    if (!checkPlayerCollision(zPos)) {
        camera.position.z = zPos.z;
    }

    // Y axis (jumping)
    camera.position.y += playerVelocity.y;
    
    // Simple boundary check
    camera.position.x = Math.max(-49, Math.min(49, camera.position.x));
    camera.position.z = Math.max(-49, Math.min(49, camera.position.z));
    
    // Force y position if not jumping (keep player on ground)
    if (!isJumping) {
        camera.position.y = isSliding ? 0.8 : 1.7;
    }
    
    // Reset velocity for next frame
    playerVelocity.set(0, 0, 0);
}

export function damagePlayer(amount) {
    // Reduce health
    playerHealth = Math.max(0, playerHealth - amount);
    
    // Update health bar
    updateHealthBar();
    
    // Screen damage effect
    damageFlashTime = 0.3;
    
    // Reset health regen timer
    lastHealthRegen = Date.now();
    
    // Check for death
    if (playerHealth <= 0) {
        gameOver();
    }
}

export function updateHealthRegen(deltaTime) {
    const now = Date.now();
    if (playerHealth < 100 && now - lastHealthRegen >= healthRegenDelay) {
        playerHealth = Math.min(100, playerHealth + healthRegenRate * deltaTime);
        updateHealthBar();
    }
}