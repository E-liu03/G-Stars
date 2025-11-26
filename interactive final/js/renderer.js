/**
 * renderer.js
 * Main render loop and rendering logic
 */

import { createPerspective, createLookAt, createIdentity, multiply } from './mathUtils.js';
import { getCameraPosition, updateCamera } from './camera.js';
import { getTrafficLightState } from './trafficLight.js';
import { getDayNightLighting } from './lighting.js';
import { updateRain, updateRainBuffer } from './rainSystem.js';
import { keys, features } from './inputHandler.js';

/**
 * Creates the render state object
 * @param {HTMLCanvasElement} canvas - The canvas element
 * @param {GPUDevice} device - The WebGPU device
 * @param {GPURenderPipeline} pipeline - Main render pipeline
 * @param {GPURenderPipeline} rainPipeline - Rain render pipeline
 * @param {GPURenderPipeline} bgPipeline - Background render pipeline
 * @param {GPUTexture} depthTexture - Depth texture
 * @param {Object} model - Loaded model data
 * @param {Object} rain - Rain system
 * @param {Array} meshData - Array of mesh data with buffers and bind groups
 * @param {GPUBuffer} rainUniformBuffer - Rain uniform buffer
 * @param {GPUBindGroup} rainBindGroup - Rain bind group
 * @param {GPUBuffer} bgUniformBuffer - Background uniform buffer
 * @param {GPUBindGroup} bgBindGroup - Background bind group
 * @param {GPUBuffer} skyboxBuffer - Skybox vertex buffer
 * @param {number} skyboxVertexCount - Number of skybox vertices
 * @returns {Object} Render state
 */
export function createRenderState(canvas, device, pipeline, rainPipeline, bgPipeline, depthTexture, model, rain, meshData, rainUniformBuffer, rainBindGroup, bgUniformBuffer, bgBindGroup, skyboxBuffer, skyboxVertexCount) {
  return {
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
    skyboxVertexCount,
    startTime: performance.now(),
    lastTime: performance.now(),
    timeOfDay: 0.5,
    dayNightSpeed: 0.15,
  };
}

/**
 * Main render loop function
 * @param {number} time - Current time from requestAnimationFrame
 * @param {GPUCanvasContext} context - WebGPU canvas context
 * @param {string} format - Canvas texture format
 * @param {Object} state - Render state object
 */
