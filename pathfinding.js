// A* Pathfinding system for Babylon.js FPS game
// Optimized for 2D grid navigation in backrooms maze

// Binary heap implementation for efficient priority queue
class BinaryHeap {
    constructor(scoreFunction) {
        this.content = [];
        this.scoreFunction = scoreFunction;
    }

    push(element) {
        this.content.push(element);
        this.sinkDown(this.content.length - 1);
    }

    pop() {
        const result = this.content[0];
        const end = this.content.pop();
        if (this.content.length > 0) {
            this.content[0] = end;
            this.bubbleUp(0);
        }
        return result;
    }

    remove(node) {
        const i = this.content.indexOf(node);
        const end = this.content.pop();
        if (i !== this.content.length - 1) {
            this.content[i] = end;
            if (this.scoreFunction(end) < this.scoreFunction(node)) {
                this.sinkDown(i);
            } else {
                this.bubbleUp(i);
            }
        }
    }

    size() {
        return this.content.length;
    }

    rescoreElement(node) {
        this.sinkDown(this.content.indexOf(node));
    }

    sinkDown(n) {
        const element = this.content[n];
        while (n > 0) {
            const parentN = ((n + 1) >> 1) - 1;
            const parent = this.content[parentN];
            if (this.scoreFunction(element) < this.scoreFunction(parent)) {
                this.content[parentN] = element;
                this.content[n] = parent;
                n = parentN;
            } else {
                break;
            }
        }
    }

    bubbleUp(n) {
        const length = this.content.length;
        const element = this.content[n];
        const elemScore = this.scoreFunction(element);

        while (true) {
            const child2N = (n + 1) << 1;
            const child1N = child2N - 1;
            let swap = null;
            let child1Score;
            if (child1N < length) {
                const child1 = this.content[child1N];
                child1Score = this.scoreFunction(child1);
                if (child1Score < elemScore) {
                    swap = child1N;
                }
            }
            if (child2N < length) {
                const child2 = this.content[child2N];
                const child2Score = this.scoreFunction(child2);
                if (child2Score < (swap === null ? elemScore : child1Score)) {
                    swap = child2N;
                }
            }

            if (swap !== null) {
                this.content[n] = this.content[swap];
                this.content[swap] = element;
                n = swap;
            } else {
                break;
            }
        }
    }
}

// Pathfinding node class
class PathNode {
    constructor(x, y, isWalkable) {
        this.x = x;
        this.y = y;
        this.isWalkable = isWalkable;
        this.f = 0;
        this.g = 0;
        this.h = 0;
        this.visited = false;
        this.closed = false;
        this.parent = null;
    }

    toString() {
        return `[${this.x},${this.y}]`;
    }

    getCost(fromNeighbor) {
        // Diagonal movement costs more
        if (fromNeighbor && fromNeighbor.x !== this.x && fromNeighbor.y !== this.y) {
            return 1.414;
        }
        return 1.0;
    }

    isWall() {
        return !this.isWalkable;
    }
}

// A* pathfinding graph
class PathfindingGraph {
    constructor(gridArray, options = {}) {
        this.options = {
            closest: options.closest || false,
            heuristic: options.heuristic || PathfindingGraph.heuristics.manhattan,
            diagonal: options.diagonal || false
        };
        this.nodes = [];
        this.diagonal = !!this.options.diagonal;
        this.init(gridArray);
    }

    init(grid) {
        this.dirtyNodes = [];
        this.nodes = [];

        for (let x = 0; x < grid.length; x++) {
            this.nodes[x] = [];
            for (let y = 0; y < grid[x].length; y++) {
                this.nodes[x][y] = new PathNode(x, y, grid[x][y]);
            }
        }
    }

    cleanDirty() {
        for (let i = 0; i < this.dirtyNodes.length; i++) {
            this.dirtyNodes[i].f = 0;
            this.dirtyNodes[i].g = 0;
            this.dirtyNodes[i].h = 0;
            this.dirtyNodes[i].visited = false;
            this.dirtyNodes[i].closed = false;
            this.dirtyNodes[i].parent = null;
        }
        this.dirtyNodes = [];
    }

    markDirty(node) {
        this.dirtyNodes.push(node);
    }

