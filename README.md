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
# G-Stars - Interactive Diorama Visualizer
Computer Graphics - Task 3: Interactive WebGPU Visualizer

## Project Overview
This project is an interactive 3D visualizer built with WebGPU that renders a Japanese-themed diorama. The visualizer features:
- Full OBJ/MTL model loading with material support
- Interactive camera system with keyboard controls
- Dynamic lighting (directional and point lights)
- Multiple shading modes
- Texture mapping support
- Real-time rendering with performance stats

## Requirements
- A modern web browser with WebGPU support:
  - Chrome/Edge 113+ (enable chrome://flags/#enable-unsafe-webgpu if needed)
  - Firefox Nightly with WebGPU enabled
  - Safari Technology Preview 163+

## File Structure
```
.
├── index.html              # Main HTML file with UI
├── main.js                 # Main application and renderer
├── camera.js               # Camera system with controls
├── objParser.js            # OBJ file parser
├── mtlParser.js            # MTL material parser
├── shaders.wgsl            # WGSL vertex and fragment shaders
├── FinalProjectV4.obj      # 3D model geometry
├── FinalProjectV4.mtl      # Material definitions
└── Images for textures/    # Texture assets
```

## How to Run

### Method 1: Using Python's HTTP Server
```bash
# Navigate to the project directory
cd /Users/hamdaanismail/Documents/GitHub/G-Stars

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

## Interactive Controls

### Camera Movement
- **W/S**: Move forward/backward
- **A/D**: Move left/right
- **Q/E**: Move up/down
- **Arrow Keys**: Rotate camera view
- **R**: Reset camera to initial position

### Lighting & Shading
- **1**: Toggle directional light on/off
- **2**: Toggle point light on/off
- **3**: Cycle through shading modes:
  - Mode 0: Normal Phong shading
  - Mode 1: Wireframe-like edge visualization
  - Mode 2: Normal map visualization
- **+/-**: Increase/decrease light intensity

## Features Implemented

### Task 3 Requirements Checklist
- [x] Import and render object geometry using WebGPU
- [x] Import and render materials and textures
- [x] Set up camera model (interactive, keyboard-controlled)
- [x] Set up light models (directional + animated point light)
- [x] Shaders to render and highlight object attributes
- [x] Interaction using keys
- [x] Show incremental work (see commit history)

### Technical Features
1. **WebGPU Rendering Pipeline**
   - Modern GPU-accelerated rendering
   - Efficient buffer management
   - Depth testing and back-face culling

2. **OBJ/MTL Loading**
   - Complete OBJ parser with face triangulation
   - MTL material parser with texture support
   - Automatic normal calculation if not provided

3. **Lighting System**
   - Ambient lighting
   - Directional light (sun-like)
   - Point light (animated, circular path)
   - Phong reflection model with specular highlights
   - Adjustable light intensity

4. **Camera System**
   - Free-flight camera with 6 degrees of freedom
   - Smooth keyboard controls
   - Automatic scene framing on load
   - Real-time position display

5. **Shading & Materials**
   - Per-pixel Phong shading
   - Texture mapping support
   - Material properties (ambient, diffuse, specular, shininess)
   - Multiple visualization modes

6. **UI & Stats**
   - Real-time FPS counter
   - Vertex and triangle count
   - Material count
   - Camera position display
   - Interactive controls overlay

## Performance Stats
The visualizer displays real-time statistics in the top-right corner:
- **FPS**: Frames per second
- **Vertices**: Total vertex count
- **Triangles**: Total triangle count
- **Materials**: Number of materials loaded
- **Camera**: Current camera position

## Troubleshooting

### WebGPU Not Supported
If you see "WebGPU not supported", ensure you're using a compatible browser:
- Update to the latest Chrome/Edge (v113+)
- Enable WebGPU in chrome://flags if needed
- Try Chrome Canary for the latest features

### Model Not Loading
- Ensure the HTTP server is running (files must be served, not opened directly)
- Check browser console for error messages
- Verify FinalProjectV4.obj and .mtl files are present

### Performance Issues
- The model has a high polygon count (check stats)
- Try closing other browser tabs
- Update GPU drivers
- Use a machine with dedicated GPU for best performance

## Development Notes

### Project Structure
The code is organized into modular ES6 modules:
- **main.js**: Core renderer and application logic
- **camera.js**: Camera mathematics and input handling
- **objParser.js**: Geometry parsing and processing
- **mtlParser.js**: Material and texture loading
- **shaders.wgsl**: GPU shader programs (WGSL)

### Future Enhancements
Potential improvements for future iterations:
- Mouse camera controls
- Additional animation effects
- Shadow mapping
- Post-processing effects
- Model selection/switching
- More interactive object manipulation

## Credits
- Project: F20GA Computer Graphics
- Model: Japanese-themed diorama created in Blender
- Renderer: WebGPU-based custom engine
- Shading: Phong reflection model with multiple light sources
>>>>>>> Stashed changes
