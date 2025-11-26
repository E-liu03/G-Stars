/**
 * mathUtils.js
 * Matrix and vector math utilities
 */

/**
 * Creates a perspective projection matrix
 */
export function createPerspective(fovY, aspect, near, far) {
  const f = 1.0 / Math.tan(fovY / 2);
  const nf = 1 / (near - far);
  return new Float32Array([f/aspect,0,0,0, 0,f,0,0, 0,0,(far+near)*nf,-1, 0,0,2*far*near*nf,0]);
}

/**
 * Creates a view matrix looking from eye towards target
 */
export function createLookAt(eye, target, up) {
  const zAxis = normalize(subtract(eye, target));
  const xAxis = normalize(cross(up, zAxis));
  const yAxis = cross(zAxis, xAxis);
  return new Float32Array([
    xAxis[0], yAxis[0], zAxis[0], 0,
    xAxis[1], yAxis[1], zAxis[1], 0,
    xAxis[2], yAxis[2], zAxis[2], 0,
    -dot(xAxis,eye), -dot(yAxis,eye), -dot(zAxis,eye), 1
  ]);
}

/**
 * Creates a 4x4 identity matrix
 */
export function createIdentity() {
  return new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);
}

/**
 * Multiplies two 4x4 matrices
 */
export function multiply(a, b) {
  const r = new Float32Array(16);
  for(let i=0;i<4;i++) for(let j=0;j<4;j++)
    r[j*4+i] = a[i]*b[j*4] + a[4+i]*b[j*4+1] + a[8+i]*b[j*4+2] + a[12+i]*b[j*4+3];
  return r;
}

/**
 * Subtracts vector b from vector a
 */
export function subtract(a, b) {
  return [a[0]-b[0],a[1]-b[1],a[2]-b[2]];
}

/**
 * Cross product of two vectors
 */
export function cross(a, b) {
  return [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
}

/**
 * Dot product of two vectors
 */
export function dot(a, b) {
  return a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
}

/**
 * Normalizes a vector
 */
export function normalize(v) {
  const l = Math.sqrt(dot(v,v));
  return [v[0]/l,v[1]/l,v[2]/l];
}
