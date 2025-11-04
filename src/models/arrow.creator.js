/**
 * @fileOverview 定义了用于创建箭头视觉元素的函数。
 */

import * as THREE from "three";

/**
 * 创建一个由轴和头部组成的箭头对象组。
 * 这是一个纯函数，返回一个包含已正确定位的轴和头部网格的 THREE.Group。
 * 默认沿Y轴正方向构建。
 *
 * @param {object} options - 配置选项。
 * @param {number} options.shaftLength - 轴的长度。
 * @param {number} options.shaftDiameter - 轴的直径。
 * @param {number} options.headLength - 箭头头部的长度。
 * @param {number} options.headDiameter - 箭头头部的直径。
 * @param {THREE.Material} options.material - 用于箭头轴和头部的材质。
 * @returns {THREE.Group} 包含名为 'shaft' 和 'head' 的两个Mesh的Group。
 */
export function createArrow(options) {
  const { shaftLength, shaftDiameter, headLength, headDiameter, material } =
    options;

  const arrowGroup = new THREE.Group();

  // 创建轴
  const shaftGeometry = new THREE.CylinderGeometry(
    shaftDiameter / 2,
    shaftDiameter / 2,
    shaftLength,
    12,
    1
  );
  const shaft = new THREE.Mesh(shaftGeometry, material);
  shaft.name = "shaft";
  shaft.position.y = shaftLength / 2;
  arrowGroup.add(shaft);

  // 创建头部
  const headGeometry = new THREE.CylinderGeometry(
    0,
    headDiameter / 2,
    headLength,
    12,
    1
  );
  const head = new THREE.Mesh(headGeometry, material);
  head.name = "head";
  head.position.y = shaftLength + headLength / 2;
  arrowGroup.add(head);

  return arrowGroup;
}
