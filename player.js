// Player module with modern Babylon.js character controller and collision system

/**
 * Original Goals:
 * 1. Create a first-person character controller with physics
 * 2. Handle movement (WASD), jumping, sprinting, sliding
 * 3. Implement proper collision detection with world geometry
 * 4. Handle pointer lock and mouse look controls
 * 5. Manage player health, damage, and regeneration
 * 6. Integrate with weapon system and UI
 * 
 * Structural Simplification:
 * 1. Use Babylon.js PhysicsCharacterController for movement physics
 * 2. Use modern collision callbacks for damage and interactions
 * 3. Separate input handling from physics updates
 * 4. Use proper camera follow system for FPS view
 * 5. Leverage Babylon.js observables for event handling
 */

// Create player with modern Babylon.js character controller
window.game.createPlayer = function() {
    const g = window.game;
    
    // Character controller setup
    const characterHeight = 1.8;
    const characterRadius = 0.4;
    const characterPosition = new BABYLON.Vector3(0, 1.7, 0);
    
    // Create character controller (modern Babylon.js approach)
    try {
        g.playerController = new BABYLON.PhysicsCharacterController(
            characterPosition, 
            {
                capsuleHeight: characterHeight, 
                capsuleRadius: characterRadius
            }, 
            g.scene
        );
        
        // Create visual representation (invisible in FPS)
        g.playerMesh = BABYLON.MeshBuilder.CreateCapsule("playerCapsule", {
            height: characterHeight, 
            radius: characterRadius
        }, g.scene);
        g.playerMesh.visibility = 0; // Invisible for FPS view
        g.playerMesh.position.copyFrom(characterPosition);
        
        // For PhysicsCharacterController, we DON'T need a separate PhysicsAggregate
        // The character controller handles physics internally
        // We'll use a different approach for collision detection with enemies
        
        // Create player collision object using new collision system (without aggregate)
        g.playerCollision = g.CollisionManager.createPlayerCollision(
            g.playerMesh, 
            null, // No aggregate needed for character controller
            { controller: g.playerController }
        );
        
        console.log("Using PhysicsCharacterController with manual collision detection");
        
    } catch (e) {
        console.log("PhysicsCharacterController not available, using PhysicsAggregate fallback");
        
        // Fallback to PhysicsAggregate system
        g.playerMesh = BABYLON.MeshBuilder.CreateCapsule("playerCapsule", {
            height: characterHeight, 
            radius: characterRadius
        }, g.scene);
        g.playerMesh.visibility = 0;
        g.playerMesh.position.copyFrom(characterPosition);
        
        // Create physics aggregate for collision
        g.playerAggregate = new BABYLON.PhysicsAggregate(
            g.playerMesh, 
            BABYLON.PhysicsShapeType.CAPSULE, 
            { mass: 1 }, 
            g.scene
        );
        
        // Lock rotation to prevent tipping
        g.playerAggregate.body.setMassProperties({
            mass: 1,
            inertia: new BABYLON.Vector3(0, 0, 0)
        });
        
        // Create player collision object using new collision system
        g.playerCollision = g.CollisionManager.createPlayerCollision(
            g.playerMesh, 
            g.playerAggregate, 
            { useFallback: true }
        );
        
        console.log("Using PhysicsAggregate fallback with standard collision detection");
    }
    
    // Setup camera to follow player
    g.camera.position.copyFrom(characterPosition);
    g.camera.position.y += 0.7; // Eye level offset
    
    // Initialize player state
    g.player = g.playerMesh;
    g.inputDirection = new BABYLON.Vector3(0, 0, 0);
    g.characterOrientation = BABYLON.Quaternion.Identity();
    
    // Setup pointer lock controls
    setupPointerControls();
    
    console.log("Player created successfully");
};

