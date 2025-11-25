// Camera system with keyboard controls
export class Camera {
    constructor(canvas) {
        this.canvas = canvas;

        // Camera position and orientation
        this.position = [0, 5, 10];
        this.target = [0, 0, 0];
        this.up = [0, 1, 0];

        // Camera rotation
        this.yaw = -90; // Looking towards -Z
        this.pitch = 0;

        // Camera parameters
        this.fov = 45 * Math.PI / 180;
        this.aspect = canvas.width / canvas.height;
        this.near = 0.1;
        this.far = 1000.0;

        // Movement speed
        this.moveSpeed = 0.5;
        this.rotationSpeed = 2.0;

        // Input state
        this.keys = {};

        // Initial camera position
        this.initialPosition = [...this.position];
        this.initialYaw = this.yaw;
        this.initialPitch = this.pitch;

        this.setupInputHandlers();
    }

    setupInputHandlers() {
        // Keyboard events
        window.addEventListener('keydown', (e) => {
            this.keys[e.key.toLowerCase()] = true;
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
        });
    }

    update(deltaTime) {
        // Camera rotation with arrow keys
        if (this.keys['arrowleft']) {
            this.yaw -= this.rotationSpeed;
        }
        if (this.keys['arrowright']) {
            this.yaw += this.rotationSpeed;
        }
        if (this.keys['arrowup']) {
            this.pitch += this.rotationSpeed;
            this.pitch = Math.min(this.pitch, 89); // Clamp pitch
        }
        if (this.keys['arrowdown']) {
            this.pitch -= this.rotationSpeed;
            this.pitch = Math.max(this.pitch, -89); // Clamp pitch
        }

        // Calculate forward and right vectors
        const forward = this.getForwardVector();
        const right = this.getRightVector();
        const worldUp = [0, 1, 0];

        // Camera movement with WASD
        if (this.keys['w']) {
            this.position[0] += forward[0] * this.moveSpeed;
            this.position[1] += forward[1] * this.moveSpeed;
            this.position[2] += forward[2] * this.moveSpeed;
        }
        if (this.keys['s']) {
            this.position[0] -= forward[0] * this.moveSpeed;
            this.position[1] -= forward[1] * this.moveSpeed;
            this.position[2] -= forward[2] * this.moveSpeed;
        }
        if (this.keys['a']) {
            this.position[0] -= right[0] * this.moveSpeed;
            this.position[1] -= right[1] * this.moveSpeed;
            this.position[2] -= right[2] * this.moveSpeed;
        }
        if (this.keys['d']) {
            this.position[0] += right[0] * this.moveSpeed;
            this.position[1] += right[1] * this.moveSpeed;
            this.position[2] += right[2] * this.moveSpeed;
        }

        // Up/Down movement with Q/E
        if (this.keys['q']) {
            this.position[1] -= this.moveSpeed;
        }
        if (this.keys['e']) {
            this.position[1] += this.moveSpeed;
        }

        // Reset camera with R
        if (this.keys['r']) {
            this.reset();
        }

        // Update target based on rotation
        this.target = [
            this.position[0] + forward[0],
            this.position[1] + forward[1],
            this.position[2] + forward[2]
        ];
    }

    getForwardVector() {
        const yawRad = this.yaw * Math.PI / 180;
        const pitchRad = this.pitch * Math.PI / 180;

        return [
            Math.cos(pitchRad) * Math.cos(yawRad),
            Math.sin(pitchRad),
            Math.cos(pitchRad) * Math.sin(yawRad)
        ];
    }

    getRightVector() {
        const forward = this.getForwardVector();
        const up = [0, 1, 0];

        // Cross product: forward x up
        return this.normalize([
            forward[1] * up[2] - forward[2] * up[1],
            forward[2] * up[0] - forward[0] * up[2],
            forward[0] * up[1] - forward[1] * up[0]
        ]);
    }

    normalize(vec) {
        const len = Math.sqrt(vec[0] ** 2 + vec[1] ** 2 + vec[2] ** 2);
        return len > 0 ? [vec[0] / len, vec[1] / len, vec[2] / len] : vec;
    }

    getViewMatrix() {
        return this.lookAt(this.position, this.target, this.up);
    }

    getProjectionMatrix() {
        this.aspect = this.canvas.width / this.canvas.height;
        return this.perspective(this.fov, this.aspect, this.near, this.far);
    }

    lookAt(eye, center, up) {
        const z = this.normalize([
            eye[0] - center[0],
            eye[1] - center[1],
            eye[2] - center[2]
        ]);

        const x = this.normalize([
            up[1] * z[2] - up[2] * z[1],
            up[2] * z[0] - up[0] * z[2],
            up[0] * z[1] - up[1] * z[0]
        ]);

        const y = [
            z[1] * x[2] - z[2] * x[1],
            z[2] * x[0] - z[0] * x[2],
            z[0] * x[1] - z[1] * x[0]
        ];

        return new Float32Array([
            x[0], y[0], z[0], 0,
            x[1], y[1], z[1], 0,
            x[2], y[2], z[2], 0,
            -(x[0] * eye[0] + x[1] * eye[1] + x[2] * eye[2]),
            -(y[0] * eye[0] + y[1] * eye[1] + y[2] * eye[2]),
            -(z[0] * eye[0] + z[1] * eye[1] + z[2] * eye[2]),
            1
        ]);
    }

    perspective(fov, aspect, near, far) {
        const f = 1.0 / Math.tan(fov / 2);
        const nf = 1 / (near - far);

        return new Float32Array([
            f / aspect, 0, 0, 0,
            0, f, 0, 0,
            0, 0, (far + near) * nf, -1,
            0, 0, 2 * far * near * nf, 0
        ]);
    }

    reset() {
        this.position = [...this.initialPosition];
        this.yaw = this.initialYaw;
        this.pitch = this.initialPitch;
    }

    setInitialPosition(position, yaw = -90, pitch = 0) {
        this.position = [...position];
        this.yaw = yaw;
        this.pitch = pitch;
        this.initialPosition = [...position];
        this.initialYaw = yaw;
        this.initialPitch = pitch;
    }
}
