import { defineConfig } from 'vite'  

/**
 * @see https://vitejs.dev/config/
 */
export default defineConfig({  
  resolve: {
    alias: {
      'three/examples/jsm': 'three/examples/jsm',
      'three/addons': 'three/examples/jsm',
      'three/tsl': 'three/webgpu',
      'three': 'three/webgpu'
    }
  }
})