// Setup modern pointer lock controls
function setupPointerControls() {
    const g = window.game;
    
    // Enable pointer lock on canvas click
    g.canvas.addEventListener('click', () => {
        if (g.gameActive && !g.isPaused) {
            g.canvas.requestPointerLock();
        }
    });
    
    // Handle pointer lock state changes
    document.addEventListener('pointerlockchange', () => {
        if (document.pointerLockElement === g.canvas) {
            console.log("Pointer locked");
        } else {
            console.log("Pointer unlocked");
            if (g.gameActive && !g.isPaused) {
                // Auto-pause when losing pointer lock during gameplay
                if (g.pauseGame) g.pauseGame();
            }
        }
    });
    
    // Handle mouse movement for camera rotation
    g.canvas.addEventListener('mousemove', (event) => {
        if (document.pointerLockElement === g.canvas && g.gameActive && !g.isPaused) {
            const sensitivity = 0.002; // Increased sensitivity
            
            // Horizontal rotation (Y-axis)
            g.camera.rotation.y += event.movementX * sensitivity;
            
            // Vertical rotation (X-axis) with limits - invert Y movement
            g.camera.rotation.x += event.movementY * sensitivity; 
            g.camera.rotation.x = Math.max(-Math.PI/2, Math.min(Math.PI/2, g.camera.rotation.x));
            
            // Update character orientation for movement direction
            BABYLON.Quaternion.FromEulerAnglesToRef(0, g.camera.rotation.y, 0, g.characterOrientation);
        }
    });
}

// Modern physics-based character movement update
window.game.updatePlayerPhysics = function() {
    const g = window.game;
    if (!g.scene || g.scene.deltaTime === undefined) return;
    
    const dt = g.scene.deltaTime / 1000.0;
    if (dt === 0) return;
    
    // Update input direction based on movement keys
    updateInputDirection();
    
    // Use character controller if available
    if (g.playerController) {
        updateWithCharacterController(dt);
    } else if (g.playerAggregate) {
        updateWithPhysicsAggregate(dt);
    }
    
    // Update camera to follow player
    updateCameraFollow();
    
    // Check for enemy collisions manually since character controller doesn't use standard collision callbacks
    if (g.playerController) {
        checkEnemyCollisions();
    }
};

// Update input direction from movement keys
function updateInputDirection() {
    const g = window.game;
    
    g.inputDirection.setAll(0);
    
    if (g.moveForward) g.inputDirection.z = 1;
    if (g.moveBackward) g.inputDirection.z = -1;
    if (g.moveLeft) g.inputDirection.x = -1;
    if (g.moveRight) g.inputDirection.x = 1;
    
    // Normalize for diagonal movement
    if (g.inputDirection.length() > 0) {
        g.inputDirection.normalize();
    }
}

// Update using PhysicsCharacterController
function updateWithCharacterController(dt) {
    const g = window.game;
    
    // Character controller state management
    const down = new BABYLON.Vector3(0, -1, 0);
    const support = g.playerController.checkSupport(dt, down);
    
    // Determine character state
    const nextState = getNextCharacterState(support);
    if (nextState !== g.characterState) {
        g.characterState = nextState;
    }
    
    // Calculate desired velocity based on state
    const currentVelocity = g.playerController.getVelocity();
    const desiredVelocity = getDesiredVelocity(dt, support, currentVelocity);
    
    // Apply velocity and integrate
    g.playerController.setVelocity(desiredVelocity);
    g.playerController.integrate(dt, support, g.characterGravity);
    
    // Update visual mesh position
    g.playerMesh.position.copyFrom(g.playerController.getPosition());
}

// Update using PhysicsAggregate (fallback)
function updateWithPhysicsAggregate(dt) {
    const g = window.game;
    
    // Calculate movement based on input and character orientation
    let speed = g.isSprinting ? g.onGroundSpeed * 1.5 : g.onGroundSpeed;
    
    const moveVector = g.inputDirection.clone();
    moveVector.applyRotationQuaternion(g.characterOrientation);
    moveVector.scaleInPlace(speed);
    
    // Apply movement force
    if (moveVector.length() > 0) {
        g.playerAggregate.body.applyImpulse(moveVector.scale(dt), g.playerMesh.position);
    }
    
    // Handle jumping
    if (g.wantJump > 0 && g.characterState === "ON_GROUND") {
        const jumpImpulse = new BABYLON.Vector3(0, Math.sqrt(2 * 9.81 * g.jumpHeight), 0);
        g.playerAggregate.body.applyImpulse(jumpImpulse, g.playerMesh.position);
        g.wantJump = 0;
        g.characterState = "IN_AIR";
    }
}

