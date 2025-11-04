/**
 * @fileOverview 交互式标记的交互工具函数。
 */

import * as THREE from "three";

/**
 * @function findClosestPoint
 * @description 在targetRay上找到离mouseRay上任意点最近的点。数学原理来自 http://paulbourke.net/geometry/lineline3d/
 * @param {THREE.Ray} targetRay - 目标射线。
 * @param {THREE.Ray} mouseRay - 鼠标射线。
 * @returns {number|undefined} 两条射线之间最近点的参数，如果平行则返回undefined。
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
  // 检查delta值
  if (Math.abs(denom) <= 0.0001) {
    return undefined;
  }
  const numer = d1343 * d4321 - d1321 * d4343;

  return numer / denom;
}

/**
 * @function closestAxisPoint
 * @description 找到轴和鼠标之间的最近点。
 * @param {THREE.Ray} axisRay - 来自轴的射线。
 * @param {THREE.Camera} camera - 用于投影的相机。
 * @param {THREE.Vector2} mousePos - 鼠标位置。
 * @returns {number|undefined} 最近的轴点参数。
 */
export function closestAxisPoint(axisRay, camera, mousePos) {
  // 将轴投影到屏幕上
  const o = axisRay.origin.clone();
  o.project(camera);
  const o2 = axisRay.direction.clone().add(axisRay.origin);
  o2.project(camera);

  // d是屏幕空间中的轴向量 (d = o2-o)
  const d = o2.clone().sub(o);

  // t是mousePos在o上的垂直投影的2D射线参数
  const tmp = new THREE.Vector2();
  // (t = (mousePos - o) * d / (d*d))
  const t = tmp.subVectors(mousePos, o).dot(d) / d.dot(d);

  // mp是最终的2D投影鼠标位置 (mp = o + d*t)
  const mp = new THREE.Vector2();
  mp.addVectors(o, d.clone().multiplyScalar(t));

  // 通过发射射线回到3D
  const vector = new THREE.Vector3(mp.x, mp.y, 0.5);
  vector.unproject(camera);
  const mpRay = new THREE.Ray(
    camera.position,
    vector.sub(camera.position).normalize()
  );

  return findClosestPoint(axisRay, mpRay);
}

/**
 * @function intersectPlane
 * @description 返回鼠标射线和平面之间的交点。
 * @param {THREE.Ray} mouseRay - 鼠标射线。
 * @param {THREE.Vector3} planeOrigin - 平面原点。
 * @param {THREE.Vector3} planeNormal - 平面法线。
 * @returns {THREE.Vector3|undefined} 交点，如果平行则返回undefined。
 */
export function intersectPlane(mouseRay, planeOrigin, planeNormal) {
  const vector = new THREE.Vector3();
  const intersectPoint = new THREE.Vector3();
  vector.subVectors(planeOrigin, mouseRay.origin);
  const dot = mouseRay.direction.dot(planeNormal);

  // 如果射线和平行则中止
  if (Math.abs(dot) < mouseRay.precision) {
    return undefined;
  }

  // 计算到平面的距离
  const scalar = planeNormal.dot(vector) / dot;

  intersectPoint.addVectors(
    mouseRay.origin,
    mouseRay.direction.clone().multiplyScalar(scalar)
  );
  return intersectPoint;
}
