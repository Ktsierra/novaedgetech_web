import type { Camera, Object3D, WebGLRenderer } from 'three';

/**
 * Compile a scene's shaders (non-blocking where the browser supports parallel compile) so the first
 * visible frame doesn't stall on shader compilation. Callers then render one hidden frame to push
 * textures and geometry to the GPU.
 */
export async function compileScene(renderer: WebGLRenderer, scene: Object3D, cam: Camera) {
  try {
    await renderer.compileAsync(scene, cam);
  } catch {
    renderer.compile(scene, cam);
  }
}
