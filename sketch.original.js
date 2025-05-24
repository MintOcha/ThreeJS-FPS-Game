// Enhanced FPS Game - Main.js
import * as THREE from 'three';


// Game variables
let scene, camera, renderer, controls;
let player, moveForward, moveBackward, moveLeft, moveRight;
let playerVelocity, playerDirection;
let isSprinting = false, isSliding = false, slideTimer = 0;
let jumpForce = 0, isJumping = false;
let enemies = [], bullets = [], explosions = [];
let raycaster, mouse;
let gameActive = false, isPaused = false;
let currentWave = 0, enemiesRemaining = 0, waveDelay = 5000; // ms
let clock, deltaTime;
let isWaveTransition = false;
let playerHealth = 100;
let damageFlashTime = 0;
let lastHealthRegen = 0; // Track last health regen time
let healthRegenDelay = 8000; // 5 seconds before health starts regenerating after damage
let healthRegenRate = 5; // Health points per second
let reloadTimeoutId;
let baseSensitivity = 0.002;
let sensitivity = baseSensitivity;

// Weapon system
const WEAPON_RIFLE = 1, WEAPON_SHOTGUN = 2, WEAPON_ROCKET = 3, WEAPON_MELEE = 4;
let currentWeapon = WEAPON_RIFLE;
let weaponModels = {};
let isReloading = false;
let isADS = false; // Aiming Down Sights
let adsTransition = 0; // 0 = hip fire, 1 = fully aimed
let lastShotTime = 0;
let isShooting = false; // For full auto

// Ammo system
const weapons = {
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

// UI Elements
let uiContainer, healthBarFill, healthText, ammoText, reloadText;
let waveText, waveStatusText, gameOverScreen, crosshair;
let enemyHealthBars = {}, damageNumbers = [];

// p5.js sound setup
let sounds = {
  hit: new Howl({ src: ['hit.mp3'], onloaderror: (id,err) => console.error("Howler failed:", err) }),
  reload: new Howl({ src: ['reload.mp3'], onloaderror: (id,err) => console.error("Howler failed:", err) }),
  shoot: new Howl({ src: ['shoot.mp3'], onloaderror: (id,err) => console.error("Howler failed:", err) })
};

// Initialize the game
function setup() {
    // Initialize Three.js scene
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
    
    // Setup renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    document.body.appendChild(renderer.domElement);
    
    // Create clock for timing
    clock = new THREE.Clock();
  
    setupUI();
    
    // Setup lighting
    setupLighting();
    
    // Create the world
    createWorld();
    
    // Create player
    createPlayer();
    
    // Setup controls
    setupControls();
    
    // Initialize raycaster for shooting
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();
    
    // Create weapon models
    createWeaponModels();
    
    // Event listeners for window resize
    window.addEventListener('resize', onWindowResize, false);
    
    // Show home screen
    document.getElementById('home-screen').style.display = 'flex';
    
    // Start the game loop (even if not active yet)
    animate();
}

// Handle window resize
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Setup lighting in the scene
function setupLighting() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(50, 200, 100);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.shadow.mapSize.height = 1024;
    scene.add(directionalLight);

    // setup skybox
    const loader = new THREE.CubeTextureLoader();
    // Ensure the paths are correct relative to your HTML file.
    // You might need './skybox.jpg' or 'path/to/skybox.jpg'
    // The order is: +X, -X, +Y, -Y, +Z, -Z (positive x, negative x, etc.)
    const texture = loader.load([
      'skybox.jpg', // Right face
      'skybox.jpg', // Left face
      'skybox.jpg', // Top face
      'skybox.jpg', // Bottom face
      'skybox.jpg', // Front face
      'skybox.jpg'  // Back face
    ],
    () => {
        console.log('Skybox textures loaded successfully.');
        scene.background = texture;
    },
    undefined, // onProgress callback not needed here
    (error) => {
        console.error('An error occurred loading the skybox textures:', error);
    });

    // --- Set solid colour bg if it doesn't work ---
    scene.background = new THREE.Color(0x87CEEB); // Sky blue color
}

