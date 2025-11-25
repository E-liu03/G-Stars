import { OBJParser } from './objParser.js';
import { MTLParser } from './mtlParser.js';
import { Camera } from './camera.js';

class WebGPURenderer {
    constructor() {
        this.canvas = document.getElementById('gpuCanvas');
        this.device = null;
        this.context = null;
        this.pipeline = null;
        this.meshes = [];
        this.materials = new Map();

        // Camera
        this.camera = null;

        // Lighting state
        this.lightState = {
            directionalEnabled: true,
            pointEnabled: true,
            shadingMode: 0,
            lightIntensity: 1.0
        };

        // Stats
        this.stats = {
            fps: 0,
            frameCount: 0,
            lastTime: performance.now(),
            vertices: 0,
            triangles: 0,
            materials: 0
        };

        // Animation
        this.animationTime = 0;
    }

    async init() {
        try {
            console.log('Step 1: Checking WebGPU support...');
            document.getElementById('loading').innerHTML = '<div>Checking WebGPU support...</div><div class="spinner"></div>';

            // Check WebGPU support
            if (!navigator.gpu) {
                throw new Error('WebGPU not supported. Please use Chrome 113+ or Edge with WebGPU enabled.');
            }

            console.log('Step 2: Requesting GPU adapter...');
            document.getElementById('loading').innerHTML = '<div>Requesting GPU...</div><div class="spinner"></div>';

            // Get adapter and device
            const adapter = await navigator.gpu.requestAdapter();
            if (!adapter) {
                throw new Error('No GPU adapter found. Try enabling WebGPU in chrome://flags');
            }

            console.log('Step 3: Creating GPU device...');
            this.device = await adapter.requestDevice();
            console.log('GPU device created successfully!');

            console.log('Step 4: Configuring canvas...');
            // Configure canvas
            this.context = this.canvas.getContext('webgpu');
            const canvasFormat = navigator.gpu.getPreferredCanvasFormat();

            this.context.configure({
                device: this.device,
                format: canvasFormat,
                alphaMode: 'premultiplied',
            });

            console.log('Step 5: Loading shaders...');
            document.getElementById('loading').innerHTML = '<div>Loading shaders...</div><div class="spinner"></div>';

            // Load shaders
            const shaderResponse = await fetch('shaders.wgsl');
            const shaderCode = await shaderResponse.text();
            console.log('Shaders loaded!');

            console.log('Step 6: Initializing camera...');
            // Initialize camera
            this.camera = new Camera(this.canvas);

            console.log('Step 7: Loading 3D model (this may take a moment)...');
            document.getElementById('loading').innerHTML = '<div>Loading 3D model (88MB)...</div><div>This may take 10-30 seconds</div><div class="spinner"></div>';

            // Load OBJ and MTL files
            await this.loadModel();
            console.log('Model loaded successfully!');

            console.log('Step 8: Creating render pipeline...');
            document.getElementById('loading').innerHTML = '<div>Creating render pipeline...</div><div class="spinner"></div>';

            // Create pipeline
            await this.createRenderPipeline(shaderCode, canvasFormat);
            console.log('Pipeline created!');

            // Setup keyboard handlers
            this.setupKeyboardHandlers();

            console.log('Step 9: Starting render loop...');
            // Hide loading screen
            document.getElementById('loading').style.display = 'none';

            console.log('✅ Initialization complete! Scene should be visible now.');
            // Start render loop
            this.render();

        } catch (error) {
            console.error('❌ Initialization error:', error);
            console.error('Error stack:', error.stack);
            const loadingDiv = document.getElementById('loading');
            loadingDiv.innerHTML = `<div class="error">Error: ${error.message}<br><br>Check console (F12) for details</div>`;
        }
    }

