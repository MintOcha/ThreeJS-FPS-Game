// Pathfinding module using A* algorithm

function findPath(startX, startY, endX, endY, grid) {
    const PARENT_NODE = Symbol('parent'); // Use Symbol to avoid collision with grid properties if any

    // Node structure: { x, y, g, h, f, [PARENT_NODE] }
    // g: cost from start to node
    // h: heuristic cost from node to end
    // f: g + h

    const openList = [];
    const closedList = new Set(); // Using a Set for efficient "has" checks: "x,y"

    const startNode = { x: startX, y: startY, g: 0, h: 0, f: 0 };
    startNode.h = heuristic(startX, startY, endX, endY);
    startNode.f = startNode.g + startNode.h;
    openList.push(startNode);

    const directions = [
        { x: 0, y: -1 }, // Up
        { x: 0, y: 1 },  // Down
        { x: -1, y: 0 }, // Left
        { x: 1, y: 0 },  // Right
        // Optional: Diagonals (if allowed, heuristic and gCost for diagonals should be adjusted)
        // { x: -1, y: -1 }, { x: 1, y: -1 }, { x: -1, y: 1 }, { x: 1, y: 1 }
    ];

    while (openList.length > 0) {
        // Find node with lowest f cost in openList
        openList.sort((a, b) => a.f - b.f);
        const currentNode = openList.shift();

        // Add to closed list (using string representation for Set)
        const currentNodeKey = `${currentNode.x},${currentNode.y}`;
        closedList.add(currentNodeKey);

        // Check if goal reached
        if (currentNode.x === endX && currentNode.y === endY) {
            return reconstructPath(currentNode, PARENT_NODE);
        }

        // Process neighbors
        for (const dir of directions) {
            const neighborX = currentNode.x + dir.x;
            const neighborY = currentNode.y + dir.y;
            const neighborKey = `${neighborX},${neighborY}`;

            // Validate neighbor
            if (
                neighborX < 0 || neighborX >= grid[0].length || // Check against grid width (cols)
                neighborY < 0 || neighborY >= grid.length ||    // Check against grid height (rows)
                grid[neighborY][neighborX] === 1 || // Check if wall (grid is row, col so grid[y][x])
                closedList.has(neighborKey)
            ) {
                continue;
            }

            // Calculate costs
            const gCost = currentNode.g + 1; // Assuming cost of 1 for non-diagonal movement
            const hCost = heuristic(neighborX, neighborY, endX, endY);
            const fCost = gCost + hCost;

            // Check if neighbor is in openList
            const existingNeighbor = openList.find(node => node.x === neighborX && node.y === neighborY);

            if (existingNeighbor) {
                if (gCost < existingNeighbor.g) {
                    existingNeighbor.g = gCost;
                    existingNeighbor.f = fCost;
                    existingNeighbor[PARENT_NODE] = currentNode;
                }
            } else {
                const neighborNode = { x: neighborX, y: neighborY, g: gCost, h: hCost, f: fCost };
                neighborNode[PARENT_NODE] = currentNode;
                openList.push(neighborNode);
            }
        }
    }

    return []; // No path found
}

function heuristic(x1, y1, x2, y2) {
    // Manhattan distance
    return Math.abs(x1 - x2) + Math.abs(y1 - y2);
}

function reconstructPath(endNode, parentSymbol) {
    const path = [];
    let currentNode = endNode;
    while (currentNode) {
        path.unshift([currentNode.x, currentNode.y]); // Add to beginning to reverse order
        currentNode = currentNode[parentSymbol];
    }
    return path;
}

// Export the function
if (window.game) {
    window.game.findPath = findPath;
} else {
    console.warn("window.game not found for pathfinding, attempting to create it.");
    window.game = { findPath: findPath };
}
