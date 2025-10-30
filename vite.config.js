import { defineConfig } from 'vite';

export default defineConfig({
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
  resolve: {
    // 别名配置
  }
});