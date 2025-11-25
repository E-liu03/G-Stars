// main.js -- WebGPU OBJ Loader with Textures, Traffic Lights, and Rain

// ============== TEXTURE LOADER ==============
async function loadTexture(device, url) {
  try {
    console.log("Loading texture:", url);
    const response = await fetch(url);
    if (!response.ok) {
      console.warn("Texture not found:", url);
      return null;
    }
    
    const blob = await response.blob();
    const imageBitmap = await createImageBitmap(blob);
    
    const texture = device.createTexture({
      size: [imageBitmap.width, imageBitmap.height, 1],
      format: 'rgba8unorm',
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
    });
    
    device.queue.copyExternalImageToTexture(
      { source: imageBitmap },
      { texture: texture },
      [imageBitmap.width, imageBitmap.height]
    );
    
    console.log(`✓ Loaded: ${url} (${imageBitmap.width}x${imageBitmap.height})`);
    return texture;
  } catch (e) {
    console.warn("Error loading texture:", url, e);
    return null;
  }
}

function createWhiteTexture(device) {
  const texture = device.createTexture({
    size: [1, 1, 1],
    format: 'rgba8unorm',
    usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
  });
  device.queue.writeTexture(
    { texture },
    new Uint8Array([255, 255, 255, 255]),
    { bytesPerRow: 4 },
    [1, 1]
  );
  return texture;
}

