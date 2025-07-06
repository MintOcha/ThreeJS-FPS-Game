// World/scene module for Babylon.js

// Setup lighting in the scene
window.game.setupLighting = function() {
    const g = window.game;

    // Ambient light
    const ambientLight = new BABYLON.HemisphericLight("ambientLight", new BABYLON.Vector3(0, 1, 0), g.scene);
    ambientLight.intensity = 0.6;

    // Directional light for shadows
    const directionalLight = new BABYLON.DirectionalLight("dirLight", new BABYLON.Vector3(-1, -1, -1), g.scene);
    directionalLight.position = new BABYLON.Vector3(50, 200, 100);
    directionalLight.intensity = 0.8;
    
    // Enable shadows
    const shadowGenerator = new BABYLON.ShadowGenerator(1024, directionalLight);
    shadowGenerator.useBlurExponentialShadowMap = true;
    shadowGenerator.blurKernel = 32;
    g.shadowGenerator = shadowGenerator;

    // Set sky color background
    g.scene.clearColor = new BABYLON.Color3(0.53, 0.81, 0.92); // Sky blue
};

window.game.createWorld = function() {
    const g = window.game;
    
    // Floor
    const ground = BABYLON.MeshBuilder.CreateGround("ground", {width: 100, height: 100}, g.scene);
    const groundMaterial = new BABYLON.StandardMaterial("groundMat", g.scene);
    groundMaterial.diffuseColor = new BABYLON.Color3(0.6, 0.6, 0.6);
    ground.material = groundMaterial;
    ground.receiveShadows = true;
    
    // Add physics to ground using modern PhysicsAggregate
    const groundAggregate = new BABYLON.PhysicsAggregate(ground, BABYLON.PhysicsShapeType.BOX, 
        { mass: 0, restitution: 0.1, friction: 0.8 }, g.scene);
    
    // Add collision object to ground
    g.CollisionManager.createWorldCollision(ground, groundAggregate, { type: "ground", name: "ground" });
    
    // Wall material
    const wallMaterial = new BABYLON.StandardMaterial("wallMat", g.scene);
    wallMaterial.diffuseColor = new BABYLON.Color3(0, 0.53, 1);
    
    // Outer walls
    g.createWall(-50, 2.5, 0, 1, 5, 100, wallMaterial); // Left
    g.createWall(50, 2.5, 0, 1, 5, 100, wallMaterial);  // Right
    g.createWall(0, 2.5, -50, 100, 5, 1, wallMaterial); // Back
    g.createWall(0, 2.5, 50, 100, 5, 1, wallMaterial);  // Front
    
    // Inner structures - Random boxes and platforms
    for (let i = 0; i < 15; i++) {
        const size = 2 + Math.random() * 5;
        const height = 1 + Math.random() * 4;
        const x = (Math.random() - 0.5) * 80;
        const z = (Math.random() - 0.5) * 80;
        g.createWall(x, height/2, z, size, height, size, wallMaterial);
    }
    
    // Add some platforms
    g.createWall(-20, 3, -20, 10, 0.5, 10, wallMaterial);
    g.createWall(20, 5, 20, 15, 0.5, 15, wallMaterial);
    g.createWall(0, 7, 0, 8, 0.5, 8, wallMaterial);
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