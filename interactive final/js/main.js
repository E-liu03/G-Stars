/**
 * main.js -- WebGPU 3D Shibuya Diorama Renderer
 *
 * Features:
 * - OBJ/MTL model loading with textures
 * - Traffic light animation (auto-cycle or manual control)
 * - Rain particle system
 * - Neon sign glow effects
 * - Billboard spotlight lighting
 * - Vending machine button illumination
 * - Flag wave animation
 * - Day/night cycle with dynamic lighting
 * - Background image support
 *
 * Controls:
 * - A/D: Rotate camera left/right
 * - W/S: Zoom in/out
 * - Q/E: Move camera up/down
 * - Space: Toggle auto-rotate
 * - G/Y/R/T: Traffic light control (Green/Yellow/Red/Auto)
 * - P: Toggle rain
 * - N: Toggle neon signs
 * - L: Toggle billboard lights
 * - F: Toggle flag wave
 * - C: Toggle day/night cycle
 */

import { loadTexture } from './textureLoader.js';
import { loadOBJ } from './objLoader.js';
import { createRainSystem } from './rainSystem.js';
import { mainShaderCode, rainShaderCode, bgShaderCode, createCylinderGeometry } from './shaders.js';
import { initInputHandlers } from './inputHandler.js';
import { createRenderState, frame } from './renderer.js';