    async loadModel() {
        try {
            console.log('Loading MTL file...');
            // Load MTL file first
            const mtlResponse = await fetch('FinalProjectV4.mtl');
            if (!mtlResponse.ok) throw new Error('Failed to load MTL file');
            const mtlText = await mtlResponse.text();
            console.log('MTL file loaded, parsing materials...');

            const mtlParser = new MTLParser();
            const materials = await mtlParser.parse(mtlText);
            console.log(`Parsed ${materials.size} materials`);

            console.log('Loading OBJ file (88MB - this will take a moment)...');
            // Load OBJ file
            const objResponse = await fetch('FinalProjectV4.obj');
            if (!objResponse.ok) throw new Error('Failed to load OBJ file');
            const objText = await objResponse.text();
            console.log(`OBJ file loaded (${(objText.length / 1024 / 1024).toFixed(2)}MB), parsing geometry...`);

            const objParser = new OBJParser();
            const meshes = await objParser.parse(objText, mtlParser);
            console.log(`Parsed ${meshes.length} meshes`);

            // Create GPU buffers for each mesh
            for (const mesh of meshes) {
                const vertexBuffer = this.device.createBuffer({
                    size: mesh.vertices.length * 4,
                    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
                });
                this.device.queue.writeBuffer(vertexBuffer, 0, new Float32Array(mesh.vertices));

                const indexBuffer = this.device.createBuffer({
                    size: mesh.indices.length * 4,
                    usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
                });
                this.device.queue.writeBuffer(indexBuffer, 0, new Uint32Array(mesh.indices));

                // Get material
                const material = materials.get(mesh.material) || mtlParser.getDefaultMaterial();

                // Load texture or create default
                let texture;
                if (material.hasTexture && material.texturePath) {
                    texture = await mtlParser.loadTexture(this.device, material.texturePath);
                }
                if (!texture) {
                    texture = mtlParser.createDefaultTexture(this.device);
                }

                // Create material buffer
                const materialData = new Float32Array([
                    ...material.ambient, 0,
                    ...material.diffuse, 0,
                    ...material.specular, material.shininess,
                    material.hasTexture ? 1.0 : 0.0, 0, 0, 0
                ]);

                const materialBuffer = this.device.createBuffer({
                    size: materialData.byteLength,
                    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
                });
                this.device.queue.writeBuffer(materialBuffer, 0, materialData);

                this.meshes.push({
                    vertexBuffer,
                    indexBuffer,
                    indexCount: mesh.indices.length,
                    material,
                    materialBuffer,
                    texture
                });

                this.stats.vertices += mesh.vertices.length / 8;
                this.stats.triangles += mesh.indices.length / 3;
            }

            this.stats.materials = materials.size;

            // Set initial camera position based on scene bounds
            if (objParser.bounds) {
                const bounds = objParser.bounds;
                const maxSize = Math.max(...bounds.size);
                const distance = maxSize * 2;
                this.camera.setInitialPosition([
                    bounds.center[0],
                    bounds.center[1] + maxSize * 0.5,
                    bounds.center[2] + distance
                ], -90, -10);
            }

            console.log(`Loaded ${this.meshes.length} meshes, ${this.stats.vertices} vertices, ${this.stats.triangles} triangles`);

        } catch (error) {
            console.error('Model loading error:', error);
            throw error;
        }
    }