// ============== MTL PARSER ==============
async function loadMTL(url) {
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
    
    for (const line of text.split('\n')) {
      const trimmed = line.trim();
      
      if (trimmed.startsWith('newmtl ')) {
        currentMat = trimmed.substring(7).trim();
        materials[currentMat] = { 
          Kd: [0.8, 0.8, 0.8],
          map_Kd: null,
        };
      } else if (trimmed.startsWith('Kd ') && currentMat) {
        const parts = trimmed.split(/\s+/);
        materials[currentMat].Kd = [
          parseFloat(parts[1]),
          parseFloat(parts[2]),
          parseFloat(parts[3])
        ];
      } else if (trimmed.startsWith('map_Kd ') && currentMat) {
        let texPath = trimmed.substring(7).trim();
        texPath = texPath.replace(/-[os]\s+[-\d.]+\s+[-\d.]+\s+[-\d.]+\s*/g, '').trim();
        
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

// ============== TRAFFIC LIGHT DETECTION ==============
function detectTrafficLightType(matName, hasTexture) {
  if (hasTexture) {
    return null;
  }
  
  if (matName === 'Material.003') {
    return 'green';
  }
  
  if (matName === 'Material.004') {
    return 'yellow';
  }
  
  if (matName === 'Material.006') {
    return 'red';
  }
  
  return null;
}

// ============== OBJ LOADER ==============
async function loadOBJ(device, objUrl, mtlUrl) {
  const materials = await loadMTL(mtlUrl);
  const defaultColor = [0.7, 0.7, 0.7];
  
  const textureFiles = {
    'nintendo.png': 'textures/Nintendo.png',
    'alipay.jpg': 'textures/Alipay.jpg',
    'japanese writing blank.png': 'textures/Japanese Writing Blank.png',
    'flag_of_japan.svg.png': 'textures/Flag_of_Japan.png',
    'flag_of_japan.png': 'textures/Flag_of_Japan.png',
    'stainless steel.jpeg': 'textures/stainless steel.jpeg',
  };
  
  const loadedTextures = {};
  const whiteTexture = createWhiteTexture(device);
  
  for (const [key, path] of Object.entries(textureFiles)) {
    const tex = await loadTexture(device, path);
    if (tex) {
      loadedTextures[key] = tex;
    }
  }
  
  const sampler = device.createSampler({
    magFilter: 'linear',
    minFilter: 'linear',
    addressModeU: 'repeat',
    addressModeV: 'repeat',
  });
  
  console.log("Loading OBJ:", objUrl);
  const response = await fetch(objUrl);
  if (!response.ok) {
    console.error("Failed to load:", objUrl);
    return null;
  }
  
  const text = await response.text();
  console.log("Parsing OBJ...");
  
  const positions = [];
  const normals = [];
  const texcoords = [];
  const geometryByMaterial = {};
  let currentMaterial = null;
  
  for (const line of text.split('\n')) {
    const parts = line.trim().split(/\s+/);
    const type = parts[0];
    
    if (type === 'v') {
      positions.push([parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3])]);
    } else if (type === 'vn') {
      normals.push([parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3])]);
    } else if (type === 'vt') {
      texcoords.push([parseFloat(parts[1]), parseFloat(parts[2])]);
    } else if (type === 'usemtl') {
      currentMaterial = parts.slice(1).join(' ');
    } else if (type === 'f') {
      const matKey = currentMaterial || '__default__';
      
      if (!geometryByMaterial[matKey]) {
        geometryByMaterial[matKey] = { vertices: [] };
      }
      
      const faceVerts = parts.slice(1);
      const mat = materials[matKey];
      const color = mat ? mat.Kd : defaultColor;
      
      for (let i = 1; i < faceVerts.length - 1; i++) {
        [faceVerts[0], faceVerts[i], faceVerts[i + 1]].forEach(vert => {
          const indices = vert.split('/');
          const pi = parseInt(indices[0]) - 1;
          const ti = indices[1] ? parseInt(indices[1]) - 1 : -1;
          const ni = indices[2] ? parseInt(indices[2]) - 1 : -1;
          
          const pos = positions[pi] || [0, 0, 0];
          const norm = (ni >= 0 && normals[ni]) ? normals[ni] : [0, 1, 0];
          let uv = (ti >= 0 && texcoords[ti]) ? texcoords[ti] : [0, 0];
          
          uv = [uv[0], 1.0 - uv[1]];
          
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
  
  // Calculate bounding box
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
  
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  const centerZ = (minZ + maxZ) / 2;
  const maxSize = Math.max(maxX - minX, maxY - minY, maxZ - minZ);
  const scale = 4.0 / maxSize;
  
  // Create meshes
  const meshes = [];
  let trafficLightCount = { red: 0, yellow: 0, green: 0 };
  
  for (const [matName, group] of Object.entries(geometryByMaterial)) {
    if (group.vertices.length === 0) continue;
    
    for (let i = 0; i < group.vertices.length; i += 11) {
      group.vertices[i] = (group.vertices[i] - centerX) * scale;
      group.vertices[i + 1] = (group.vertices[i + 1] - centerY) * scale;
      group.vertices[i + 2] = (group.vertices[i + 2] - centerZ) * scale;
    }
    
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
    
    const color = mat ? mat.Kd : defaultColor;
    const lightType = detectTrafficLightType(matName, hasTexture);
    
    if (lightType) {
      trafficLightCount[lightType]++;
      console.log(`🚦 Traffic light (${lightType}): "${matName}"`);
    }
    
    const data = new Float32Array(group.vertices);
    const buffer = device.createBuffer({
      size: data.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(buffer, 0, data);
    
    meshes.push({
      buffer,
      vertexCount: data.length / 11,
      texture,
      useTexture,
      name: matName,
      trafficLight: lightType,
      baseColor: color,
    });
  }
  
  console.log(`🚦 Traffic lights found:`, trafficLightCount);
  
  return { meshes, sampler, whiteTexture };
}

// ============== RAIN SYSTEM ==============
function createRainSystem(device, numDrops = 1200) {
  const drops = [];
  const areaSizeX = 1.5; // Wider coverage
  const areaSizeZ = 1.5; // Depth coverage
  const heightMin = -0.5;
  const heightMax = 2.5;
  
  // Offset to shift rain position (adjust these to move the rain)
  const offsetX = -0.5;  // Positive = right, Negative = left
  const offsetZ = 0.8;  // Positive = forward, Negative = back
  
  // Initialize rain drops
  for (let i = 0; i < numDrops; i++) {
    drops.push({
      x: (Math.random() - 0.5) * areaSizeX * 2 + offsetX,
      y: Math.random() * (heightMax - heightMin) + heightMin,
      z: (Math.random() - 0.5) * areaSizeZ * 2 + offsetZ,
      speed: 2.5 + Math.random() * 1.5,
      length: 0.04 + Math.random() * 0.05,
    });
  }
  
  const vertexData = new Float32Array(numDrops * 2 * 4);
  
  const buffer = device.createBuffer({
    size: vertexData.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  });
  
  return { drops, buffer, numDrops, areaSizeX, areaSizeZ, heightMin, heightMax, offsetX, offsetZ };
}

function updateRain(rain, dt) {
  for (const drop of rain.drops) {
    drop.y -= drop.speed * dt;
    
    // Reset drop when it falls below ground
    if (drop.y < rain.heightMin) {
      drop.y = rain.heightMax;
      drop.x = (Math.random() - 0.5) * rain.areaSizeX * 2 + rain.offsetX;
      drop.z = (Math.random() - 0.5) * rain.areaSizeZ * 2 + rain.offsetZ;
    }
  }
}

function updateRainBuffer(device, rain) {
  const data = new Float32Array(rain.numDrops * 2 * 4);
  let idx = 0;
  
  for (const drop of rain.drops) {
    // Top of rain streak
    data[idx++] = drop.x;
    data[idx++] = drop.y;
    data[idx++] = drop.z;
    data[idx++] = 0.6; // Alpha
    
    // Bottom of rain streak
    data[idx++] = drop.x;
    data[idx++] = drop.y - drop.length;
    data[idx++] = drop.z;
    data[idx++] = 0.0; // Fade out at bottom
  }
  
  device.queue.writeBuffer(rain.buffer, 0, data);
}

// ============== MAIN ==============
async function main() {
  const canvas = document.getElementById("gfx-main");

  if (!navigator.gpu) {
    alert("WebGPU not supported! Use Chrome.");
    return;
  }

  const adapter = await navigator.gpu.requestAdapter();
  const device = await adapter.requestDevice();

  const context = canvas.getContext("webgpu");
  const format = navigator.gpu.getPreferredCanvasFormat();
  context.configure({ device, format, alphaMode: "opaque" });

  // Main scene shader
  const shaderModule = device.createShaderModule({
    code: `
      struct Uniforms {
        mvp : mat4x4<f32>,
        model : mat4x4<f32>,
        lightDir : vec4<f32>,
        cameraPos : vec4<f32>,
        useTexture : vec4<f32>,
        emissive : vec4<f32>,
        time : vec4<f32>,
      };
      @group(0) @binding(0) var<uniform> u : Uniforms;
      @group(0) @binding(1) var texSampler : sampler;
      @group(0) @binding(2) var texDiffuse : texture_2d<f32>;

      struct VSOut {
        @builtin(position) pos : vec4<f32>,
        @location(0) normal : vec3<f32>,
        @location(1) worldPos : vec3<f32>,
        @location(2) uv : vec2<f32>,
        @location(3) color : vec3<f32>,
      };

      @vertex
      fn vs(@location(0) pos : vec3<f32>, @location(1) norm : vec3<f32>, @location(2) uv : vec2<f32>, @location(3) color : vec3<f32>) -> VSOut {
        var out : VSOut;
        var animatedPos = pos;

        // Flag wave animation - based on UV coordinates
        // u.time.y is a flag identifier (1.0 for flag material)
        // u.time.z is wave enabled (1.0 for enabled, 0.0 for disabled)
        if (u.time.y > 0.5 && u.time.z > 0.5) {
          let time = u.time.x;

          // Flag attached at BOTTOM (uv.y = 1), free edge at TOP (uv.y = 0)
          // Cubic falloff makes the free edge wave more than the pole
          let waveAmount = (1.0 - uv.y) * (1.0 - uv.y) * (1.0 - uv.y);

          // Waves propagate up the flag - reduced amplitude for subtlety
          let wave1 = sin(time * 2.5 + (1.0 - uv.y) * 6.0) * 0.04;
          let wave2 = sin(time * 1.8 + (1.0 - uv.y) * 4.0 + uv.x * 2.0) * 0.025;

          // Apply HORIZONTAL displacement (X-axis for side-to-side flutter)
          animatedPos.x += (wave1 + wave2) * waveAmount;

          // Tiny Z motion for depth/realism
          animatedPos.z += wave2 * 0.15 * waveAmount;
        }

        out.pos = u.mvp * vec4(animatedPos, 1.0);
        out.normal = (u.model * vec4(norm, 0.0)).xyz;
        out.worldPos = (u.model * vec4(animatedPos, 1.0)).xyz;
        out.uv = uv;
        out.color = color;
        return out;
      }

      @fragment
      fn fs(@location(0) normal : vec3<f32>, @location(1) worldPos : vec3<f32>, @location(2) uv : vec2<f32>, @location(3) color : vec3<f32>) -> @location(0) vec4<f32> {
        let N = normalize(normal);
        let L = normalize(u.lightDir.xyz);
        let V = normalize(u.cameraPos.xyz - worldPos);
        let H = normalize(L + V);
        
        var baseColor = color;
        if (u.useTexture.x > 0.5) {
          let texColor = textureSample(texDiffuse, texSampler, uv);
          baseColor = texColor.rgb;
        }
        
        let isTrafficLight = u.emissive.y > 0.5;
        let emissiveStrength = u.emissive.x;
        
        var lit : vec3<f32>;
        
        if (isTrafficLight) {
          if (emissiveStrength > 0.5) {
            lit = baseColor * 2.5 + vec3(0.3);
          } else {
            lit = baseColor * 0.15;
          }
        } else {
          let ambient = 0.3;
          let diffuse = max(dot(N, L), 0.0) * 0.55;
          let specular = pow(max(dot(N, H), 0.0), 32.0) * 0.1;
          lit = baseColor * (ambient + diffuse) + vec3(specular);
        }
        
        let mapped = lit / (lit + vec3(1.0));
        
        return vec4(mapped, 1.0);
      }
    `,
  });

  // Rain shader
  const rainShaderModule = device.createShaderModule({
    code: `
      struct RainUniforms {
        mvp : mat4x4<f32>,
      };
      @group(0) @binding(0) var<uniform> u : RainUniforms;

      struct VSOut {
        @builtin(position) pos : vec4<f32>,
        @location(0) alpha : f32,
      };

      @vertex
      fn vs(@location(0) pos : vec3<f32>, @location(1) alpha : f32) -> VSOut {
        var out : VSOut;
        out.pos = u.mvp * vec4(pos, 1.0);
        out.alpha = alpha;
        return out;
      }

      @fragment
      fn fs(@location(0) alpha : f32) -> @location(0) vec4<f32> {
        // Light blue rain color with fade
        return vec4(0.7, 0.8, 1.0, alpha * 0.5);
      }
    `,
  });

  // Main scene bind group layout and pipeline
  const bindGroupLayout = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } },
      { binding: 1, visibility: GPUShaderStage.FRAGMENT, sampler: { type: 'filtering' } },
      { binding: 2, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'float' } },
    ],
  });

  const pipeline = device.createRenderPipeline({
    layout: device.createPipelineLayout({ bindGroupLayouts: [bindGroupLayout] }),
    vertex: {
      module: shaderModule,
      entryPoint: "vs",
      buffers: [{
        arrayStride: 44,
        attributes: [
          { shaderLocation: 0, offset: 0, format: "float32x3" },
          { shaderLocation: 1, offset: 12, format: "float32x3" },
          { shaderLocation: 2, offset: 24, format: "float32x2" },
          { shaderLocation: 3, offset: 32, format: "float32x3" },
        ],
      }],
    },
    fragment: {
      module: shaderModule,
      entryPoint: "fs",
      targets: [{ format }],
    },
    primitive: { topology: "triangle-list", cullMode: "none" },
    depthStencil: {
      format: "depth24plus",
      depthWriteEnabled: true,
      depthCompare: "less",
    },
  });

  // Rain bind group layout and pipeline
  const rainBindGroupLayout = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.VERTEX, buffer: { type: 'uniform' } },
    ],
  });

  const rainPipeline = device.createRenderPipeline({
    layout: device.createPipelineLayout({ bindGroupLayouts: [rainBindGroupLayout] }),
    vertex: {
      module: rainShaderModule,
      entryPoint: "vs",
      buffers: [{
        arrayStride: 16, // x, y, z, alpha
        attributes: [
          { shaderLocation: 0, offset: 0, format: "float32x3" },
          { shaderLocation: 1, offset: 12, format: "float32" },
        ],
      }],
    },
    fragment: {
      module: rainShaderModule,
      entryPoint: "fs",
      targets: [{
        format,
        blend: {
          color: {
            srcFactor: 'src-alpha',
            dstFactor: 'one-minus-src-alpha',
            operation: 'add',
          },
          alpha: {
            srcFactor: 'one',
            dstFactor: 'one-minus-src-alpha',
            operation: 'add',
          },
        },
      }],
    },
    primitive: { topology: "line-list" },
    depthStencil: {
      format: "depth24plus",
      depthWriteEnabled: false, // Don't write to depth buffer
      depthCompare: "less",
    },
  });

  // Rain uniform buffer
  const rainUniformBuffer = device.createBuffer({
    size: 64, // mat4x4
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const rainBindGroup = device.createBindGroup({
    layout: rainBindGroupLayout,
    entries: [
      { binding: 0, resource: { buffer: rainUniformBuffer } },
    ],
  });

  const depthTexture = device.createTexture({
    size: [canvas.width, canvas.height],
    format: "depth24plus",
    usage: GPUTextureUsage.RENDER_ATTACHMENT,
  });

  console.log("=== Loading Shibuya Diorama ===");
  const model = await loadOBJ(device, "Shibuya-Diorama.obj", "Shibuya-Diorama.mtl");
  
  if (!model || model.meshes.length === 0) {
    console.error("Failed to load model!");
    return;
  }

  // Create rain system
  const rain = createRainSystem(device, 2000);
  console.log("🌧️ Rain system created with", rain.numDrops, "drops");

  // Create uniform buffer and bind group for each mesh
  const meshData = model.meshes.map(mesh => {
    const uniformBuffer = device.createBuffer({
      size: 64 * 4 + 16, // Added 16 bytes for time vec4
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    
    const bindGroup = device.createBindGroup({
      layout: bindGroupLayout,
      entries: [
        { binding: 0, resource: { buffer: uniformBuffer } },
        { binding: 1, resource: model.sampler },
        { binding: 2, resource: mesh.texture.createView() },
      ],
    });
    
    return { mesh, uniformBuffer, bindGroup };
  });

  // Matrix helpers
  function createPerspective(fovY, aspect, near, far) {
    const f = 1.0 / Math.tan(fovY / 2);
    const nf = 1 / (near - far);
    return new Float32Array([f/aspect,0,0,0, 0,f,0,0, 0,0,(far+near)*nf,-1, 0,0,2*far*near*nf,0]);
  }

  function createLookAt(eye, target, up) {
    const zAxis = normalize(subtract(eye, target));
    const xAxis = normalize(cross(up, zAxis));
    const yAxis = cross(zAxis, xAxis);
    return new Float32Array([
      xAxis[0], yAxis[0], zAxis[0], 0,
      xAxis[1], yAxis[1], zAxis[1], 0,
      xAxis[2], yAxis[2], zAxis[2], 0,
      -dot(xAxis,eye), -dot(yAxis,eye), -dot(zAxis,eye), 1
    ]);
  }

  function createIdentity() { return new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]); }
  function multiply(a,b) {
    const r = new Float32Array(16);
    for(let i=0;i<4;i++) for(let j=0;j<4;j++)
      r[j*4+i] = a[i]*b[j*4] + a[4+i]*b[j*4+1] + a[8+i]*b[j*4+2] + a[12+i]*b[j*4+3];
    return r;
  }
  function subtract(a,b) { return [a[0]-b[0],a[1]-b[1],a[2]-b[2]]; }
  function cross(a,b) { return [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]; }
  function dot(a,b) { return a[0]*b[0]+a[1]*b[1]+a[2]*b[2]; }
  function normalize(v) { const l=Math.sqrt(dot(v,v)); return [v[0]/l,v[1]/l,v[2]/l]; }

  // Traffic light state
  let trafficLightMode = 'auto';
  
  function getTrafficLightState(time) {
    if (trafficLightMode === 'green') {
      return { green: 1.0, yellow: 0.0, red: 0.0 };
    } else if (trafficLightMode === 'yellow') {
      return { green: 0.0, yellow: 1.0, red: 0.0 };
    } else if (trafficLightMode === 'red') {
      return { green: 0.0, yellow: 0.0, red: 1.0 };
    }
    
    const cycleLength = 10;
    const t = time % cycleLength;
    
    if (t < 4) {
      return { green: 1.0, yellow: 0.0, red: 0.0 };
    } else if (t < 5) {
      return { green: 0.0, yellow: 1.0, red: 0.0 };
    } else if (t < 9) {
      return { green: 0.0, yellow: 0.0, red: 1.0 };
    } else {
      return { green: 0.0, yellow: 1.0, red: 0.0 };
    }
  }

  let camAngle = 0, camDist = 8, camHeight = 3, autoRotate = false;
  let rainEnabled = true;
  let flagWaveEnabled = false;
  
  const keys = {};
  window.addEventListener('keydown', e => { 
    keys[e.key.toLowerCase()] = true; 
    if (e.key === ' ') autoRotate = !autoRotate;
    
    // Traffic light controls
    if (e.key.toLowerCase() === 'g') {
      trafficLightMode = 'green';
      console.log('🚦 Traffic light: GREEN');
    } else if (e.key.toLowerCase() === 'y') {
      trafficLightMode = 'yellow';
      console.log('🚦 Traffic light: YELLOW');
    } else if (e.key.toLowerCase() === 'r') {
      trafficLightMode = 'red';
      console.log('🚦 Traffic light: RED');
    } else if (e.key.toLowerCase() === 't') {
      trafficLightMode = 'auto';
      console.log('🚦 Traffic light: AUTO CYCLE');
    }
    
    // Rain toggle
    if (e.key.toLowerCase() === 'p') {
      rainEnabled = !rainEnabled;
      console.log(rainEnabled ? '🌧️ Rain: ON' : '☀️ Rain: OFF');
    }

    // Flag wave toggle
    if (e.key.toLowerCase() === 'f') {
      flagWaveEnabled = !flagWaveEnabled;
      console.log(flagWaveEnabled ? '🎌 Flag wave: ON' : '🎌 Flag wave: OFF');
    }
  });
  window.addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);

  let startTime = performance.now();
  let lastTime = performance.now();

  function frame(time) {
    const dt = (time - lastTime) / 1000;
    const totalTime = (time - startTime) / 1000;
    lastTime = time;

    if (keys['a']||keys['arrowleft']) camAngle -= dt*1.5;
    if (keys['d']||keys['arrowright']) camAngle += dt*1.5;
    if (keys['w']||keys['arrowup']) camDist = Math.max(2, camDist-dt*5);
    if (keys['s']||keys['arrowdown']) camDist = Math.min(20, camDist+dt*5);
    if (keys['q']) camHeight += dt*3;
    if (keys['e']) camHeight -= dt*3;
    if (autoRotate) camAngle += dt*0.3;

    const camX = Math.sin(camAngle)*camDist;
    const camZ = Math.cos(camAngle)*camDist;
    const camY = camHeight;

    const proj = createPerspective(Math.PI/3, canvas.width/canvas.height, 0.1, 100);
    const view = createLookAt([camX,camY,camZ], [0,0,0], [0,1,0]);
    const mvp = multiply(proj, view);
    const modelMat = createIdentity();

    const lightState = getTrafficLightState(totalTime);

    // Update rain
    if (rainEnabled) {
      updateRain(rain, dt);
      updateRainBuffer(device, rain);
      device.queue.writeBuffer(rainUniformBuffer, 0, mvp);
    }

    // Update mesh uniforms
    for (const { mesh, uniformBuffer } of meshData) {
      const uniforms = new Float32Array(68); // Increased size for time parameter
      uniforms.set(mvp, 0);
      uniforms.set(modelMat, 16);
      uniforms.set([0.4, 0.7, 0.5, 0], 32);
      uniforms.set([camX, camY, camZ, 1], 36);
      uniforms.set([mesh.useTexture, 0, 0, 0], 40);

      let emissive = 0;
      let isTrafficLight = 0;

      if (mesh.trafficLight) {
        isTrafficLight = 1;
        if (mesh.trafficLight === 'red') {
          emissive = lightState.red;
        } else if (mesh.trafficLight === 'yellow') {
          emissive = lightState.yellow;
        } else if (mesh.trafficLight === 'green') {
          emissive = lightState.green;
        }
      }

      uniforms.set([emissive, isTrafficLight, 0, 0], 44);

      // Add time parameter, flag identifier, and wave enabled flag
      const isFlag = mesh.name && mesh.name.toLowerCase().includes('flag') ? 1.0 : 0.0;
      const waveEnabled = flagWaveEnabled ? 1.0 : 0.0;
      uniforms.set([totalTime, isFlag, waveEnabled, 0], 48);

      device.queue.writeBuffer(uniformBuffer, 0, uniforms);
    }

    const encoder = device.createCommandEncoder();
    const pass = encoder.beginRenderPass({
      colorAttachments: [{
        view: context.getCurrentTexture().createView(),
        clearValue: rainEnabled ? { r:0.03, g:0.03, b:0.06, a:1 } : { r:0.05, g:0.05, b:0.08, a:1 },
        loadOp: "clear", storeOp: "store",
      }],
      depthStencilAttachment: {
        view: depthTexture.createView(),
        depthClearValue: 1.0,
        depthLoadOp: "clear", depthStoreOp: "store",
      },
    });

    // Draw scene
    pass.setPipeline(pipeline);
    for (const { mesh, bindGroup } of meshData) {
      pass.setBindGroup(0, bindGroup);
      pass.setVertexBuffer(0, mesh.buffer);
      pass.draw(mesh.vertexCount);
    }

    // Draw rain
    if (rainEnabled) {
      pass.setPipeline(rainPipeline);
      pass.setBindGroup(0, rainBindGroup);
      pass.setVertexBuffer(0, rain.buffer);
      pass.draw(rain.numDrops * 2);
    }

    pass.end();
    device.queue.submit([encoder.finish()]);
    requestAnimationFrame(frame);
  }

  console.log("=== Controls ===");
  console.log("A/D or ←/→: Rotate camera");
  console.log("W/S or ↑/↓: Zoom in/out");
  console.log("Q/E: Move camera up/down");
  console.log("Space: Toggle auto-rotate");
  console.log("🚦 G: Green light | Y: Yellow | R: Red | T: Auto");
  console.log("🌧️ P: Toggle rain");
  console.log("🎌 F: Toggle flag wave");
  
  requestAnimationFrame(frame);
}

main();