export function frame(time, context, format, state) {
  // Calculate delta time and total elapsed time
  const dt = (time - state.lastTime) / 1000;  // Convert to seconds
  const totalTime = (time - state.startTime) / 1000;
  state.lastTime = time;

  // Update day/night cycle if enabled
  if (features.dayNightCycleEnabled) {
    state.timeOfDay = (state.timeOfDay + dt * state.dayNightSpeed) % 1.0;
  }

  // Update camera
  updateCamera(keys, dt);

  // Get camera position
  const [camX, camY, camZ] = getCameraPosition();

  // Create view-projection matrices
  const proj = createPerspective(Math.PI/3, state.canvas.width/state.canvas.height, 0.1, 100);
  const view = createLookAt([camX,camY,camZ], [0,0,0], [0,1,0]);
  const mvp = multiply(proj, view);
  const modelMat = createIdentity();

  // Get current states
  const lightState = getTrafficLightState(totalTime);
  const dayNightLighting = getDayNightLighting(state.timeOfDay);

  // Update rain if enabled
  if (features.rainEnabled) {
    updateRain(state.rain, dt);
    updateRainBuffer(state.device, state.rain);
    state.device.queue.writeBuffer(state.rainUniformBuffer, 0, mvp);
  }

  // Neon sign pulsing effect (smooth sine wave oscillation)
  const neonPulse = 0.5 + 0.5 * Math.sin(totalTime * 3.0);

  // Update uniforms for each mesh
  for (const { mesh, uniformBuffer } of state.meshData) {
    const uniforms = new Float32Array(64);

    // Set matrices
    uniforms.set(mvp, 0);       // Offset 0: MVP matrix (16 floats)
    uniforms.set(modelMat, 16); // Offset 16: Model matrix (16 floats)

    // Set lighting data
    uniforms.set([...dayNightLighting.lightDir, 0], 32); // Offset 32: Light direction
    uniforms.set([camX, camY, camZ, 1], 36);              // Offset 36: Camera position
    uniforms.set([mesh.useTexture, 0, 0, 0], 40);         // Offset 40: Use texture flag

    // Determine emissive properties based on mesh type
    let emissive = 0;
    let isTrafficLight = 0;
    let isNeonSign = 0;
    let isVendingButton = 0;

    // Traffic light handling
    if (mesh.trafficLight) {
      isTrafficLight = 1;
      if (mesh.trafficLight === 'red') emissive = lightState.red;
      else if (mesh.trafficLight === 'yellow') emissive = lightState.yellow;
      else if (mesh.trafficLight === 'green') emissive = lightState.green;
    }

    // Neon sign handling
    if (mesh.neonSign && features.neonEnabled) {
      isNeonSign = 1;
      emissive = neonPulse;  // Pulsing glow
    }

    // Vending button handling (lights up with billboard)
    if (mesh.vendingButton) {
      isVendingButton = 1;
      emissive = features.spotlightEnabled ? 1.0 : 0.0;
    }

    uniforms.set([emissive, isTrafficLight, isNeonSign, isVendingButton], 44);

    // Time and flag animation data
    const isFlag = mesh.isFlag ? 1.0 : 0.0;
    const waveEnabled = features.flagWaveEnabled ? 1.0 : 0.0;
    uniforms.set([totalTime, isFlag, waveEnabled, 0], 48);

    // Day/night lighting parameters
    uniforms.set([dayNightLighting.ambient, dayNightLighting.diffuse, dayNightLighting.sunHeight, 0], 52);

    // Spotlight enabled flag
    uniforms.set([0, 0, 0, features.spotlightEnabled ? 1.0 : 0.0], 56);

    state.device.queue.writeBuffer(uniformBuffer, 0, uniforms);
  }

  // Begin render pass
  const encoder = state.device.createCommandEncoder();
  const pass = encoder.beginRenderPass({
    colorAttachments: [{
      view: context.getCurrentTexture().createView(),
      clearValue: {
        r: dayNightLighting.skyColor.r,
        g: dayNightLighting.skyColor.g,
        b: dayNightLighting.skyColor.b,
        a: 1
      },
      loadOp: "clear",
      storeOp: "store",
    }],
    depthStencilAttachment: {
      view: state.depthTexture.createView(),
      depthClearValue: 1.0,
      depthLoadOp: "clear",
      depthStoreOp: "store",
    },
  });

  // Draw background skybox first (if available)
  if (state.bgBindGroup) {
    // Adjust background brightness based on day/night
    const bgBrightness = 0.3 + dayNightLighting.ambient * 1.0;
    const bgUniforms = new Float32Array(20);  // mat4 (16) + vec4 (4)
    bgUniforms.set(mvp, 0);  // MVP matrix
    bgUniforms.set([bgBrightness, 0, 0, 0], 16);  // Brightness
    state.device.queue.writeBuffer(state.bgUniformBuffer, 0, bgUniforms);

    pass.setPipeline(state.bgPipeline);
    pass.setBindGroup(0, state.bgBindGroup);
    pass.setVertexBuffer(0, state.skyboxBuffer);
    pass.draw(state.skyboxVertexCount);
  }

  // Draw all scene meshes
  pass.setPipeline(state.pipeline);
  for (const { mesh, bindGroup } of state.meshData) {
    pass.setBindGroup(0, bindGroup);
    pass.setVertexBuffer(0, mesh.buffer);
    pass.draw(mesh.vertexCount);
  }

  // Draw rain (if enabled)
  if (features.rainEnabled) {
    pass.setPipeline(state.rainPipeline);
    pass.setBindGroup(0, state.rainBindGroup);
    pass.setVertexBuffer(0, state.rain.buffer);
    pass.draw(state.rain.numDrops * 2);  // 2 vertices per rain drop
  }

  // End render pass and submit commands
  pass.end();
  state.device.queue.submit([encoder.finish()]);

  // Request next frame
  requestAnimationFrame((t) => frame(t, context, format, state));
}
