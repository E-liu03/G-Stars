<<<<<<< Updated upstream
# G-Stars
Computer Graphics

Video Demonstrations Here:

Google Drive to Videos: https://drive.google.com/drive/folders/1Qi7ZZ-xvgUZXWyzXZLzs4pqvKkBpvEQ-?usp=sharing

Unlisted Youtube Videos:

Render: https://youtu.be/hEGu0rlUdEU

Animation: https://youtu.be/2x5HZUm9IOc

We could not upload the zip folder of the demonstrations as normal. Sorry for the inconvenience.

Shibuya - A 3D Diorama Project
F20GA Computer Graphics
A miniature recreation of Tokyo's iconic Shibuya Crossing, complete with cherry blossoms, traditional elements, and urban atmosphere.

Project Overview
This project is a 3D diorama inspired by Shibuya Crossing in Tokyo, Japan - one of the world's busiest pedestrian intersections. Our diorama captures the essence of this iconic location through a blend of traditional Japanese elements and modern urban architecture.
Theme & Concept
Our scene showcases a stylized interpretation of Shibuya, featuring:

Shibuya 109 Skyscraper - The famous landmark building with illuminated signage
Cherry Blossom Trees - Sakura trees bringing natural beauty to the urban landscape
Grass Corner - A green space adding natural contrast to the urban environment
Traditional Shrine - A torii gate with a ceremonial katana display
Japanese Vending Machine - An authentic street fixture
Waving Flag - Dynamic element in the center of the scene
Traffic Lights - Simulating the crossing's synchronized pedestrian system
Zebra Crossing Floor - The characteristic crossing patterns of Shibuya
Neon Billboard - Illuminated signage creating the district's vibrant atmosphere
Dynamic Lighting - Neon lights creating the nighttime Tokyo aesthetic

The diorama blends traditional Japanese culture with contemporary Tokyo street life, creating a miniature world that captures the unique spirit of Shibuya.

Group Members

Ethan Liu - H00372182
Hamdaan Ismail - H00350285
Youssef Shehata - H00364069


Repository Structure
This repository contains three main deliverables:
\GitHub\G-Stars\D1 - Render1
\GitHub\G-Stars\D1 - Render2
\GitHub\G-Stars\D1 - Render3
\GitHub\G-Stars\D1 - Render4

High-quality offline rendered images of individual objects and the complete diorama scene created in Blender. Includes modeling process, materials, textures, and lighting setup.



Animation/
\GitHub\G-Stars\D1 - Render-Shibuya-Diorama.blend  (Click File, External Data, Find Missing files To load Textures)

Interactive/
https://drive.google.com/file/d/1-RLNoflehFYEenedOVM1qzQCXf-Y7JeN/view?usp=sharing

Animated video sequence exported to Unreal Engine, featuring camera fly-throughs and object animations that bring the Shibuya crossing to life.

References 


Make flag - https://www.youtube.com/watch?v=U0pcvfHP3vs&t=233s
CherryBlossom Tree - https://www.youtube.com/watch?v=vawavO7dDkU&t=497s
Neon Light Flicker - https://youtu.be/7u9XmgcF2F0?si=UX0tMuQZ00lME6Uj
Lighting tutorial - https://youtu.be/sw5qv4emXqM?si=x6jemhRzT8RX8HjS
Importing using glb - https://youtu.be/HIzDW4FlC-U?si=5DSdQEvHxWr-JBNL
Shibuya 109 Logo - https://www.youtube.com/watch?v=WHnQr-4uu1w&t=316s
Modeling in blender - https://www.youtube.com/watch?v=SVl_tlbGrh4
Neon lights - https://youtu.be/708q9j0V9nk?si=DsfNfo1fALA7d1un
Cloth in blender - https://www.youtube.com/watch?v=IYdfMqRIfMA
2D into 3D - https://www.youtube.com/watch?v=t5cGdv57y6I
Shrine - https://www.youtube.com/watch?v=t5cGdv57y6I
Rain Animation in unreal - https://www.youtube.com/watch?v=8N8EOkj0pK8
How to make cinematic scenes in unreal - https://www.youtube.com/watch?v=CW8hDvJOwGM
Vending Machine - https://www.youtube.com/watch?v=BzTN2yTgTj0&t=714s
Billboard - https://www.youtube.com/watch?v=Fbve035X7iA
=======
# G-Stars - Interactive Shibuya Diorama
**F20GA Computer Graphics - Task 3: Interactive WebGPU Visualizer**

## Video Demonstration

