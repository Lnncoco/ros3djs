/**
 * @fileOverview
 * 
 * 通用辅助函数
 */

/**
 * 检查值是否接近另一个值（在指定公差范围内）
 * @param {number} a - 第一个值
 * @param {number} b - 第二个值
 * @param {number} tolerance - 容差，默认为 1e-6
 * @returns {boolean} 如果值在容差范围内则返回 true
 */
export const isNear = (a, b, tolerance = 1e-6) => {
  return Math.abs(a - b) < tolerance;
};

/**
 * 将角度标准化到 [-π, π] 范围内
 * @param {number} angle - 要标准化的角度（弧度）
 * @returns {number} 标准化后的角度
 */
export const normalizeAngle = (angle) => {
  while (angle > Math.PI) angle -= 2 * Math.PI;
  while (angle <= -Math.PI) angle += 2 * Math.PI;
  return angle;
};

/**
 * 线性插值函数
 * @param {number} a - 起始值
 * @param {number} b - 结束值
 * @param {number} t - 插值参数 [0, 1]
 * @returns {number} 插值结果
 */
export const lerp = (a, b, t) => {
  return a + (b - a) * t;
};

/**
 * 将值限制在指定范围内
 * @param {number} value - 要限制的值
 * @param {number} min - 最小值
 * @param {number} max - 最大值
 * @returns {number} 限制后的值
 */
export const clamp = (value, min, max) => {
  return Math.min(Math.max(value, min), max);
};