// OBJ File Parser for WebGPU
export class OBJParser {
    constructor() {
        this.vertices = [];
        this.normals = [];
        this.uvs = [];
        this.meshes = [];
        this.currentMaterial = null;
    }

    async parse(objText, mtlParser = null) {
        const lines = objText.split('\n');
        let currentMesh = null;
        let currentMaterialName = null;

        for (let line of lines) {
            line = line.trim();

            // Skip comments and empty lines
            if (line.startsWith('#') || line.length === 0) continue;

            const parts = line.split(/\s+/);
            const type = parts[0];

            switch (type) {
                case 'v': // Vertex position
                    this.vertices.push([
                        parseFloat(parts[1]),
                        parseFloat(parts[2]),
                        parseFloat(parts[3])
                    ]);
                    break;

                case 'vn': // Vertex normal
                    this.normals.push([
                        parseFloat(parts[1]),
                        parseFloat(parts[2]),
                        parseFloat(parts[3])
                    ]);
                    break;

                case 'vt': // Texture coordinate
                    this.uvs.push([
                        parseFloat(parts[1]),
                        parseFloat(parts[2] || 0)
                    ]);
                    break;

                case 'usemtl': // Use material
                    currentMaterialName = parts[1];
                    // Start a new mesh for each material
                    currentMesh = {
                        name: currentMaterialName,
                        material: currentMaterialName,
                        vertices: [],
                        indices: [],
                        vertexMap: new Map()
                    };
                    this.meshes.push(currentMesh);
                    break;

                case 'f': // Face
                    if (!currentMesh) {
                        // Create default mesh if none exists
                        currentMesh = {
                            name: 'default',
                            material: 'default',
                            vertices: [],
                            indices: [],
                            vertexMap: new Map()
                        };
                        this.meshes.push(currentMesh);
                    }
                    this.parseFace(parts.slice(1), currentMesh);
                    break;
            }
        }

        // Calculate bounding box
        this.calculateBounds();

        // Generate normals if not present
        this.ensureNormals();

        return this.meshes;
    }

    parseFace(faceParts, mesh) {
        const faceIndices = [];

        for (let i = 0; i < faceParts.length; i++) {
            const vertexData = faceParts[i].split('/');

            const vIndex = parseInt(vertexData[0]) - 1;
            const vtIndex = vertexData[1] ? parseInt(vertexData[1]) - 1 : -1;
            const vnIndex = vertexData[2] ? parseInt(vertexData[2]) - 1 : -1;

            // Create a unique key for this vertex combination
            const key = `${vIndex}/${vtIndex}/${vnIndex}`;

            let index;
            if (mesh.vertexMap.has(key)) {
                index = mesh.vertexMap.get(key);
            } else {
                index = mesh.vertices.length / 8; // 8 floats per vertex (pos3, normal3, uv2)

                // Position
                const pos = this.vertices[vIndex] || [0, 0, 0];
                mesh.vertices.push(...pos);

                // Normal (will be filled later if not present)
                const normal = vnIndex >= 0 ? this.normals[vnIndex] : [0, 1, 0];
                mesh.vertices.push(...normal);

                // UV
                const uv = vtIndex >= 0 ? this.uvs[vtIndex] : [0, 0];
                mesh.vertices.push(...uv);

                mesh.vertexMap.set(key, index);
            }

            faceIndices.push(index);
        }

        // Triangulate face (for faces with more than 3 vertices)
        for (let i = 1; i < faceIndices.length - 1; i++) {
            mesh.indices.push(faceIndices[0], faceIndices[i], faceIndices[i + 1]);
        }
    }

    ensureNormals() {
        for (const mesh of this.meshes) {
            // Check if normals are all zero
            let hasNormals = false;
            for (let i = 3; i < mesh.vertices.length; i += 8) {
                if (mesh.vertices[i] !== 0 || mesh.vertices[i + 1] !== 0 || mesh.vertices[i + 2] !== 0) {
                    hasNormals = true;
                    break;
                }
            }

            if (!hasNormals) {
                // Calculate flat normals
                for (let i = 0; i < mesh.indices.length; i += 3) {
                    const i0 = mesh.indices[i] * 8;
                    const i1 = mesh.indices[i + 1] * 8;
                    const i2 = mesh.indices[i + 2] * 8;

                    const v0 = [mesh.vertices[i0], mesh.vertices[i0 + 1], mesh.vertices[i0 + 2]];
                    const v1 = [mesh.vertices[i1], mesh.vertices[i1 + 1], mesh.vertices[i1 + 2]];
                    const v2 = [mesh.vertices[i2], mesh.vertices[i2 + 1], mesh.vertices[i2 + 2]];

                    const normal = this.calculateNormal(v0, v1, v2);

                    // Set normal for all three vertices
                    mesh.vertices[i0 + 3] = normal[0];
                    mesh.vertices[i0 + 4] = normal[1];
                    mesh.vertices[i0 + 5] = normal[2];

                    mesh.vertices[i1 + 3] = normal[0];
                    mesh.vertices[i1 + 4] = normal[1];
                    mesh.vertices[i1 + 5] = normal[2];

                    mesh.vertices[i2 + 3] = normal[0];
                    mesh.vertices[i2 + 4] = normal[1];
                    mesh.vertices[i2 + 5] = normal[2];
                }
            }
        }
    }

    calculateNormal(v0, v1, v2) {
        const u = [v1[0] - v0[0], v1[1] - v0[1], v1[2] - v0[2]];
        const v = [v2[0] - v0[0], v2[1] - v0[1], v2[2] - v0[2]];

        const normal = [
            u[1] * v[2] - u[2] * v[1],
            u[2] * v[0] - u[0] * v[2],
            u[0] * v[1] - u[1] * v[0]
        ];

        const length = Math.sqrt(normal[0] ** 2 + normal[1] ** 2 + normal[2] ** 2);
        if (length > 0) {
            normal[0] /= length;
            normal[1] /= length;
            normal[2] /= length;
        }

        return normal;
    }

    calculateBounds() {
        let minX = Infinity, minY = Infinity, minZ = Infinity;
        let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

        for (const vertex of this.vertices) {
            minX = Math.min(minX, vertex[0]);
            minY = Math.min(minY, vertex[1]);
            minZ = Math.min(minZ, vertex[2]);
            maxX = Math.max(maxX, vertex[0]);
            maxY = Math.max(maxY, vertex[1]);
            maxZ = Math.max(maxZ, vertex[2]);
        }

        this.bounds = {
            min: [minX, minY, minZ],
            max: [maxX, maxY, maxZ],
            center: [(minX + maxX) / 2, (minY + maxY) / 2, (minZ + maxZ) / 2],
            size: [maxX - minX, maxY - minY, maxZ - minZ]
        };
    }
}