Youtube: (https://www.youtube.com/watch?v=wp7yQsMi4rU)

Google Drive: https://drive.google.com/file/d/1UQw0uZ5PIdYUqrB5iOPEDtQuLwJ2aRG4/view?usp=drive_link

---

## Project Overview

This project is an interactive 3D visualizer built with WebGPU that renders our Japanese-themed Shibuya Crossing diorama. The visualizer features real-time rendering with multiple interactive effects including rain particles, traffic light animations, neon lighting, and a dynamic day/night cycle.

### Key Features
- Full OBJ/MTL model loading with material support
- Interactive orbital camera system with keyboard controls
- Dynamic lighting with day/night cycle
- Rain particle system
- Traffic light animations (manual and automatic)
- Neon sign glow effects
- Billboard spotlight illumination
- Flag wave animation
- Real-time rendering with WebGPU

---

## Group Members
Ethan Liu - H00372182
Hamdaan Ismail - H00350285 
Youssef Shehata - H00364069 


## File Structure

```
interactive final/
├── index.html              # Main HTML file with UI and controls
├── Shibuya-Diorama.obj     # 3D model geometry
├── Shibuya-Diorama.mtl     # Material definitions
├── js/
│   ├── main.js             # Main application entry point
│   ├── renderer.js         # WebGPU rendering pipeline
│   ├── camera.js           # Orbital camera system
│   ├── objLoader.js        # OBJ file parser
│   ├── mtlParser.js        # MTL material parser
│   ├── textureLoader.js    # Texture loading utilities
│   ├── shaders.js          # WGSL shader definitions
│   ├── lighting.js         # Lighting system
│   ├── inputHandler.js     # Keyboard input handling
│   ├── mathUtils.js        # Math utilities (matrices, vectors)
│   ├── rainSystem.js       # Rain particle effect system
│   └── trafficLight.js     # Traffic light animation
└── textures/               # Texture assets
    ├── Alipay.jpg
    ├── Flag_of_Japan.png
    ├── Japanese Writing Blank.png
    ├── Nintendo.png
    ├── imagewrap.jpg
    └── stainless steel.jpeg
```

---

## How to Run

### Method 1: Using Python's HTTP Server
```bash
# Navigate to the project directory
cd "interactive final"

# Python 3
python3 -m http.server 8000

# Python 2
python -m SimpleHTTPServer 8000
```
Then open your browser to: `http://localhost:8000`

### Method 2: Using Node.js HTTP Server
```bash
# Install http-server globally (first time only)
npm install -g http-server

# Run the server
http-server -p 8000
```
Then open your browser to: `http://localhost:8000`

### Method 3: Using VS Code Live Server
1. Install the "Live Server" extension in VS Code
2. Right-click on `index.html`
3. Select "Open with Live Server"

---

## Interactive Controls

### Camera Controls
| Key | Action |
|-----|--------|
| **A / D** | Rotate camera left/right |
| **W / S** | Zoom in/out |
| **Q / E** | Move camera up/down |
| **Space** | Toggle auto-rotate |

### Traffic Light Controls
| Key | Action |
|-----|--------|
| **G** | Force green light |
| **Y** | Force yellow light |
| **R** | Force red light |
| **T** | Toggle auto-cycle mode |

### Effect Toggles
| Key | Action |
|-----|--------|
| **P** | Toggle rain effect |
| **N** | Toggle neon sign glow |
| **L** | Toggle billboard spotlights |
| **F** | Toggle flag wave animation |
| **C** | Toggle day/night cycle |


### Technical Features

1. **WebGPU Rendering Pipeline**
   - Modern GPU-accelerated rendering
   - Efficient buffer management
   - Depth testing and back-face culling

2. **OBJ/MTL Loading**
   - Complete OBJ parser with face triangulation
   - MTL material parser with texture support
   - Automatic normal calculation

3. **Lighting System**
   - Ambient lighting
   - Directional light (sun-like)
   - Point lights for neon and billboard effects
   - Day/night cycle with smooth transitions

4. **Camera System**
   - Orbital camera with smooth controls
   - Auto-rotate functionality
   - Height adjustment

5. **Interactive Effects**
   - Rain particle system with physics
   - Traffic light state machine (manual + auto)
   - Neon sign glow toggle
   - Billboard spotlight illumination
   - Flag wave animation

6. **UI & Controls**
   - Clean control panel with keyboard reference
   - Color-coded key indicators
   - Japanese-themed styling


## References
Model Loading - https://sotrh.github.io/learn-wgpu/beginner/tutorial9-models/#accessing-files-in-the-res-folder
Vertex Buffers - https://www.youtube.com/watch?v=X2taVY4jRSg&list=PLn3eTxaOtL2Ns3wkxdyS3CiqkJuwQdZzn&index=8
Textures - https://www.youtube.com/watch?v=QubvRWJHTCA&list=PLn3eTxaOtL2Ns3wkxdyS3CiqkJuwQdZzn&index=10
Object Loading - https://www.youtube.com/watch?v=uUQfMGcdBbs&list=PLn3eTxaOtL2Ns3wkxdyS3CiqkJuwQdZzn&index=16
Transformations - https://www.youtube.com/watch?v=Ny0EuH1dlrM&list=PLn3eTxaOtL2Ns3wkxdyS3CiqkJuwQdZzn&index=9
Advanced Graphics - https://www.youtube.com/watch?v=KTFFdZSDiTU
3D Sphere with lighting - https://www.youtube.com/watch?v=SjBJKHhNJpM
---
