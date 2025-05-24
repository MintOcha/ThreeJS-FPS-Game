// Entry point for Enhanced FPS Game
import * as THREE from 'three';
// All module functions are now expected to be on window.game
// and called via window.game.functionName() if needed by main.js directly.

// Create a global game object to hold all game state
window.game = {
    // Scene, renderer, camera
    scene: new THREE.Scene(),
    camera: new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000),
    renderer: new THREE.WebGLRenderer({ antialias: true }),
    clock: new THREE.Clock(),
    deltaTime: 0,
    
    // Player
    player: null,
    moveForward: false,
    moveBackward: false,
    moveLeft: false,
    moveRight: false,
    playerVelocity: new THREE.Vector3(0, 0, 0),
    playerDirection: new THREE.Vector3(0, 0, 0),
    isSprinting: false,
    isSliding: false,
    slideTimer: 0,
    jumpForce: 0,
    isJumping: false,
    gameActive: false,
    isPaused: false,
    playerHealth: 100,
    damageFlashTime: 0,
    lastHealthRegen: 0,
    healthRegenDelay: 8000,
    healthRegenRate: 5,
    baseSensitivity: 0.002,
    sensitivity: 0.002,
    
    // Weapons
    WEAPON_RIFLE: 1,
    WEAPON_SHOTGUN: 2,
    WEAPON_ROCKET: 3, 
    WEAPON_MELEE: 4,
    currentWeapon: 1, // Start with rifle
    weaponModels: {},
    isReloading: false,
    isADS: false,
    adsTransition: 0,
    lastShotTime: 0,
    isShooting: false,
    reloadTimeoutId: null,
    
    // Enemies, bullets, etc
    enemies: [],
    bullets: [],
    explosions: [],
    currentWave: 0,
    enemiesRemaining: 0,
    waveDelay: 5000,
    isWaveTransition: false,
    
    // Raycasting
    raycaster: null,
    mouse: new THREE.Vector2(),
    
    // UI
    uiContainer: null,
    healthBarFill: null,
    healthText: null,
    ammoText: null,
    reloadText: null,
    waveText: null,
    waveStatusText: null,
    gameOverScreen: null,
    crosshair: null,
    enemyHealthBars: {},
    damageNumbers: [],
    
    // Weapon definitions
    weapons: {
        1: { // RIFLE
            name: "Rifle", 
            damage: 37, 
            fireRate: 75,
            spread: 0.05,
            magazineSize: 30,
            currentAmmo: 31,
            reloadTime: 2000,
            automatic: true,
            bulletSpeed: 100,
            bulletModel: null,
            muzzleFlash: null,
            pierce: 3,
            maxRange: 60,
            minRange: 10,
            minDamagePercent: 0.7
        },
        2: { // SHOTGUN
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
            maxRange: 30,
            minRange: 5,
            minDamagePercent: 0.6
        },
        3: { // ROCKET
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
            maxRange: 100,
            minRange: 0,
            minDamagePercent: 1.0
        },
        4: { // MELEE
            name: "Melee", 
            damage: 120, 
            fireRate: 300, 
            range: 5,
            magazineSize: Infinity,
            currentAmmo: Infinity,
            automatic: false,
            attackModel: null,
            maxRange: 3,
            minRange: 0,
            minDamagePercent: 1.0
        }
    },
    
    // Sound
    sounds: {
        hit: new Howl({ src: ['hit.mp3'], onloaderror: (id,err) => console.error("Howler failed:", err) }),
        reload: new Howl({ src: ['reload.mp3'], onloaderror: (id,err) => console.error("Howler failed:", err) }),
        shoot: new Howl({ src: ['shoot.mp3'], onloaderror: (id,err) => console.error("Howler failed:", err) })
    }
};

// Initialize the game
function setup() {
    // Initialize the renderer
    const g = window.game;
    g.renderer.setSize(window.innerWidth, window.innerHeight);
    g.renderer.shadowMap.enabled = true;
    document.body.appendChild(g.renderer.domElement);
    
    // Start the clock
    g.clock.start();
  
    // Setup UI
    if(g.setupUI) g.setupUI();
    
    // Setup lighting
    if(g.setupLighting) g.setupLighting();
    
    // Create the world
    if(g.createWorld) g.createWorld();
    
    // Create player
    if(g.createPlayer) g.createPlayer();
    
    // Setup controls
    if(g.setupControls) g.setupControls();
    
    // Initialize raycaster for shooting
    g.raycaster = new THREE.Raycaster();
    
    // Create weapon models
    if(g.createWeaponModels) g.createWeaponModels();
    
    // Event listeners for window resize
    if(g.onWindowResize) window.addEventListener('resize', g.onWindowResize, false);
    
    // Show home screen
    document.getElementById('home-screen').style.display = 'flex';
    
    // Start the game loop (even if not active yet)
    animate();
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    
    const g = window.game;
    
    // Update deltaTime
    g.deltaTime = g.clock.getDelta();
    
    // Skip game logic when paused or game over
    if (g.gameActive && !g.isPaused) {
        // Handle automatic shooting
        if (g.isShooting && g.weapons[g.currentWeapon].automatic) {
            if(g.shoot) g.shoot();
        }
        
        // Update player movement
        if(g.updatePlayer) g.updatePlayer();
        
        // Update weapons position
        if(g.updateWeaponPosition) g.updateWeaponPosition();
        
        // Update bullets, explosions, and enemies
        if(g.updateBullets) g.updateBullets();
        if(g.updateExplosions) g.updateExplosions();
        if(g.updateEnemies) g.updateEnemies(); 
        if(g.updateDamageNumbers) g.updateDamageNumbers();
        
        // Update health regeneration
        if(g.updateHealthRegen) g.updateHealthRegen();
        
        // Update damage flash effect
        if (g.damageFlashTime > 0) {
            g.damageFlashTime -= g.deltaTime;
        }
    }
    
    // First render the main scene
    g.renderer.render(g.scene, g.camera);
    
    // Then render weapon on top using the same camera
    if (g.gameActive && window.weaponViewport) {
        // Preserve the renderer's state
        const currentAutoClear = g.renderer.autoClear;
        g.renderer.autoClear = false; // Prevent clearing what we just rendered
        
        // Render the weapon viewport
        g.renderer.render(window.weaponViewport, g.camera);
        
        // Restore renderer state
        g.renderer.autoClear = currentAutoClear;
    }
}

// Start the game on load
window.addEventListener('load', setup);

// No need to export variables that are stored in the window.game object