    neighbors(node) {
        const ret = [];
        const x = node.x;
        const y = node.y;
        const grid = this.nodes;

        // West
        if (grid[x - 1] && grid[x - 1][y]) {
            ret.push(grid[x - 1][y]);
        }

        // East
        if (grid[x + 1] && grid[x + 1][y]) {
            ret.push(grid[x + 1][y]);
        }

        // South
        if (grid[x] && grid[x][y - 1]) {
            ret.push(grid[x][y - 1]);
        }

        // North
        if (grid[x] && grid[x][y + 1]) {
            ret.push(grid[x][y + 1]);
        }

        if (this.diagonal) {
            // Southwest
            if (grid[x - 1] && grid[x - 1][y - 1]) {
                ret.push(grid[x - 1][y - 1]);
            }

            // Southeast
            if (grid[x + 1] && grid[x + 1][y - 1]) {
                ret.push(grid[x + 1][y - 1]);
            }

            // Northwest
            if (grid[x - 1] && grid[x - 1][y + 1]) {
                ret.push(grid[x - 1][y + 1]);
            }

            // Northeast
            if (grid[x + 1] && grid[x + 1][y + 1]) {
                ret.push(grid[x + 1][y + 1]);
            }
        }

        return ret;
    }

    toString() {
        const graphString = [];
        const nodes = this.nodes;
        for (let x = 0; x < nodes.length; x++) {
            const rowDebug = [];
            const row = nodes[x];
            for (let y = 0; y < row.length; y++) {
                rowDebug.push(row[y].isWalkable ? "." : "X");
            }
            graphString.push(rowDebug.join(""));
        }
        return graphString.join("\n");
    }
}

// Heuristic functions
PathfindingGraph.heuristics = {
    manhattan: function(pos0, pos1) {
        const d1 = Math.abs(pos1.x - pos0.x);
        const d2 = Math.abs(pos1.y - pos0.y);
        return d1 + d2;
    },
    diagonal: function(pos0, pos1) {
        const D = 1;
        const D2 = Math.sqrt(2);
        const d1 = Math.abs(pos1.x - pos0.x);
        const d2 = Math.abs(pos1.y - pos0.y);
        return (D * (d1 + d2)) + ((D2 - (2 * D)) * Math.min(d1, d2));
    }
};

// A* search algorithm
function astar(graph, start, end, options = {}) {
    graph.cleanDirty();
    options = options || {};
    const heuristic = options.heuristic || graph.options.heuristic;
    const closest = options.closest || graph.options.closest;

    const openHeap = new BinaryHeap(function(node) {
        return node.f;
    });
    let closestNode = start;

    start.h = heuristic(start, end);
    graph.markDirty(start);

    openHeap.push(start);

    // Add iteration limit to prevent infinite loops
    const maxIterations = 10000;
    let iterations = 0;

    while (openHeap.size() > 0 && iterations < maxIterations) {
        iterations++;
        const currentNode = openHeap.pop();

        if (currentNode === end) {
            return pathTo(currentNode);
        }

        currentNode.closed = true;

        const neighbors = graph.neighbors(currentNode);

        for (let i = 0; i < neighbors.length; i++) {
            const neighbor = neighbors[i];

            if (neighbor.closed || neighbor.isWall()) {
                continue;
            }

            const gScore = currentNode.g + neighbor.getCost(currentNode);
            const beenVisited = neighbor.visited;

            if (!beenVisited || gScore < neighbor.g) {
                neighbor.visited = true;
                neighbor.parent = currentNode;
                neighbor.h = neighbor.h || heuristic(neighbor, end);
                neighbor.g = gScore;
                neighbor.f = neighbor.g + neighbor.h;
                graph.markDirty(neighbor);

                if (closest) {
                    if (neighbor.h < closestNode.h || (neighbor.h === closestNode.h && neighbor.g < closestNode.g)) {
                        closestNode = neighbor;
                    }
                }

                if (!beenVisited) {
                    openHeap.push(neighbor);
                } else {
                    openHeap.rescoreElement(neighbor);
                }
            }
        }
    }

    if (closest) {
        return pathTo(closestNode);
    }

    return [];
}

// Helper function to reconstruct path
function pathTo(node) {
    let curr = node;
    const path = [];
    while (curr.parent) {
        path.unshift(curr);
        curr = curr.parent;
    }
    return path;
}

