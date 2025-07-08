// World/scene module for Babylon.js

// Setup lighting in the scene
window.game.setupLighting = function() {
    const g = window.game;

    // Ambient light (dimmer for backrooms atmosphere)
    const ambientLight = new BABYLON.HemisphericLight("ambientLight", new BABYLON.Vector3(0, 1, 0), g.scene);
    ambientLight.intensity = 0.4; // Reduced for backrooms atmosphere
    ambientLight.diffuse = new BABYLON.Color3(1.0, 0.9, 0.7); // Slightly warm white

    // Directional light for shadows (positioned higher for ceiling lighting effect)
    const directionalLight = new BABYLON.DirectionalLight("dirLight", new BABYLON.Vector3(0, -1, 0), g.scene);
    directionalLight.position = new BABYLON.Vector3(0, 50, 0); // Directly above for indoor feel
    directionalLight.intensity = 0.6; // Reduced intensity
    directionalLight.diffuse = new BABYLON.Color3(1.0, 0.95, 0.8); // Warm fluorescent-like light
    
    // Enable shadows
    const shadowGenerator = new BABYLON.ShadowGenerator(2048, directionalLight); // Higher resolution for indoor detail
    shadowGenerator.useBlurExponentialShadowMap = true;
    shadowGenerator.blurKernel = 16; // Softer shadows
    g.shadowGenerator = shadowGenerator;

    // Set background color (darker, more enclosed feeling)
    g.scene.clearColor = new BABYLON.Color3(0.2, 0.2, 0.15); // Dark brownish for backrooms
    
    // Add some point lights for variation (fluorescent tube simulation)
    for (let i = 0; i < 5; i++) {
        const pointLight = new BABYLON.PointLight(`fluorescentLight${i}`, 
            new BABYLON.Vector3(
                (Math.random() - 0.5) * 100, 
                3.8, 
                (Math.random() - 0.5) * 100
            ), g.scene);
        pointLight.intensity = 0.3;
        pointLight.diffuse = new BABYLON.Color3(1.0, 0.95, 0.85);
        pointLight.range = 15;
    }
};

window.game.createWorld = function() {
    const g = window.game;
    
    // Create base ground (backrooms use this as foundation)
    const config = g.BackroomsConfig;
    const groundSize = Math.max(config.WORLD_WIDTH, config.WORLD_HEIGHT) * 1.2;
    
    const ground = BABYLON.MeshBuilder.CreateGround("ground", {width: groundSize, height: groundSize}, g.scene);
    const groundMaterial = new BABYLON.StandardMaterial("groundMat", g.scene);
    // Backrooms-style floor (yellowish carpet-like)
    groundMaterial.diffuseColor = new BABYLON.Color3(0.8, 0.7, 0.5);
    groundMaterial.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
    ground.material = groundMaterial;
    ground.receiveShadows = true;
    
    // Add physics to ground
    const groundAggregate = new BABYLON.PhysicsAggregate(ground, BABYLON.PhysicsShapeType.BOX, 
        { mass: 0, restitution: 0.1, friction: 0.8 }, g.scene);
    
    // Add collision object to ground
    g.CollisionManager.createWorldCollision(ground, groundAggregate, { type: "ground", name: "ground" });
    
    // Generate and create backrooms layout
    console.log("Generating Backrooms world...");
    const maze = g.generateBackrooms();
    g.lastGeneratedMaze = maze; // Store for regeneration
    g.createBackroomsWorld(maze);
    
    // Set initial player spawn position to a safe location in the maze
    const spawnPos = g.findSafeSpawnPosition(maze);
    if (g.camera) {
        g.camera.position.copyFrom(spawnPos);
    }
    
    console.log("Backrooms world created successfully");
};

// Helper function to create walls
window.game.createWall = function(x, y, z, width, height, depth, material) {
    const g = window.game;
    const wall = BABYLON.MeshBuilder.CreateBox("wall", {width: width, height: height, depth: depth}, g.scene);
    wall.position = new BABYLON.Vector3(x, y, z);
    wall.material = material;
    wall.receiveShadows = true;
    
    // Add to shadow casters
    if (g.shadowGenerator) {
        g.shadowGenerator.addShadowCaster(wall);
    }
    
    // Add physics using modern PhysicsAggregate
    const wallAggregate = new BABYLON.PhysicsAggregate(wall, BABYLON.PhysicsShapeType.BOX, 
        { mass: 0, restitution: 0.1, friction: 0.8 }, g.scene);
    
    // Add collision object to wall
    g.CollisionManager.createWorldCollision(wall, wallAggregate, { type: "wall", name: wall.name });
    
    return wall;
};