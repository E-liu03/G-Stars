/**
 * shaders.js
 * WebGPU shader definitions
 */

/**
 * Main scene shader code
 * Handles all 3D objects with lighting, textures, and special effects
 */
export const mainShaderCode = `
  // Uniform data passed from JavaScript each frame
  struct Uniforms {
    mvp : mat4x4<f32>,        // Model-View-Projection matrix
    model : mat4x4<f32>,       // Model matrix for transforming normals
    lightDir : vec4<f32>,      // Direction to the light source
    cameraPos : vec4<f32>,     // Camera position for specular calculation
    useTexture : vec4<f32>,    // x: 1.0 if textured, 0.0 if not
    emissive : vec4<f32>,      // x: strength, y: isTrafficLight, z: isNeonSign, w: isVendingButton
    time : vec4<f32>,          // x: totalTime, y: isFlag, z: waveEnabled
    lighting : vec4<f32>,      // x: ambient, y: diffuse, z: sunHeight
    spotlight : vec4<f32>,     // w: spotlight enabled flag
  };

  // Bind group 0: uniform buffer, texture sampler, and texture
  @group(0) @binding(0) var<uniform> u : Uniforms;
  @group(0) @binding(1) var texSampler : sampler;
  @group(0) @binding(2) var texDiffuse : texture_2d<f32>;

  // Vertex shader output / Fragment shader input
  struct VSOut {
    @builtin(position) pos : vec4<f32>,  // Clip-space position
    @location(0) normal : vec3<f32>,      // World-space normal
    @location(1) worldPos : vec3<f32>,    // World-space position
    @location(2) uv : vec2<f32>,          // Texture coordinates
    @location(3) color : vec3<f32>,       // Vertex color (from material)
  };

  // Vertex shader - transforms vertices and optionally animates the flag
  @vertex
  fn vs(@location(0) pos : vec3<f32>, @location(1) norm : vec3<f32>, @location(2) uv : vec2<f32>, @location(3) color : vec3<f32>) -> VSOut {
    var out : VSOut;
    var animatedPos = pos;

    // Flag wave animation
    // u.time.y = 1.0 if this is the flag, u.time.z = 1.0 if wave is enabled
    if (u.time.y > 0.5 && u.time.z > 0.5) {
      let time = u.time.x;

      // Wave amount increases from pole (bottom, uv.y=1) to free edge (top, uv.y=0)
      // Cubic falloff makes the free edge wave more dramatically
      let waveAmount = (1.0 - uv.y) * (1.0 - uv.y) * (1.0 - uv.y);

      // Two overlapping sine waves create natural-looking flutter
      let wave1 = sin(time * 2.5 + (1.0 - uv.y) * 6.0) * 0.04;
      let wave2 = sin(time * 1.8 + (1.0 - uv.y) * 4.0 + uv.x * 2.0) * 0.025;

      // Apply horizontal displacement (side-to-side flutter)
      animatedPos.x += (wave1 + wave2) * waveAmount;

      // Tiny Z motion adds depth/realism
      animatedPos.z += wave2 * 0.15 * waveAmount;
    }

    // Transform position to clip space
    out.pos = u.mvp * vec4(animatedPos, 1.0);

    // Transform normal to world space (using model matrix)
    out.normal = (u.model * vec4(norm, 0.0)).xyz;

    // Transform position to world space
    out.worldPos = (u.model * vec4(animatedPos, 1.0)).xyz;

    out.uv = uv;
    out.color = color;
    return out;
  }

  // Fragment shader - calculates final pixel color
  @fragment
  fn fs(@location(0) normal : vec3<f32>, @location(1) worldPos : vec3<f32>, @location(2) uv : vec2<f32>, @location(3) color : vec3<f32>) -> @location(0) vec4<f32> {
    // Normalize interpolated normal
    let N = normalize(normal);

    // Light direction (normalized)
    let L = normalize(u.lightDir.xyz);

    // View direction (from fragment to camera)
    let V = normalize(u.cameraPos.xyz - worldPos);

    // Half vector for Blinn-Phong specular
    let H = normalize(L + V);

    // Get base color from texture or vertex color
    var baseColor = color;
    if (u.useTexture.x > 0.5) {
      let texColor = textureSample(texDiffuse, texSampler, uv);
      baseColor = texColor.rgb;
    }

    // Extract flags from uniform data
    let isTrafficLight = u.emissive.y > 0.5;
    let isNeonSign = u.emissive.z > 0.5;
    let isVendingButton = u.emissive.w > 0.5;
    let emissiveStrength = u.emissive.x;
    let spotlightEnabled = u.spotlight.w > 0.5;

    var lit : vec3<f32>;

    // Special handling for traffic lights
    if (isTrafficLight) {
      if (emissiveStrength > 0.5) {
        // Light is ON - bright and glowing
        lit = baseColor * 2.5 + vec3(0.3);
      } else {
        // Light is OFF - very dim
        lit = baseColor * 0.15;
      }
    }
    // Special handling for neon signs
    else if (isNeonSign) {
      let glow = emissiveStrength;  // Pulsing value 0-1
      let turquoise = vec3(0.0, 0.9, 0.8);  // Turquoise neon color
      // Bright base with additional glow that pulses
      lit = turquoise * (1.2 + glow * 1.0) + vec3(0.1, 0.3, 0.3) * glow;
    }
    // Special handling for vending machine buttons
    else if (isVendingButton) {
      if (emissiveStrength > 0.5) {
        // Buttons lit up - warm white glow
        let buttonColor = vec3(1.0, 0.9, 0.7);
        lit = buttonColor * 1.8;
      } else {
        // Buttons off - dim
        lit = baseColor * 0.3;
      }
    }
    // Normal objects - standard Phong lighting
    else {
      // Get lighting parameters from day/night cycle
      let ambient = u.lighting.x;
      let diffuse = max(dot(N, L), 0.0) * u.lighting.y;
      let specular = pow(max(dot(N, H), 0.0), 32.0) * 0.1;

      lit = baseColor * (ambient + diffuse) + vec3(specular);

      // Add billboard spotlight effect if enabled
      if (spotlightEnabled) {
        // Five spotlight positions above the billboard
        let spot1Pos = vec3<f32>(-1.4, 1.0, 0.35);
        let spot2Pos = vec3<f32>(-1.1, 1.0, 0.35);
        let spot3Pos = vec3<f32>(-0.8, 1.0, 0.35);
        let spot4Pos = vec3<f32>(-0.5, 1.0, 0.35);
        let spot5Pos = vec3<f32>(-0.2, 1.0, 0.35);

        // Spotlight direction (pointing down and slightly forward)
        let spotDir = vec3<f32>(0.0, -1.0, 0.2);

        // Warm white spotlight color
        let spotColor = vec3<f32>(1.0, 0.95, 0.85);

        var spotLight = 0.0;

        // Calculate contribution from each spotlight
        let spots = array<vec3<f32>, 5>(spot1Pos, spot2Pos, spot3Pos, spot4Pos, spot5Pos);
        for (var i = 0; i < 5; i++) {
          let toFrag = worldPos - spots[i];
          let dist = length(toFrag);
          let dir = normalize(toFrag);

          // Check if fragment is within spotlight cone
          let angle = dot(dir, normalize(spotDir));
          let cutoff = 0.8;  // Cone angle (higher = narrower)

          if (angle > cutoff && dist < 1.5) {
            // Calculate spotlight intensity with distance falloff
            let intensity = (angle - cutoff) / (1.0 - cutoff);
            let falloff = 1.0 / (1.0 + dist * dist * 1.0);
            spotLight += intensity * falloff * 0.35;
          }
        }

        // Add spotlight contribution to final color
        lit += spotColor * spotLight;
      }
    }

    // Tone mapping (Reinhard) to handle HDR values
    let mapped = lit / (lit + vec3(1.0));

    return vec4(mapped, 1.0);
  }
`;

