// World/scene module
import * as THREE from 'three';

// We're using the global game object for all game state
// so we don't need to export scene, camera, etc.

// Initialize renderer settings (if game object hasn't been created yet, we'll do this in setupLighting)
// The renderer is added to the document in main.js

// Setup lighting in the scene
window.game.setupLighting = function() {
    const g = window.game;

    // Remove or comment out existing lights
    // const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    // g.scene.add(ambientLight);

    // const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    // directionalLight.position.set(50, 200, 100);
    // directionalLight.castShadow = true;
    // directionalLight.shadow.mapSize.width = 1024;
    // directionalLight.shadow.mapSize.height = 1024;
    // g.scene.add(directionalLight);
    
    // Backrooms Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5); // Softer overall ambient
    g.scene.add(ambientLight);

    // Add a few PointLights to simulate fluorescent fixtures
    // These are just examples, placement might need to be tied to grid generation
    const wallHeight = 3; // Should match wallHeight in createWorld
    const pointLight1 = new THREE.PointLight(0xFFFDD0, 0.7, 30, 1.5); // Color, Intensity, Distance, Decay
    pointLight1.position.set(10, wallHeight - 0.5, 10);
    // pointLight1.castShadow = true; // Performance heavy
    g.scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0xFFFDD0, 0.7, 30, 1.5);
    pointLight2.position.set(-10, wallHeight - 0.5, -10);
    // pointLight2.castShadow = true;
    g.scene.add(pointLight2);
    
    const pointLight3 = new THREE.PointLight(0xFFFDD0, 0.7, 30, 1.5);
    pointLight3.position.set(10, wallHeight - 0.5, -10);
    // pointLight3.castShadow = true;
    g.scene.add(pointLight3);

    const pointLight4 = new THREE.PointLight(0xFFFDD0, 0.7, 30, 1.5);
    pointLight4.position.set(-10, wallHeight - 0.5, 10);
    // pointLight4.castShadow = true;
    g.scene.add(pointLight4);


    // Remove skybox, set plain background color for Backrooms
    // const loader = new THREE.CubeTextureLoader();
    // const texture = loader.load([...]);
    // g.scene.background = texture;

    g.scene.background = new THREE.Color(0x101010); // Dark color, or a very dim yellow
    g.scene.fog = new THREE.Fog(0x101010, 10, 50); // Fog to enhance atmosphere
};

window.game.createWorld = function() {
    const g = window.game;

    // Grid Generation
    const gridWidth = 51;
    const gridHeight = 51;
    const mazeGrid = window.game.generateMaze(gridWidth, gridHeight);
    const backroomsGrid = window.game.convertToBackroomsStyle(
        mazeGrid,
        20, // roomAttempts
        5,  // roomMinSize
        11, // roomMaxSize
        true, // removeDeadEnds
        3   // deadEndPasses
    );

    // Wall and world scale parameters
    const wallSize = 2;
    const wallHeight = 3; // Height of the walls

    // Wall Material
    const wallMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xFFFFE0, // Light yellow
        roughness: 0.8, 
        metalness: 0.2 
    });

    // Floor
    const floorGeometry = new THREE.PlaneGeometry(gridWidth * wallSize, gridHeight * wallSize);
    const floorMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xC2B280, // Dingy yellow/light brown
        roughness: 0.9 
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    g.scene.add(floor);

    // Ceiling
    const ceilingGeometry = new THREE.PlaneGeometry(gridWidth * wallSize, gridHeight * wallSize);
    const ceilingMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xAAAAAA, // Light grey
        roughness: 0.9
    });
    const ceiling = new THREE.Mesh(ceilingGeometry, ceilingMaterial);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = wallHeight;
    // ceiling.receiveShadow = true; // Optional
    g.scene.add(ceiling);
    
    // Clear Existing Static Obstacles (Old code is removed by not being here)

    // Instantiate Walls from Grid
    for (let r = 0; r < gridHeight; r++) {
        for (let c = 0; c < gridWidth; c++) {
            if (backroomsGrid[r][c] === 1) { // 1 represents a wall
                const x = (c - gridWidth / 2) * wallSize;
                const z = (r - gridHeight / 2) * wallSize;
                // y position is wallHeight / 2 because the origin of a BoxGeometry is its center
                if(g.createWall) g.createWall(x, wallHeight / 2, z, wallSize, wallHeight, wallSize, wallMaterial);
            }
        }
    }
    
    
    // Store grid and config for pathfinding and other systems
    g.levelGrid = backroomsGrid;
    g.gridConfig = {
        width: gridWidth,    // Number of columns
        height: gridHeight,  // Number of rows
        tileSize: wallSize
    };

    // Adjust player spawn point to the first empty cell
    let playerSpawned = false;
    for (let r = 0; r < gridHeight; r++) {
        for (let c = 0; c < gridWidth; c++) {
            if (backroomsGrid[r][c] === 0) { // 0 is a path
                g.camera.position.set(
                    (c - gridWidth / 2 + 0.5) * wallSize, // Center of the tile
                    1.7, // Standard player eye height
                    (r - gridHeight / 2 + 0.5) * wallSize  // Center of the tile
                );
                playerSpawned = true;
                r = gridHeight; // Break outer loop
                break;          // Break inner loop
            }
        }
    }
    if (!playerSpawned) {
        console.warn("Could not find an empty cell to spawn player. Defaulting to (0, 1.7, 0).");
        g.camera.position.set(0, 1.7, 0);
    }
};

// Helper function to create walls
window.game.createWall = function(x, y, z, width, height, depth, material) {
    const g = window.game;
    const geometry = new THREE.BoxGeometry(width, height, depth);
    const wall = new THREE.Mesh(geometry, material);
    wall.position.set(x, y, z);
    wall.castShadow = true;
    wall.receiveShadow = true;
    g.scene.add(wall);
    return wall;
};

window.game.onWindowResize = function() {
    const g = window.game;
    g.camera.aspect = window.innerWidth / window.innerHeight;
    g.camera.updateProjectionMatrix();
    g.renderer.setSize(window.innerWidth, window.innerHeight);
};