// Determine next character state
function getNextCharacterState(supportInfo) {
    const g = window.game;
    
    if (g.characterState === "IN_AIR") {
        if (supportInfo && supportInfo.supportedState === BABYLON.CharacterSupportedState.SUPPORTED) {
            return "ON_GROUND";
        }
        return "IN_AIR";
    } else if (g.characterState === "ON_GROUND") {
        if (supportInfo && supportInfo.supportedState !== BABYLON.CharacterSupportedState.SUPPORTED) {
            return "IN_AIR";
        }
        if (g.wantJump > 0) {
            g.wantJump--;
            return "START_JUMP";
        }
        return "ON_GROUND";
    } else if (g.characterState === "START_JUMP") {
        return "IN_AIR";
    }
    
    return g.characterState;
}

// Calculate desired velocity based on character state
function getDesiredVelocity(dt, supportInfo, currentVelocity) {
    const g = window.game;
    
    const upWorld = g.characterGravity.normalizeToNew().scale(-1.0);
    const forwardWorld = new BABYLON.Vector3(0, 0, 1).applyRotationQuaternion(g.characterOrientation);
    
    let speed = g.isSprinting ? g.onGroundSpeed * 1.5 : g.onGroundSpeed;
    
    if (g.characterState === "IN_AIR") {
        speed = g.inAirSpeed;
        const desiredVelocity = g.inputDirection.scale(speed).applyRotationQuaternion(g.characterOrientation);
        
        let outputVelocity;
        if (g.playerController.calculateMovement) {
            outputVelocity = g.playerController.calculateMovement(
                dt, forwardWorld, upWorld, currentVelocity, 
                BABYLON.Vector3.ZeroReadOnly, desiredVelocity, upWorld
            );
        } else {
            outputVelocity = desiredVelocity;
        }
        
        // Preserve vertical velocity and add gravity
        outputVelocity.addInPlace(upWorld.scale(-outputVelocity.dot(upWorld)));
        outputVelocity.addInPlace(upWorld.scale(currentVelocity.dot(upWorld)));
        outputVelocity.addInPlace(g.characterGravity.scale(dt));
        
        return outputVelocity;
        
    } else if (g.characterState === "ON_GROUND") {
        const desiredVelocity = g.inputDirection.scale(speed).applyRotationQuaternion(g.characterOrientation);
        
        if (g.playerController.calculateMovement && supportInfo) {
            return g.playerController.calculateMovement(
                dt, forwardWorld, supportInfo.averageSurfaceNormal, 
                currentVelocity, supportInfo.averageSurfaceVelocity, 
                desiredVelocity, upWorld
            );
        } else {
            return desiredVelocity;
        }
        
    } else if (g.characterState === "START_JUMP") {
        const jumpVelocity = Math.sqrt(2 * g.characterGravity.length() * g.jumpHeight);
        const currentVerticalVelocity = currentVelocity.dot(upWorld);
        return currentVelocity.add(upWorld.scale(jumpVelocity - currentVerticalVelocity));
    }
    
    return BABYLON.Vector3.Zero();
}

// Update camera to follow player
function updateCameraFollow() {
    const g = window.game;
    
    if (g.playerController) {
        const playerPos = g.playerController.getPosition();
        g.camera.position.x = playerPos.x;
        g.camera.position.z = playerPos.z;
        g.camera.position.y = playerPos.y + 0.7; // Eye level offset
    } else if (g.playerMesh) {
        g.camera.position.x = g.playerMesh.position.x;
        g.camera.position.z = g.playerMesh.position.z;
        g.camera.position.y = g.playerMesh.position.y + 0.7;
    }
}

