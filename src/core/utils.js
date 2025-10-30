/**
 * @fileOverview ROS3D 工具函数
 */

import * as THREE from 'three';

/**
 * 根据给定的 RGBA 值创建 THREE 材质
 * @param {number} r - 红色值
 * @param {number} g - 绿色值
 * @param {number} b - 蓝色值
 * @param {number} a - 透明度值
 * @returns {THREE.Material} THREE 材质
 */
export function makeColorMaterial(r, g, b, a) {
  const color = new THREE.Color();
  color.setRGB(r, g, b);
  if (a <= 0.99) {
    return new THREE.MeshBasicMaterial({
      color: color.getHex(),
      opacity: a + 0.1,
      transparent: true,
      depthWrite: true,
      blending: THREE.NormalBlending
    });
  } else {
    return new THREE.MeshPhongMaterial({
      color: color.getHex(),
      opacity: a,
      blending: THREE.NormalBlending
    });
  }
}

/**
 * 返回鼠标射线与平面的交点
 * @param {THREE.Ray} mouseRay - 鼠标射线
 * @param {THREE.Vector3} planeOrigin - 平面原点
 * @param {THREE.Vector3} planeNormal - 平面法线
 * @returns {THREE.Vector3|undefined} 交点，如果平行则返回 undefined
 */
export function intersectPlane(mouseRay, planeOrigin, planeNormal) {
  const vector = new THREE.Vector3();
  const intersectPoint = new THREE.Vector3();
  vector.subVectors(planeOrigin, mouseRay.origin);
  const dot = mouseRay.direction.dot(planeNormal);

  // 如果射线与平面平行则返回
  if (Math.abs(dot) < mouseRay.precision) {
    return undefined;
  }

  // 计算到平面的距离
  const scalar = planeNormal.dot(vector) / dot;

  intersectPoint.addVectors(mouseRay.origin, mouseRay.direction.clone().multiplyScalar(scalar));
  return intersectPoint;
}

/**
 * 找到 targetRay 上距离 mouseRay 最近的点
 * 数学原理来自 http://paulbourke.net/geometry/lineline3d/
 * @param {THREE.Ray} targetRay - 目标射线
 * @param {THREE.Ray} mouseRay - 鼠标射线
 * @returns {number|undefined} 两射线间最近点的参数值，如果平行则返回 undefined
 */
export function findClosestPoint(targetRay, mouseRay) {
  const v13 = new THREE.Vector3();
  v13.subVectors(targetRay.origin, mouseRay.origin);
  const v43 = mouseRay.direction.clone();
  const v21 = targetRay.direction.clone();
  const d1343 = v13.dot(v43);
  const d4321 = v43.dot(v21);
  const d1321 = v13.dot(v21);
  const d4343 = v43.dot(v43);
  const d2121 = v21.dot(v21);

  const denom = d2121 * d4343 - d4321 * d4321;
  // 检查 delta 内
  if (Math.abs(denom) <= 0.0001) {
    return undefined;
  }
  const numer = d1343 * d4321 - d1321 * d4343;

  const mua = numer / denom;
  return mua;
}

/**
 * 找到轴线与鼠标的最近点
 * @param {THREE.Ray} axisRay - 轴线射线
 * @param {THREE.Camera} camera - 相机
 * @param {THREE.Vector2} mousePos - 鼠标位置
 * @returns {THREE.Vector3|undefined} 最近轴点
 */
export function closestAxisPoint(axisRay, camera, mousePos) {
  // 将轴投影到屏幕上
  const o = axisRay.origin.clone();
  o.project(camera);
  const o2 = axisRay.direction.clone().add(axisRay.origin);
  o2.project(camera);

  // d 是屏幕空间中的轴向量 (d = o2-o)
  const d = o2.clone().sub(o);

  // t 是鼠标位置垂直投影到 o 上的 2D 射线参数
  const tmp = new THREE.Vector2();
  // (t = (mousePos - o) * d / (d*d))
  const t = tmp.subVectors(mousePos, o).dot(d) / d.dot(d);

  // mp 是最终的 2D 投影鼠标位置 (mp = o + d*t)
  const mp = new THREE.Vector2();
  mp.addVectors(o, d.clone().multiplyScalar(t));

  // 通过射线回到 3D
  const vector = new THREE.Vector3(mp.x, mp.y, 0.5);
  vector.unproject(camera);
  const mpRay = new THREE.Ray(camera.position, vector.sub(camera.position).normalize());

  return findClosestPoint(axisRay, mpRay);
}