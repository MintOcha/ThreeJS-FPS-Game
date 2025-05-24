// Player module for movement, controls, health, and player state
import * as THREE from 'three';
// ui.js functions will be refactored to use window.game
import { updateHealthBar, updateAmmoText } from 'ui'; 
// audio.js sounds are on window.game.sounds
import { getQuaternionRoll } from 'utils';

// Using the global game object for scene and camera instead of imports

// All player-related functions use the global game object
export function createPlayer() {
    const g = window.game;
    // Player is just a camera with collision detection
    g.player = g.camera; // g.camera should already be initialized in main.js
    
    // Initialize player movement variables
    g.playerVelocity = new THREE.Vector3(0, 0, 0);
    g.playerDirection = new THREE.Vector3(0, 0, 0);
    
    // Set up player controls (movement handled in keyDown/keyUp)
    g.moveForward = false;
    g.moveBackward = false;
    g.moveLeft = false;
    g.moveRight = false;
}
export function setupControls() {
    const g = window.game;
    document.addEventListener('keydown', onKeyDown, false);
    document.addEventListener('keyup', onKeyUp, false);
    document.addEventListener('mousedown', onMouseDown, false);
    document.addEventListener('mouseup', onMouseUp, false);
    document.addEventListener('mousemove', onMouseMove, false); // For mouse data, not camera rotation here
    
    // Lock pointer when clicking on the game
    if (g.renderer && g.renderer.domElement) {
        g.renderer.domElement.addEventListener('click', function() {
            if (g.gameActive && !g.isPaused) {
                g.renderer.domElement.requestPointerLock();
            }
        });
    }
    
    // Handle pointer lock changes
    document.addEventListener('pointerlockchange', () => {
        if (g.renderer && document.pointerLockElement === g.renderer.domElement) {
            // Pointer locked, game is active
            document.addEventListener('mousemove', updateCameraRotation, false); // Add camera rotation listener
        } else {
            // Pointer unlocked, pause game if it was active
            document.removeEventListener('mousemove', updateCameraRotation, false); // Remove camera rotation listener
            if (g.gameActive && !g.isPaused) {
                pauseGame(); // pauseGame will use window.game
            }
        }
    });
    
    // Setup play button
    const playButton = document.getElementById('play-button');
    if (playButton) {
        playButton.addEventListener('click', startGame); // startGame will use window.game
    }
}
export function updateCameraRotation(event) {
    const g = window.game;
    if (!g.gameActive || g.isPaused) return;
    
    const movementX = event.movementX || 0;
    const movementY = event.movementY || 0;
    
    // Store the current pitch angle
    let pitch = 0;
    
    // Extract current pitch angle from quaternion
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(g.camera.quaternion);
    pitch = Math.asin(forward.y);
    
    // Apply horizontal rotation (yaw) around Y axis
    g.camera.rotateOnWorldAxis(new THREE.Vector3(0, 1, 0), -movementX * g.sensitivity);
    
    // Calculate new pitch with limits
    const newPitch = Math.max(-Math.PI/2 + 0.05, Math.min(Math.PI/2 - 0.05, pitch - movementY * g.sensitivity));
    const pitchDelta = newPitch - pitch;
    
    // Apply vertical rotation (pitch) around local X axis
    g.camera.rotateX(pitchDelta);
    
    // Update weapon position to follow camera rotation
    if (window.game.updateWeaponPosition) window.game.updateWeaponPosition(); // Will be on window.game
}
export function startGame() {
    const g = window.game;
    // Hide home screen
    const homeScreen = document.getElementById('home-screen');
    if (homeScreen) homeScreen.style.display = 'none';
    
    // Show game UI
    if (g.uiContainer) g.uiContainer.style.display = 'block';
    if (g.waveText) g.waveText.style.display = 'block'; // waveText is on g
    if (g.crosshair) g.crosshair.style.display = 'block'; // crosshair is on g
    
    // Lock pointer
    if (g.renderer && g.renderer.domElement) {
        g.renderer.domElement.requestPointerLock();
    }
    
    // Set game state to active
    g.gameActive = true;
    g.isPaused = false;
    
    // Start first wave
    if (window.game.startNextWave) window.game.startNextWave(); // Will be on window.game
    
    // Reset player stats
    g.playerHealth = 100;
    updateHealthBar(); // ui.js function, will use window.game
    updateAmmoText();  // ui.js function, will use window.game
}
export function pauseGame() {
    const g = window.game;
    if (!g.gameActive) return;
    
    g.isPaused = true;
    document.exitPointerLock();
}
export function resumeGame() {
    const g = window.game;
    if (!g.gameActive) return;
    
    g.isPaused = false;
    if (g.renderer && g.renderer.domElement) {
        g.renderer.domElement.requestPointerLock();
    }
}
export function gameOver() {
    const g = window.game;
    g.gameActive = false;
    const gameOverScreen = document.getElementById('game-over-screen');
    if (gameOverScreen) gameOverScreen.style.display = 'flex';
    document.exitPointerLock();
}
export function onKeyDown(event) {
    const g = window.game;
    if (!g.gameActive) return;
    
    switch (event.code) {
        case 'KeyW':
            g.moveForward = true;
            break;
        case 'KeyS':
            g.moveBackward = true;
            break;
        case 'KeyA':
            g.moveLeft = true;
            break;
        case 'KeyD':
            g.moveRight = true;
            break;
        case 'ShiftLeft':
        case 'ShiftRight':
            g.isSprinting = true;
            break;
        case 'KeyC':
            if (!g.isSliding && !g.isJumping) {
                startSlide(); // Uses window.game
            }
            break;
        case 'Space':
            if (!g.isJumping) {
                jump(); // Uses window.game
            }
            break;
        case 'KeyR':
            if (window.game.reload) window.game.reload(); // Will be on window.game
            break;
        case 'Digit1':
            if (window.game.switchWeapon) window.game.switchWeapon(g.WEAPON_RIFLE);
            break;
        case 'Digit2':
            if (window.game.switchWeapon) window.game.switchWeapon(g.WEAPON_SHOTGUN);
            break;
        case 'Digit3':
            if (window.game.switchWeapon) window.game.switchWeapon(g.WEAPON_ROCKET);
            break;
        case 'Digit4':
            if (window.game.switchWeapon) window.game.switchWeapon(g.WEAPON_MELEE);
            break;
        case 'Escape':
            if (g.isPaused) resumeGame(); // Uses window.game
            else pauseGame(); // Uses window.game
            break;
    }
}
export function onKeyUp(event) {
    const g = window.game;
    if (!g.gameActive) return;
    
    switch (event.code) {
        case 'KeyW':
            g.moveForward = false;
            break;
        case 'KeyS':
            g.moveBackward = false;
            break;
        case 'KeyA':
            g.moveLeft = false;
            break;
        case 'KeyD':
            g.moveRight = false;
            break;
        case 'ShiftLeft':
        case 'ShiftRight':
            g.isSprinting = false;
            break;
    }
}
export function onMouseDown(event) {
    const g = window.game;
    if (!g.gameActive || g.isPaused) return;
    
    switch (event.button) {
        case 0: // Left mouse button
            if (g.weapons[g.currentWeapon] && g.weapons[g.currentWeapon].automatic) {
                g.isShooting = true;
            } else {
                if (window.game.shoot) window.game.shoot(); // Will be on window.game
            }
            break;
        case 2: // Right mouse button
            g.isADS = true;
            if (window.game.updateWeaponPosition) window.game.updateWeaponPosition(); // Update position for ADS
            break;
    }
}
export function onMouseUp(event) {
    const g = window.game;
    if (!g.gameActive) return; // isPaused check not strictly needed as isShooting is false anyway
    
    switch (event.button) {
        case 0: // Left mouse button
            g.isShooting = false;
            break;
        case 2: // Right mouse button
            g.isADS = false;
            if (window.game.updateWeaponPosition) window.game.updateWeaponPosition(); // Update position for normal view
            break;
    }
}
export function onMouseMove(event) {
    const g = window.game;
    // This is only used for shooting raycasting, not camera rotation by default
    if (g.mouse) { // Ensure g.mouse is initialized
        g.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        g.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    }
}
export function startSlide() {
    const g = window.game;
    if (g.isSliding) return;
    
    g.isSliding = true;
    g.slideTimer = 0;
    
    // Variables for slide camera effects
    let cameraForwardTilt = 0;
    let cameraSideTilt = 0;
    
    // Smooth transition to slide height
    const startHeight = g.camera.position.y;
    const targetHeight = 0.6; // Lower height for more dramatic slide effect
    const transitionTime = 150; // ms, slightly longer for smoother transition
    
    // Apply direction-aware slide boost
    const slideBoost = 3.5; // Increased boost for faster slides
    
    // Use camera's forward direction for sliding
    const slideDirection = new THREE.Vector3(0, 0, -1).applyQuaternion(g.camera.quaternion);
    slideDirection.y = 0; // Keep on ground plane
    slideDirection.normalize();
    
    // Apply direction from movement keys if pressing any
    if (g.moveForward || g.moveBackward || g.moveLeft || g.moveRight) {
        // Create movement vector from input
        const moveVector = new THREE.Vector3(
            (g.moveRight ? 1 : 0) - (g.moveLeft ? 1 : 0),
            0,
            (g.moveBackward ? 1 : 0) - (g.moveForward ? 1 : 0)
        );
        
        // Convert to world space
        if (moveVector.length() > 0) {
            moveVector.normalize();
            moveVector.applyQuaternion(g.camera.quaternion);
            moveVector.y = 0;
            moveVector.normalize();
            
            // Use this direction instead
            slideDirection.copy(moveVector);
            
            // Calculate camera tilt based on direction (side tilt when sliding left/right)
            if (g.moveLeft) cameraSideTilt = 0.1;
            else if (g.moveRight) cameraSideTilt = -0.1;
        }
    }
    
    // Forward camera tilt for sliding
    cameraForwardTilt = 0.15;
    
    // Initial camera and position when starting slide
    const initialCameraQuaternion = g.camera.quaternion.clone();
    
    // Create smooth transition for camera height and tilt
    const startTime = Date.now();
    const slideTransition = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / transitionTime, 1);
        
        // Smooth easing function (ease-out)
        const easeProgress = 1 - Math.pow(1 - progress, 3); // Cubic ease-out for smoother feel
        
        // Transition height
        g.camera.position.y = startHeight - (startHeight - targetHeight) * easeProgress;
        
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
            g.camera.quaternion.copy(initialCameraQuaternion.clone().multiply(tiltQuaternion));
        }
        
        if (progress >= 1) {
            clearInterval(slideTransition);
        }
    }, 16);
    
    // Apply velocity in slide direction
    g.playerVelocity.x = slideDirection.x * slideBoost;
    g.playerVelocity.z = slideDirection.z * slideBoost;
}
export function endSlide() { 
  const g = window.game;
  if (!g.isSliding) return;

  // Store current position and initial slide roll value
  const startHeight = g.camera.position.y;
  const initialRollValue = getQuaternionRoll(g.camera.quaternion); 
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
    g.camera.position.y = startHeight + (targetHeight - startHeight) * easeProgress;

    // --- Only remove the roll component while preserving current look direction ---
    // Get current orientation
    const currentEuler = new THREE.Euler().setFromQuaternion(g.camera.quaternion, 'YXZ');
    
    // Calculate how much roll to remove based on progress
    const remainingRoll = initialRollValue * (1 - easeProgress);
    
    // Apply the new roll value while keeping current pitch and yaw
    currentEuler.z = remainingRoll;
    
    // Update camera quaternion with the new orientation
    g.camera.quaternion.setFromEuler(currentEuler);
    // --- End rotation handling ---

    if (progress >= 1) {
      clearInterval(endSlideTransition);
      // Ensure final state is set exactly
      g.camera.position.y = targetHeight;
      
      // Force zero roll but keep current pitch and yaw
      const finalEuler = new THREE.Euler().setFromQuaternion(g.camera.quaternion, 'YXZ');
      finalEuler.z = 0;
      g.camera.quaternion.setFromEuler(finalEuler);
      
      g.isSliding = false;
    }
  }, 16); // Roughly 60fps interval
}
export function jump() {
    const g = window.game;
    if (g.isJumping) return;
    
    g.isJumping = true;
    g.jumpForce = 0.15;
}

