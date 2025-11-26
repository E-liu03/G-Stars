/**
 * rainSystem.js
 * Creates and animates falling rain drops using GPU line primitives
 */

/**
 * Creates a rain particle system
 * @param {GPUDevice} device - The WebGPU device
 * @param {number} numDrops - Number of rain drops to create
 * @returns {Object} Rain system with drops array and GPU buffer
 */
export function createRainSystem(device, numDrops = 1200) {
  const drops = [];

  // Rain area dimensions and position
  const areaSizeX = 1.5;   // Width of rain area
  const areaSizeZ = 1.5;   // Depth of rain area
  const heightMin = -0.5;  // Bottom of rain (ground level)
  const heightMax = 2.5;   // Top of rain (spawn height)
  const offsetX = -0.5;    // X offset to position rain over scene
  const offsetZ = 0.8;     // Z offset to position rain over scene

  // Initialize each rain drop with random position and properties
  for (let i = 0; i < numDrops; i++) {
    drops.push({
      x: (Math.random() - 0.5) * areaSizeX * 2 + offsetX,
      y: Math.random() * (heightMax - heightMin) + heightMin,
      z: (Math.random() - 0.5) * areaSizeZ * 2 + offsetZ,
      speed: 2.5 + Math.random() * 1.5,    // Fall speed (varies per drop)
      length: 0.04 + Math.random() * 0.05,  // Visual length of the streak
    });
  }

  // Create GPU buffer for rain vertices (2 vertices per drop, 4 floats each)
  const vertexData = new Float32Array(numDrops * 2 * 4);
  const buffer = device.createBuffer({
    size: vertexData.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  });

  return { drops, buffer, numDrops, areaSizeX, areaSizeZ, heightMin, heightMax, offsetX, offsetZ };
}

/**
 * Updates rain drop positions (called each frame)
 * @param {Object} rain - The rain system object
 * @param {number} dt - Delta time in seconds
 */
export function updateRain(rain, dt) {
  for (const drop of rain.drops) {
    // Move drop down based on its speed
    drop.y -= drop.speed * dt;

    // Reset drop to top when it falls below ground
    if (drop.y < rain.heightMin) {
      drop.y = rain.heightMax;
      // Randomize X and Z for varied rain pattern
      drop.x = (Math.random() - 0.5) * rain.areaSizeX * 2 + rain.offsetX;
      drop.z = (Math.random() - 0.5) * rain.areaSizeZ * 2 + rain.offsetZ;
    }
  }
}

/**
 * Updates the GPU buffer with current rain drop positions
 * @param {GPUDevice} device - The WebGPU device
 * @param {Object} rain - The rain system object
 */
export function updateRainBuffer(device, rain) {
  // Each drop is a line with 2 vertices, each vertex has 4 floats (x, y, z, alpha)
  const data = new Float32Array(rain.numDrops * 2 * 4);
  let idx = 0;

  for (const drop of rain.drops) {
    // Top of rain streak (more opaque)
    data[idx++] = drop.x;
    data[idx++] = drop.y;
    data[idx++] = drop.z;
    data[idx++] = 0.6;  // Alpha at top

    // Bottom of rain streak (fades out)
    data[idx++] = drop.x;
    data[idx++] = drop.y - drop.length;
    data[idx++] = drop.z;
    data[idx++] = 0.0;  // Alpha at bottom (transparent)
  }

  device.queue.writeBuffer(rain.buffer, 0, data);
}
