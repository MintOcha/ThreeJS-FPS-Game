# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a browser-based first-person shooter game built with Three.js. The game features wave-based enemy combat, multiple weapons, player movement mechanics (including sliding and jumping), and a modular architecture where all game state is managed through a global `window.game` object.

## Development Commands

This is a client-side only project with no build system. To run the game:

1. Serve the files using any HTTP server (required for ES6 modules)
2. Open `index.html` in a web browser

Common ways to serve locally:
- `python -m http.server 8000` (Python)
- `npx serve .` (Node.js)
- VS Code Live Server extension

## Architecture

### Core Structure
- **Entry Point**: `main.js` - Initializes the global game object and manages the main game loop
- **Global State**: All game state is stored in `window.game` object to avoid circular imports
- **Module System**: Uses ES6 modules with functions attached to `window.game`

### Key Modules

**main.js**
- Initializes `window.game` object with all game state
- Manages the main animation loop
- Handles game initialization and module coordination

**player.js**
- Player movement, controls, and camera management
- Handles keyboard/mouse input, sliding, jumping mechanics
- Manages game state transitions (start, pause, game over)

**enemies.js**
- Wave-based enemy spawning and AI
- Enemy movement, attack logic, and health management
- Wave progression and difficulty scaling

**weapons.js**
- Weapon switching, shooting mechanics, and models
- Handles rifle, shotgun, rocket launcher, and melee weapons
- Manages ammunition, reloading, and weapon positioning

**world.js**
- 3D world generation and lighting setup
- Environment geometry and collision detection

**ui.js**
- User interface elements (health bar, ammo display, wave counter)
- HUD management and visual feedback systems

**effects.js**
- Visual effects (bullet tracers, explosions, damage numbers)
- Particle systems and temporary visual elements

**utils.js**
- Utility functions shared across modules

### Key Design Patterns

**Global State Management**
- All game state lives in `window.game` object
- Modules attach functions to `window.game` (e.g., `window.game.updatePlayer`)
- Avoids circular import issues while maintaining modularity

**Weapon System**
- Weapon definitions stored in `window.game.weapons` object
- Each weapon has properties like damage, fireRate, magazineSize, etc.
- Weapon switching managed through `window.game.switchWeapon()`

**Enemy System**
- Wave-based spawning with increasing difficulty
- Enemies stored in `window.game.enemies` array
- Health and damage managed through `window.game.damageEnemy()`

## Important Implementation Details

### Player Movement
- Uses Three.js camera as player representation
- Implements sliding with smooth camera transitions and tilt effects
- Jumping with gravity simulation
- Collision detection with world geometry

### Weapon Mechanics
- Separate weapon viewport rendered on top of main scene
- Weapon models positioned relative to camera
- ADS (Aim Down Sights) affects FOV, sensitivity, and weapon position
- Raycast-based shooting with pierce mechanics

### Audio System
- Uses Howler.js for audio management
- Sounds stored in `window.game.sounds` object
- Includes shoot, reload, and hit sound effects

### UI System
- HTML/CSS based UI overlaid on canvas
- Health bar with smooth transitions
- Ammo counter and reload indicators
- Wave progression display

## File Organization

- `index.html` - Main HTML file with embedded CSS and module imports
- `main.js` - Core game initialization and loop
- `player.js` - Player mechanics and controls
- `enemies.js` - Enemy AI and wave management
- `weapons.js` - Weapon system and shooting mechanics
- `world.js` - 3D world and environment
- `ui.js` - User interface management
- `effects.js` - Visual effects and particles
- `utils.js` - Shared utility functions
- Audio files: `hit.mp3`, `reload.mp3`, `shoot.mp3`

## Development Notes

- No build system or package manager required
- Uses CDN imports for Three.js and Howler.js
- All code is ES6 modules loaded directly in browser
- No testing framework currently implemented
- Game state is completely contained in `window.game` object