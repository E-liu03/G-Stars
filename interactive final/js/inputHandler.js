/**
 * inputHandler.js
 * Handles keyboard input
 */

import { toggleAutoRotate } from './camera.js';
import { setTrafficLightMode } from './trafficLight.js';

// Keyboard state tracking
export const keys = {};

// Feature toggles
export const features = {
  rainEnabled: true,
  neonEnabled: true,
  spotlightEnabled: true,
  flagWaveEnabled: false,
  dayNightCycleEnabled: false,
};

/**
 * Initializes keyboard event listeners
 */
export function initInputHandlers() {
  window.addEventListener('keydown', e => {
    keys[e.key.toLowerCase()] = true;

    // Space: toggle auto-rotate
    if (e.key === ' ') toggleAutoRotate();

    // Traffic light controls
    if (e.key.toLowerCase() === 'g') { setTrafficLightMode('green'); console.log('🚦 GREEN'); }
    else if (e.key.toLowerCase() === 'y') { setTrafficLightMode('yellow'); console.log('🚦 YELLOW'); }
    else if (e.key.toLowerCase() === 'r') { setTrafficLightMode('red'); console.log('🚦 RED'); }
    else if (e.key.toLowerCase() === 't') { setTrafficLightMode('auto'); console.log('🚦 AUTO'); }

    // P: toggle rain
    if (e.key.toLowerCase() === 'p') {
      features.rainEnabled = !features.rainEnabled;
      console.log(features.rainEnabled ? '🌧️ Rain: ON' : '☀️ Rain: OFF');
    }

    // N: toggle neon signs
    if (e.key.toLowerCase() === 'n') {
      features.neonEnabled = !features.neonEnabled;
      console.log(features.neonEnabled ? '💡 Neon: ON' : '💡 Neon: OFF');
    }

    // L: toggle billboard lights
    if (e.key.toLowerCase() === 'l') {
      features.spotlightEnabled = !features.spotlightEnabled;
      console.log(features.spotlightEnabled ? '🔦 Billboard lights: ON' : '🔦 Billboard lights: OFF');
    }

    // F: toggle flag wave animation
    if (e.key.toLowerCase() === 'f') {
      features.flagWaveEnabled = !features.flagWaveEnabled;
      console.log(features.flagWaveEnabled ? '🎌 Flag wave: ON' : '🎌 Flag wave: OFF');
    }

    // C: toggle day/night cycle
    if (e.key.toLowerCase() === 'c') {
      features.dayNightCycleEnabled = !features.dayNightCycleEnabled;
      console.log(features.dayNightCycleEnabled ? '🔄 Day/Night cycle: ON' : '🔄 Day/Night cycle: OFF');
    }
  });

  window.addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);
}
