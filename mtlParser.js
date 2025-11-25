// MTL File Parser for WebGPU
export class MTLParser {
    constructor() {
        this.materials = new Map();
    }

    async parse(mtlText, basePath = '') {
        const lines = mtlText.split('\n');
        let currentMaterial = null;

        for (let line of lines) {
            line = line.trim();

            // Skip comments and empty lines
            if (line.startsWith('#') || line.length === 0) continue;

            const parts = line.split(/\s+/);
            const type = parts[0];

            switch (type) {
                case 'newmtl': // New material
                    currentMaterial = {
                        name: parts[1],
                        ambient: [0.2, 0.2, 0.2],
                        diffuse: [0.8, 0.8, 0.8],
                        specular: [1.0, 1.0, 1.0],
                        shininess: 32.0,
                        opacity: 1.0,
                        texturePath: null,
                        hasTexture: false
                    };
                    this.materials.set(parts[1], currentMaterial);
                    break;

                case 'Ka': // Ambient color
                    if (currentMaterial) {
                        currentMaterial.ambient = [
                            parseFloat(parts[1]),
                            parseFloat(parts[2]),
                            parseFloat(parts[3])
                        ];
                    }
                    break;

                case 'Kd': // Diffuse color
                    if (currentMaterial) {
                        currentMaterial.diffuse = [
                            parseFloat(parts[1]),
                            parseFloat(parts[2]),
                            parseFloat(parts[3])
                        ];
                    }
                    break;

                case 'Ks': // Specular color
                    if (currentMaterial) {
                        currentMaterial.specular = [
                            parseFloat(parts[1]),
                            parseFloat(parts[2]),
                            parseFloat(parts[3])
                        ];
                    }
                    break;

                case 'Ns': // Specular exponent (shininess)
                    if (currentMaterial) {
                        currentMaterial.shininess = parseFloat(parts[1]);
                    }
                    break;

                case 'd': // Opacity
                    if (currentMaterial) {
                        currentMaterial.opacity = parseFloat(parts[1]);
                    }
                    break;

                case 'map_Kd': // Diffuse texture map
                    if (currentMaterial) {
                        // Get texture path (last part, might have flags before it)
                        let texturePath = parts[parts.length - 1];
                        // Remove any flags that might be in the path
                        for (let i = parts.length - 1; i >= 1; i--) {
                            if (!parts[i].startsWith('-')) {
                                texturePath = parts.slice(i).join(' ');
                                break;
                            }
                        }
                        currentMaterial.texturePath = basePath + texturePath;
                        currentMaterial.hasTexture = true;
                    }
                    break;
            }
        }

        return this.materials;
    }

    getMaterial(name) {
        return this.materials.get(name) || this.getDefaultMaterial();
    }

    getDefaultMaterial() {
        return {
            name: 'default',
            ambient: [0.2, 0.2, 0.2],
            diffuse: [0.8, 0.8, 0.8],
            specular: [1.0, 1.0, 1.0],
            shininess: 32.0,
            opacity: 1.0,
            texturePath: null,
            hasTexture: false
        };
    }

    async loadTexture(device, texturePath) {
        try {
            const response = await fetch(texturePath);
            const blob = await response.blob();
            const imageBitmap = await createImageBitmap(blob);

            const texture = device.createTexture({
                size: [imageBitmap.width, imageBitmap.height, 1],
                format: 'rgba8unorm',
                usage: GPUTextureUsage.TEXTURE_BINDING |
                       GPUTextureUsage.COPY_DST |
                       GPUTextureUsage.RENDER_ATTACHMENT
            });

            device.queue.copyExternalImageToTexture(
                { source: imageBitmap },
                { texture: texture },
                [imageBitmap.width, imageBitmap.height]
            );

            return texture;
        } catch (error) {
            console.warn(`Failed to load texture: ${texturePath}`, error);
            return null;
        }
    }

    createDefaultTexture(device) {
        // Create a 1x1 white texture as default
        const texture = device.createTexture({
            size: [1, 1, 1],
            format: 'rgba8unorm',
            usage: GPUTextureUsage.TEXTURE_BINDING |
                   GPUTextureUsage.COPY_DST
        });

        const data = new Uint8Array([255, 255, 255, 255]);
        device.queue.writeTexture(
            { texture: texture },
            data,
            { bytesPerRow: 4 },
            [1, 1, 1]
        );

        return texture;
    }
}
