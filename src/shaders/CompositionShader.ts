export const CompositionShader = {
  uniforms: {
    baseTexture: { value: null },
    bloomTexture: { value: null },
    overlayTexture: { value: null }
  },
  vertex: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
    }
  `,
  fragment: `
    uniform sampler2D baseTexture;
    uniform sampler2D bloomTexture;
    uniform sampler2D overlayTexture;
    varying vec2 vUv;
    void main() {
      vec4 baseColor = texture2D(baseTexture, vUv);
      vec4 bloomColor = texture2D(bloomTexture, vUv);
      vec4 overlayColor = texture2D(overlayTexture, vUv);
      gl_FragColor = vec4(baseColor.rgb + bloomColor.rgb, max(baseColor.a, bloomColor.a));
    }
  `
};
