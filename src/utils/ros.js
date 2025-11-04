/**
 * @fileOverview 提供了与ROS相关的通用辅助函数，特别是位姿和变换操作。
 */

import * as THREE from "three";
import { getLogger } from "./Logger.js";

const logger = getLogger("RosUtils");

/**
 * @function applyTransform
 * @description 将一个 `ROSLIB.Transform` 应用到一个 `ROSLIB.Pose` 上，返回一个新的 `ROSLIB.Pose`。
 * @param {object} pose - 原始位姿，包含 `position {x,y,z}` 和 `orientation {x,y,z,w}`。
 * @param {object} transform - 要应用的变换，包含 `translation {x,y,z}` 和 `rotation {x,y,z,w}`。
 * @returns {object} 变换后的新位姿。
 */
export const applyTransform = (pose, transform) => {
  logger.debug("Applying transform to pose");

  const currentPosition = new THREE.Vector3(
    pose.position.x,
    pose.position.y,
    pose.position.z
  );
  const currentOrientation = new THREE.Quaternion(
    pose.orientation.x,
    pose.orientation.y,
    pose.orientation.z,
    pose.orientation.w
  );

  const transformTranslation = new THREE.Vector3(
    transform.translation.x,
    transform.translation.y,
    transform.translation.z
  );
  const transformRotation = new THREE.Quaternion(
    transform.rotation.x,
    transform.rotation.y,
    transform.rotation.z,
    transform.rotation.w
  );

  // 应用旋转到当前位置
  currentPosition.applyQuaternion(transformRotation);
  // 应用平移
  currentPosition.add(transformTranslation);

  // 应用旋转到当前方向
  currentOrientation.premultiply(transformRotation);
  currentOrientation.normalize();

  return {
    position: {
      x: currentPosition.x,
      y: currentPosition.y,
      z: currentPosition.z,
    },
    orientation: {
      x: currentOrientation.x,
      y: currentOrientation.y,
      z: currentOrientation.z,
      w: currentOrientation.w,
    },
  };
};