// Pathfinding manager for the game
window.game.PathfindingManager = {
    graph: null,
    pathCache: new Map(),
    cacheTimeout: 5000, // 5 seconds cache timeout

    // Initialize pathfinding with the current maze
    initialize: function(maze) {
        const g = window.game;
        const config = g.BackroomsConfig;
        
        if (!maze || !maze.length) {
            console.warn("No maze provided for pathfinding initialization");
            return;
        }

        // Convert maze to pathfinding grid
        const gridArray = [];
        for (let row = 0; row < maze.length; row++) {
            gridArray[row] = [];
            for (let col = 0; col < maze[row].length; col++) {
                gridArray[row][col] = maze[row][col].isPath;
            }
        }

        // Create pathfinding graph with diagonal movement
        this.graph = new PathfindingGraph(gridArray, {
            diagonal: true,
            heuristic: PathfindingGraph.heuristics.diagonal
        });

        // Clear cache when reinitializing
        this.pathCache.clear();
        
        console.log("Pathfinding system initialized with maze dimensions:", maze.length, "x", maze[0].length);
    },

    // Convert world coordinates to grid coordinates
    worldToGrid: function(worldPos) {
        const g = window.game;
        const config = g.BackroomsConfig;
        
        const gridX = Math.floor((worldPos.x + config.WORLD_WIDTH / 2) / config.CELL_SIZE);
        const gridY = Math.floor((worldPos.z + config.WORLD_HEIGHT / 2) / config.CELL_SIZE);
        
        // Clamp to grid bounds
        const { numCols, numRows } = this.getGridDimensions();
        return {
            x: Math.max(0, Math.min(numCols - 1, gridX)),
            y: Math.max(0, Math.min(numRows - 1, gridY))
        };
    },

    // Convert grid coordinates to world coordinates
    gridToWorld: function(gridPos) {
        const g = window.game;
        const config = g.BackroomsConfig;
        
        const worldX = gridPos.x * config.CELL_SIZE - config.WORLD_WIDTH / 2;
        const worldZ = gridPos.y * config.CELL_SIZE - config.WORLD_HEIGHT / 2;
        
        return new BABYLON.Vector3(worldX, 0, worldZ);
    },

    // Get grid dimensions
    getGridDimensions: function() {
        const g = window.game;
        const config = g.BackroomsConfig;
        return {
            numCols: Math.floor(config.WORLD_WIDTH / config.CELL_SIZE),
            numRows: Math.floor(config.WORLD_HEIGHT / config.CELL_SIZE)
        };
    },

    // Find path from start to end position
    findPath: function(startPos, endPos, useCache = true) {
        if (!this.graph) {
            console.warn("Pathfinding graph not initialized");
            return [];
        }

        const startGrid = this.worldToGrid(startPos);
        const endGrid = this.worldToGrid(endPos);

        // Create cache key
        const cacheKey = `${startGrid.x},${startGrid.y}-${endGrid.x},${endGrid.y}`;
        
        // Check cache first
        if (useCache && this.pathCache.has(cacheKey)) {
            const cachedEntry = this.pathCache.get(cacheKey);
            if (Date.now() - cachedEntry.timestamp < this.cacheTimeout) {
                return cachedEntry.path;
            } else {
                this.pathCache.delete(cacheKey);
            }
        }

        // Get start and end nodes
        let startNode = this.graph.nodes[startGrid.x] && this.graph.nodes[startGrid.x][startGrid.y];
        let endNode = this.graph.nodes[endGrid.x] && this.graph.nodes[endGrid.x][endGrid.y];

        if (!startNode || !endNode) {
            console.warn("Invalid start or end position for pathfinding");
            return [];
        }

        // If start or end is a wall, try to find nearest walkable cell
        if (startNode.isWall()) {
            const nearestStart = this.findNearestWalkableCell(startGrid);
            if (nearestStart) {
                const newStartNode = this.graph.nodes[nearestStart.x][nearestStart.y];
                if (newStartNode && !newStartNode.isWall()) {
                    startNode = newStartNode;
                }
            }
        }

        if (endNode.isWall()) {
            const nearestEnd = this.findNearestWalkableCell(endGrid);
            if (nearestEnd) {
                const newEndNode = this.graph.nodes[nearestEnd.x][nearestEnd.y];
                if (newEndNode && !newEndNode.isWall()) {
                    endNode = newEndNode;
                }
            }
        }

        // Find path using A*
        const path = astar(this.graph, startNode, endNode, {
            closest: true
        });

        // Convert path back to world coordinates
        const worldPath = path.map(node => this.gridToWorld(node));

        // Cache the result
        if (useCache) {
            this.pathCache.set(cacheKey, {
                path: worldPath,
                timestamp: Date.now()
            });
        }

        return worldPath;
    },

    // Find nearest walkable cell to a position
    findNearestWalkableCell: function(gridPos) {
        const { numCols, numRows } = this.getGridDimensions();
        // Limit search radius to prevent performance issues
        const maxDistance = Math.min(20, Math.max(numCols, numRows));

        for (let distance = 1; distance <= maxDistance; distance++) {
            for (let dx = -distance; dx <= distance; dx++) {
                for (let dy = -distance; dy <= distance; dy++) {
                    if (Math.abs(dx) + Math.abs(dy) !== distance) continue;

                    const x = gridPos.x + dx;
                    const y = gridPos.y + dy;

                    if (x >= 0 && x < numCols && y >= 0 && y < numRows) {
                        const node = this.graph.nodes[x][y];
                        if (node && !node.isWall()) {
                            return { x, y };
                        }
                    }
                }
            }
        }

        return null;
    },

    // Clear pathfinding cache
    clearCache: function() {
        this.pathCache.clear();
    },

    // Get next move direction based on current position and target
    getNextMoveDirection: function(currentPos, targetPos) {
        const path = this.findPath(currentPos, targetPos);
        
        if (path.length === 0) {
            return null;
        }

        // Return direction to first waypoint
        const nextWaypoint = path[0];
        const direction = nextWaypoint.subtract(currentPos);
        direction.y = 0; // Keep on ground
        
        return direction.length() > 0.1 ? direction.normalize() : null;
    },

    // Debug visualization (optional)
    debugVisualizePath: function(path, enemyId = 'default') {
        const g = window.game;
        
        // Initialize debug markers storage
        if (!g.pathDebugMarkers) {
            g.pathDebugMarkers = {};
        }
        
        // Remove existing debug markers for this enemy
        if (g.pathDebugMarkers[enemyId]) {
            g.pathDebugMarkers[enemyId].forEach(marker => marker.dispose());
        }
        g.pathDebugMarkers[enemyId] = [];

        // Create debug markers for path
        path.forEach((waypoint, index) => {
            const marker = BABYLON.MeshBuilder.CreateSphere(`pathDebug${enemyId}_${index}`, {diameter: 0.3}, g.scene);
            marker.position = waypoint.add(new BABYLON.Vector3(0, 0.5, 0));
            
            const material = new BABYLON.StandardMaterial(`pathDebugMat${enemyId}_${index}`, g.scene);
            material.diffuseColor = new BABYLON.Color3(0, 1, 0);
            material.emissiveColor = new BABYLON.Color3(0, 0.2, 0);
            marker.material = material;
            
            g.pathDebugMarkers[enemyId].push(marker);
        });
    },

    // Clear all debug visualizations
    clearAllDebugPaths: function() {
        const g = window.game;
        
        if (g.pathDebugMarkers) {
            Object.values(g.pathDebugMarkers).forEach(markers => {
                markers.forEach(marker => marker.dispose());
            });
            g.pathDebugMarkers = {};
        }
    },

    // Toggle debug visualization for all enemies
    debugVisualizationEnabled: false,
    
    toggleDebugVisualization: function() {
        this.debugVisualizationEnabled = !this.debugVisualizationEnabled;
        
        if (!this.debugVisualizationEnabled) {
            this.clearAllDebugPaths();
        }
        
        console.log(`Pathfinding visualization: ${this.debugVisualizationEnabled ? 'ON' : 'OFF'}`);
        return this.debugVisualizationEnabled;
    }
};

// Initialize pathfinding when backrooms are generated
const originalGenerateBackrooms = window.game.generateBackrooms;
window.game.generateBackrooms = function() {
    const maze = originalGenerateBackrooms.call(this);
    
    // Initialize pathfinding with the new maze
    window.game.PathfindingManager.initialize(maze);
    
    return maze;
};

// Add toggle function to main game object
window.game.togglePathfindingVisualization = function() {
    if (window.game.PathfindingManager) {
        return window.game.PathfindingManager.toggleDebugVisualization();
    }
    console.warn("PathfindingManager not available");
    return false;
};

console.log("Pathfinding system loaded successfully");