// Backrooms generator for Babylon.js FPS game
// Converted from Python implementation using Prim's Algorithm with multiple mazes

// Adjustable variables for backrooms generation
window.game.BackroomsConfig = {
    // World size in units (scaled appropriately for 3D)
    WORLD_WIDTH: 200,
    WORLD_HEIGHT: 200,
    CELL_SIZE: 4, // Size of each cell in world units
    
    // Maze generation parameters
    MAZE_FILL_PERCENTAGE: 0.8, // Desired maze fill percentage
    NUM_MAZES: 50, // Number of overlapping mazes (reduced from 1000 for performance)
    STOP_COLLISION_PROBABILITY: 0.5, // Probability of stopping if colliding with previous maze
    
    // Room generation parameters
    NUM_ROOMS: 8, // Number of open rooms
    ROOM_WIDTH_RANGE: [3, 12], // Range of room width (min, max)
    ROOM_HEIGHT_RANGE: [3, 12], // Range of room height (min, max)
    
    // Pillar room parameters
    NUM_PILLAR_ROOMS: 3, // Number of rooms with pillars
    PILLAR_ROOM_WIDTH_RANGE: [6, 20], // Range of pillar room width (min, max)
    PILLAR_ROOM_HEIGHT_RANGE: [6, 20], // Range of pillar room height (min, max)
    PILLAR_SPACING_RANGE: [3, 6], // Range of pillar spacing (min, max)
    
    // Custom room parameters
    NUM_CUSTOM_ROOMS: 2, // Number of custom-shaped rooms
    MIN_NUM_SIDES: 3, // Minimum number of sides for a custom room
    MAX_NUM_SIDES: 8, // Maximum number of sides for a custom room
    MIN_CUSTOM_ROOM_RADIUS: 3, // Minimum radius of custom room
    MAX_CUSTOM_ROOM_RADIUS: 12, // Maximum radius of custom room
    
    // Wall and ceiling heights
    WALL_HEIGHT: 6,
    CEILING_HEIGHT: 5.5
};

// Calculate grid dimensions
function getGridDimensions() {
    const config = window.game.BackroomsConfig;
    return {
        numCols: Math.floor(config.WORLD_WIDTH / config.CELL_SIZE),
        numRows: Math.floor(config.WORLD_HEIGHT / config.CELL_SIZE)
    };
}

// Generate maze using Prim's Algorithm with multiple overlapping mazes
window.game.generateBackroomsMaze = function() {
    const config = window.game.BackroomsConfig;
    const { numCols, numRows } = getGridDimensions();
    
    // Initialize maze grid - [x, y, size, isPath]
    const maze = [];
    for (let y = 0; y < numRows; y++) {
        maze[y] = [];
        for (let x = 0; x < numCols; x++) {
            maze[y][x] = {
                x: x * config.CELL_SIZE - config.WORLD_WIDTH / 2,
                y: y * config.CELL_SIZE - config.WORLD_HEIGHT / 2,
                size: config.CELL_SIZE,
                isPath: false
            };
        }
    }
    
    const visitedCells = new Set();
    
    // Generate multiple overlapping mazes
    for (let mazeIndex = 0; mazeIndex < config.NUM_MAZES; mazeIndex++) {
        const startX = Math.floor(Math.random() * numCols);
        const startY = Math.floor(Math.random() * numRows);
        
        visitedCells.add(`${startX},${startY}`);
        const frontier = [{x: startX, y: startY}];
        
        while (visitedCells.size / (numCols * numRows) < config.MAZE_FILL_PERCENTAGE) {
            if (frontier.length === 0) break;
            
            // Pick random frontier cell
            const currentIndex = Math.floor(Math.random() * frontier.length);
            const current = frontier[currentIndex];
            frontier.splice(currentIndex, 1);
            
            const cellKey = `${current.x},${current.y}`;
            visitedCells.add(cellKey);
            maze[current.y][current.x].isPath = true;
            
            // Find unvisited neighbors (2 cells away for proper maze structure)
            const neighbors = [];
            if (current.x > 1 && !visitedCells.has(`${current.x - 2},${current.y}`)) {
                neighbors.push({x: current.x - 2, y: current.y});
            }
            if (current.x < numCols - 2 && !visitedCells.has(`${current.x + 2},${current.y}`)) {
                neighbors.push({x: current.x + 2, y: current.y});
            }
            if (current.y > 1 && !visitedCells.has(`${current.x},${current.y - 2}`)) {
                neighbors.push({x: current.x, y: current.y - 2});
            }
            if (current.y < numRows - 2 && !visitedCells.has(`${current.x},${current.y + 2}`)) {
                neighbors.push({x: current.x, y: current.y + 2});
            }
            
            if (neighbors.length > 0) {
                const next = neighbors[Math.floor(Math.random() * neighbors.length)];
                
                // Check collision probability
                const midX = Math.floor((current.x + next.x) / 2);
                const midY = Math.floor((current.y + next.y) / 2);
                
                if (Math.random() > config.STOP_COLLISION_PROBABILITY || !maze[midY][midX].isPath) {
                    frontier.push(next);
                    maze[midY][midX].isPath = true; // Connect the cells
                }
            }
        }
    }
    
    return maze;
};

