// Collision management system for Babylon.js FPS game
// Defines collision classes and manages collision detection

// Collision object types
window.game.COLLISION_TYPES = {
    PLAYER: "player",
    ENEMY: "enemy", 
    WEAPON: "weapon",
    BULLET: "bullet",
    WORLD: "world",
    PICKUP: "pickup"
};

// Collision class for managing physics objects
class CollisionObject {
    constructor(mesh, aggregate, type, data = {}) {
        this.mesh = mesh;
        this.aggregate = aggregate;
        this.type = type;
        this.data = data;
        
        // Set metadata for identification
        if (mesh) {
            mesh.metadata = {
                ...mesh.metadata,
                collisionType: type,
                collisionObject: this
            };
        }
        
        // Enable collision callbacks if aggregate exists
        if (aggregate && aggregate.body) {
            aggregate.body.setCollisionCallbackEnabled(true);
        }
    }
    
    // Get the physics body
    getBody() {
        return this.aggregate ? this.aggregate.body : null;
    }
    
    // Set up collision observer
    setupCollisionObserver(callback) {
        const body = this.getBody();
        if (body) {
            const observable = body.getCollisionObservable();
            return observable.add(callback);
        }
        return null;
    }
    
    // Dispose of collision object
    dispose() {
        if (this.mesh && !this.mesh.isDisposed()) {
            this.mesh.dispose();
        }
        if (this.aggregate) {
            this.aggregate.dispose();
        }
    }
}

// Player collision object
class PlayerCollision extends CollisionObject {
    constructor(mesh, aggregate, data = {}) {
        super(mesh, aggregate, window.game.COLLISION_TYPES.PLAYER, data);
        this.setupPlayerCollisions();
    }
    
    setupPlayerCollisions() {
        this.collisionObserver = this.setupCollisionObserver((collisionEvent) => {
            const otherBody = collisionEvent.collidedAgainst;
            const otherMesh = otherBody.transformNode;
            
            if (otherMesh && otherMesh.metadata) {
                const otherCollisionObject = otherMesh.metadata.collisionObject;
                
                if (otherCollisionObject) {
                    switch (otherCollisionObject.type) {
                        case window.game.COLLISION_TYPES.ENEMY:
                            this.handleEnemyCollision(otherCollisionObject);
                            break;
                        case window.game.COLLISION_TYPES.PICKUP:
                            this.handlePickupCollision(otherCollisionObject);
                            break;
                        case window.game.COLLISION_TYPES.BULLET:
                            if (otherCollisionObject.data.isRocket) {
                                // Rocket collision handled by rocket itself
                            }
                            break;
                    }
                }
            }
        });
    }
    
    handleEnemyCollision(enemyCollision) {
        const enemy = enemyCollision.data;
        if (enemy && !enemy.isDead) {
            const now = Date.now();
            if (now - (enemy.lastPlayerContactTime || 0) > 1000) {
                console.log(`Player collided with enemy: ${enemy.id}`);
                if (window.game.damagePlayer) {
                    window.game.damagePlayer(10);
                }
                enemy.lastPlayerContactTime = now;
            }
        }
    }
    
    handlePickupCollision(pickupCollision) {
        const pickup = pickupCollision.data;
        if (pickup.type === "healthPickup") {
            window.game.playerHealth = Math.min(100, window.game.playerHealth + 25);
            if (window.game.updateHealthBar) window.game.updateHealthBar();
            pickupCollision.dispose();
        }
    }
}

// Enemy collision object
class EnemyCollision extends CollisionObject {
    constructor(mesh, aggregate, enemyData) {
        super(mesh, aggregate, window.game.COLLISION_TYPES.ENEMY, enemyData);
    }
}

// Weapon collision object
class WeaponCollision extends CollisionObject {
    constructor(mesh, aggregate, weaponData) {
        super(mesh, aggregate, window.game.COLLISION_TYPES.WEAPON, weaponData);
    }
}

// Bullet collision object
class BulletCollision extends CollisionObject {
    constructor(mesh, aggregate, bulletData) {
        super(mesh, aggregate, window.game.COLLISION_TYPES.BULLET, bulletData);
        
        if (bulletData.isRocket) {
            this.setupRocketCollisions();
        }
    }
    
    setupRocketCollisions() {
        this.collisionObserver = this.setupCollisionObserver((collisionEvent) => {
            // Create explosion at rocket position
            if (window.game.createExplosion) {
                window.game.createExplosion(this.mesh.position, 5);
            }
            
            // Remove rocket from bullets array
            const index = window.game.bullets.findIndex(b => b.bullet === this.mesh);
            if (index !== -1) {
                window.game.bullets.splice(index, 1);
            }
            
            // Dispose of rocket
            this.dispose();
        });
        
        // Add delay before enabling collisions to prevent immediate collision
        if (this.aggregate && this.aggregate.body) {
            this.aggregate.body.setCollisionCallbackEnabled(false);
            setTimeout(() => {
                if (this.aggregate && this.aggregate.body) {
                    this.aggregate.body.setCollisionCallbackEnabled(true);
                }
            }, 100);
        }
    }
}

// Collision manager
window.game.CollisionManager = {
    // Create collision objects
    createPlayerCollision(mesh, aggregate, data) {
        return new PlayerCollision(mesh, aggregate, data);
    },
    
    createEnemyCollision(mesh, aggregate, enemyData) {
        return new EnemyCollision(mesh, aggregate, enemyData);
    },
    
    createWeaponCollision(mesh, aggregate, weaponData) {
        return new WeaponCollision(mesh, aggregate, weaponData);
    },
    
    createBulletCollision(mesh, aggregate, bulletData) {
        return new BulletCollision(mesh, aggregate, bulletData);
    },
    
    // Check if mesh should be excluded from raycast
    shouldExcludeFromRaycast(mesh) {
        if (!mesh) return false;
        
        // Exclude player mesh and capsule
        if (mesh.name === "playerCapsule" || 
            mesh === window.game.playerMesh ||
            mesh === window.game.player) {
            console.log(`Excluding player mesh from raycast: ${mesh.name}`);
            return true;
        }
        
        // Check metadata-based exclusion
        if (mesh.metadata && mesh.metadata.collisionType) {
            const type = mesh.metadata.collisionType;
            if (type === window.game.COLLISION_TYPES.WEAPON || 
                type === window.game.COLLISION_TYPES.BULLET) {
                console.log(`Excluding by collision type ${type}: ${mesh.name}`);
                return true;
            }
        }
        
        // Exclude by name patterns
        if (mesh.name.startsWith("tracer_") ||
            mesh.name.startsWith("impact") ||
            mesh.name === "explosion" ||
            mesh.name.startsWith("weapon_") ||
            mesh.name.startsWith("bullet_") ||
            mesh.name.startsWith("muzzleFlash_")) {
            console.log(`Excluding by name pattern: ${mesh.name}`);
            return true;
        }
        
        return false;
    }
};

// Export classes for use in other modules
window.game.PlayerCollision = PlayerCollision;
window.game.EnemyCollision = EnemyCollision;
window.game.WeaponCollision = WeaponCollision;
window.game.BulletCollision = BulletCollision;
window.game.CollisionObject = CollisionObject;