export function checkPlayerCollision(pos) { // pos is a parameter
    const g = window.game;
    const radius = 0.4; // horizontal collision radius
    const playerHeight = 1.7; // eye height above ground
    for (const obj of g.scene.children) { // Use g.scene
        if (obj.geometry && obj.geometry.type === 'BoxGeometry') {
            const box = new THREE.Box3().setFromObject(obj);
            // Only check collision if vertical ranges overlap
            const playerMinY = pos.y - playerHeight; // pos is parameter
            const playerMaxY = pos.y; // pos is parameter
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
export function updatePlayer() { // Removed deltaTime parameter
    const g = window.game;
    // Reset player direction
    g.playerDirection.x = 0;
    g.playerDirection.z = 0;
    
    // Calculate forward/backward/left/right direction
    if (g.moveForward) {
        g.playerDirection.z = -1;
    } else if (g.moveBackward) {
        g.playerDirection.z = 1;
    }
    
    if (g.moveLeft) {
        g.playerDirection.x = -1;
    } else if (g.moveRight) {
        g.playerDirection.x = 1;
    }
    
    // Normalize direction vector to prevent faster diagonal movement
    if (g.playerDirection.length() > 0) {
        g.playerDirection.normalize();
    }
    
    // Create a movement vector that's relative to where we're looking
    const moveVector = new THREE.Vector3(g.playerDirection.x, 0, g.playerDirection.z);
    moveVector.applyQuaternion(g.camera.quaternion);
    moveVector.y = 0; // Keep movement on the ground plane
    
    // Set movement speed based on player state
    let speed = 5.0; // Base speed
    
    if (g.isSliding) {
        // Update slide timer
        g.slideTimer += g.deltaTime; // Use g.deltaTime
        
        // End slide after duration
        if (g.slideTimer >= 0.7 || g.isJumping) { // Extended slide duration
            endSlide(); // Uses window.game
            jump();     // Uses window.game
        } else {
            // Improved slide curve with better feel - less abrupt deceleration
            const slideProgress = g.slideTimer / 0.7;
            speed = 10.0 * Math.pow(1 - slideProgress, 1.5); // Smoother deceleration curve
        }
    } else if (g.isSprinting) {
        speed = 8.0; // Sprint speed
    }
    
    // Apply movement to velocity
    g.playerVelocity.x = moveVector.x * speed * g.deltaTime; // Use g.deltaTime
    g.playerVelocity.z = moveVector.z * speed * g.deltaTime; // Use g.deltaTime
    
    // Handle jumping and gravity
    if (g.isJumping) {
        // Apply jump force and gravity
        g.jumpForce -= 0.5 * g.deltaTime; // Gravity, use g.deltaTime
        g.playerVelocity.y = g.jumpForce;
        
        // Check ground collision
        if (g.camera.position.y + g.playerVelocity.y <= 1.7) {
            // Land on ground
            g.camera.position.y = 1.7;
            g.playerVelocity.y = 0;
            g.jumpForce = 0;
            g.isJumping = false;
        }
    }
    
    // --- COLLISION HANDLING: resolve axes separately ---
    const currPos = g.camera.position.clone();
    const dx = g.playerVelocity.x;
    const dz = g.playerVelocity.z;
    // X axis
    const xPos = currPos.clone().add(new THREE.Vector3(dx, 0, 0));
    if (!checkPlayerCollision(xPos)) { // checkPlayerCollision uses window.game
        g.camera.position.x = xPos.x;
    }
    // Z axis
    const zPos = currPos.clone().add(new THREE.Vector3(0, 0, dz));
    if (!checkPlayerCollision(zPos)) { // checkPlayerCollision uses window.game
        g.camera.position.z = zPos.z;
    }

    // Y axis (jumping)
    g.camera.position.y += g.playerVelocity.y;
    
    // Simple boundary check
    g.camera.position.x = Math.max(-49, Math.min(49, g.camera.position.x));
    g.camera.position.z = Math.max(-49, Math.min(49, g.camera.position.z));
    
    // Force y position if not jumping (keep player on ground)
    if (!g.isJumping) {
        g.camera.position.y = g.isSliding ? 0.8 : 1.7;
    }
    
    // Reset velocity for next frame
    g.playerVelocity.set(0, 0, 0);
}

export function damagePlayer(amount) { // amount is a parameter
    const g = window.game;
    // Reduce health
    g.playerHealth = Math.max(0, g.playerHealth - amount);
    
    // Update health bar
    updateHealthBar(); // ui.js function, will use window.game
    
    // Screen damage effect
    g.damageFlashTime = 0.3;
    
    // Reset health regen timer
    g.lastHealthRegen = Date.now();
    
    // Check for death
    if (g.playerHealth <= 0) {
        gameOver(); // Uses window.game
    }
}

export function updateHealthRegen() { // Removed deltaTime parameter
    const g = window.game;
    const now = Date.now();
    if (g.playerHealth < 100 && now - g.lastHealthRegen >= g.healthRegenDelay) {
        g.playerHealth = Math.min(100, g.playerHealth + g.healthRegenRate * g.deltaTime); // Use g.deltaTime
        updateHealthBar(); // ui.js function, will use window.game
    }
}// Player module for movement, controls, health, and player state
import * as THREE from 'three';
// ui.js functions will be refactored to use window.game
import { updateHealthBar, updateAmmoText } from 'ui'; 
// audio.js sounds are on window.game.sounds
import { getQuaternionRoll } from 'utils';

// Using the global game object for scene and camera instead of imports

// All player-related functions use the global game object
export function createPlayer() {
    const g = window.game;
    // Player is just a camera with collision detection
    g.player = g.camera; // g.camera should already be initialized in main.js
    
    // Initialize player movement variables
    g.playerVelocity = new THREE.Vector3(0, 0, 0);
    g.playerDirection = new THREE.Vector3(0, 0, 0);
    
    // Set up player controls (movement handled in keyDown/keyUp)
    g.moveForward = false;
    g.moveBackward = false;
    g.moveLeft = false;
    g.moveRight = false;
}
export function setupControls() {
    const g = window.game;
    document.addEventListener('keydown', onKeyDown, false);
    document.addEventListener('keyup', onKeyUp, false);
    document.addEventListener('mousedown', onMouseDown, false);
    document.addEventListener('mouseup', onMouseUp, false);
    document.addEventListener('mousemove', onMouseMove, false); // For mouse data, not camera rotation here
    
    // Lock pointer when clicking on the game
    if (g.renderer && g.renderer.domElement) {
        g.renderer.domElement.addEventListener('click', function() {
            if (g.gameActive && !g.isPaused) {
                g.renderer.domElement.requestPointerLock();
            }
        });
    }
    
    // Handle pointer lock changes
    document.addEventListener('pointerlockchange', () => {
        if (g.renderer && document.pointerLockElement === g.renderer.domElement) {
            // Pointer locked, game is active
            document.addEventListener('mousemove', updateCameraRotation, false); // Add camera rotation listener
        } else {
            // Pointer unlocked, pause game if it was active
            document.removeEventListener('mousemove', updateCameraRotation, false); // Remove camera rotation listener
            if (g.gameActive && !g.isPaused) {
                pauseGame(); // pauseGame will use window.game
            }
        }
    });
    
    // Setup play button
    const playButton = document.getElementById('play-button');
    if (playButton) {
        playButton.addEventListener('click', startGame); // startGame will use window.game
    }
}
export function updateCameraRotation(event) {
    const g = window.game;
    if (!g.gameActive || g.isPaused) return;
    
    const movementX = event.movementX || 0;
    const movementY = event.movementY || 0;
    
    // Store the current pitch angle
    let pitch = 0;
    
    // Extract current pitch angle from quaternion
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(g.camera.quaternion);
    pitch = Math.asin(forward.y);
    
    // Apply horizontal rotation (yaw) around Y axis
    g.camera.rotateOnWorldAxis(new THREE.Vector3(0, 1, 0), -movementX * g.sensitivity);
    
    // Calculate new pitch with limits
    const newPitch = Math.max(-Math.PI/2 + 0.05, Math.min(Math.PI/2 - 0.05, pitch - movementY * g.sensitivity));
    const pitchDelta = newPitch - pitch;
    
    // Apply vertical rotation (pitch) around local X axis
    g.camera.rotateX(pitchDelta);
    
    // Update weapon position to follow camera rotation
    if (window.game.updateWeaponPosition) window.game.updateWeaponPosition(); // Will be on window.game
}
export function startGame() {
    const g = window.game;
    // Hide home screen
    const homeScreen = document.getElementById('home-screen');
    if (homeScreen) homeScreen.style.display = 'none';
    
    // Show game UI
    if (g.uiContainer) g.uiContainer.style.display = 'block';
    if (g.waveText) g.waveText.style.display = 'block'; // waveText is on g
    if (g.crosshair) g.crosshair.style.display = 'block'; // crosshair is on g
    
    // Lock pointer
    if (g.renderer && g.renderer.domElement) {
        g.renderer.domElement.requestPointerLock();
    }
    
    // Set game state to active
    g.gameActive = true;
    g.isPaused = false;
    
    // Start first wave
    if (window.game.startNextWave) window.game.startNextWave(); // Will be on window.game
    
    // Reset player stats
    g.playerHealth = 100;
    updateHealthBar(); // ui.js function, will use window.game
    updateAmmoText();  // ui.js function, will use window.game
}
export function pauseGame() {
    const g = window.game;
    if (!g.gameActive) return;
    
    g.isPaused = true;
    document.exitPointerLock();
}
export function resumeGame() {
    const g = window.game;
    if (!g.gameActive) return;
    
    g.isPaused = false;
    if (g.renderer && g.renderer.domElement) {
        g.renderer.domElement.requestPointerLock();
    }
}
export function gameOver() {
    const g = window.game;
    g.gameActive = false;
    const gameOverScreen = document.getElementById('game-over-screen');
    if (gameOverScreen) gameOverScreen.style.display = 'flex';
    document.exitPointerLock();
}
export function onKeyDown(event) {
    const g = window.game;
    if (!g.gameActive) return;
    
    switch (event.code) {
        case 'KeyW':
            g.moveForward = true;
            break;
        case 'KeyS':
            g.moveBackward = true;
            break;
        case 'KeyA':
            g.moveLeft = true;
            break;
        case 'KeyD':
            g.moveRight = true;
            break;
        case 'ShiftLeft':
        case 'ShiftRight':
            g.isSprinting = true;
            break;
        case 'KeyC':
            if (!g.isSliding && !g.isJumping) {
                startSlide(); // Uses window.game
            }
            break;
        case 'Space':
            if (!g.isJumping) {
                jump(); // Uses window.game
            }
            break;
        case 'KeyR':
            if (window.game.reload) window.game.reload(); // Will be on window.game
            break;
        case 'Digit1':
            if (window.game.switchWeapon) window.game.switchWeapon(g.WEAPON_RIFLE);
            break;
        case 'Digit2':
            if (window.game.switchWeapon) window.game.switchWeapon(g.WEAPON_SHOTGUN);
            break;
        case 'Digit3':
            if (window.game.switchWeapon) window.game.switchWeapon(g.WEAPON_ROCKET);
            break;
        case 'Digit4':
            if (window.game.switchWeapon) window.game.switchWeapon(g.WEAPON_MELEE);
            break;
        case 'Escape':
            if (g.isPaused) resumeGame(); // Uses window.game
            else pauseGame(); // Uses window.game
            break;
    }
}
export function onKeyUp(event) {
    const g = window.game;
    if (!g.gameActive) return;
    
    switch (event.code) {
        case 'KeyW':
            g.moveForward = false;
            break;
        case 'KeyS':
            g.moveBackward = false;
            break;
        case 'KeyA':
            g.moveLeft = false;
            break;
        case 'KeyD':
            g.moveRight = false;
            break;
        case 'ShiftLeft':
        case 'ShiftRight':
            g.isSprinting = false;
            break;
    }
}
export function onMouseDown(event) {
    const g = window.game;
    if (!g.gameActive || g.isPaused) return;
    
    switch (event.button) {
        case 0: // Left mouse button
            if (g.weapons[g.currentWeapon] && g.weapons[g.currentWeapon].automatic) {
                g.isShooting = true;
            } else {
                if (window.game.shoot) window.game.shoot(); // Will be on window.game
            }
            break;
        case 2: // Right mouse button
            g.isADS = true;
            if (window.game.updateWeaponPosition) window.game.updateWeaponPosition(); // Update position for ADS
            break;
    }
}
export function onMouseUp(event) {
    const g = window.game;
    if (!g.gameActive) return; // isPaused check not strictly needed as isShooting is false anyway
    
    switch (event.button) {
        case 0: // Left mouse button
            g.isShooting = false;
            break;
        case 2: // Right mouse button
            g.isADS = false;
            if (window.game.updateWeaponPosition) window.game.updateWeaponPosition(); // Update position for normal view
            break;
    }
}
export function onMouseMove(event) {
    const g = window.game;
    // This is only used for shooting raycasting, not camera rotation by default
    if (g.mouse) { // Ensure g.mouse is initialized
        g.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        g.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    }
}
export function startSlide() {
    const g = window.game;
    if (g.isSliding) return;
    
    g.isSliding = true;
    g.slideTimer = 0;
    
    // Variables for slide camera effects
    let cameraForwardTilt = 0;
    let cameraSideTilt = 0;
    
    // Smooth transition to slide height
    const startHeight = g.camera.position.y;
    const targetHeight = 0.6; // Lower height for more dramatic slide effect
    const transitionTime = 150; // ms, slightly longer for smoother transition
    
    // Apply direction-aware slide boost
    const slideBoost = 3.5; // Increased boost for faster slides
    
    // Use camera's forward direction for sliding
    const slideDirection = new THREE.Vector3(0, 0, -1).applyQuaternion(g.camera.quaternion);
    slideDirection.y = 0; // Keep on ground plane
    slideDirection.normalize();
    
    // Apply direction from movement keys if pressing any
    if (g.moveForward || g.moveBackward || g.moveLeft || g.moveRight) {
        // Create movement vector from input
        const moveVector = new THREE.Vector3(
            (g.moveRight ? 1 : 0) - (g.moveLeft ? 1 : 0),
            0,
            (g.moveBackward ? 1 : 0) - (g.moveForward ? 1 : 0)
        );
        
        // Convert to world space
        if (moveVector.length() > 0) {
            moveVector.normalize();
            moveVector.applyQuaternion(g.camera.quaternion);
            moveVector.y = 0;
            moveVector.normalize();
            
            // Use this direction instead
            slideDirection.copy(moveVector);
            
            // Calculate camera tilt based on direction (side tilt when sliding left/right)
            if (g.moveLeft) cameraSideTilt = 0.1;
            else if (g.moveRight) cameraSideTilt = -0.1;
        }
    }
    
    // Forward camera tilt for sliding
    cameraForwardTilt = 0.15;
    
    // Initial camera and position when starting slide
    const initialCameraQuaternion = g.camera.quaternion.clone();
    
    // Create smooth transition for camera height and tilt
    const startTime = Date.now();
    const slideTransition = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / transitionTime, 1);
        
        // Smooth easing function (ease-out)
        const easeProgress = 1 - Math.pow(1 - progress, 3); // Cubic ease-out for smoother feel
        
        // Transition height
        g.camera.position.y = startHeight - (startHeight - targetHeight) * easeProgress;
        
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
            g.camera.quaternion.copy(initialCameraQuaternion.clone().multiply(tiltQuaternion));
        }
        
        if (progress >= 1) {
            clearInterval(slideTransition);
        }
    }, 16);
    
    // Apply velocity in slide direction
    g.playerVelocity.x = slideDirection.x * slideBoost;
    g.playerVelocity.z = slideDirection.z * slideBoost;
}
export function endSlide() { 
  const g = window.game;
  if (!g.isSliding) return;

  // Store current position and initial slide roll value
  const startHeight = g.camera.position.y;
  const initialRollValue = getQuaternionRoll(g.camera.quaternion); 
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
    g.camera.position.y = startHeight + (targetHeight - startHeight) * easeProgress;

    // --- Only remove the roll component while preserving current look direction ---
    // Get current orientation
    const currentEuler = new THREE.Euler().setFromQuaternion(g.camera.quaternion, 'YXZ');
    
    // Calculate how much roll to remove based on progress
    const remainingRoll = initialRollValue * (1 - easeProgress);
    
    // Apply the new roll value while keeping current pitch and yaw
    currentEuler.z = remainingRoll;
    
    // Update camera quaternion with the new orientation
    g.camera.quaternion.setFromEuler(currentEuler);
    // --- End rotation handling ---

    if (progress >= 1) {
      clearInterval(endSlideTransition);
      // Ensure final state is set exactly
      g.camera.position.y = targetHeight;
      
      // Force zero roll but keep current pitch and yaw
      const finalEuler = new THREE.Euler().setFromQuaternion(g.camera.quaternion, 'YXZ');
      finalEuler.z = 0;
      g.camera.quaternion.setFromEuler(finalEuler);
      
      g.isSliding = false;
    }
  }, 16); // Roughly 60fps interval
}
export function jump() {
    const g = window.game;
    if (g.isJumping) return;
    
    g.isJumping = true;
    g.jumpForce = 0.15;
}