// Generate open rooms
window.game.generateRooms = function(maze) {
    const config = window.game.BackroomsConfig;
    const { numCols, numRows } = getGridDimensions();
    
    for (let i = 0; i < config.NUM_ROOMS; i++) {
        const roomWidth = Math.floor(Math.random() * (config.ROOM_WIDTH_RANGE[1] - config.ROOM_WIDTH_RANGE[0] + 1)) + config.ROOM_WIDTH_RANGE[0];
        const roomHeight = Math.floor(Math.random() * (config.ROOM_HEIGHT_RANGE[1] - config.ROOM_HEIGHT_RANGE[0] + 1)) + config.ROOM_HEIGHT_RANGE[0];
        
        const x = Math.floor(Math.random() * (numCols - roomWidth));
        const y = Math.floor(Math.random() * (numRows - roomHeight));
        
        // Clear the room area
        for (let row = y; row < y + roomHeight; row++) {
            for (let col = x; col < x + roomWidth; col++) {
                if (row < numRows && col < numCols) {
                    maze[row][col].isPath = true;
                }
            }
        }
    }
};

// Generate rooms with pillars
window.game.generatePillarRooms = function(maze) {
    const config = window.game.BackroomsConfig;
    const { numCols, numRows } = getGridDimensions();
    
    for (let i = 0; i < config.NUM_PILLAR_ROOMS; i++) {
        const roomWidth = Math.floor(Math.random() * (config.PILLAR_ROOM_WIDTH_RANGE[1] - config.PILLAR_ROOM_WIDTH_RANGE[0] + 1)) + config.PILLAR_ROOM_WIDTH_RANGE[0];
        const roomHeight = Math.floor(Math.random() * (config.PILLAR_ROOM_HEIGHT_RANGE[1] - config.PILLAR_ROOM_HEIGHT_RANGE[0] + 1)) + config.PILLAR_ROOM_HEIGHT_RANGE[0];
        
        const x = Math.floor(Math.random() * (numCols - roomWidth));
        const y = Math.floor(Math.random() * (numRows - roomHeight));
        
        // Clear the room area
        for (let row = y; row < y + roomHeight; row++) {
            for (let col = x; col < x + roomWidth; col++) {
                if (row < numRows && col < numCols) {
                    maze[row][col].isPath = true;
                }
            }
        }
        
        // Add pillars
        const pillarSpacing = Math.floor(Math.random() * (config.PILLAR_SPACING_RANGE[1] - config.PILLAR_SPACING_RANGE[0] + 1)) + config.PILLAR_SPACING_RANGE[0];
        for (let row = y; row < y + roomHeight; row += pillarSpacing) {
            for (let col = x; col < x + roomWidth; col += pillarSpacing) {
                if (row < numRows && col < numCols) {
                    maze[row][col].isPath = false; // Create pillar
                    maze[row][col].isPillar = true; // Mark as pillar for special handling
                }
            }
        }
    }
};

// Point-in-polygon test for custom rooms
function isInsidePolygon(x, y, vertices) {
    let inside = false;
    const numVertices = vertices.length;
    
    for (let i = 0; i < numVertices; i++) {
        const j = (i + 1) % numVertices;
        
        if (((vertices[i].y > y) !== (vertices[j].y > y)) &&
            (x < (vertices[j].x - vertices[i].x) * (y - vertices[i].y) / (vertices[j].y - vertices[i].y) + vertices[i].x)) {
            inside = !inside;
        }
    }
    
    return inside;
}