// Modern event handlers with proper key mapping
const onKeyDown = function(event) {
    const g = window.game;
    if (!g.gameActive) return;
    
    switch (event.code) {
        case 'KeyW':
        case 'ArrowUp':
            g.moveForward = true;
            break;
        case 'KeyS':
        case 'ArrowDown':
            g.moveBackward = true;
            break;
        case 'KeyA':
        case 'ArrowLeft':
            g.moveLeft = true;
            break;
        case 'KeyD':
        case 'ArrowRight':
            g.moveRight = true;
            break;
        case 'ShiftLeft':
        case 'ShiftRight':
            g.isSprinting = true;
            break;
        case 'KeyC':
            if (!g.isSliding && !g.isJumping) {
                if(g.startSlide) g.startSlide(); 
            }
            break;
        case 'Space':
            event.preventDefault(); // Prevent page scroll
            g.wantJump = Math.max(g.wantJump, 1);
            break;
        case 'KeyR':
            if (g.reload) g.reload(); 
            break;
        case 'Digit1':
            if (g.switchWeapon) g.switchWeapon(g.WEAPON_RIFLE);
            break;
        case 'Digit2':
            if (g.switchWeapon) g.switchWeapon(g.WEAPON_SHOTGUN);
            break;
        case 'Digit3':
            if (g.switchWeapon) g.switchWeapon(g.WEAPON_ROCKET);
            break;
        case 'Digit4':
            if (g.switchWeapon) g.switchWeapon(g.WEAPON_MELEE);
            break;
        case 'Escape':
            if (g.isPaused) {
                if(g.resumeGame) g.resumeGame();
            } else {
                if(g.pauseGame) g.pauseGame();
            }
            break;
    }
};

const onKeyUp = function(event) {
    const g = window.game;
    if (!g.gameActive) return;
    
    switch (event.code) {
        case 'KeyW':
        case 'ArrowUp':
            g.moveForward = false;
            break;
        case 'KeyS':
        case 'ArrowDown':
            g.moveBackward = false;
            break;
        case 'KeyA':
        case 'ArrowLeft':
            g.moveLeft = false;
            break;
        case 'KeyD':
        case 'ArrowRight':
            g.moveRight = false;
            break;
        case 'ShiftLeft':
        case 'ShiftRight':
            g.isSprinting = false;
            break;
        case 'Space':
            g.wantJump = 0;
            break;
    }
};

const onMouseDown = function(event) {
    const g = window.game;
    console.log("Mouse down event:", event.button, "Game active:", g.gameActive, "Paused:", g.isPaused); // Debug log
    if (!g.gameActive || g.isPaused) return;
    
    switch (event.button) {
        case 0: // Left mouse button
            console.log("Left click detected. Shoot function available:", !!g.shoot); // Debug log
            if (g.weapons[g.currentWeapon] && g.weapons[g.currentWeapon].automatic) {
                g.isShooting = true;
                console.log("Setting isShooting to true for automatic weapon"); // Debug log
            } else {
                console.log("Calling shoot function for non-automatic weapon"); // Debug log
                if (g.shoot) g.shoot(); 
            }
            break;
        case 2: // Right mouse button
            g.isADS = true;
            if (g.updateWeaponPosition) g.updateWeaponPosition(); 
            break;
    }
};

const onMouseUp = function(event) {
    const g = window.game;
    if (!g.gameActive) return; 
    
    switch (event.button) {
        case 0: // Left mouse button
            g.isShooting = false;
            break;
        case 2: // Right mouse button
            g.isADS = false;
            if (g.updateWeaponPosition) g.updateWeaponPosition(); 
            break;
    }
};

// Setup all game controls
window.game.setupControls = function() {
    const g = window.game;
    
    // Keyboard controls
    document.addEventListener('keydown', onKeyDown, false);
    document.addEventListener('keyup', onKeyUp, false);
    
    // Mouse controls
    document.addEventListener('mousedown', onMouseDown, false);
    document.addEventListener('mouseup', onMouseUp, false);
    
    // Prevent context menu on right click
    g.canvas.addEventListener('contextmenu', function(e) {
        e.preventDefault();
    });
    
    // Setup play button
    const playButton = document.getElementById('play-button');
    if (playButton) {
        playButton.addEventListener('click', window.game.startGame); 
    }
};