    async createRenderPipeline(shaderCode, format) {
        const shaderModule = this.device.createShaderModule({
            code: shaderCode,
        });

        // Create bind group layouts
        this.uniformBindGroupLayout = this.device.createBindGroupLayout({
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
                    buffer: { type: 'uniform' }
                },
                {
                    binding: 1,
                    visibility: GPUShaderStage.FRAGMENT,
                    buffer: { type: 'uniform' }
                }
            ]
        });

        this.materialBindGroupLayout = this.device.createBindGroupLayout({
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.FRAGMENT,
                    buffer: { type: 'uniform' }
                },
                {
                    binding: 1,
                    visibility: GPUShaderStage.FRAGMENT,
                    sampler: {}
                },
                {
                    binding: 2,
                    visibility: GPUShaderStage.FRAGMENT,
                    texture: {}
                }
            ]
        });

        const pipelineLayout = this.device.createPipelineLayout({
            bindGroupLayouts: [this.uniformBindGroupLayout, this.materialBindGroupLayout]
        });

        // Create render pipeline
        this.pipeline = this.device.createRenderPipeline({
            layout: pipelineLayout,
            vertex: {
                module: shaderModule,
                entryPoint: 'vertexMain',
                buffers: [
                    {
                        arrayStride: 32, // 8 floats * 4 bytes
                        attributes: [
                            { shaderLocation: 0, offset: 0, format: 'float32x3' },  // position
                            { shaderLocation: 1, offset: 12, format: 'float32x3' }, // normal
                            { shaderLocation: 2, offset: 24, format: 'float32x2' }, // uv
                        ],
                    },
                ],
            },
            fragment: {
                module: shaderModule,
                entryPoint: 'fragmentMain',
                targets: [{ format: format }],
            },
            primitive: {
                topology: 'triangle-list',
                cullMode: 'back',
            },
            depthStencil: {
                depthWriteEnabled: true,
                depthCompare: 'less',
                format: 'depth24plus',
            },
        });

        // Create depth texture
        this.depthTexture = this.device.createTexture({
            size: [this.canvas.width, this.canvas.height],
            format: 'depth24plus',
            usage: GPUTextureUsage.RENDER_ATTACHMENT,
        });

        // Create uniform buffer
        this.uniformBuffer = this.device.createBuffer({
            size: 256, // 4 * mat4x4 + vec3 + float
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });

        // Create light buffer
        this.lightBuffer = this.device.createBuffer({
            size: 256,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });

        // Create sampler
        this.sampler = this.device.createSampler({
            magFilter: 'linear',
            minFilter: 'linear',
            mipmapFilter: 'linear',
        });

        // Create uniform bind group
        this.uniformBindGroup = this.device.createBindGroup({
            layout: this.uniformBindGroupLayout,
            entries: [
                { binding: 0, resource: { buffer: this.uniformBuffer } },
                { binding: 1, resource: { buffer: this.lightBuffer } }
            ]
        });

        // Create material bind groups for each mesh
        for (const mesh of this.meshes) {
            mesh.bindGroup = this.device.createBindGroup({
                layout: this.materialBindGroupLayout,
                entries: [
                    { binding: 0, resource: { buffer: mesh.materialBuffer } },
                    { binding: 1, resource: this.sampler },
                    { binding: 2, resource: mesh.texture.createView() }
                ]
            });
        }
    }

    setupKeyboardHandlers() {
        window.addEventListener('keydown', (e) => {
            switch(e.key) {
                case '1':
                    this.lightState.directionalEnabled = !this.lightState.directionalEnabled;
                    console.log('Directional light:', this.lightState.directionalEnabled);
                    break;
                case '2':
                    this.lightState.pointEnabled = !this.lightState.pointEnabled;
                    console.log('Point light:', this.lightState.pointEnabled);
                    break;
                case '3':
                    this.lightState.shadingMode = (this.lightState.shadingMode + 1) % 3;
                    console.log('Shading mode:', this.lightState.shadingMode);
                    break;
                case '+':
                case '=':
                    this.lightState.lightIntensity = Math.min(this.lightState.lightIntensity + 0.1, 3.0);
                    console.log('Light intensity:', this.lightState.lightIntensity.toFixed(2));
                    break;
                case '-':
                case '_':
                    this.lightState.lightIntensity = Math.max(this.lightState.lightIntensity - 0.1, 0.1);
                    console.log('Light intensity:', this.lightState.lightIntensity.toFixed(2));
                    break;
            }
        });
    }

    updateUniforms() {
        this.animationTime += 0.01;

        // Update camera
        this.camera.update(1 / 60);

        // Get matrices
        const viewMatrix = this.camera.getViewMatrix();
        const projectionMatrix = this.camera.getProjectionMatrix();
        const modelMatrix = this.identity();

        // Calculate MVP matrix
        const mvpMatrix = this.multiplyMatrices(
            projectionMatrix,
            this.multiplyMatrices(viewMatrix, modelMatrix)
        );

        // Normal matrix (inverse transpose of model matrix)
        const normalMatrix = this.identity();

        // Pack uniform data
        const uniformData = new Float32Array([
            ...mvpMatrix,
            ...modelMatrix,
            ...normalMatrix,
            ...this.camera.position, this.lightState.lightIntensity
        ]);

        this.device.queue.writeBuffer(this.uniformBuffer, 0, uniformData);

        // Animate point light in a circle
        const pointLightRadius = 20;
        const pointLightX = Math.cos(this.animationTime) * pointLightRadius;
        const pointLightZ = Math.sin(this.animationTime) * pointLightRadius;

        // Pack light data
        const lightData = new Float32Array([
            // Directional light
            0.5, -1.0, 0.3, 0, // direction
            1.0, 1.0, 0.9, 0,  // color
            0.8, 0, 0, 0,       // intensity
            // Point light
            pointLightX, 10, pointLightZ, 0, // position
            1.0, 0.8, 0.6, 0,  // color
            1.0, 0, 0, 0,       // intensity
            // Ambient light
            0.3, 0.3, 0.4, 0,  // color
            0.2, 0, 0, 0,       // intensity
            // Flags
            this.lightState.directionalEnabled ? 1.0 : 0.0,
            this.lightState.pointEnabled ? 1.0 : 0.0,
            this.lightState.shadingMode,
            0
        ]);

        this.device.queue.writeBuffer(this.lightBuffer, 0, lightData);
    }

    render = () => {
        // Update stats
        this.updateStats();

        // Update uniforms
        this.updateUniforms();

        // Begin render pass
        const commandEncoder = this.device.createCommandEncoder();
        const textureView = this.context.getCurrentTexture().createView();

        const renderPassDescriptor = {
            colorAttachments: [
                {
                    view: textureView,
                    clearValue: { r: 0.1, g: 0.1, b: 0.15, a: 1.0 },
                    loadOp: 'clear',
                    storeOp: 'store',
                },
            ],
            depthStencilAttachment: {
                view: this.depthTexture.createView(),
                depthClearValue: 1.0,
                depthLoadOp: 'clear',
                depthStoreOp: 'store',
            },
        };

        const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
        passEncoder.setPipeline(this.pipeline);
        passEncoder.setBindGroup(0, this.uniformBindGroup);

        // Draw all meshes
        for (const mesh of this.meshes) {
            passEncoder.setVertexBuffer(0, mesh.vertexBuffer);
            passEncoder.setIndexBuffer(mesh.indexBuffer, 'uint32');
            passEncoder.setBindGroup(1, mesh.bindGroup);
            passEncoder.drawIndexed(mesh.indexCount);
        }

        passEncoder.end();
        this.device.queue.submit([commandEncoder.finish()]);

        requestAnimationFrame(this.render);
    }

    updateStats() {
        this.stats.frameCount++;
        const currentTime = performance.now();
        const elapsed = currentTime - this.stats.lastTime;

        if (elapsed >= 1000) {
            this.stats.fps = Math.round((this.stats.frameCount * 1000) / elapsed);
            this.stats.frameCount = 0;
            this.stats.lastTime = currentTime;

            // Update UI
            document.getElementById('fps').textContent = `FPS: ${this.stats.fps}`;
            document.getElementById('vertices').textContent = `Vertices: ${this.stats.vertices.toLocaleString()}`;
            document.getElementById('triangles').textContent = `Triangles: ${this.stats.triangles.toLocaleString()}`;
            document.getElementById('materials').textContent = `Materials: ${this.stats.materials}`;
            document.getElementById('cameraPos').textContent =
                `Camera: (${this.camera.position[0].toFixed(1)}, ${this.camera.position[1].toFixed(1)}, ${this.camera.position[2].toFixed(1)})`;
        }
    }

    // Matrix utilities
    identity() {
        return new Float32Array([
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1
        ]);
    }

    multiplyMatrices(a, b) {
        const result = new Float32Array(16);
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                result[i * 4 + j] =
                    a[i * 4 + 0] * b[0 * 4 + j] +
                    a[i * 4 + 1] * b[1 * 4 + j] +
                    a[i * 4 + 2] * b[2 * 4 + j] +
                    a[i * 4 + 3] * b[3 * 4 + j];
            }
        }
        return result;
    }
}

// Initialize the application
const renderer = new WebGPURenderer();
renderer.init();