/**
 * Rain shader code
 * Simple shader for rain drop lines with alpha fade
 */
export const rainShaderCode = `
  struct RainUniforms {
    mvp : mat4x4<f32>,  // Model-View-Projection matrix
  };
  @group(0) @binding(0) var<uniform> u : RainUniforms;

  struct VSOut {
    @builtin(position) pos : vec4<f32>,
    @location(0) alpha : f32,  // Alpha value for fade
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
    // Light blue rain color with fade based on alpha
    return vec4(0.7, 0.8, 1.0, alpha * 0.5);
  }
`;

/**
 * Background shader code
 * Cylindrical skybox surrounding the scene
 */
export const bgShaderCode = `
  struct BGUniforms {
    mvp : mat4x4<f32>,         // Model-View-Projection matrix
    brightness : vec4<f32>,    // x: brightness multiplier
  };
  @group(0) @binding(0) var<uniform> u : BGUniforms;
  @group(0) @binding(1) var bgSampler : sampler;
  @group(0) @binding(2) var bgTexture : texture_2d<f32>;

  struct VSOut {
    @builtin(position) pos : vec4<f32>,
    @location(0) uv : vec2<f32>,
  };

  @vertex
  fn vs(@location(0) position : vec3<f32>, @location(1) uv : vec2<f32>) -> VSOut {
    var out : VSOut;
    out.pos = u.mvp * vec4(position, 1.0);
    out.uv = uv;
    return out;
  }

  @fragment
  fn fs(@location(0) uv : vec2<f32>) -> @location(0) vec4<f32> {
    let texColor = textureSample(bgTexture, bgSampler, uv);
    let brightness = u.brightness.x;
    return vec4(texColor.rgb * brightness, 1.0);
  }
`;

/**
 * Creates a cylinder geometry for the skybox
 * @param {number} radius - Cylinder radius
 * @param {number} height - Cylinder height
 * @param {number} segments - Number of segments around the cylinder
 * @returns {Float32Array} Vertex data
 */
export function createCylinderGeometry(radius, height, segments) {
  const vertices = [];

  for (let i = 0; i < segments; i++) {
    const angle1 = (i / segments) * Math.PI * 2;
    const angle2 = ((i + 1) / segments) * Math.PI * 2;

    const x1 = Math.cos(angle1) * radius;
    const z1 = Math.sin(angle1) * radius;
    const x2 = Math.cos(angle2) * radius;
    const z2 = Math.sin(angle2) * radius;

    // UV coordinates (wrap texture around cylinder)
    const u1 = i / segments;
    const u2 = (i + 1) / segments;

    // Two triangles per segment (quad)
    // Triangle 1: bottom-left, bottom-right, top-left
    vertices.push(
      x1, -height/2, z1, u1, 1.0,  // bottom-left
      x2, -height/2, z2, u2, 1.0,  // bottom-right
      x1, height/2, z1, u1, 0.0,   // top-left
    );

    // Triangle 2: top-left, bottom-right, top-right
    vertices.push(
      x1, height/2, z1, u1, 0.0,   // top-left
      x2, -height/2, z2, u2, 1.0,  // bottom-right
      x2, height/2, z2, u2, 0.0,   // top-right
    );
  }

  return new Float32Array(vertices);
}
