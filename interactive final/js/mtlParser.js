/**
 * mtlParser.js
 * Parses Wavefront MTL (Material Template Library) files
 */

/**
 * Loads and parses an MTL file to extract material definitions
 * @param {string} url - Path to the MTL file
 * @returns {Object} Dictionary of material names to their properties
 */
export async function loadMTL(url) {
  console.log("Loading MTL:", url);
  const materials = {};

  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.warn("MTL file not found");
      return materials;
    }

    const text = await response.text();
    let currentMat = null;

    // Parse each line of the MTL file
    for (const line of text.split('\n')) {
      const trimmed = line.trim();

      // 'newmtl' defines a new material name
      if (trimmed.startsWith('newmtl ')) {
        currentMat = trimmed.substring(7).trim();
        materials[currentMat] = {
          Kd: [0.8, 0.8, 0.8],  // Default diffuse color (light gray)
          map_Kd: null,         // Diffuse texture map (none by default)
        };
      }
      // 'Kd' defines the diffuse color (RGB values 0-1)
      else if (trimmed.startsWith('Kd ') && currentMat) {
        const parts = trimmed.split(/\s+/);
        materials[currentMat].Kd = [
          parseFloat(parts[1]),
          parseFloat(parts[2]),
          parseFloat(parts[3])
        ];
      }
      // 'map_Kd' defines the diffuse texture file
      else if (trimmed.startsWith('map_Kd ') && currentMat) {
        let texPath = trimmed.substring(7).trim();
        // Remove any texture options (like -o, -s for offset/scale)
        texPath = texPath.replace(/-[os]\s+[-\d.]+\s+[-\d.]+\s+[-\d.]+\s*/g, '').trim();

        // Extract just the filename from the path
        let filename = texPath;
        if (texPath.includes('/')) filename = texPath.split('/').pop();
        if (filename.includes('\\')) filename = filename.split('\\').pop();

        materials[currentMat].map_Kd = filename;
      }
    }

    console.log(`Loaded ${Object.keys(materials).length} materials from MTL`);
  } catch (e) {
    console.warn("Error loading MTL:", e);
  }

  return materials;
}

/**
 * Detects if a material is a traffic light bulb
 * @param {string} matName - The material name
 * @param {boolean} hasTexture - Whether the material has a texture
 * @returns {string|null} 'green', 'yellow', 'red', or null
 */
export function detectTrafficLightType(matName, hasTexture) {
  // Traffic lights don't have textures
  if (hasTexture) return null;

  // Material names correspond to specific light colors in the Blender model
  if (matName === 'Material.003') return 'green';
  if (matName === 'Material.004') return 'yellow';
  if (matName === 'Material.006') return 'red';
  return null;
}

/**
 * Detects if a material is a neon sign
 * @param {string} matName - The material name
 * @param {boolean} hasTexture - Whether the material has a texture
 * @returns {string|null} 'blue' or null
 */
export function detectNeonSign(matName, hasTexture) {
  // These materials are the turquoise neon signs on the tower and board
  if (matName === 'Material.053' || matName === 'Material.009') {
    return 'blue';
  }
  return null;
}

/**
 * Detects if a material is a vending machine button
 * @param {string} matName - The material name
 * @param {boolean} hasTexture - Whether the material has a texture
 * @returns {string|null} 'button' or null
 */
export function detectVendingButton(matName, hasTexture) {
  // Material.042 is the vending machine buttons
  if (matName === 'Material.042') {
    return 'button';
  }
  return null;
}
