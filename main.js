// Entry point for Enhanced FPS Game with Babylon.js and Modern Physics

// Create and initialize the global game object
window.game = {
    // Babylon.js core objects
    engine: null,
    scene: null,
    camera: null,
    canvas: null,
    physicsPlugin: null,
    
    // Game timing
    deltaTime: 0,
    lastTime: 0,
    
    // Player
    player: null,
    playerController: null,
    playerAggregate: null,
    moveForward: false,
    moveBackward: false,
    moveLeft: false,
    moveRight: false,
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
    
    // Input state for character controller (will be initialized after BABYLON loads)
    inputDirection: null,
    characterOrientation: null,
    characterGravity: null,
    inAirSpeed: 8.0,
    onGroundSpeed: 10.0,
    jumpHeight: 1.5,
    wantJump: 0,
    characterState: "IN_AIR", // "IN_AIR", "ON_GROUND", "START_JUMP"
    
    // Weapons
    WEAPON_RIFLE: 1,
    WEAPON_SHOTGUN: 2,
    WEAPON_ROCKET: 3, 
    WEAPON_MELEE: 4,
    currentWeapon: 1,
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
    ray: null,
    mouse: null, // Will be initialized as BABYLON.Vector2()
    
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
    
    // Sound (using Babylon.js audio)
    sounds: {
        hit: null,
        reload: null,
        shoot: null
    }
};

// Initialize the game with proper Babylon.js setup
async function setup() {
    try {
        // Initialize BABYLON-dependent objects now that BABYLON is loaded
        window.game.inputDirection = new BABYLON.Vector3(0, 0, 0);
        window.game.characterOrientation = BABYLON.Quaternion.Identity();
        window.game.characterGravity = new BABYLON.Vector3(0, -18, 0);
        window.game.mouse = new BABYLON.Vector2();
        
        // Get canvas element or create it with proper styling
        const canvas = document.getElementById('game-canvas') || document.createElement('canvas');
        if (!document.getElementById('game-canvas')) {
            canvas.id = 'game-canvas';
            document.body.appendChild(canvas);
        }
        window.game.canvas = canvas;
        
        // Initialize Babylon.js engine with proper canvas handling
        window.game.engine = new BABYLON.Engine(canvas, true, {
            preserveDrawingBuffer: true,
            stencil: true,
            antialias: true,
            adaptToDeviceRatio: true
        });
        
        // Ensure canvas is properly sized
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        
        // Create scene
        window.game.scene = new BABYLON.Scene(window.game.engine);
        
        // Initialize physics with proper Havok setup
        let physicsPlugin;
        try {
            // Initialize Havok physics properly using the UMD version
            const havokInstance = await HavokPhysics();
            physicsPlugin = new BABYLON.HavokPlugin(true, havokInstance);
            window.game.physicsPlugin = physicsPlugin;
            window.game.scene.enablePhysics(new BABYLON.Vector3(0, -9.81, 0), physicsPlugin);
            console.log("Using Havok physics");

            // Setup world-level collision observer for all physics events
            physicsPlugin.onCollisionObservable.add((collisionEvent) => {
                const g = window.game;
                if (!g.gameActive || g.isPaused || !g.player) return;

                const bodyA = collisionEvent.collider;
                const bodyB = collisionEvent.collidedAgainst;

                const meshA = bodyA.transformNode;
                const meshB = bodyB.transformNode;

                // Check if the player's transform node is involved
                let otherMesh = null;
                if (meshA === g.player) {
                    otherMesh = meshB;
                } else if (meshB === g.player) {
                    otherMesh = meshA;
                }

                // If player collided with something, check what it is
                if (otherMesh && otherMesh.metadata?.type === "enemyHitbox") {
                    const enemy = otherMesh.metadata.enemy;
                    if (enemy && !enemy.isDead) {
                        const now = Date.now();
                        // Cooldown to prevent rapid damage from a single touch
                        if (now - (enemy.lastPlayerContactTime || 0) > 1000) {
                            console.log(`Player collided with enemy hitbox: ${enemy.mesh.name}`);
                            if (g.damagePlayer) g.damagePlayer(10);
                            enemy.lastPlayerContactTime = now;
                        }
                    }
                }
            });

        } catch (e) {
            try {
                // Fallback to CannonJS if available
                console.log("Havok not available, trying CannonJS");
                physicsPlugin = new BABYLON.CannonJSPlugin();
                window.game.physicsPlugin = physicsPlugin;
                window.game.scene.enablePhysics(new BABYLON.Vector3(0, -9.81, 0), physicsPlugin);
                console.log("Using CannonJS physics");
            } catch (e2) {
                // No physics engine available, continue without physics
                console.log("No physics engine available, running without physics");
                window.game.physicsPlugin = null;
            }
        }
        
        // Create FPS camera with proper configuration
        window.game.camera = new BABYLON.UniversalCamera("playerCamera", new BABYLON.Vector3(0, 1.7, 0), window.game.scene);
        window.game.camera.setTarget(new BABYLON.Vector3(0, 1.7, 1)); // Look forward, small distance
        
        // Initialize camera rotation to zero and ensure no quaternion conflicts
        window.game.camera.rotation = new BABYLON.Vector3(0, 0, 0);
        window.game.camera.rotationQuaternion = null; // Disable quaternion to avoid conflicts
        
        // Configure camera for FPS with proper sensitivity
        window.game.camera.minZ = 0.1;
        window.game.camera.maxZ = 1000;
        window.game.camera.fov = Math.PI / 3; // 60 degrees
        window.game.camera.angularSensibility = 1000; // Reduced sensitivity
        window.game.camera.inertia = 0.0;
        
        // Disable default camera controls - we'll handle them manually
        window.game.camera.attachControl(canvas, false);
        
        // Initialize timing
        window.game.lastTime = performance.now();
        
        // Setup game components
        window.game.setupUI();
        window.game.setupLighting();
        window.game.createWorld();
        window.game.createPlayer();
        window.game.setupControls();
        window.game.createWeaponModels();
        
        // Collision logic is now handled in the physics plugin's onCollisionObservable above.

        // Load sounds
        loadSounds();
        
        // Setup window resize handling
        window.addEventListener('resize', () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            window.game.engine.resize();
        }, false);
        
        // Show home screen
        const homeScreen = document.getElementById('home-screen');
        if (homeScreen) homeScreen.style.display = 'flex';
        
        // Centralize physics updates in onAfterPhysicsObservable as per the example
        window.game.scene.onAfterPhysicsObservable.add(() => {
            const g = window.game;
            if (g.gameActive && !g.isPaused) {
                if(g.updatePlayerPhysics) g.updatePlayerPhysics();
            }
        });

        // Start the render loop
        window.game.engine.runRenderLoop(() => {
            animate();
        });
        
        console.log("Game initialized successfully");
        
    } catch (error) {
        console.error("Failed to initialize game:", error);
    }
}