// Generate custom-shaped rooms
window.game.generateCustomRooms = function(maze) {
    const config = window.game.BackroomsConfig;
    const { numCols, numRows } = getGridDimensions();
    
    for (let i = 0; i < config.NUM_CUSTOM_ROOMS; i++) {
        const numSides = Math.floor(Math.random() * (config.MAX_NUM_SIDES - config.MIN_NUM_SIDES + 1)) + config.MIN_NUM_SIDES;
        const roomRadius = Math.floor(Math.random() * (config.MAX_CUSTOM_ROOM_RADIUS - config.MIN_CUSTOM_ROOM_RADIUS + 1)) + config.MIN_CUSTOM_ROOM_RADIUS;
        
        const centerX = Math.floor(Math.random() * (numCols - roomRadius * 2)) + roomRadius;
        const centerY = Math.floor(Math.random() * (numRows - roomRadius * 2)) + roomRadius;
        
        // Generate polygon vertices
        const vertices = [];
        const angleStep = (Math.PI * 2) / numSides;
        for (let j = 0; j < numSides; j++) {
            const angle = j * angleStep;
            const vertexX = centerX + Math.floor(roomRadius * Math.cos(angle));
            const vertexY = centerY + Math.floor(roomRadius * Math.sin(angle));
            vertices.push({x: vertexX, y: vertexY});
        }
        
        // Fill the custom room
        for (let row = centerY - roomRadius; row <= centerY + roomRadius; row++) {
            for (let col = centerX - roomRadius; col <= centerX + roomRadius; col++) {
                if (row >= 0 && row < numRows && col >= 0 && col < numCols) {
                    if (isInsidePolygon(col, row, vertices)) {
                        maze[row][col].isPath = true;
                    }
                }
            }
        }
    }
};

// Generate complete backrooms layout
window.game.generateBackrooms = function() {
    console.log("Generating Backrooms layout...");
    
    // Generate base maze
    const maze = window.game.generateBackroomsMaze();
    
    // Add different room types
    window.game.generateRooms(maze);
    window.game.generatePillarRooms(maze);
    window.game.generateCustomRooms(maze);
    
    console.log("Backrooms layout generated successfully");
    return maze;
};

// Convert maze data to 3D world geometry
window.game.createBackroomsWorld = function(maze) {
    const g = window.game;
    const config = g.BackroomsConfig;
    const { numCols, numRows } = getGridDimensions();
    
    // Clear existing world geometry (except ground)
    // We'll keep the ground as base
    
    // Backrooms materials with wallpaper texture
    const wallTexture = new BABYLON.Texture("assets/wallpaper.png", g.scene);
    // Scale texture based on wall dimensions (CELL_SIZE=4, WALL_HEIGHT=6)
    // This creates appropriately sized wallpaper pattern
    wallTexture.uScale = config.CELL_SIZE / 2; // Horizontal: repeat every 2 units for good density
    wallTexture.vScale = config.WALL_HEIGHT / 3; // Vertical: repeat every 3 units for good proportion
    wallTexture.wrapU = BABYLON.Texture.WRAP_ADDRESSMODE; // Enable wrapping for tiling
    wallTexture.wrapV = BABYLON.Texture.WRAP_ADDRESSMODE;
    
    const wallMaterial = new BABYLON.StandardMaterial("backroomsWall", g.scene);
    wallMaterial.diffuseTexture = wallTexture;
    wallMaterial.diffuseColor = new BABYLON.Color3(1.0, 1.0, 1.0); // White base for pure texture color
    wallMaterial.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
    
    // Pillar material also uses wallpaper texture but slightly darker
    const pillarTexture = wallTexture.clone();
    const pillarMaterial = new BABYLON.StandardMaterial("backroomsPillar", g.scene);
    pillarMaterial.diffuseTexture = pillarTexture;
    pillarMaterial.diffuseColor = new BABYLON.Color3(0.9, 0.9, 0.9); // Slightly darker tint for pillars
    
    // Create PBR material for drop ceiling tiles
    const ceilingMaterial = new BABYLON.PBRMaterial("backroomsCeiling", g.scene);
    
    // Load ceiling tile textures (PBR workflow)
    const ceilingBaseTexture = new BABYLON.Texture("assets/tiles/tiles_diffuse.jpg", g.scene);
    const ceilingNormalTexture = new BABYLON.Texture("assets/tiles/tiles_normal.jpg", g.scene);
    const ceilingRoughnessTexture = new BABYLON.Texture("assets/tiles/tiles_roughness.jpg", g.scene);
    
    // Configure texture tiling for drop ceiling effect
    const tileScale = config.CELL_SIZE; // One tile per cell for realistic scale
    [ceilingBaseTexture, ceilingNormalTexture, ceilingRoughnessTexture].forEach(texture => {
        texture.uScale = config.WORLD_WIDTH / tileScale;
        texture.vScale = config.WORLD_HEIGHT / tileScale;
        texture.wrapU = BABYLON.Texture.WRAP_ADDRESSMODE;
        texture.wrapV = BABYLON.Texture.WRAP_ADDRESSMODE;
    });
    
    // Apply PBR textures
    ceilingMaterial.baseTexture = ceilingBaseTexture;
    ceilingMaterial.normalTexture = ceilingNormalTexture;
    ceilingMaterial.metallicTexture = ceilingRoughnessTexture; // Use roughness map for metallic channel
    ceilingMaterial.useRoughnessFromMetallicTextureGreen = true; // Green channel for roughness
    
    // PBR material properties for drop ceiling tiles
    ceilingMaterial.baseColor = new BABYLON.Color3(0.9, 0.9, 0.85); // Slight warm tint
    ceilingMaterial.metallicFactor = 0.0; // Non-metallic
    ceilingMaterial.roughnessFactor = 0.8; // Fairly rough surface
    
    // Create perimeter boundary walls around the entire map
    g.createPerimeterWalls(numCols, numRows, config, wallMaterial);
    
    // Generate walls and ceiling based on maze
    for (let row = 0; row < maze.length; row++) {
        for (let col = 0; col < maze[row].length; col++) {
            const cell = maze[row][col];
            
            if (!cell.isPath) {
                // Create wall
                if (cell.isPillar) {
                    // Create pillar (smaller, taller)
                    g.createBackroomsWall(
                        cell.x, 
                        config.WALL_HEIGHT / 2, 
                        cell.y, 
                        config.CELL_SIZE * 0.6, 
                        config.WALL_HEIGHT, 
                        config.CELL_SIZE * 0.6, 
                        pillarMaterial
                    );
                } else {
                    // Create regular wall
                    g.createBackroomsWall(
                        cell.x, 
                        config.WALL_HEIGHT / 2, 
                        cell.y, 
                        config.CELL_SIZE, 
                        config.WALL_HEIGHT, 
                        config.CELL_SIZE, 
                        wallMaterial
                    );
                }
            }
        }
    }
    
    // Create complete ceiling coverage (separate from walls to ensure no holes)
    g.createCompleteCeiling(numCols, numRows, config, ceilingMaterial);
    
    // Generate ceiling lights for proper illumination
    g.createCeilingLights(maze, config);
    
    console.log("3D Backrooms world created with perimeter walls, complete ceiling, and lighting");
};

