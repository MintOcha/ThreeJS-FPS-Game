# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a first-person shooter game built with Babylon.js (not Three.js despite the repo name). The game features:

- Modern Babylon.js engine with Havok physics (fallback to CannonJS)
- First-person camera with mouse look controls
- Multiple weapon types (rifle, shotgun, rocket launcher, melee)
- Wave-based enemy spawning system
- Health system with regeneration
- Collision detection and damage system
- 3D audio integration

## Architecture

### Core Game Structure
- **main.js**: Entry point, game initialization, render loop, and global game state
- **player.js**: Player controller using Babylon.js PhysicsCharacterController
- **world.js**: Scene setup, lighting, and world geometry creation
- **enemies.js**: Enemy AI, spawning, and wave management
- **weapons.js**: Weapon system with different weapon types and behaviors
- **collision.js**: Collision detection and damage system using CollisionManager
- **effects.js**: Visual effects, explosions, and particle systems
- **ui.js**: UI management and HUD elements
- **utils.js**: Utility functions and helpers

### Key Systems
- **Physics**: Uses Havok physics engine (primary) with CannonJS fallback
- **Collision**: Custom CollisionManager system handles object interactions
- **Input**: Manual input handling with pointer lock for FPS controls
- **Audio**: Babylon.js Sound system for 3D audio effects
- **Rendering**: Babylon.js render loop with shadow mapping

## Development Commands

Since this is a client-side JavaScript game with no build process:

- **Run locally**: Open `index.html` in a web browser or use a local server
- **Local server**: `python -m http.server 8000` or any static file server
- **Debug**: Use browser developer tools for debugging

## Key Implementation Details

### Game State Management
- Global `window.game` object contains all game state
- Game runs at 60 FPS with deltaTime calculations
- Pause/resume functionality built-in

### Physics Integration
- Uses modern Babylon.js PhysicsAggregate system
- Player uses PhysicsCharacterController for movement
- Enemies use dynamic physics bodies
- Collision callbacks handle damage and interactions

### Weapon System
- Each weapon has configurable properties (damage, fire rate, spread, etc.)
- Automatic vs semi-automatic firing modes
- Range-based damage falloff
- Ammo management and reload system

### Enemy AI
- Simple pathfinding toward player
- Health system with damage visualization
- Wave-based spawning with increasing difficulty
- Collision-based damage to player

## File Loading Order

Scripts must be loaded in this order (as defined in index.html):
1. Babylon.js core libraries (CDN)
2. main.js (initializes game object)
3. collision.js (CollisionManager)
4. world.js (scene setup)
5. weapons.js (weapon system)
6. player.js (player controller)
7. enemies.js (enemy system)
8. effects.js (visual effects)
9. utils.js (utilities)
10. ui.js (UI management)

## Common Patterns

- Functions are attached to `window.game` object
- Physics objects use PhysicsAggregate for collision detection
- UI elements are managed through DOM manipulation
- Audio uses Babylon.js Sound objects
- All vector operations use Babylon.js Vector3/Vector2 classes

## Browser Compatibility

