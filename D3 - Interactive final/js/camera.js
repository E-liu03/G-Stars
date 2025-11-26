/**
 * camera.js
 * Camera state and controls
 */

export const cameraState = {
  angle: 0,        // Horizontal rotation angle (radians)
  dist: 8,         // Distance from center
  height: 3,       // Camera Y position
  autoRotate: false // Automatic rotation enabled
};

/**
 * Updates camera based on keyboard input
 * @param {Object} keys - Keyboard state object
 * @param {number} dt - Delta time in seconds
 */
export function updateCamera(keys, dt) {
  // Handle camera controls
  if (keys['a']||keys['arrowleft']) cameraState.angle -= dt*1.5;   // Rotate left
  if (keys['d']||keys['arrowright']) cameraState.angle += dt*1.5;  // Rotate right
  if (keys['w']||keys['arrowup']) cameraState.dist = Math.max(2, cameraState.dist-dt*5);    // Zoom in
  if (keys['s']||keys['arrowdown']) cameraState.dist = Math.min(20, cameraState.dist+dt*5); // Zoom out
  if (keys['q']) cameraState.height += dt*3;  // Move up
  if (keys['e']) cameraState.height -= dt*3;  // Move down
  if (cameraState.autoRotate) cameraState.angle += dt*0.3; // Auto-rotate
}

/**
 * Gets the current camera position in 3D space
 * @returns {Array} [x, y, z] camera position
 */
export function getCameraPosition() {
  const camX = Math.sin(cameraState.angle) * cameraState.dist;
  const camZ = Math.cos(cameraState.angle) * cameraState.dist;
  const camY = cameraState.height;
  return [camX, camY, camZ];
}

/**
 * Toggles auto-rotate
 */
export function toggleAutoRotate() {
  cameraState.autoRotate = !cameraState.autoRotate;
}
