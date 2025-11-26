/**
 * textureLoader.js
 * Handles loading image files and creating WebGPU textures
 */

/**
 * Loads an image from a URL and creates a WebGPU texture
 * @param {GPUDevice} device - The WebGPU device
 * @param {string} url - Path to the image file
 * @returns {GPUTexture|null} The loaded texture or null if failed
 */
export async function loadTexture(device, url) {
  try {
    console.log("Loading texture:", url);

    // Fetch the image file from the server
    const response = await fetch(url);
    if (!response.ok) {
      console.warn("Texture not found:", url);
      return null;
    }

    // Convert response to blob, then to ImageBitmap for GPU upload
    const blob = await response.blob();
    const imageBitmap = await createImageBitmap(blob);

    // Create a WebGPU texture with the image dimensions
    const texture = device.createTexture({
      size: [imageBitmap.width, imageBitmap.height, 1],
      format: 'rgba8unorm',  // 8-bit RGBA format
      usage: GPUTextureUsage.TEXTURE_BINDING |    // Can be bound to shaders
             GPUTextureUsage.COPY_DST |            // Can receive data copies
             GPUTextureUsage.RENDER_ATTACHMENT,    // Can be rendered to
    });

    // Copy the image data to the GPU texture
    device.queue.copyExternalImageToTexture(
      { source: imageBitmap },
      { texture: texture },
      [imageBitmap.width, imageBitmap.height]
    );

    console.log(`✓ Loaded: ${url} (${imageBitmap.width}x${imageBitmap.height})`);
    return texture;
  } catch (e) {
    console.warn("Error loading texture:", url, e);
    return null;
  }
}

/**
 * Creates a 1x1 white texture as a fallback for materials without textures
 * @param {GPUDevice} device - The WebGPU device
 * @returns {GPUTexture} A 1x1 white texture
 */
export function createWhiteTexture(device) {
  const texture = device.createTexture({
    size: [1, 1, 1],
    format: 'rgba8unorm',
    usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
  });

  // Write white pixel data (RGBA = 255, 255, 255, 255)
  device.queue.writeTexture(
    { texture },
    new Uint8Array([255, 255, 255, 255]),
    { bytesPerRow: 4 },
    [1, 1]
  );
  return texture;
}
