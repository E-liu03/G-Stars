# Quick Start Guide

## Run the Visualizer in 3 Simple Steps

### Step 1: Start a Local Server
Open your terminal in this directory and run:

```bash
python3 -m http.server 8000
```

### Step 2: Open Your Browser
Navigate to: **http://localhost:8000**

Make sure you're using:
- Chrome/Edge 113+ or
- Firefox Nightly (with WebGPU enabled) or
- Safari Technology Preview 163+

### Step 3: Explore Your Diorama!

Use these controls:
- **WASD** - Move around
- **Arrow Keys** - Look around
- **Q/E** - Move up/down
- **1/2/3** - Toggle lights and shading modes
- **R** - Reset camera

## If It Doesn't Work

### WebGPU Not Supported?
1. Update your browser to the latest version
2. In Chrome, go to `chrome://flags`
3. Search for "WebGPU"
4. Enable "Unsafe WebGPU"
5. Restart browser

### Model Not Loading?
- Make sure the HTTP server is running
- Check that `FinalProjectV4.obj` and `FinalProjectV4.mtl` are in the same directory
- Open browser console (F12) to see error messages

### Still Having Issues?
Check the full [README.md](README.md) for detailed troubleshooting.

## What You're Seeing

Your interactive visualizer includes:
- ✅ Full 3D model rendering
- ✅ Interactive camera controls
- ✅ Dynamic lighting (directional + animated point light)
- ✅ Material and texture support
- ✅ Multiple shading modes
- ✅ Real-time performance stats

Enjoy exploring your diorama!
