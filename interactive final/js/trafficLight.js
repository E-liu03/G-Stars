/**
 * trafficLight.js
 * Traffic light state machine
 */

let trafficLightMode = 'auto';  // 'auto', 'green', 'yellow', or 'red'

/**
 * Gets the current traffic light state based on mode and time
 * @param {number} time - Current time in seconds
 * @returns {Object} State object with green, yellow, red values (0 or 1)
 */
export function getTrafficLightState(time) {
  // Manual override modes
  if (trafficLightMode === 'green') return { green: 1.0, yellow: 0.0, red: 0.0 };
  if (trafficLightMode === 'yellow') return { green: 0.0, yellow: 1.0, red: 0.0 };
  if (trafficLightMode === 'red') return { green: 0.0, yellow: 0.0, red: 1.0 };

  // Auto cycle: 10 second loop
  // 0-4s: green, 4-5s: yellow, 5-9s: red, 9-10s: yellow
  const t = time % 10;
  if (t < 4) return { green: 1.0, yellow: 0.0, red: 0.0 };
  if (t < 5) return { green: 0.0, yellow: 1.0, red: 0.0 };
  if (t < 9) return { green: 0.0, yellow: 0.0, red: 1.0 };
  return { green: 0.0, yellow: 1.0, red: 0.0 };
}

/**
 * Sets the traffic light mode
 * @param {string} mode - 'auto', 'green', 'yellow', or 'red'
 */
export function setTrafficLightMode(mode) {
  trafficLightMode = mode;
}
