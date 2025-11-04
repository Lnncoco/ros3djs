/**
 * @fileOverview 提供了 `OrbitControls` 的核心事件处理逻辑函数。
 */

import * as THREE from "three";
import { intersectViewPlane } from "./interaction.utils";

/**
 * @constant {number} PIXELS_PER_ROUND
 * @description 定义了鼠标拖动多少像素等于旋转一整圈（360度），用于旋转速度的计算。
 */
const PIXELS_PER_ROUND = 1800;

/**
 * @constant {number} TOUCH_MOVE_THRESHOLD_SQ
 * @description 触摸移动的最小距离阈值的平方，用于判断是否为有效的触摸手势，避免因手指微小抖动而触发事件。
 */
const TOUCH_MOVE_THRESHOLD_SQ = 10 * 10;

/**
 * @function handleRotateMove
 * @description 处理相机围绕中心点的旋转操作。
 * @param {OrbitControls} controls - `OrbitControls` 的实例。
 * @param {THREE.Vector2} rotateDelta - 鼠标或触摸拖动的2D屏幕增量向量。
 */
export function handleRotateMove(controls, rotateDelta) {
  const rotationSpeed =
    ((2 * Math.PI) / PIXELS_PER_ROUND) * controls.userRotateSpeed;
  controls.rotateLeft(rotateDelta.x * rotationSpeed);
  controls.rotateUp(rotateDelta.y * rotationSpeed);
}

/**
 * @function handleZoomMove
 * @description 处理相机的缩放操作（滚轮或拖动）。
 * @param {OrbitControls} controls - `OrbitControls` 的实例。
 * @param {THREE.Vector2} zoomDelta - 鼠标或触摸的2D屏幕增量向量。通常只使用y分量。
 */
export function handleZoomMove(controls, zoomDelta) {
  if (zoomDelta.y > 0) {
    controls.zoomIn();
  } else {
    controls.zoomOut();
  }
}

/**
 * @function handlePanMove
 * @description 处理相机的平移操作。
 * @param {OrbitControls} controls - `OrbitControls` 的实例。
 * @param {object} event3D - 3D事件对象，包含当前的鼠标射线。
 * @param {THREE.Vector3} moveStartCenter - 平移开始时相机聚焦的中心点。
 * @param {THREE.Vector3} moveStartPosition - 平移开始时的相机位置。
 * @param {THREE.Vector3} moveStartIntersection - 平移开始时鼠标射线与视图平面的交点。
 * @param {THREE.Vector3} moveStartNormal - 平移开始时视图平面的法线。
 */
export function handlePanMove(
  controls,
  event3D,
  moveStartCenter,
  moveStartPosition,
  moveStartIntersection,
  moveStartNormal
) {
  const intersection = intersectViewPlane(
    event3D.mouseRay,
    controls.center, // 使用当前的中心点作为平面原点
    moveStartNormal // 使用拖动开始时的平面法线
  );

  if (!intersection) {
    return;
  }

  // 计算从拖动开始点到当前点的位移
  const delta = new THREE.Vector3().subVectors(
    moveStartIntersection,
    intersection
  );

  // 将此位移应用到相机中心和相机位置
  controls.center.copy(moveStartCenter).add(delta);
  controls.camera.position.copy(moveStartPosition).add(delta);
  controls.update();
}

/**
 * @function handleTouchMoveLogic
 * @description 处理双指触摸移动手势，区分平移和缩放。
 * @param {OrbitControls} controls - `OrbitControls` 的实例。
 * @param {object} event3D - 3D事件对象。
 * @param {Array<THREE.Vector2>} touchMoveVectors - 存储两个手指移动向量的数组。
 * @param {Array<THREE.Vector2>} touchStartPositions - 存储两个手指起始位置的数组。
 * @param {THREE.Vector3} moveStartCenter - 平移开始时的相机中心点。
 * @param {THREE.Vector3} moveStartPosition - 平移开始时的相机位置。
 * @param {THREE.Vector3} moveStartIntersection - 平移开始时鼠标射线与平面的交点。
 * @param {THREE.Vector3} moveStartNormal - 平移开始时的平面法线。
 */
export function handleTouchMoveLogic(
  controls,
  event3D,
  touchMoveVectors,
  touchStartPositions,
  moveStartCenter,
  moveStartPosition,
  moveStartIntersection,
  moveStartNormal
) {
  const { STATE } = controls;
  let { state } = controls;

  // 计算两个手指各自的移动向量
  touchMoveVectors[0].subVectors(
    touchStartPositions[0],
    new THREE.Vector2(
      event3D.domEvent.touches[0].pageX,
      event3D.domEvent.touches[0].pageY
    )
  );
  touchMoveVectors[1].subVectors(
    touchStartPositions[1],
    new THREE.Vector2(
      event3D.domEvent.touches[1].pageX,
      event3D.domEvent.touches[1].pageY
    )
  );

  // 仅当两个手指都移动了足够距离时才处理手势
  if (
    touchMoveVectors[0].lengthSq() > TOUCH_MOVE_THRESHOLD_SQ &&
    touchMoveVectors[1].lengthSq() > TOUCH_MOVE_THRESHOLD_SQ
  ) {
    // 检查两个手指的移动方向
    // 点积 > 0: 两个向量方向大致相同，视为平移
    // 点积 < 0: 两个向量方向大致相反，视为缩放（捏合或张开）
    const dot = touchMoveVectors[0].dot(touchMoveVectors[1]);

    if (dot > 0 && state !== STATE.ZOOM) {
      state = STATE.MOVE;
    } else if (dot < 0 && state !== STATE.MOVE) {
      state = STATE.ZOOM;
    }

    if (state === STATE.ZOOM) {
      // 判断是放大还是缩小
      const pinchVector = new THREE.Vector2().subVectors(
        touchStartPositions[0],
        touchStartPositions[1]
      );
      // 通过判断移动向量在捏合向量上的投影方向来确定是放大还是缩小
      if (
        touchMoveVectors[0].dot(pinchVector) < 0 &&
        touchMoveVectors[1].dot(pinchVector) > 0
      ) {
        controls.zoomOut();
      } else if (
        touchMoveVectors[0].dot(pinchVector) > 0 &&
        touchMoveVectors[1].dot(pinchVector) < 0
      ) {
        controls.zoomIn();
      }
    }

    // 更新触摸起始点以进行下一次增量计算
    touchStartPositions[0].set(
      event3D.domEvent.touches[0].pageX,
      event3D.domEvent.touches[0].pageY
    );
    touchStartPositions[1].set(
      event3D.domEvent.touches[1].pageX,
      event3D.domEvent.touches[1].pageY
    );
  }

  if (state === STATE.MOVE) {
    handlePanMove(
      controls,
      event3D,
      moveStartCenter,
      moveStartPosition,
      moveStartIntersection,
      moveStartNormal
    );
  }

  // 更新controls实例的状态
  controls.state = state;
}