// Enhanced wall creation function for backrooms
window.game.createBackroomsWall = function(x, y, z, width, height, depth, material) {
    const g = window.game;
    const wall = BABYLON.MeshBuilder.CreateBox("backroomsWall", {width: width, height: height, depth: depth}, g.scene);
    wall.position = new BABYLON.Vector3(x, y, z);
    wall.material = material;
    wall.receiveShadows = true;
    
    // Add to shadow casters
    if (g.shadowGenerator) {
        g.shadowGenerator.addShadowCaster(wall);
    }
    
    // Add physics
    const wallAggregate = new BABYLON.PhysicsAggregate(wall, BABYLON.PhysicsShapeType.BOX, 
        { mass: 0, restitution: 0.1, friction: 0.8 }, g.scene);
    
    // Add collision object
    g.CollisionManager.createWorldCollision(wall, wallAggregate, { type: "backroomsWall", name: wall.name });
    
    return wall;
};

// Find a safe spawn position in the generated maze
window.game.findSafeSpawnPosition = function(maze) {
    const config = window.game.BackroomsConfig;
    const { numCols, numRows } = getGridDimensions();
    
    // Find open areas (paths) for spawning
    const openCells = [];
    for (let row = 0; row < maze.length; row++) {
        for (let col = 0; col < maze[row].length; col++) {
            if (maze[row][col].isPath) {
                openCells.push(maze[row][col]);
            }
        }
    }
    
    if (openCells.length > 0) {
        const spawnCell = openCells[Math.floor(Math.random() * openCells.length)];
        return new BABYLON.Vector3(spawnCell.x, 1.7, spawnCell.y);
    }
    
    // Fallback to center if no open cells found
    return new BABYLON.Vector3(0, 1.7, 0);
};