export function checkPlayerCollision(pos) { // pos is a parameter
    const g = window.game;
    const radius = 0.4; // horizontal collision radius
    const playerHeight = 1.7; // eye height above ground
    for (const obj of g.scene.children) { // Use g.scene
        if (obj.geometry && obj.geometry.type === 'BoxGeometry') {
            const box = new THREE.Box3().setFromObject(obj);
            // Only check collision if vertical ranges overlap
            const playerMinY = pos.y - playerHeight; // pos is parameter
            const playerMaxY = pos.y; // pos is parameter
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
export function updatePlayer() { // Removed deltaTime parameter
    const g = window.game;
    // Reset player direction
    g.playerDirection.x = 0;
    g.playerDirection.z = 0;
    
    // Calculate forward/backward/left/right direction
    if (g.moveForward) {
        g.playerDirection.z = -1;
    } else if (g.moveBackward) {
        g.playerDirection.z = 1;
    }
    
    if (g.moveLeft) {
        g.playerDirection.x = -1;
    } else if (g.moveRight) {
        g.playerDirection.x = 1;
    }
    
    // Normalize direction vector to prevent faster diagonal movement
    if (g.playerDirection.length() > 0) {
        g.playerDirection.normalize();
    }
    
    // Create a movement vector that's relative to where we're looking
    const moveVector = new THREE.Vector3(g.playerDirection.x, 0, g.playerDirection.z);
    moveVector.applyQuaternion(g.camera.quaternion);
    moveVector.y = 0; // Keep movement on the ground plane
    
    // Set movement speed based on player state
    let speed = 5.0; // Base speed
    
    if (g.isSliding) {
        // Update slide timer
        g.slideTimer += g.deltaTime; // Use g.deltaTime
        
        // End slide after duration
        if (g.slideTimer >= 0.7 || g.isJumping) { // Extended slide duration
            endSlide(); // Uses window.game
            jump();     // Uses window.game
        } else {
            // Improved slide curve with better feel - less abrupt deceleration
            const slideProgress = g.slideTimer / 0.7;
            speed = 10.0 * Math.pow(1 - slideProgress, 1.5); // Smoother deceleration curve
        }
    } else if (g.isSprinting) {
        speed = 8.0; // Sprint speed
    }
    
    // Apply movement to velocity
    g.playerVelocity.x = moveVector.x * speed * g.deltaTime; // Use g.deltaTime
    g.playerVelocity.z = moveVector.z * speed * g.deltaTime; // Use g.deltaTime
    
    // Handle jumping and gravity
    if (g.isJumping) {
        // Apply jump force and gravity
        g.jumpForce -= 0.5 * g.deltaTime; // Gravity, use g.deltaTime
        g.playerVelocity.y = g.jumpForce;
        
        // Check ground collision
        if (g.camera.position.y + g.playerVelocity.y <= 1.7) {
            // Land on ground
            g.camera.position.y = 1.7;
            g.playerVelocity.y = 0;
            g.jumpForce = 0;
            g.isJumping = false;
        }
    }
    
    // --- COLLISION HANDLING: resolve axes separately ---
    const currPos = g.camera.position.clone();
    const dx = g.playerVelocity.x;
    const dz = g.playerVelocity.z;
    // X axis
    const xPos = currPos.clone().add(new THREE.Vector3(dx, 0, 0));
    if (!checkPlayerCollision(xPos)) { // checkPlayerCollision uses window.game
        g.camera.position.x = xPos.x;
    }
    // Z axis
    const zPos = currPos.clone().add(new THREE.Vector3(0, 0, dz));
    if (!checkPlayerCollision(zPos)) { // checkPlayerCollision uses window.game
        g.camera.position.z = zPos.z;
    }

    // Y axis (jumping)
    g.camera.position.y += g.playerVelocity.y;
    
    // Simple boundary check
    g.camera.position.x = Math.max(-49, Math.min(49, g.camera.position.x));
    g.camera.position.z = Math.max(-49, Math.min(49, g.camera.position.z));
    
    // Force y position if not jumping (keep player on ground)
    if (!g.isJumping) {
        g.camera.position.y = g.isSliding ? 0.8 : 1.7;
    }
    
    // Reset velocity for next frame
    g.playerVelocity.set(0, 0, 0);
}

export function damagePlayer(amount) { // amount is a parameter
    const g = window.game;
    // Reduce health
    g.playerHealth = Math.max(0, g.playerHealth - amount);
    
    // Update health bar
    updateHealthBar(); // ui.js function, will use window.game
    
    // Screen damage effect
    g.damageFlashTime = 0.3;
    
    // Reset health regen timer
    g.lastHealthRegen = Date.now();
    
    // Check for death
    if (g.playerHealth <= 0) {
        gameOver(); // Uses window.game
    }
}

export function updateHealthRegen() { // Removed deltaTime parameter
    const g = window.game;
    const now = Date.now();
    if (g.playerHealth < 100 && now - g.lastHealthRegen >= g.healthRegenDelay) {
        g.playerHealth = Math.min(100, g.playerHealth + g.healthRegenRate * g.deltaTime); // Use g.deltaTime
        updateHealthBar(); // ui.js function, will use window.game
    }
}