// Create the world (floor, walls, etc.)
function createWorld() {
    // Floor
    const floorGeometry = new THREE.PlaneGeometry(100, 100);
    const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x999999 });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);
    
    // Walls and obstacles using boxes
    const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x0088ff });
    
    // Outer walls
    createWall(-50, 2.5, 0, 1, 5, 100, wallMaterial); // Left
    createWall(50, 2.5, 0, 1, 5, 100, wallMaterial);  // Right
    createWall(0, 2.5, -50, 100, 5, 1, wallMaterial); // Back
    createWall(0, 2.5, 50, 100, 5, 1, wallMaterial);  // Front
    
    // Inner structures - Random boxes and platforms
    for (let i = 0; i < 15; i++) {
        const size = 2 + Math.random() * 5;
        const height = 1 + Math.random() * 4;
        const x = (Math.random() - 0.5) * 80;
        const z = (Math.random() - 0.5) * 80;
        createWall(x, height/2, z, size, height, size, wallMaterial);
    }
    
    // Add some platforms
    createWall(-20, 3, -20, 10, 0.5, 10, wallMaterial);
    createWall(20, 5, 20, 15, 0.5, 15, wallMaterial);
    createWall(0, 7, 0, 8, 0.5, 8, wallMaterial);
}

// Helper function to create walls
function createWall(x, y, z, width, height, depth, material) {
    const geometry = new THREE.BoxGeometry(width, height, depth);
    const wall = new THREE.Mesh(geometry, material);
    wall.position.set(x, y, z);
    wall.castShadow = true;
    wall.receiveShadow = true;
    scene.add(wall);
    return wall;
}

// Create the player
function createPlayer() {
    // Player is just a camera with collision detection
    camera.position.set(0, 1.7, 10);
    player = camera;
    
    // Initialize player movement variables
    playerVelocity = new THREE.Vector3(0, 0, 0);
    playerDirection = new THREE.Vector3(0, 0, 0);
    
    // Set up player controls (movement handled in keyDown/keyUp)
    moveForward = moveBackward = moveLeft = moveRight = false;
}