async function main() {
  // Get the canvas element for rendering
  const canvas = document.getElementById("gfx-main");

  // Check for WebGPU support
  if (!navigator.gpu) {
    alert("WebGPU not supported! Use Chrome.");
    return;
  }

  // Initialize WebGPU
  const adapter = await navigator.gpu.requestAdapter();
  const device = await adapter.requestDevice();

  // Configure the canvas for WebGPU rendering
  const context = canvas.getContext("webgpu");
  const format = navigator.gpu.getPreferredCanvasFormat();
  context.configure({ device, format, alphaMode: "opaque" });

  // ==========================================================================
  // SHADER SETUP
  // ==========================================================================

  const shaderModule = device.createShaderModule({ code: mainShaderCode });
  const rainShaderModule = device.createShaderModule({ code: rainShaderCode });
  const bgShaderModule = device.createShaderModule({ code: bgShaderCode });

  // Create cylinder geometry for skybox
  const skyboxVertices = createCylinderGeometry(25, 20, 64);
  const skyboxBuffer = device.createBuffer({
    size: skyboxVertices.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(skyboxBuffer, 0, skyboxVertices);
  const skyboxVertexCount = skyboxVertices.length / 5;  // 5 floats per vertex

  // ==========================================================================
  // PIPELINE SETUP
  // ==========================================================================

  // Main scene bind group layout - defines what resources the shader can access
  const bindGroupLayout = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } },
      { binding: 1, visibility: GPUShaderStage.FRAGMENT, sampler: { type: 'filtering' } },
      { binding: 2, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'float' } },
    ],
  });

  // Main render pipeline for 3D scene objects
  const pipeline = device.createRenderPipeline({
    layout: device.createPipelineLayout({ bindGroupLayouts: [bindGroupLayout] }),
    vertex: {
      module: shaderModule,
      entryPoint: "vs",
      buffers: [{
        arrayStride: 44,  // 11 floats * 4 bytes = 44 bytes per vertex
        attributes: [
          { shaderLocation: 0, offset: 0, format: "float32x3" },   // position
          { shaderLocation: 1, offset: 12, format: "float32x3" },  // normal
          { shaderLocation: 2, offset: 24, format: "float32x2" },  // uv
          { shaderLocation: 3, offset: 32, format: "float32x3" },  // color
        ],
      }],
    },
    fragment: {
      module: shaderModule,
      entryPoint: "fs",
      targets: [{ format }],
    },
    primitive: {
      topology: "triangle-list",
      cullMode: "none"  // Don't cull back faces (some models need this)
    },
    depthStencil: {
      format: "depth24plus",
      depthWriteEnabled: true,
      depthCompare: "less",
    },
  });

  // Rain pipeline bind group layout
  const rainBindGroupLayout = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.VERTEX, buffer: { type: 'uniform' } },
    ],
  });

  // Rain render pipeline (line primitives with blending)
  const rainPipeline = device.createRenderPipeline({
    layout: device.createPipelineLayout({ bindGroupLayouts: [rainBindGroupLayout] }),
    vertex: {
      module: rainShaderModule,
      entryPoint: "vs",
      buffers: [{
        arrayStride: 16,  // 4 floats * 4 bytes = 16 bytes per vertex
        attributes: [
          { shaderLocation: 0, offset: 0, format: "float32x3" },  // position
          { shaderLocation: 1, offset: 12, format: "float32" },   // alpha
        ],
      }],
    },
    fragment: {
      module: rainShaderModule,
      entryPoint: "fs",
      targets: [{
        format,
        // Alpha blending for transparent rain
        blend: {
          color: { srcFactor: 'src-alpha', dstFactor: 'one-minus-src-alpha', operation: 'add' },
          alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' },
        },
      }],
    },
    primitive: { topology: "line-list" },  // Each 2 vertices form a line
    depthStencil: {
      format: "depth24plus",
      depthWriteEnabled: false,  // Don't write to depth (rain is transparent)
      depthCompare: "less",
    },
  });

  // Rain uniform buffer for MVP matrix
  const rainUniformBuffer = device.createBuffer({
    size: 64,  // 4x4 matrix = 16 floats = 64 bytes
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const rainBindGroup = device.createBindGroup({
    layout: rainBindGroupLayout,
    entries: [{ binding: 0, resource: { buffer: rainUniformBuffer } }],
  });

  // Background pipeline setup
  const bgBindGroupLayout = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } },
      { binding: 1, visibility: GPUShaderStage.FRAGMENT, sampler: { type: 'filtering' } },
      { binding: 2, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'float' } },
    ],
  });

  const bgPipeline = device.createRenderPipeline({
    layout: device.createPipelineLayout({ bindGroupLayouts: [bgBindGroupLayout] }),
    vertex: {
      module: bgShaderModule,
      entryPoint: "vs",
      buffers: [{
        arrayStride: 20,  // 5 floats * 4 bytes = 20 bytes per vertex (pos + uv)
        attributes: [
          { shaderLocation: 0, offset: 0, format: "float32x3" },   // position
          { shaderLocation: 1, offset: 12, format: "float32x2" },  // uv
        ],
      }],
    },
    fragment: {
      module: bgShaderModule,
      entryPoint: "fs",
      targets: [{ format }],
    },
    primitive: {
      topology: "triangle-list",
      cullMode: "front",  // Cull front faces so we see inside of cylinder
    },
    depthStencil: {
      format: "depth24plus",
      depthWriteEnabled: false,
      depthCompare: "less-equal",  // Draw at far depth
    },
  });

  const bgUniformBuffer = device.createBuffer({
    size: 80,  // mat4x4 (64 bytes) + vec4 (16 bytes) = 80 bytes
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const bgSampler = device.createSampler({
    magFilter: 'linear',
    minFilter: 'linear',
  });

  // Create depth texture for depth testing
  const depthTexture = device.createTexture({
    size: [canvas.width, canvas.height],
    format: "depth24plus",
    usage: GPUTextureUsage.RENDER_ATTACHMENT,
  });

  // ==========================================================================
  // LOAD RESOURCES
  // ==========================================================================

  console.log("=== Loading Shibuya Diorama ===");
  const model = await loadOBJ(device, "Shibuya-Diorama.obj", "Shibuya-Diorama.mtl");

  if (!model || model.meshes.length === 0) {
    console.error("Failed to load model!");
    return;
  }

  // Load background texture
  const backgroundTexture = await loadTexture(device, "textures/imagewrap.jpg");
  let bgBindGroup = null;
  if (backgroundTexture) {
    console.log("🖼️ Background texture loaded");
    bgBindGroup = device.createBindGroup({
      layout: bgBindGroupLayout,
      entries: [
        { binding: 0, resource: { buffer: bgUniformBuffer } },
        { binding: 1, resource: bgSampler },
        { binding: 2, resource: backgroundTexture.createView() },
      ],
    });
  } else {
    console.warn("⚠️ Background texture not found - using solid color");
  }

  // Create rain particle system
  const rain = createRainSystem(device, 2000);
  console.log("🌧️ Rain system created with", rain.numDrops, "drops");

  // Create uniform buffers and bind groups for each mesh
  const meshData = model.meshes.map(mesh => {
    const uniformBuffer = device.createBuffer({
      size: 256,  // Enough for all our uniforms
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

  // ==========================================================================
  // INITIALIZE INPUT HANDLERS
  // ==========================================================================

  initInputHandlers();

  // ==========================================================================
  // START APPLICATION
  // ==========================================================================

  // Log controls to console
  console.log("=== Controls ===");
  console.log("A/D or ←/→: Rotate camera");
  console.log("W/S or ↑/↓: Zoom in/out");
  console.log("Q/E: Move camera up/down");
  console.log("Space: Toggle auto-rotate");
  console.log("🚦 G: Green | Y: Yellow | R: Red | T: Auto");
  console.log("🌧️ P: Toggle rain");
  console.log("💡 N: Toggle neon signs");
  console.log("🔦 L: Toggle billboard lights");
  console.log("🎌 F: Toggle flag wave");
  console.log("🔄 C: Toggle day/night cycle");

  // Create render state
  const state = createRenderState(
    canvas,
    device,
    pipeline,
    rainPipeline,
    bgPipeline,
    depthTexture,
    model,
    rain,
    meshData,
    rainUniformBuffer,
    rainBindGroup,
    bgUniformBuffer,
    bgBindGroup,
    skyboxBuffer,
    skyboxVertexCount
  );

  // Start the render loop
  requestAnimationFrame((time) => frame(time, context, format, state));
}

// Run the application
main();
