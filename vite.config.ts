import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  assetsInclude: ['**/*.gltf', '**/*.bin','**/*.glb'], // Add GLTF and BIN to asset types
  build: {
    rollupOptions: {
      external: ['three']
    }
  }
})
