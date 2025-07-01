// World/scene module
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d';

// We're using the global game object for all game state
// so we don't need to export scene, camera, etc.

// Initialize renderer settings (if game object hasn't been created yet, we'll do this in setupLighting)
// The renderer is added to the document in main.js

// Setup lighting in the scene
window.game.setupLighting = function() {
    const g = window.game;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    g.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(50, 200, 100);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.shadow.mapSize.height = 1024;
    g.scene.add(directionalLight);

    // setup skybox
    const loader = new THREE.CubeTextureLoader();
    // Ensure the paths are correct relative to your HTML file.
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
        g.scene.background = texture;
    },
    undefined, // onProgress callback not needed here
    (error) => {
        console.error('An error occurred loading the skybox textures:', error);
    });

    // --- Set solid colour bg if it doesn't work ---
    g.scene.background = new THREE.Color(0x87CEEB); // Sky blue color
};

window.game.createWorld = function() {
    const g = window.game;
    
    // Floor
    const floorGeometry = new THREE.PlaneGeometry(100, 100);
    const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x999999 });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    g.scene.add(floor);

    // Add Rapier collider for the floor
    const floorColliderDesc = RAPIER.ColliderDesc.cuboid(50, 0.1, 50)
        .setTranslation(0, -0.1, 0) // Position it just below y=0
        .setRestitution(0.1)
        .setFriction(1.0);
    g.rapierWorld.createCollider(floorColliderDesc);
    
    // Walls and obstacles using boxes
    const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x0088ff });
    
    // Outer walls
    if(g.createWall) g.createWall(-50, 2.5, 0, 1, 5, 100, wallMaterial); // Left
    if(g.createWall) g.createWall(50, 2.5, 0, 1, 5, 100, wallMaterial);  // Right
    if(g.createWall) g.createWall(0, 2.5, -50, 100, 5, 1, wallMaterial); // Back
    if(g.createWall) g.createWall(0, 2.5, 50, 100, 5, 1, wallMaterial);  // Front
    
    // Inner structures - Random boxes and platforms
    for (let i = 0; i < 15; i++) {
        const size = 2 + Math.random() * 5;
        const height = 1 + Math.random() * 4;
        const x = (Math.random() - 0.5) * 80;
        const z = (Math.random() - 0.5) * 80;
        if(g.createWall) g.createWall(x, height/2, z, size, height, size, wallMaterial);
    }
    
    // Add some platforms
    if(g.createWall) g.createWall(-20, 3, -20, 10, 0.5, 10, wallMaterial);
    if(g.createWall) g.createWall(20, 5, 20, 15, 0.5, 15, wallMaterial);
    if(g.createWall) g.createWall(0, 7, 0, 8, 0.5, 8, wallMaterial);
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

    // Add Rapier collider for the wall
    const wallColliderDesc = RAPIER.ColliderDesc.cuboid(width / 2, height / 2, depth / 2)
        .setTranslation(x, y, z)
        .setRestitution(0.1)
        .setFriction(1.0);
    const wallBody = g.rapierWorld.createRigidBody(RAPIER.RigidBodyDesc.fixed()); // Fixed body
    g.rapierWorld.createCollider(wallColliderDesc, wallBody);

    return wall;
};

window.game.onWindowResize = function() {
    const g = window.game;
    g.camera.aspect = window.innerWidth / window.innerHeight;
    g.camera.updateProjectionMatrix();
    g.renderer.setSize(window.innerWidth, window.innerHeight);
};