// Setup weapon models
function createWeaponModels() {
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

// Setup controls for camera and input
function setupControls() {
    document.addEventListener('keydown', onKeyDown, false);
    document.addEventListener('keyup', onKeyUp, false);
    document.addEventListener('mousedown', onMouseDown, false);
    document.addEventListener('mouseup', onMouseUp, false);
    document.addEventListener('mousemove', onMouseMove, false);
    
    // Lock pointer when clicking on the game
    renderer.domElement.addEventListener('click', function() {
        if (gameActive && !isPaused) {
            renderer.domElement.requestPointerLock();
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

// Update camera rotation from mouse movement
function updateCameraRotation(event) {
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

// Start the game
function startGame() {
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

// Pause game
function pauseGame() {
    if (!gameActive) return;
    
    isPaused = true;
    document.exitPointerLock();
}

// Resume game
function resumeGame() {
    if (!gameActive) return;
    
    isPaused = false;
    renderer.domElement.requestPointerLock();
}

// Game over
function gameOver() {
    gameActive = false;
    document.getElementById('game-over-screen').style.display = 'flex';
    document.exitPointerLock();
}

// Set up UI elements
function setupUI() {
    uiContainer = document.getElementById('ui-container');
    healthBarFill = document.getElementById('health-bar-fill');
    healthText = document.getElementById('health-text');
    ammoText = document.getElementById('ammo-text');
    reloadText = document.getElementById('reload-text');
    waveText = document.getElementById('wave-text');
    waveStatusText = document.getElementById('wave-status-text');
    gameOverScreen = document.getElementById('game-over-screen');
    crosshair = document.getElementById('crosshair');
    
    // Initialize health bar
    updateHealthBar();
    
    // Initialize ammo text
    updateAmmoText();
}

// Update health bar
function updateHealthBar() {
    healthBarFill.style.width = `${playerHealth}%`;
    healthText.textContent = `${Math.ceil(playerHealth)} / 100`;
    
    // Change color based on health
    if (playerHealth > 70) {
        healthBarFill.style.backgroundColor = 'rgba(0, 200, 0, 0.9)';
    } else if (playerHealth > 30) {
        healthBarFill.style.backgroundColor = 'rgba(200, 200, 0, 0.9)';
    } else {
        healthBarFill.style.backgroundColor = 'rgba(200, 0, 0, 0.9)';
    }
}

// Update ammo display
function updateAmmoText() {
    const weapon = weapons[currentWeapon];
    if (weapon.magazineSize === Infinity) {
        ammoText.textContent = '∞';
    } else {
        ammoText.textContent = `${weapon.currentAmmo} / ${weapon.magazineSize}`;
    }
}

// Handle key down
function onKeyDown(event) {
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

// Handle key up
function onKeyUp(event) {
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

// Handle mouse down
function onMouseDown(event) {
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

// Handle mouse up
function onMouseUp(event) {
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

// Handle mouse move
function onMouseMove(event) {
    // This is only used for shooting raycasting, not camera rotation
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
}

// Start sliding
function startSlide() {
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

// End sliding

function endSlide() { 
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

// Helper function to extract roll value from a quaternion
function getQuaternionRoll(quaternion) {
  // Convert quaternion to Euler angles using YXZ order (typical for FPS cameras)
  const euler = new THREE.Euler().setFromQuaternion(quaternion, 'YXZ');
  // Return the z-component which represents roll
  return euler.z;
}




// Jump function
function jump() {
    if (isJumping) return;
    
    isJumping = true;
    jumpForce = 0.15;
}

// Reload current weapon
function reload() {
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

// Switch weapons
function switchWeapon(weaponId) {
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

// Update weapon position relative to camera
function updateWeaponPosition() {
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

// --- COLLISION DETECTION ---
function checkPlayerCollision(pos) {
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

function updatePlayer(deltaTime) {
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

// Shoot function (continued)
// Shoot function (corrected)
function shoot() {
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

// Create a bullet tracer effect
function createBulletTracer(direction) {
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

// Create rocket projectile
function createRocket(position, direction) {
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

// Create explosion effect
function createExplosion(position, radius) {
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

// Create bullet impact effect
function createBulletImpact(position, normal) {
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

// Apply damage to player
function damagePlayer(amount) {
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

// Apply damage to enemy
function damageEnemy(enemy, amount, hitPoint) {
  
    // Play hit sound
  
    sounds.hit.play();
    // Reduce enemy health
    enemy.health -= amount;
    
    // Show damage number
    showDamageNumber(amount, hitPoint);
    
    // Update enemy health bar
    updateEnemyHealthBar(enemy);
    
    // Check for death
    if (enemy.health <= 0) {
        killEnemy(enemy);
    }
}

// Show damage number at hit position
function showDamageNumber(amount, position) {
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

// Update enemy health bar
function updateEnemyHealthBar(enemy) {
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

// Kill enemy function
function killEnemy(enemy) {
    // Remove from scene
    scene.remove(enemy.mesh);
    
    // Remove health bar if it exists
    if (enemyHealthBars[enemy.id]) {
        document.getElementById('enemy-health-bar-container').removeChild(enemyHealthBars[enemy.id].container);
        delete enemyHealthBars[enemy.id];
    }
    
    // Remove from enemies array
    const index = enemies.indexOf(enemy);
    if (index !== -1) {
        enemies.splice(index, 1);
    }
    
    // Update enemies remaining
    enemiesRemaining--;
    
    // Check if wave is cleared
    if (enemiesRemaining <= 0) {
        waveCleared();
    }
}

// Start next wave
function startNextWave() {
    // Increment wave
    currentWave++;
    
    // Update wave text
    waveText.textContent = `Wave: ${currentWave}`;
    
    // Calculate enemies for this wave
    const enemyCount = Math.min(5 + currentWave * 2, 40); // Cap at 40 enemies
    enemiesRemaining = enemyCount;
    
    // Spawn enemies
    for (let i = 0; i < enemyCount; i++) {
        // Delay spawn to avoid all enemies appearing at once
        setTimeout(() => spawnEnemy(), i * 200);
    }
}

// Wave cleared
function waveCleared() {
    // Show wave cleared message
    waveStatusText.textContent = `Wave ${currentWave} Cleared!`;
    waveStatusText.style.display = 'block';
    
    // Hide after delay
    setTimeout(() => {
        waveStatusText.style.display = 'none';
    }, 3000);
    
    // Start next wave after delay
    isWaveTransition = true;
    
    // Wait a bit longer before starting next wave
    setTimeout(() => {
        isWaveTransition = false;
        startNextWave();
    }, waveDelay);
}

// Spawn an enemy
function spawnEnemy() {
    // Skip if game is not active
    if (!gameActive) return;
    
    // Create enemy mesh
    const enemyGeo = new THREE.BoxGeometry(1, 2, 1);
    const enemyMat = new THREE.MeshStandardMaterial({ color: 0xff0000 });
    const enemyMesh = new THREE.Mesh(enemyGeo, enemyMat);
    
    // Random spawn position away from player (minimum distance of 15)
    let spawnPos = new THREE.Vector3();
    do {
        spawnPos.set(
            (Math.random() - 0.5) * 80,
            1,
            (Math.random() - 0.5) * 80
        );
    } while (spawnPos.distanceTo(camera.position) < 15);
    
    enemyMesh.position.copy(spawnPos);
    enemyMesh.castShadow = true;
    enemyMesh.receiveShadow = true;
    
    // Calculate health based on wave
    const baseHealth = 100;
    const healthMultiplier = 1 + (currentWave - 1) * 0.2; // +20% health per wave
    const health = Math.round(baseHealth * healthMultiplier);
    
    // Add to scene
    scene.add(enemyMesh);
    
    // Create enemy object
    const enemy = {
        id: `enemy-${Date.now()}-${Math.random()}`,
        mesh: enemyMesh,
        velocity: new THREE.Vector3(),
        health: health,
        maxHealth: health,
        speed: 0.05,
        attackCooldown: 0,
        lastAttackTime: 0
    };
    
    // Add to enemies array
    enemies.push(enemy);
}

// Update enemy position and behavior
function updateEnemies(deltaTime) {
    for (const enemy of enemies) {
        // Update attack cooldown
        if (enemy.attackCooldown > 0) {
            enemy.attackCooldown -= deltaTime;
        }
        
        // Move towards player
        const direction = new THREE.Vector3().subVectors(camera.position, enemy.mesh.position);
        direction.y = 0; // Keep enemy on ground
        direction.normalize();
        
        // Set velocity based on direction and speed
        enemy.velocity.x = direction.x * enemy.speed;
        enemy.velocity.z = direction.z * enemy.speed;
        
        // Apply velocity
        enemy.mesh.position.x += enemy.velocity.x;
        enemy.mesh.position.z += enemy.velocity.z;
        
        // Make enemy face player
        enemy.mesh.lookAt(new THREE.Vector3(camera.position.x, enemy.mesh.position.y, camera.position.z));
        
        // Check for attack range
        const distanceToPlayer = enemy.mesh.position.distanceTo(camera.position);
        if (distanceToPlayer < 1.5 && enemy.attackCooldown <= 0) {
            // Attack player
            damagePlayer(10);
            
            // Set attack cooldown
            enemy.attackCooldown = 1.0; // 1 second between attacks
        }
        
        // Update enemy health bar position if visible
        if (enemyHealthBars[enemy.id] && enemyHealthBars[enemy.id].container.style.visibility !== 'hidden') {
            const screenPos = new THREE.Vector3().copy(enemy.mesh.position);
            screenPos.y += 2.5; // Position above enemy
            screenPos.project(camera);
            
            const x = (screenPos.x * 0.5 + 0.5) * window.innerWidth;
            const y = (-(screenPos.y * 0.5) + 0.5) * window.innerHeight;
            
            enemyHealthBars[enemy.id].container.style.left = `${x - 25}px`; // Center bar
            enemyHealthBars[enemy.id].container.style.top = `${y}px`;
        }
    }
}

// Update bullets
function updateBullets(deltaTime) {
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

// Update explosions
function updateExplosions(deltaTime) {
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

// Update damage numbers
function updateDamageNumbers(deltaTime) {
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

// Update health regeneration
function updateHealthRegen(deltaTime) {
    const now = Date.now();
    if (playerHealth < 100 && now - lastHealthRegen >= healthRegenDelay) {
        playerHealth = Math.min(100, playerHealth + healthRegenRate * deltaTime);
        updateHealthBar();
    }
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    
    // Get delta time
    deltaTime = clock.getDelta();
    
    // Skip game logic when paused or game over
    if (gameActive && !isPaused) {
        // Handle automatic shooting
        if (isShooting && weapons[currentWeapon].automatic) {
            shoot();
        }
        
        // Update player movement
        updatePlayer(deltaTime);
        
        // Update weapons position
        updateWeaponPosition();
        
        // Update bullets, explosions, and enemies
        updateBullets(deltaTime);
        updateExplosions(deltaTime);
        updateEnemies(deltaTime);
        updateDamageNumbers(deltaTime); 
        
        // Update health regeneration
        updateHealthRegen(deltaTime);
        
        // Update damage flash effect
        if (damageFlashTime > 0) {
            damageFlashTime -= deltaTime;
            //renderer.setClearColor(0x330000);
        } else {
            //renderer.setClearColor(0x000000);
        }
    }
    
    // First render the main scene
    renderer.render(scene, camera);
    
    // Then render weapon on top using the same camera
    if (gameActive && window.weaponViewport) {
        // Preserve the renderer's state
        const currentAutoClear = renderer.autoClear;
        renderer.autoClear = false; // Prevent clearing what we just rendered
        
        // Render the weapon viewport
        renderer.render(window.weaponViewport, camera);
        
        // Restore renderer state
        renderer.autoClear = currentAutoClear;
    }
}

// Start the game on load
window.addEventListener('load', setup);