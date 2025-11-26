/**
 * lighting.js
 * Calculates dynamic lighting parameters based on time of day
 */

/**
 * Calculates lighting parameters for the current time of day
 * @param {number} timeOfDay - Time from 0 (midnight) to 1 (next midnight), 0.5 = noon
 * @returns {Object} Lighting parameters including light direction, ambient, diffuse, sky color
 */
export function getDayNightLighting(timeOfDay) {
  // Convert time to angle (0 = midnight, π/2 = sunrise, π = noon, 3π/2 = sunset)
  const sunAngle = timeOfDay * Math.PI * 2;

  // Sun height: -1 (below horizon) to 1 (directly above)
  const sunHeight = Math.sin(sunAngle);

  // Light direction vector (sun moves across the sky)
  const lightDir = [
    Math.cos(sunAngle) * 0.5,  // X: east-west movement
    sunHeight,                  // Y: up-down based on time
    Math.sin(sunAngle) * 0.3   // Z: slight north-south variation
  ];

  // Calculate how much "day" we have (0 = full night, 1 = full day)
  // Smooth transition with some light even below horizon
  const dayAmount = Math.max(0, Math.min(1, (sunHeight + 0.3) / 1.3));

  // Lighting intensities
  const ambient = 0.15 + dayAmount * 0.35;  // 0.15 (night) to 0.5 (day)
  const diffuse = 0.15 + dayAmount * 0.6;   // 0.15 (night) to 0.75 (day)

  // Sky color: dark blue (night) to light blue (day)
  const skyColor = {
    r: 0.03 + dayAmount * 0.17,
    g: 0.03 + dayAmount * 0.17,
    b: 0.06 + dayAmount * 0.24
  };

  return { lightDir, ambient, diffuse, skyColor, sunHeight };
}