// Regenerate backrooms (similar to pressing 'R' in the Python version)
window.game.regenerateBackrooms = function() {
    const g = window.game;
    
    console.log("Regenerating Backrooms...");
    
    // Clear existing world geometry (keep only ground)
    const meshesToRemove = [];
    const lightsToRemove = [];
    for (const mesh of g.scene.meshes) {
        if (mesh.name.startsWith("backroomsWall") || 
            mesh.name.startsWith("ceiling") || 
            mesh.name.startsWith("completeCeiling") ||
            mesh.name.startsWith("wall") ||
            mesh.name.startsWith("lightFixture") ||
            mesh.name.startsWith("lightBulb") ||
            mesh.name.startsWith("spotlightFixture") ||
            mesh.name.startsWith("neonTube") ||
            mesh.name.startsWith("neonRing")) {
            meshesToRemove.push(mesh);
        }
    }
    
    // Clear lights
    for (const light of g.scene.lights) {
        if (light.name.startsWith("ceilingLight") || 
            light.name.startsWith("accentLight")) {
            lightsToRemove.push(light);
        }
    }
    
    // Dispose old meshes
    meshesToRemove.forEach(mesh => {
        if (mesh.physicsAggregate) {
            mesh.physicsAggregate.dispose();
        }
        mesh.dispose();
    });
    
    // Dispose old lights
    lightsToRemove.forEach(light => {
        light.dispose();
    });
    
    // Clear flickering lights data
    if (g.flickeringLights) {
        g.flickeringLights = {};
    }
    if (g.flickeringNeonLights) {
        g.flickeringNeonLights = {};
    }
    
    // Clear glow layer if it exists
    if (g.glowLayer) {
        g.glowLayer.dispose();
        g.glowLayer = null;
    }
    
    // Generate new layout
    const newMaze = g.generateBackrooms();
    g.lastGeneratedMaze = newMaze;
    
    // Create new world
    g.createBackroomsWorld(newMaze);
    
    // Teleport player to new safe position
    const newSpawnPos = g.findSafeSpawnPosition(newMaze);
    if (g.camera) {
        g.camera.position.copyFrom(newSpawnPos);
    }
    if (g.playerController) {
        g.playerController.setPosition(newSpawnPos);
    }
    if (g.playerMesh) {
        g.playerMesh.position.copyFrom(newSpawnPos);
    }
    
    // Clear existing enemies
    if (g.enemies) {
        g.enemies.forEach(enemy => {
            if (enemy.mesh) enemy.mesh.dispose();
            if (enemy.aggregate) enemy.aggregate.dispose();
        });
        g.enemies.length = 0;
        g.enemiesRemaining = 0;
    }
    
    console.log("Backrooms regenerated successfully!");
};

// Create perimeter boundary walls around the entire map
window.game.createPerimeterWalls = function(numCols, numRows, config, wallMaterial) {
    const g = window.game;
    
    // Calculate world boundaries
    const halfWidth = config.WORLD_WIDTH / 2;
    const halfHeight = config.WORLD_HEIGHT / 2;
    const wallThickness = config.CELL_SIZE;
    const wallHeight = config.WALL_HEIGHT;
    
    // North wall (top edge)
    g.createBackroomsWall(
        0, 
        wallHeight / 2, 
        -halfHeight - wallThickness / 2, 
        config.WORLD_WIDTH + wallThickness * 2, 
        wallHeight, 
        wallThickness, 
        wallMaterial
    );
    
    // South wall (bottom edge)
    g.createBackroomsWall(
        0, 
        wallHeight / 2, 
        halfHeight + wallThickness / 2, 
        config.WORLD_WIDTH + wallThickness * 2, 
        wallHeight, 
        wallThickness, 
        wallMaterial
    );
    
    // West wall (left edge)
    g.createBackroomsWall(
        -halfWidth - wallThickness / 2, 
        wallHeight / 2, 
        0, 
        wallThickness, 
        wallHeight, 
        config.WORLD_HEIGHT, 
        wallMaterial
    );
    
    // East wall (right edge)
    g.createBackroomsWall(
        halfWidth + wallThickness / 2, 
        wallHeight / 2, 
        0, 
        wallThickness, 
        wallHeight, 
        config.WORLD_HEIGHT, 
        wallMaterial
    );
    
    console.log("Perimeter boundary walls created");
};

// Create complete ceiling coverage to eliminate holes
window.game.createCompleteCeiling = function(numCols, numRows, config, ceilingMaterial) {
    const g = window.game;
    
    // Create one large ceiling piece that covers the entire world area
    const ceilingWidth = config.WORLD_WIDTH;
    const ceilingDepth = config.WORLD_HEIGHT;
    
    const completeCeiling = BABYLON.MeshBuilder.CreateBox("completeCeiling", {
        width: ceilingWidth, 
        height: 0.2, 
        depth: ceilingDepth
    }, g.scene);
    
    completeCeiling.position = new BABYLON.Vector3(0, config.CEILING_HEIGHT, 0);
    completeCeiling.material = ceilingMaterial;
    completeCeiling.receiveShadows = true;
    
    // Add physics to complete ceiling
    const ceilingAggregate = new BABYLON.PhysicsAggregate(completeCeiling, BABYLON.PhysicsShapeType.BOX, 
        { mass: 0, restitution: 0.1, friction: 0.8 }, g.scene);
    
    // Add collision object
    g.CollisionManager.createWorldCollision(completeCeiling, ceilingAggregate, { 
        type: "ceiling", 
        name: "completeCeiling" 
    });
    
    console.log("Complete ceiling coverage created");
};