// Load game sounds
function loadSounds() {
    try {
        window.game.sounds.hit = new BABYLON.Sound("hit", "hit.mp3", window.game.scene, null, {
            loop: false,
            autoplay: false
        });
        window.game.sounds.reload = new BABYLON.Sound("reload", "reload.mp3", window.game.scene, null, {
            loop: false,
            autoplay: false
        });
        window.game.sounds.shoot = new BABYLON.Sound("shoot", "shoot.mp3", window.game.scene, null, {
            loop: false,
            autoplay: false
        });
    } catch (error) {
        console.warn("Could not load some sound files:", error);
    }
}

// Animation loop with proper Babylon.js integration
function animate() {
    const g = window.game;
    const currentTime = performance.now();
    
    // Update deltaTime
    g.deltaTime = (currentTime - g.lastTime) / 1000;
    g.lastTime = currentTime;
    
    // Skip game logic when paused or game over
    if (g.gameActive && !g.isPaused) {
        // Handle automatic shooting
        if (g.isShooting && g.weapons[g.currentWeapon] && g.weapons[g.currentWeapon].automatic) {
            if(g.shoot) g.shoot();
        }
        
        // Player physics is now updated in onAfterPhysicsObservable.
        
        // Update weapons position
        if(g.updateWeaponPosition) g.updateWeaponPosition();
        
        // Update game objects
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
    
    // Render the scene
    g.scene.render();
}

// Start the game on load
window.addEventListener('load', setup);