// Game state management functions
window.game.startGame = function() {
    const g = window.game;
    
    // Hide home screen
    const homeScreen = document.getElementById('home-screen');
    if (homeScreen) homeScreen.style.display = 'none';
    
    // Show game UI elements
    if (g.uiContainer) g.uiContainer.style.display = 'block';
    if (g.waveText) g.waveText.style.display = 'block';
    if (g.crosshair) g.crosshair.style.display = 'block';
    
    // Request pointer lock
    g.canvas.requestPointerLock();
    
    // Set game state to active
    g.gameActive = true;
    g.isPaused = false;
    
    // Initialize player stats
    g.playerHealth = 100;
    g.characterState = "IN_AIR";
    
    // Start first wave
    if (g.startNextWave) g.startNextWave(); 
    
    // Update UI
    if(g.updateHealthBar) g.updateHealthBar(); 
    if(g.updateAmmoText) g.updateAmmoText();
    if(g.updateWaveText) g.updateWaveText();
    
    console.log("Game started");
};

window.game.pauseGame = function() {
    const g = window.game;
    if (!g.gameActive) return;
    
    g.isPaused = true;
    document.exitPointerLock();
    
    console.log("Game paused");
};

window.game.resumeGame = function() {
    const g = window.game;
    if (!g.gameActive) return;
    
    g.isPaused = false;
    g.canvas.requestPointerLock();
    
    console.log("Game resumed");
};

window.game.gameOver = function() {
    const g = window.game;
    g.gameActive = false;
    g.isPaused = false;
    
    // Show game over screen
    if (g.showGameOver) g.showGameOver();
    
    // Release pointer lock
    document.exitPointerLock();
    
    console.log("Game over");
};

// Player health and damage system
window.game.damagePlayer = function(amount) {
    const g = window.game;
    g.playerHealth = Math.max(0, g.playerHealth - amount);
    
    if(g.updateHealthBar) g.updateHealthBar(); 
    
    g.damageFlashTime = 0.3;
    g.lastHealthRegen = Date.now();
    
    if (g.playerHealth <= 0) {
        if(g.gameOver) g.gameOver(); 
    }
    
    console.log(`Player took ${amount} damage, health: ${g.playerHealth}`);
};

window.game.updateHealthRegen = function() { 
    const g = window.game;
    const now = Date.now();
    if (g.playerHealth < 100 && now - g.lastHealthRegen >= g.healthRegenDelay) {
        g.playerHealth = Math.min(100, g.playerHealth + g.healthRegenRate * g.deltaTime);
        if(g.updateHealthBar) g.updateHealthBar(); 
    }
};

// Modern sliding functions (simplified for now)
window.game.startSlide = function() {
    const g = window.game;
    if (g.isSliding || g.characterState !== "ON_GROUND") return;
    
    g.isSliding = true;
    g.slideTimer = 0;
    
    // Apply forward momentum for sliding
    const slideForce = g.inputDirection.length() > 0 ? 
        g.inputDirection.normalize().scale(15) : 
        new BABYLON.Vector3(0, 0, 1).applyRotationQuaternion(g.characterOrientation).scale(15);
    
    if (g.playerAggregate) {
        g.playerAggregate.body.applyImpulse(slideForce, g.playerAggregate.transformNode.position);
    }
    
    console.log("Started sliding");
    
    // End slide after duration
    setTimeout(() => {
        if (g.endSlide) g.endSlide();
    }, 700);
};

window.game.endSlide = function() { 
    const g = window.game;
    if (!g.isSliding) return;
    
    g.isSliding = false;
    console.log("Ended sliding");
};

// Check for enemy collisions manually (for character controller)
function checkEnemyCollisions() {
    const g = window.game;
    if (!g.playerController || !g.enemies) return;
    
    const playerPos = g.playerController.getPosition();
    const collisionRadius = 0.8; // Player radius + enemy radius
    
    for (const enemy of g.enemies) {
        if (enemy.isDead) continue;
        
        const distance = BABYLON.Vector3.Distance(playerPos, enemy.mesh.position);
        if (distance < collisionRadius) {
            const now = Date.now();
            if (now - (enemy.lastPlayerContactTime || 0) > 1000) {
                console.log(`Player manually collided with enemy: ${enemy.id}`);
                if (g.damagePlayer) {
                    g.damagePlayer(10);
                }
                enemy.lastPlayerContactTime = now;
            }
        }
    }
}