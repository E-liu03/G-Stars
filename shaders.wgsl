// Vertex Shader Structs
struct Uniforms {
    modelViewProjectionMatrix: mat4x4<f32>,
    modelMatrix: mat4x4<f32>,
    normalMatrix: mat4x4<f32>,
    cameraPosition: vec3<f32>,
    lightIntensity: f32,
}

struct Light {
    directionalDirection: vec3<f32>,
    directionalColor: vec3<f32>,
    directionalIntensity: f32,
    pointPosition: vec3<f32>,
    pointColor: vec3<f32>,
    pointIntensity: f32,
    ambientColor: vec3<f32>,
    ambientIntensity: f32,
    enableDirectional: f32,
    enablePoint: f32,
    shadingMode: f32,
}

struct VertexInput {
    @location(0) position: vec3<f32>,
    @location(1) normal: vec3<f32>,
    @location(2) uv: vec2<f32>,
}

struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) worldPosition: vec3<f32>,
    @location(1) normal: vec3<f32>,
    @location(2) uv: vec2<f32>,
    @location(3) viewDirection: vec3<f32>,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var<uniform> light: Light;

@vertex
fn vertexMain(input: VertexInput) -> VertexOutput {
    var output: VertexOutput;

    // Transform position
    let worldPos = uniforms.modelMatrix * vec4<f32>(input.position, 1.0);
    output.worldPosition = worldPos.xyz;
    output.position = uniforms.modelViewProjectionMatrix * vec4<f32>(input.position, 1.0);

    // Transform normal
    output.normal = normalize((uniforms.normalMatrix * vec4<f32>(input.normal, 0.0)).xyz);

    // Pass UV coordinates
    output.uv = input.uv;

    // Calculate view direction
    output.viewDirection = normalize(uniforms.cameraPosition - worldPos.xyz);

    return output;
}

// Fragment Shader
struct Material {
    ambient: vec3<f32>,
    diffuse: vec3<f32>,
    specular: vec3<f32>,
    shininess: f32,
    hasTexture: f32,
}

@group(1) @binding(0) var<uniform> material: Material;
@group(1) @binding(1) var textureSampler: sampler;
@group(1) @binding(2) var baseTexture: texture_2d<f32>;

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {
    let normal = normalize(input.normal);
    let viewDir = normalize(input.viewDirection);

    // Get base color from material or texture
    var baseColor: vec3<f32>;
    if (material.hasTexture > 0.5) {
        baseColor = textureSample(baseTexture, textureSampler, input.uv).rgb;
    } else {
        baseColor = material.diffuse;
    }

    // Ambient lighting
    var ambient = light.ambientColor * light.ambientIntensity * material.ambient * baseColor;

    var finalColor = ambient;

    // Directional Light
    if (light.enableDirectional > 0.5) {
        let lightDir = normalize(-light.directionalDirection);
        let diff = max(dot(normal, lightDir), 0.0);
        let diffuse = light.directionalColor * light.directionalIntensity * diff * baseColor;

        // Specular (Blinn-Phong)
        let halfDir = normalize(lightDir + viewDir);
        let spec = pow(max(dot(normal, halfDir), 0.0), material.shininess);
        let specular = light.directionalColor * light.directionalIntensity * spec * material.specular;

        finalColor += diffuse + specular;
    }

    // Point Light
    if (light.enablePoint > 0.5) {
        let lightVector = light.pointPosition - input.worldPosition;
        let distance = length(lightVector);
        let lightDir = normalize(lightVector);

        // Attenuation
        let attenuation = 1.0 / (1.0 + 0.09 * distance + 0.032 * distance * distance);

        let diff = max(dot(normal, lightDir), 0.0);
        let diffuse = light.pointColor * light.pointIntensity * diff * baseColor * attenuation;

        // Specular
        let halfDir = normalize(lightDir + viewDir);
        let spec = pow(max(dot(normal, halfDir), 0.0), material.shininess);
        let specular = light.pointColor * light.pointIntensity * spec * material.specular * attenuation;

        finalColor += diffuse + specular;
    }

    // Shading modes
    if (light.shadingMode > 1.5) {
        // Mode 2: Normal visualization
        return vec4<f32>(normal * 0.5 + 0.5, 1.0);
    } else if (light.shadingMode > 0.5) {
        // Mode 1: Wireframe-like effect
        let edgeFactor = abs(dot(normal, viewDir));
        return vec4<f32>(finalColor * edgeFactor, 1.0);
    }

    // Mode 0: Normal shading
    finalColor = finalColor * uniforms.lightIntensity;

    return vec4<f32>(finalColor, 1.0);
}
