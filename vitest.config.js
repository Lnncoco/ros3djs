import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    // 测试环境
    environment: 'jsdom', // 使用 JSDOM 模拟浏览器环境
    // 测试报告
    reporters: ['verbose'],
    // 测试文件匹配
    include: ['test/**/*.test.js'],
    // 是否启用类型检查
    typecheck: {
      enabled: true
    }
  },
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
  }
});