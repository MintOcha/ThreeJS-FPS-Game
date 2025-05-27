// Maze Generator using Prim's Algorithm

function generateMaze(width, height) {
    // Ensure width and height are odd
    if (width % 2 === 0) width++;
    if (height % 2 === 0) height++;

    const WALL = 1;
    const PATH = 0;

    // Initialize grid with all walls
    const grid = Array(height).fill(null).map(() => Array(width).fill(WALL));

    // List of frontier cells
    const frontier = [];

    // Helper function to check if a cell is within bounds
    function isInBounds(r, c) {
        return r >= 0 && r < height && c >= 0 && c < width;
    }

    // Helper function to add frontier cells
    // A frontier cell is a wall cell that is 2 units away from a known path cell
    function addFrontierCells(r, c) {
        const directions = [
            [-2, 0], // Up
            [2, 0],  // Down
            [0, -2], // Left
            [0, 2]   // Right
        ];

        for (const [dr, dc] of directions) {
            const nr = r + dr;
            const nc = c + dc;

            // Check if the new cell (nr, nc) is within bounds and is a wall
            if (isInBounds(nr, nc) && grid[nr][nc] === WALL) {
                // Also check the cell in between (the wall to be potentially carved)
                const wallR = r + dr / 2;
                const wallC = c + dc / 2;
                if (isInBounds(wallR, wallC) && grid[wallR][wallC] === WALL) {
                     // Add to frontier if not already there (simple check by value, could be more robust)
                    const existing = frontier.find(f => f.r === nr && f.c === nc);
                    if (!existing) {
                        frontier.push({ r: nr, c: nc });
                    }
                }
            }
        }
    }

    // Start Prim's algorithm
    const startR = 1;
    const startC = 1;
    grid[startR][startC] = PATH; // Mark starting cell as path

    // Add initial frontier cells around the starting cell
    addFrontierCells(startR, startC);

    // Main loop
    while (frontier.length > 0) {
        // Pick a random frontier cell
        const randomIndex = Math.floor(Math.random() * frontier.length);
        const currentFrontierCell = frontier.splice(randomIndex, 1)[0];
        const { r: fr, c: fc } = currentFrontierCell;

        // Find its neighboring path cells (cells already part of the maze, 2 units away)
        const pathNeighbors = [];
        const directions = [
            [-2, 0], [2, 0], [0, -2], [0, 2]
        ];

        for (const [dr, dc] of directions) {
            const pathNeighborR = fr + dr;
            const pathNeighborC = fc + dc;

            if (isInBounds(pathNeighborR, pathNeighborC) && grid[pathNeighborR][pathNeighborC] === PATH) {
                pathNeighbors.push({ r: pathNeighborR, c: pathNeighborC });
            }
        }

        if (pathNeighbors.length > 0) {
            // Connect the frontier cell to one of its random neighboring path cells
            const randomPathNeighborIndex = Math.floor(Math.random() * pathNeighbors.length);
            const chosenPathNeighbor = pathNeighbors[randomPathNeighborIndex];

            // Carve out the wall cell between the frontier cell and the chosen path neighbor
            const wallR = (fr + chosenPathNeighbor.r) / 2;
            const wallC = (fc + chosenPathNeighbor.c) / 2;

            grid[fr][fc] = PATH;       // Mark frontier cell as path
            grid[wallR][wallC] = PATH; // Mark connecting wall as path

            // Add new frontier cells from the newly added path cell
            addFrontierCells(fr, fc);
        }
    }

    return grid;
}

// Export the function to the global game object
if (window.game) {
    window.game.generateMaze = generateMaze;
} else {
    // Fallback for environments where window.game might not be initialized yet
    // This is less likely if this script is loaded after main.js
    console.warn("window.game not found for maze generator, attempting to create it.");
    window.game = { generateMaze: generateMaze };
}

// --- Backrooms Style Conversion ---

// Constants used in convertToBackroomsStyle
const WALL_BTS = 1; // Using BTS (Backrooms Style) to avoid conflict if original constants change
const PATH_BTS = 0;

function convertToBackroomsStyle(grid, roomAttempts, roomMinSize, roomMaxSize, removeDeadEnds = true, deadEndRemovalPasses = 3) {
    if (!grid || grid.length === 0 || grid[0].length === 0) {
        console.error("Invalid grid provided to convertToBackroomsStyle");
        return grid;
    }

    const height = grid.length;
    const width = grid[0].length;

    // Helper function to check if a cell is within bounds
    function isInBounds(r, c) {
        return r >= 0 && r < height && c >= 0 && c < width;
    }

    // 1. Room Carving
    for (let i = 0; i < roomAttempts; i++) {
        // Ensure room dimensions are odd to help with alignment if desired,
        // but for random carving, any size can work.
        let rWidth = Math.floor(Math.random() * (roomMaxSize - roomMinSize + 1)) + roomMinSize;
        let rHeight = Math.floor(Math.random() * (roomMaxSize - roomMinSize + 1)) + roomMinSize;
        // if (rWidth % 2 === 0) rWidth++; // Optional: force odd
        // if (rHeight % 2 === 0) rHeight++; // Optional: force odd
        
        // Choose a random starting position (can be any cell)
        // To ensure rooms are fully contained, subtract room dimensions from random range
        const rX = Math.floor(Math.random() * (width - rWidth));
        const rY = Math.floor(Math.random() * (height - rHeight));

        for (let y = rY; y < rY + rHeight; y++) {
            for (let x = rX; x < rX + rWidth; x++) {
                if (isInBounds(y, x)) {
                    grid[y][x] = PATH_BTS;
                }
            }
        }
    }

    // 2. Dead-End Removal (Optional)
    if (removeDeadEnds) {
        function countPathNeighbors(r, c) {
            let count = 0;
            const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]]; // 1 unit away
            for (const [dr, dc] of directions) {
                const nr = r + dr;
                const nc = c + dc;
                if (isInBounds(nr, nc) && grid[nr][nc] === PATH_BTS) {
                    count++;
                }
            }
            return count;
        }

        for (let pass = 0; pass < deadEndRemovalPasses; pass++) {
            const deadEndsThisPass = [];
            for (let r = 0; r < height; r++) {
                for (let c = 0; c < width; c++) {
                    if (grid[r][c] === PATH_BTS) { // Only consider path cells
                        // Boundary cells (except potential start/end of maze if specifically designed)
                        // can also be dead ends.
                        if (r === 0 || r === height - 1 || c === 0 || c === width - 1) {
                             // For simplicity, we'll consider boundary path cells with 1 neighbor as dead ends.
                             // More complex logic could preserve designated entrances/exits.
                            if (countPathNeighbors(r, c) === 1) {
                                deadEndsThisPass.push({ r, c });
                            }
                        } else {
                            // Inner cells
                            if (countPathNeighbors(r, c) === 1) {
                                deadEndsThisPass.push({ r, c });
                            }
                        }
                    }
                }
            }

            if (deadEndsThisPass.length === 0) break; // No more dead ends found

            for (const de of deadEndsThisPass) {
                grid[de.r][de.c] = WALL_BTS;
            }
        }
    }

    return grid;
}


// Export the new function
if (window.game) {
    window.game.convertToBackroomsStyle = convertToBackroomsStyle;
} else {
    // Fallback if window.game wasn't created by generateMaze's export
    console.warn("window.game not found for convertToBackroomsStyle, attempting to create/use it.");
    window.game = window.game || {}; // Ensure window.game exists
    window.game.convertToBackroomsStyle = convertToBackroomsStyle;
}
