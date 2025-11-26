/**
 * objLoader.js
 * Parses Wavefront OBJ files and creates GPU buffers for rendering
 */

import { loadMTL, detectTrafficLightType, detectNeonSign, detectVendingButton } from './mtlParser.js';
import { loadTexture, createWhiteTexture } from './textureLoader.js';

/**
 * Loads an OBJ model with materials and textures
 * @param {GPUDevice} device - The WebGPU device
 * @param {string} objUrl - Path to the OBJ file
 * @param {string} mtlUrl - Path to the MTL file
 * @returns {Object} Object containing meshes, sampler, and white texture
 */
export async function loadOBJ(device, objUrl, mtlUrl) {
  // First load the material definitions
  const materials = await loadMTL(mtlUrl);
  const defaultColor = [0.7, 0.7, 0.7];  // Default gray for materials without color

  // Map of texture filenames to their actual paths
  // Keys are lowercase for case-insensitive matching
  const textureFiles = {
    'nintendo.png': 'textures/Nintendo.png',
    'alipay.jpg': 'textures/Alipay.jpg',
    'japanese writing blank.png': 'textures/Japanese Writing Blank.png',
    'flag_of_japan.svg.png': 'textures/Flag_of_Japan.png',
    'flag_of_japan.png': 'textures/Flag_of_Japan.png',
    'stainless steel.jpeg': 'textures/stainless steel.jpeg',
    'imagewrap.jpg': 'textures/imagewrap.jpg',
  };

  // Load all textures
  const loadedTextures = {};
  const whiteTexture = createWhiteTexture(device);  // Fallback texture

  for (const [key, path] of Object.entries(textureFiles)) {
    const tex = await loadTexture(device, path);
    if (tex) {
      loadedTextures[key] = tex;
    }
  }

  // Create texture sampler with linear filtering and repeat wrapping
  const sampler = device.createSampler({
    magFilter: 'linear',   // Smooth when magnified
    minFilter: 'linear',   // Smooth when minified
    addressModeU: 'repeat', // Repeat texture horizontally
    addressModeV: 'repeat', // Repeat texture vertically
  });

  // Load the OBJ file
  console.log("Loading OBJ:", objUrl);
  const response = await fetch(objUrl);
  if (!response.ok) {
    console.error("Failed to load:", objUrl);
    return null;
  }

  const text = await response.text();
  console.log("Parsing OBJ...");

  // Arrays to store parsed vertex data
  const positions = [];   // Vertex positions (v)
  const normals = [];     // Vertex normals (vn)
  const texcoords = [];   // Texture coordinates (vt)
  const geometryByMaterial = {};  // Vertices grouped by material
  let currentMaterial = null;

  // Parse each line of the OBJ file
  for (const line of text.split('\n')) {
    const parts = line.trim().split(/\s+/);
    const type = parts[0];

    if (type === 'v') {
      // Vertex position: v x y z
      positions.push([parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3])]);
    } else if (type === 'vn') {
      // Vertex normal: vn x y z
      normals.push([parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3])]);
    } else if (type === 'vt') {
      // Texture coordinate: vt u v
      texcoords.push([parseFloat(parts[1]), parseFloat(parts[2])]);
    } else if (type === 'usemtl') {
      // Switch to a different material
      currentMaterial = parts.slice(1).join(' ');
    } else if (type === 'f') {
      // Face definition: f v1/vt1/vn1 v2/vt2/vn2 v3/vt3/vn3 ...
      const matKey = currentMaterial || '__default__';

      if (!geometryByMaterial[matKey]) {
        geometryByMaterial[matKey] = { vertices: [] };
      }

      const faceVerts = parts.slice(1);
      const mat = materials[matKey];
      const color = mat ? mat.Kd : defaultColor;

      // Triangulate the face (fan triangulation for polygons)
      for (let i = 1; i < faceVerts.length - 1; i++) {
        [faceVerts[0], faceVerts[i], faceVerts[i + 1]].forEach(vert => {
          // Parse vertex indices: position/texcoord/normal
          const indices = vert.split('/');
          const pi = parseInt(indices[0]) - 1;  // Position index (1-based in OBJ)
          const ti = indices[1] ? parseInt(indices[1]) - 1 : -1;  // Texcoord index
          const ni = indices[2] ? parseInt(indices[2]) - 1 : -1;  // Normal index

          // Get actual data, with fallbacks for missing data
          const pos = positions[pi] || [0, 0, 0];
          const norm = (ni >= 0 && normals[ni]) ? normals[ni] : [0, 1, 0];
          let uv = (ti >= 0 && texcoords[ti]) ? texcoords[ti] : [0, 0];

          // Flip V coordinate (OBJ uses bottom-left origin, WebGPU uses top-left)
          uv = [uv[0], 1.0 - uv[1]];

          // Add vertex data: position (3) + normal (3) + uv (2) + color (3) = 11 floats
          geometryByMaterial[matKey].vertices.push(
            pos[0], pos[1], pos[2],
            norm[0], norm[1], norm[2],
            uv[0], uv[1],
            color[0], color[1], color[2]
          );
        });
      }
    }
  }

  console.log(`Parsed ${Object.keys(geometryByMaterial).length} material groups`);

  // Calculate bounding box to center and scale the model
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;

  for (const group of Object.values(geometryByMaterial)) {
    for (let i = 0; i < group.vertices.length; i += 11) {
      minX = Math.min(minX, group.vertices[i]);
      maxX = Math.max(maxX, group.vertices[i]);
      minY = Math.min(minY, group.vertices[i + 1]);
      maxY = Math.max(maxY, group.vertices[i + 1]);
      minZ = Math.min(minZ, group.vertices[i + 2]);
      maxZ = Math.max(maxZ, group.vertices[i + 2]);
    }
  }

  // Calculate center and scale factor to fit model in view
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  const centerZ = (minZ + maxZ) / 2;
  const maxSize = Math.max(maxX - minX, maxY - minY, maxZ - minZ);
  const scale = 4.0 / maxSize;  // Scale to fit in a 4-unit box

  // Create GPU meshes for each material group
  const meshes = [];
  let trafficLightCount = { red: 0, yellow: 0, green: 0 };

  for (const [matName, group] of Object.entries(geometryByMaterial)) {
    if (group.vertices.length === 0) continue;

    // Transform vertices: center and scale
    for (let i = 0; i < group.vertices.length; i += 11) {
      group.vertices[i] = (group.vertices[i] - centerX) * scale;
      group.vertices[i + 1] = (group.vertices[i + 1] - centerY) * scale;
      group.vertices[i + 2] = (group.vertices[i + 2] - centerZ) * scale;
    }

    // Determine texture for this material
    const mat = materials[matName];
    let texture = whiteTexture;
    let useTexture = 0;
    let hasTexture = false;

    if (mat && mat.map_Kd) {
      const texKey = mat.map_Kd.toLowerCase();
      if (loadedTextures[texKey]) {
        texture = loadedTextures[texKey];
        useTexture = 1;
        hasTexture = true;
      }
    }

    // Detect special material types
    const color = mat ? mat.Kd : defaultColor;
    const lightType = detectTrafficLightType(matName, hasTexture);
    const neonType = detectNeonSign(matName, hasTexture);
    const vendingButton = detectVendingButton(matName, hasTexture);

    // Detect if this is the flag (for wave animation)
    const isFlag = matName.toLowerCase().includes('flag') ||
                   (mat && mat.map_Kd && mat.map_Kd.toLowerCase().includes('flag'));

    // Log detected special materials
    if (lightType) {
      trafficLightCount[lightType]++;
      console.log(`🚦 Traffic light (${lightType}): "${matName}"`);
    }
    if (neonType) {
      console.log(`💡 Neon sign (${neonType}): "${matName}"`);
    }
    if (vendingButton) {
      console.log(`🔘 Vending button: "${matName}"`);
    }
    if (isFlag) {
      console.log(`🎌 Flag detected: "${matName}"`);
    }

    // Create GPU buffer with vertex data
    const data = new Float32Array(group.vertices);
    const buffer = device.createBuffer({
      size: data.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(buffer, 0, data);

    // Add mesh to the list with all its properties
    meshes.push({
      buffer,
      vertexCount: data.length / 11,  // 11 floats per vertex
      texture,
      useTexture,
      name: matName,
      trafficLight: lightType,
      neonSign: neonType,
      vendingButton: vendingButton,
      isFlag: isFlag,
      baseColor: color,
    });
  }

  console.log(`🚦 Traffic lights found:`, trafficLightCount);

  return { meshes, sampler, whiteTexture };
}