// Create comprehensive neon yellow glow lighting system
window.game.createCeilingLights = function(maze, config) {
    const g = window.game;
    const { numCols, numRows } = getGridDimensions();
    
    // Initialize glow layer for neon effect
    if (!g.glowLayer) {
        g.glowLayer = new BABYLON.GlowLayer("neonGlow", g.scene);
        g.glowLayer.intensity = 1.5; // Strong glow for neon effect
        g.glowLayer.blurKernelSize = 64; // Soft glow spread
    }
    
    // Lighting configuration
    const lightSpacing = config.CELL_SIZE * 1.5; // Closer spacing for better coverage
    const lightHeight = config.CEILING_HEIGHT - 0.4; // Just below ceiling
    const tubeLength = config.CELL_SIZE * 0.8; // Length of neon tube
    const tubeRadius = 0.08; // Radius of neon tube
    
    // Neon yellow emissive material
    const neonMaterial = new BABYLON.StandardMaterial("neonYellow", g.scene);
    neonMaterial.emissiveColor = new BABYLON.Color3(1.0, 1.0, 0.0); // Bright yellow
    neonMaterial.diffuseColor = new BABYLON.Color3(0.1, 0.1, 0.0); // Dark base
    neonMaterial.specularColor = new BABYLON.Color3(0.0, 0.0, 0.0); // No specular
    
    // Fixture material (dark metal)
    const fixtureMaterial = new BABYLON.StandardMaterial("lightFixture", g.scene);
    fixtureMaterial.diffuseColor = new BABYLON.Color3(0.2, 0.2, 0.2); // Dark gray
    fixtureMaterial.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
    
    let lightCount = 0;
    const maxLights = 150; // Increased limit for better coverage
    
    // More aggressive coverage - check more positions
    const startX = -config.WORLD_WIDTH / 2 + lightSpacing / 2;
    const endX = config.WORLD_WIDTH / 2 - lightSpacing / 2;
    const startZ = -config.WORLD_HEIGHT / 2 + lightSpacing / 2;
    const endZ = config.WORLD_HEIGHT / 2 - lightSpacing / 2;
    
    console.log(`Generating lights from (${startX}, ${startZ}) to (${endX}, ${endZ}) with spacing ${lightSpacing}`);
    
    // Generate lights in a comprehensive grid pattern
    for (let x = startX; x <= endX; x += lightSpacing) {
        for (let z = startZ; z <= endZ; z += lightSpacing) {
            if (lightCount >= maxLights) break;
            
            // Check multiple points around this position for better coverage
            const checkPositions = [
                {x: x, z: z},
                {x: x + lightSpacing * 0.3, z: z},
                {x: x - lightSpacing * 0.3, z: z},
                {x: x, z: z + lightSpacing * 0.3},
                {x: x, z: z - lightSpacing * 0.3}
            ];
            
            let bestPosition = null;
            for (const pos of checkPositions) {
                if (g.isPositionInOpenArea(pos.x, pos.z, maze, config)) {
                    bestPosition = pos;
                    break;
                }
            }
            
            if (bestPosition) {
                // Create neon tube light (cylindrical)
                const neonTube = BABYLON.MeshBuilder.CreateCylinder(`neonTube_${lightCount}`, {
                    height: tubeLength,
                    diameter: tubeRadius * 2,
                    tessellation: 8
                }, g.scene);
                
                // Rotate to horizontal position
                neonTube.rotation.z = Math.PI / 2;
                neonTube.position = new BABYLON.Vector3(bestPosition.x, lightHeight, bestPosition.z);
                neonTube.material = neonMaterial;
                
                // Add to glow layer for neon effect
                g.glowLayer.addIncludedOnlyMesh(neonTube);
                
                // Create fixture housing around the tube
                const fixture = BABYLON.MeshBuilder.CreateBox(`lightFixture_${lightCount}`, {
                    width: tubeLength * 1.2,
                    height: 0.12,
                    depth: 0.2
                }, g.scene);
                
                fixture.position = new BABYLON.Vector3(bestPosition.x, lightHeight + 0.06, bestPosition.z);
                fixture.material = fixtureMaterial;
                
                // Create actual point light for scene illumination
                const pointLight = new BABYLON.PointLight(`ceilingLight_${lightCount}`, 
                    new BABYLON.Vector3(bestPosition.x, lightHeight - 0.1, bestPosition.z), g.scene);
                
                pointLight.intensity = 0.6; // Higher intensity for neon effect
                pointLight.diffuse = new BABYLON.Color3(1.0, 1.0, 0.7); // Yellow-white light
                pointLight.specular = new BABYLON.Color3(1.0, 1.0, 0.8);
                pointLight.range = lightSpacing * 2; // Good coverage
                
                // Store light data for flickering
                const lightData = {
                    tube: neonTube,
                    light: pointLight,
                    baseEmissive: neonMaterial.emissiveColor.clone(),
                    baseIntensity: pointLight.intensity
                };
                
                // Add flickering to some lights
                if (Math.random() < 0.15) { // 15% of lights flicker
                    g.addNeonFlicker(lightData, lightCount);
                }
                
                lightCount++;
            }
        }
        if (lightCount >= maxLights) break;
    }
    
    // Add emergency/accent lighting in larger rooms
    g.addNeonAccentLighting(maze, config, lightCount);
    
    console.log(`Created ${lightCount} neon ceiling lights with glow effects`);
};

