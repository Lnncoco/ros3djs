/**
 * @fileOverview 交互模块相关的辅助函数集合。
 */

import * as THREE from "three";

/**
 * @constant {number} EPSILON
 * @description 一个小的浮点数，用于处理近乎为零的容差，避免浮点数精度问题。
 */
const EPSILON = 1e-5;

/**
 * @function computeMouseData
 * @description 根据DOM事件计算鼠标/触摸位置的归一化设备坐标（NDC）和对应的3D射线投射器。
 * @param {MouseEvent|TouchEvent} domEvent - 浏览器触发的DOM事件。
 * @param {THREE.WebGLRenderer} renderer - Three.js渲染器实例。
 * @param {THREE.Camera} camera - 场景相机实例。
 * @returns {{mousePos: THREE.Vector2, mouseRaycaster: THREE.Raycaster, domEvent: Event, camera: THREE.Camera}}
 *          返回一个包含鼠标NDC坐标、射线投射器、原始DOM事件和相机的对象。
 */
export const computeMouseData = (domEvent, renderer, camera) => {
  const target = domEvent.target;
  const rect = target.getBoundingClientRect();

  let clientX, clientY;

  if (domEvent.type.startsWith("touch")) {
    clientX = 0;
    clientY = 0;
    for (let i = 0; i < domEvent.touches.length; ++i) {
      clientX += domEvent.touches[i].clientX;
      clientY += domEvent.touches[i].clientY;
    }
    clientX /= domEvent.touches.length;
    clientY /= domEvent.touches.length;
  } else {
    clientX = domEvent.clientX;
    clientY = domEvent.clientY;
  }

  const left = clientX - rect.left - target.clientLeft + target.scrollLeft;
  const top = clientY - rect.top - target.clientTop + target.scrollTop;
  const deviceX = (left / target.clientWidth) * 2 - 1;
  const deviceY = -(top / target.clientHeight) * 2 + 1;
  const mousePos = new THREE.Vector2(deviceX, deviceY);

  const mouseRaycaster = new THREE.Raycaster();
  // 为旧版（< r125）和新版Three.js设置射线投射器的线条检测阈值以保证兼容性。
  if (mouseRaycaster.params.Line) {
    mouseRaycaster.params.Line.threshold = 0.01; // r125+
  } else {
    mouseRaycaster.linePrecision = 0.01; // < r125
  }
  mouseRaycaster.setFromCamera(mousePos, camera);

  return {
    mousePos,
    mouseRaycaster,
    domEvent,
    camera,
  };
};

/**
 * @function isValidMouseButton
 * @description 验证给定的按钮代码是否为有效的鼠标按钮（左键、中键或右键）。
 * @param {number} button - 从鼠标事件中获取的按钮代码。
 * @returns {boolean} 如果按钮有效则返回 `true`，否则返回 `false`。
 */
export const isValidMouseButton = (button) => {
  return button === 0 || button === 1 || button === 2;
};

/**
 * @function intersectViewPlane
 * @description 计算一条射线与一个由原点和法线定义的平面的交点。
 * @param {THREE.Ray} mouseRay - 从相机发出的射线。
 * @param {THREE.Vector3} planeOrigin - 平面上的一个点（原点）。
 * @param {THREE.Vector3} planeNormal - 平面的法线向量。
 * @returns {THREE.Vector3|null} 如果存在交点，则返回交点坐标；如果射线与平面平行，则返回 `null`。
 */
export const intersectViewPlane = (mouseRay, planeOrigin, planeNormal) => {
  const vector = new THREE.Vector3();
  const intersection = new THREE.Vector3();

  vector.subVectors(planeOrigin, mouseRay.origin);
  const dot = mouseRay.direction.dot(planeNormal);

  // 如果射线与平面几乎平行，则认为没有交点
  if (Math.abs(dot) < EPSILON) {
    return null;
  }

  // 计算从射线原点到交点的标量距离
  const scalar = planeNormal.dot(vector) / dot;

  // 计算并返回交点
  intersection
    .copy(mouseRay.direction)
    .multiplyScalar(scalar)
    .add(mouseRay.origin);
  return intersection;
};
