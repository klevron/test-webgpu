import { resolve } from 'path'
import { defineConfig } from 'vite'  

/**
 * @see https://vitejs.dev/config/
 */
export default defineConfig({  
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        test2: resolve(import.meta.dirname, 'test2.html')
      }
    }
  },
  // resolve: {
  //   alias: {
  //     'three/examples/jsm': 'three/examples/jsm',
  //     'three/addons': 'three/examples/jsm',
  //     'three/tsl': 'three/webgpu',
  //     'three': 'three/webgpu'
  //   }
  // }
})
