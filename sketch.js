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