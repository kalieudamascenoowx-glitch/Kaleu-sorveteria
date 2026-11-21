// Tiny WebGL probe kept out of the three.js chunk so the main bundle stays light.
// The probe context is released right away (iOS caps the number of live contexts).
export function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    const gl = window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl'));
    if (!gl) return false;
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return true;
  } catch { return false; }
}
