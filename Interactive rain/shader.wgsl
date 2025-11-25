// Improved shader with normals and lighting

struct Uniforms {
  mvp : mat4x4<f32>,
  modelMatrix : mat4x4<f32>,
  lightDir : vec4<f32>,
};

@group(0) @binding(0)
var<uniform> uniforms : Uniforms;

struct VertexOut {
  @builtin(position) position : vec4<f32>,
  @location(0) normal : vec3<f32>,
  @location(1) uv : vec2<f32>,
  @location(2) worldPos : vec3<f32>,
};

@vertex
fn vs_main(
  @location(0) position : vec3<f32>,
  @location(1) normal : vec3<f32>,
  @location(2) uv : vec2<f32>,
) -> VertexOut {
  var out : VertexOut;
  out.position = uniforms.mvp * vec4(position, 1.0);
  
  // Transform normal to world space (simplified - assumes uniform scale)
  out.normal = normalize((uniforms.modelMatrix * vec4(normal, 0.0)).xyz);
  out.uv = uv;
  out.worldPos = (uniforms.modelMatrix * vec4(position, 1.0)).xyz;
  
  return out;
}

@fragment
fn fs_main(
  @location(0) normal : vec3<f32>,
  @location(1) uv : vec2<f32>,
  @location(2) worldPos : vec3<f32>,
) -> @location(0) vec4<f32> {
  // Normalize the interpolated normal
  let N = normalize(normal);
  
  // Light direction (from uniforms, pointing towards light)
  let L = normalize(uniforms.lightDir.xyz);
  
  // Basic diffuse lighting
  let NdotL = max(dot(N, L), 0.0);
  
  // Ambient light
  let ambient = 0.3;
  
  // Base color - use a nice grey/white so lighting shows well
  let baseColor = vec3<f32>(0.8, 0.8, 0.85);
  
  // Final color with lighting
  let lit = baseColor * (ambient + NdotL * 0.7);
  
  return vec4(lit, 1.0);
}
