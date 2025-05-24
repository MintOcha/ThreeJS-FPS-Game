import * as THREE from 'three';

/**
 * Helper function to extract roll value from a quaternion.
 * @param {THREE.Quaternion} quaternion - The quaternion to extract roll from.
 * @returns {number} The roll value in radians.
 */
window.game.getQuaternionRoll = function(quaternion) {
  // Convert quaternion to Euler angles using YXZ order (typical for FPS cameras)
  const euler = new THREE.Euler().setFromQuaternion(quaternion, 'YXZ');
  // Return the z-component which represents roll
  return euler.z;
};
