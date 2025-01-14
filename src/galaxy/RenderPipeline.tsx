import { useEffect, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { BASE_LAYER, BLOOM_LAYER, OVERLAY_LAYER, BLOOM_PARAMS } from '../constants/render';
import { CompositionShader } from '../shaders/CompositionShader';

const RenderPipeline = () => {
  const { gl, scene, camera, size } = useThree();
  const composerRef = useRef<{ base: EffectComposer, bloom: EffectComposer, overlay: EffectComposer }>();

  useEffect(() => {
    const renderScene = new RenderPass(scene, camera);

    const params = {
      stencilBuffer: false,
      format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType,
    };

    const bloomPass = new UnrealBloomPass(new THREE.Vector2(size.width, size.height), 1.5, 0.4, 0.85 );
    bloomPass.threshold = BLOOM_PARAMS.bloomThreshold;
    bloomPass.strength = BLOOM_PARAMS.bloomStrength;
    bloomPass.radius = BLOOM_PARAMS.bloomRadius;

    const bloomRenderTarget = new THREE.WebGLRenderTarget(size.width, size.height, params);
    const bloomComposer = new EffectComposer(gl, bloomRenderTarget);
    bloomComposer.renderToScreen = false;
    bloomComposer.addPass(renderScene);
    bloomComposer.addPass(bloomPass);

    const overlayRenderTarget = new THREE.WebGLRenderTarget(size.width, size.height, params);
    const overlayComposer = new EffectComposer(gl, overlayRenderTarget);
    overlayComposer.renderToScreen = false;
    overlayComposer.addPass(renderScene);

    const finalPass = new ShaderPass(
      new THREE.ShaderMaterial({
        transparent: true,
        uniforms: {
          baseTexture: { value: null },
          bloomTexture: { value: bloomComposer.renderTarget2.texture },
          overlayTexture: { value: overlayComposer.renderTarget2.texture }
        },
        vertexShader: CompositionShader.vertex,
        fragmentShader: CompositionShader.fragment,
      }),
      'baseTexture'
    );
    finalPass.needsSwap = true;

    const baseRenderTarget = new THREE.WebGLRenderTarget(size.width, size.height, params);
    const baseComposer = new EffectComposer(gl, baseRenderTarget);
    baseComposer.addPass(renderScene);
    baseComposer.addPass(finalPass);

    composerRef.current = { base: baseComposer, bloom: bloomComposer, overlay: overlayComposer };

    return () => {
      composerRef.current?.base.dispose();
      composerRef.current?.bloom.dispose();
      composerRef.current?.overlay.dispose();
    };
  }, [gl, scene, camera, size]);

  useFrame(() => {
    if (!composerRef.current) return;

    gl.clear();

    camera.layers.set(BLOOM_LAYER);
    composerRef.current.bloom.render();

    camera.layers.set(OVERLAY_LAYER);
    composerRef.current.overlay.render();

    camera.layers.set(BASE_LAYER);
    composerRef.current.base.render();
  }, 1);

  return null;
};

export default RenderPipeline;
