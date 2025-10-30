import { defineConfig } from 'vitest/config';

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
  }
});