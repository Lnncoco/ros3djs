import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@constants': resolve(__dirname, './src/constants'),
      '@utils': resolve(__dirname, './src/utils'),
      '@models': resolve(__dirname, './src/models'),
      '@markers': resolve(__dirname, './src/markers'),
      '@visualization': resolve(__dirname, './src/visualization'),
      '@interaction': resolve(__dirname, './src/interaction')
    }
  },
  build: {
    lib: {
      entry: './src/index.js',
      name: 'ROS3D',
      fileName: (format) => `ros3d.${format}.js`,
      formats: ['es', 'cjs', 'iife']
    },
    rollupOptions: {
      external: ['three', 'roslib', 'eventemitter3'],
      output: {
        globals: {
          three: 'THREE',
          roslib: 'ROSLIB',
          eventemitter3: 'EventEmitter3'
        },
        exports: 'named'
      }
    },
    sourcemap: true,
    minify: 'terser'
  },
  define: {
    // 定义全局常量
  },
  server: {
    // 配置开发服务器
  }
});