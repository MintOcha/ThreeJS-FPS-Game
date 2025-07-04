// Utils module - Helper functions for Babylon.js FPS game
// No imports needed - using global BABYLON namespace

/**
 * Helper function to extract roll value from a quaternion.
 * @param {BABYLON.Quaternion} quaternion - The quaternion to extract roll from.
 * @returns {number} The roll value in radians.
 */
window.game.getQuaternionRoll = function(quaternion) {
  // Convert quaternion to Euler angles
  const euler = quaternion.toEulerAngles();
  // Return the z-component which represents roll
  return euler.z;
};

/**
 * Helper function to clamp a value between min and max
 * @param {number} value - The value to clamp
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} The clamped value
 */
window.game.clamp = function(value, min, max) {
    return Math.min(Math.max(value, min), max);
};

/**
 * Helper function to lerp between two values
 * @param {number} a - Start value
 * @param {number} b - End value  
 * @param {number} t - Interpolation factor (0-1)
 * @returns {number} The interpolated value
 */
window.game.lerp = function(a, b, t) {
    return a + (b - a) * t;
};

/**
 * Helper function to get screen position from world position
 * @param {BABYLON.Vector3} worldPosition - World space position
 * @param {BABYLON.Scene} scene - Babylon.js scene
 * @param {BABYLON.Camera} camera - Babylon.js camera
 * @returns {BABYLON.Vector2} Screen position
 */
window.game.worldToScreen = function(worldPosition, scene, camera) {
    const coordinates = BABYLON.Vector3.Project(
        worldPosition,
        BABYLON.Matrix.Identity(),
        scene.getTransformMatrix(),
        camera.viewport.toGlobal(scene.getEngine().getRenderWidth(), scene.getEngine().getRenderHeight())
    );
    return new BABYLON.Vector2(coordinates.x, coordinates.y);
};