// Helper function to check if a position is in an open area
window.game.isPositionInOpenArea = function(worldX, worldZ, maze, config) {
    const g = window.game;
    
    // Convert world coordinates to grid coordinates
    const gridX = Math.floor((worldX + config.WORLD_WIDTH / 2) / config.CELL_SIZE);
    const gridZ = Math.floor((worldZ + config.WORLD_HEIGHT / 2) / config.CELL_SIZE);
    
    // Debug logging for first few checks
    if (Math.random() < 0.01) { // Log 1% of checks for debugging
        console.log(`Checking position: world(${worldX}, ${worldZ}) -> grid(${gridX}, ${gridZ}), bounds: [0-${maze[0]?.length-1}, 0-${maze.length-1}]`);
    }
    
    // Check bounds
    if (gridZ < 0 || gridZ >= maze.length || gridX < 0 || gridX >= (maze[0]?.length || 0)) {
        return false;
    }
    
    // Check if the cell is a path (open area)
    const cell = maze[gridZ] && maze[gridZ][gridX];
    return cell && cell.isPath;
};

// Add neon accent lighting for larger rooms and special areas
window.game.addNeonAccentLighting = function(maze, config, startLightId) {
    const g = window.game;
    let accentLightCount = 0;
    const maxAccentLights = 15;
    
    // Find larger open areas (rooms) and add brighter neon accent lights
    const openAreas = g.findLargeOpenAreas(maze, config);
    
    // Neon orange material for accent lights
    const neonOrangeMaterial = new BABYLON.StandardMaterial("neonOrange", g.scene);
    neonOrangeMaterial.emissiveColor = new BABYLON.Color3(1.0, 0.5, 0.0); // Bright orange
    neonOrangeMaterial.diffuseColor = new BABYLON.Color3(0.1, 0.05, 0.0); // Dark base
    neonOrangeMaterial.specularColor = new BABYLON.Color3(0.0, 0.0, 0.0);
    
    for (const area of openAreas) {
        if (accentLightCount >= maxAccentLights) break;
        
        // Create larger neon ring light for rooms
        const neonRing = BABYLON.MeshBuilder.CreateTorus(`neonRing_${startLightId + accentLightCount}`, {
            diameter: Math.min(area.size * 0.6, 8),
            thickness: 0.15,
            tessellation: 16
        }, g.scene);
        
        neonRing.position = new BABYLON.Vector3(area.centerX, config.CEILING_HEIGHT - 0.3, area.centerZ);
        neonRing.material = neonOrangeMaterial;
        
        // Add ring to glow layer
        g.glowLayer.addIncludedOnlyMesh(neonRing);
        
        // Create brighter spotlight for this area
        const spotlight = new BABYLON.SpotLight(`accentLight_${startLightId + accentLightCount}`,
            new BABYLON.Vector3(area.centerX, config.CEILING_HEIGHT - 0.2, area.centerZ),
            new BABYLON.Vector3(0, -1, 0), // Point down
            Math.PI / 4, // 45-degree cone
            2, // Sharp falloff
            g.scene);
        
        spotlight.intensity = 0.8;
        spotlight.diffuse = new BABYLON.Color3(1.0, 0.7, 0.3); // Orange-white light
        spotlight.specular = new BABYLON.Color3(1.0, 0.8, 0.5);
        spotlight.range = area.size * 2;
        
        // Store accent light data for potential flickering
        const accentLightData = {
            ring: neonRing,
            light: spotlight,
            baseEmissive: neonOrangeMaterial.emissiveColor.clone(),
            baseIntensity: spotlight.intensity
        };
        
        // Occasional flickering for accent lights
        if (Math.random() < 0.2) {
            g.addNeonFlicker(accentLightData, startLightId + accentLightCount);
        }
        
        accentLightCount++;
    }
    
    console.log(`Added ${accentLightCount} neon accent lights in larger rooms`);
};