- Requires modern browser with WebGL support
- Uses pointer lock API for mouse control
- Requires audio context for sound effects
- Uses modern JavaScript features (async/await, arrow functions)

 # Using Gemini CLI for Large Codebase Analysis

  When analyzing large codebases or multiple files that might exceed context limits, use the Gemini CLI with its massive
  context window. Use `gemini -p` to leverage Google Gemini's large context capacity.

  ## File and Directory Inclusion Syntax

  Use the `@` syntax to include files and directories in your Gemini prompts. The paths should be relative to WHERE you run the
   gemini command:

  ### Examples:

  **Single file analysis:**
  ```bash
  gemini -p "@src/main.py Explain this file's purpose and structure"

  Multiple files:
  gemini -p "@package.json @src/index.js Analyze the dependencies used in the code"

  Entire directory:
  gemini -p "@src/ Summarize the architecture of this codebase"

  Multiple directories:
  gemini -p "@src/ @tests/ Analyze test coverage for the source code"

  Current directory and subdirectories:
  gemini -p "@./ Give me an overview of this entire project"

  Or use --all_files flag:
  gemini --all_files -p "Analyze the project structure and dependencies"

  Implementation Verification Examples

  Check if a feature is implemented:
  gemini -p "@src/ @lib/ Has dark mode been implemented in this codebase? Show me the relevant files and functions"

  Verify authentication implementation:
  gemini -p "@src/ @middleware/ Is JWT authentication implemented? List all auth-related endpoints and middleware"

  Check for specific patterns:
  gemini -p "@src/ Are there any React hooks that handle WebSocket connections? List them with file paths"

  Verify error handling:
  gemini -p "@src/ @api/ Is proper error handling implemented for all API endpoints? Show examples of try-catch blocks"

  Check for rate limiting:
  gemini -p "@backend/ @middleware/ Is rate limiting implemented for the API? Show the implementation details"

  Verify caching strategy:
  gemini -p "@src/ @lib/ @services/ Is Redis caching implemented? List all cache-related functions and their usage"

  Check for specific security measures:
  gemini -p "@src/ @api/ Are SQL injection protections implemented? Show how user inputs are sanitized"

  Verify test coverage for features:
  gemini -p "@src/payment/ @tests/ Is the payment processing module fully tested? List all test cases"

  When to Use Gemini CLI

  Use gemini -p when:
  - Analyzing entire codebases or large directories
  - Comparing multiple large files
  - Need to understand project-wide patterns or architecture
  - Current context window is insufficient for the task
  - Working with files totaling more than 100KB
  - Verifying if specific features, patterns, or security measures are implemented
  - Checking for the presence of certain coding patterns across the entire codebase

  Important Notes

  - Paths in @ syntax are relative to your current working directory when invoking gemini
  - The CLI will include file contents directly in the context
  - No need for --yolo flag for read-only analysis
  - Gemini's context window can handle entire codebases that would overflow Claude's context
  - When checking implementations, be specific about what you're looking for to get accurate results # Using Gemini CLI for Large Codebase Analysis


  When analyzing large codebases or multiple files that might exceed context limits, use the Gemini CLI with its massive
  context window. Use `gemini -p` to leverage Google Gemini's large context capacity.


  ## File and Directory Inclusion Syntax
  Use the `@` syntax to include files and directories in your Gemini prompts. The paths should be relative to WHERE you run the
   gemini command:

  ### Examples:
  **Single file analysis:**
  ```bash
  gemini -p "@src/main.py Explain this file's purpose and structure"


  Multiple files:
  gemini -p "@package.json @src/index.js Analyze the dependencies used in the code"


  Entire directory:
  gemini -p "@src/ Summarize the architecture of this codebase"


  Multiple directories:
  gemini -p "@src/ @tests/ Analyze test coverage for the source code"


  Current directory and subdirectories:
  gemini -p "@./ Give me an overview of this entire project"
  # Or use --all_files flag:
  gemini --all_files -p "Analyze the project structure and dependencies"


  Implementation Verification Examples


  Check if a feature is implemented:
  gemini -p "@src/ @lib/ Has dark mode been implemented in this codebase? Show me the relevant files and functions"


  Verify authentication implementation:
  gemini -p "@src/ @middleware/ Is JWT authentication implemented? List all auth-related endpoints and middleware"


  Check for specific patterns:
  gemini -p "@src/ Are there any React hooks that handle WebSocket connections? List them with file paths"


  Verify error handling:
  gemini -p "@src/ @api/ Is proper error handling implemented for all API endpoints? Show examples of try-catch blocks"


  Check for rate limiting:
  gemini -p "@backend/ @middleware/ Is rate limiting implemented for the API? Show the implementation details"


  Verify caching strategy:
  gemini -p "@src/ @lib/ @services/ Is Redis caching implemented? List all cache-related functions and their usage"


  Check for specific security measures:
  gemini -p "@src/ @api/ Are SQL injection protections implemented? Show how user inputs are sanitized"


  Verify test coverage for features:
  gemini -p "@src/payment/ @tests/ Is the payment processing module fully tested? List all test cases"


  When to Use Gemini CLI


  Use gemini -p when:
  - Analyzing entire codebases or large directories
  - Comparing multiple large files
  - Need to understand project-wide patterns or architecture
  - Current context window is insufficient for the task
  - Working with files totaling more than 100KB
  - Verifying if specific features, patterns, or security measures are implemented
  - Checking for the presence of certain coding patterns across the entire codebase


  Important Notes
  - Paths in @ syntax are relative to your current working directory when invoking gemini
  - The CLI will include file contents directly in the context
  - No need for --yolo flag for read-only analysis
  - Gemini's context window can handle entire codebases that would overflow Claude's context
  - When checking implementations, be specific about what you're looking for to get accurate results
