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
    WALL_HEIGHT: 5,
    CEILING_HEIGHT: 4
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
    
    // Clear existing world geometry (except ground)
    // We'll keep the ground as base
    
    // Backrooms materials
    const wallMaterial = new BABYLON.StandardMaterial("backroomsWall", g.scene);
    wallMaterial.diffuseColor = new BABYLON.Color3(0.9, 0.9, 0.7); // Yellowish walls
    wallMaterial.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
    
    const pillarMaterial = new BABYLON.StandardMaterial("backroomsPillar", g.scene);
    pillarMaterial.diffuseColor = new BABYLON.Color3(0.8, 0.8, 0.6); // Slightly darker for pillars
    
    const ceilingMaterial = new BABYLON.StandardMaterial("backroomsCeiling", g.scene);
    ceilingMaterial.diffuseColor = new BABYLON.Color3(0.95, 0.95, 0.85); // Light ceiling
    
    // Generate walls based on maze
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
            } else {
                // Create ceiling tile for open areas
                const ceiling = BABYLON.MeshBuilder.CreateBox("ceiling", {
                    width: config.CELL_SIZE, 
                    height: 0.2, 
                    depth: config.CELL_SIZE
                }, g.scene);
                ceiling.position = new BABYLON.Vector3(cell.x, config.CEILING_HEIGHT, cell.y);
                ceiling.material = ceilingMaterial;
                ceiling.receiveShadows = true;
                
                // Add physics to ceiling
                const ceilingAggregate = new BABYLON.PhysicsAggregate(ceiling, BABYLON.PhysicsShapeType.BOX, 
                    { mass: 0, restitution: 0.1, friction: 0.8 }, g.scene);
                
                // Add collision object
                g.CollisionManager.createWorldCollision(ceiling, ceilingAggregate, { type: "ceiling", name: ceiling.name });
            }
        }
    }
    
    console.log("3D Backrooms world created");
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
    for (const mesh of g.scene.meshes) {
        if (mesh.name.startsWith("backroomsWall") || 
            mesh.name.startsWith("ceiling") || 
            mesh.name.startsWith("wall")) {
            meshesToRemove.push(mesh);
        }
    }
    
    // Dispose old meshes
    meshesToRemove.forEach(mesh => {
        if (mesh.physicsAggregate) {
            mesh.physicsAggregate.dispose();
        }
        mesh.dispose();
    });
    
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