// Find larger open areas for accent lighting
window.game.findLargeOpenAreas = function(maze, config) {
    const areas = [];
    const minRoomSize = 3; // Minimum size to be considered a "room"
    const visited = new Set();
    
    for (let row = 0; row < maze.length; row++) {
        for (let col = 0; col < maze[row].length; col++) {
            const key = `${row},${col}`;
            if (visited.has(key) || !maze[row][col].isPath) continue;
            
            // Flood fill to find connected open area
            const area = { cells: [], minX: col, maxX: col, minZ: row, maxZ: row };
            const queue = [{row, col}];
            visited.add(key);
            
            while (queue.length > 0) {
                const {row: r, col: c} = queue.shift();
                area.cells.push({row: r, col: c});
                area.minX = Math.min(area.minX, c);
                area.maxX = Math.max(area.maxX, c);
                area.minZ = Math.min(area.minZ, r);
                area.maxZ = Math.max(area.maxZ, r);
                
                // Check neighbors
                [[0,1], [0,-1], [1,0], [-1,0]].forEach(([dr, dc]) => {
                    const nr = r + dr, nc = c + dc;
                    const nkey = `${nr},${nc}`;
                    if (nr >= 0 && nr < maze.length && nc >= 0 && nc < maze[0].length &&
                        !visited.has(nkey) && maze[nr][nc].isPath) {
                        visited.add(nkey);
                        queue.push({row: nr, col: nc});
                    }
                });
            }
            
            // If area is large enough, add it
            const width = area.maxX - area.minX + 1;
            const height = area.maxZ - area.minZ + 1;
            if (width >= minRoomSize && height >= minRoomSize) {
                // Calculate world coordinates for center
                const centerCol = (area.minX + area.maxX) / 2;
                const centerRow = (area.minZ + area.maxZ) / 2;
                area.centerX = centerCol * config.CELL_SIZE - config.WORLD_WIDTH / 2;
                area.centerZ = centerRow * config.CELL_SIZE - config.WORLD_HEIGHT / 2;
                area.size = Math.min(width, height) * config.CELL_SIZE;
                areas.push(area);
            }
        }
    }
    
    return areas.slice(0, 15); // Limit number of accent areas
};

// Add neon flicker effect with glow integration
window.game.addNeonFlicker = function(lightData, lightId) {
    const g = window.game;
    
    // Store flicker data for neon lights
    if (!g.flickeringNeonLights) g.flickeringNeonLights = {};
    g.flickeringNeonLights[lightId] = {
        ...lightData,
        flickerSpeed: 2 + Math.random() * 4, // Faster flicker for neon
        phase: Math.random() * Math.PI * 2,
        flickerIntensity: 0.3 + Math.random() * 0.4, // Variable flicker strength
        strobeChance: 0.02, // 2% chance of strobe effect per frame
        lastStrobe: 0
    };
};

// Update neon light flicker with glow effects
window.game.updateLightFlicker = function() {
    const g = window.game;
    if (!g.flickeringNeonLights) return;
    
    const time = Date.now() * 0.001; // Convert to seconds
    const frameTime = Date.now();
    
    for (const [lightId, flickerData] of Object.entries(g.flickeringNeonLights)) {
        const { tube, ring, light, baseEmissive, baseIntensity, flickerSpeed, phase, flickerIntensity, strobeChance, lastStrobe } = flickerData;
        
        // Check if objects are still valid
        const mainMesh = tube || ring;
        if (!mainMesh || mainMesh.isDisposed() || !light || light.isDisposed()) {
            delete g.flickeringNeonLights[lightId];
            continue;
        }
        
        let flickerMultiplier = 1.0;
        
        // Random strobe effect
        if (Math.random() < strobeChance && frameTime - lastStrobe > 1000) {
            flickerMultiplier = Math.random() < 0.5 ? 0.1 : 1.8; // Sharp on/off
            flickerData.lastStrobe = frameTime;
        } else {
            // Normal sinusoidal flicker
            const flicker = Math.sin(time * flickerSpeed + phase) * flickerIntensity + 1;
            flickerMultiplier = Math.max(0.2, flicker); // Don't go completely dark
        }
        
        // Apply flicker to light intensity
        light.intensity = baseIntensity * flickerMultiplier;
        
        // Apply flicker to emissive material
        if (mainMesh.material && mainMesh.material.emissiveColor) {
            mainMesh.material.emissiveColor = baseEmissive.scale(flickerMultiplier);
        }
        
        // Extra dim effect for dramatic strobe
        if (flickerMultiplier < 0.3) {
            light.intensity *= 0.5;
            if (mainMesh.material && mainMesh.material.emissiveColor) {
                mainMesh.material.emissiveColor = baseEmissive.scale(0.1);
            }
        }
    }
};