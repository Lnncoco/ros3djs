/**
 * @fileOverview 定义了 SceneNode 类，用于在场景中跟踪相对于ROS帧的3D对象。
 */

import * as THREE from "three";
import { applyTransform } from "../utils/ros.js";
import { getLogger } from "../utils/Logger.js";

const logger = getLogger("SceneNode");

/**
 * SceneNode类，用于在场景中跟踪相对于ROS帧的3D对象。
 * 它订阅TF变换，并根据TF更新其关联的THREE.Object3D的位姿。
 */
export class SceneNode extends THREE.Object3D {
  /**
   * 内部静态方法：更新 THREE.Object3D 的位姿。
   * @private
   */
  static #updateObjectPose(object, pose) {
    logger.debug("更新对象位姿:", pose);
    object.position.set(pose.position.x, pose.position.y, pose.position.z);
    object.quaternion.set(
      pose.orientation.x,
      pose.orientation.y,
      pose.orientation.z,
      pose.orientation.w
    );
    object.quaternion.normalize(); // 确保四元数标准化
    object.updateMatrixWorld(true);
    object.visible = true;
  }

  /**
   * 内部静态方法：创建TF更新处理器。
   * @private
   */
  static #createTFUpdateHandler(sceneNodeInstance) {
    return (msg) => {
      // 始终基于初始位姿应用变换，避免累积误差
      const poseTransformed = applyTransform(
        sceneNodeInstance.initialPose,
        msg
      );
      // 更新实例的位姿
      sceneNodeInstance.updatePose(poseTransformed);
    };
  }

  /**
   * 内部私有方法：设置SceneNode的初始状态。
   * @private
   */
  #setup(options) {
    const {
      tfClient,
      frameID,
      object,
      pose = {
        position: { x: 0, y: 0, z: 0 },
        orientation: { x: 0, y: 0, z: 0, w: 1 },
      },
    } = options;

    this.tfClient = tfClient;
    this.frameID = frameID;
    this.initialPose = pose; // 保存初始位姿

    this.visible = false; // 在接收到TF更新前不渲染

    if (object) {
      this.add(object);
    }

    this.updatePose(pose); // 设置初始位姿

    // 创建TF更新处理器
    this.tfUpdateBound = SceneNode.#createTFUpdateHandler(this);

    // 监听TF更新
    if (tfClient && frameID) {
      tfClient.subscribe(frameID, this.tfUpdateBound);
    }
  }

  /**
   * @param {Object} options - 选项对象
   * @param {Object} options.tfClient - TF客户端句柄
   * @param {string} options.frameID - 此对象所属的帧ID
   * @param {Object} [options.pose] - 与此对象关联的姿态
   * @param {THREE.Object3D} options.object - 要渲染的 THREE 3D 对象
   */
  constructor(options = {}) {
    super();
    logger.info("初始化SceneNode组件");
    logger.debug("SceneNode配置选项:", options);

    // 调用私有实例方法来设置实例
    this.#setup(options);

    logger.debug("SceneNode组件初始化完成");
  }

  /**
   * 设置关联模型的姿态。
   * @param {Object} pose - 要更新的姿态。
   */
  updatePose(pose) {
    this.constructor.#updateObjectPose(this, pose);
  }

  /**
   * 取消订阅TF更新。
   */
  unsubscribeTf() {
    if (this.tfClient && this.frameID && this.tfUpdateBound) {
      this.tfClient.unsubscribe(this.frameID, this.tfUpdateBound);
      logger.debug("已取消订阅TF更新，帧ID:", this.frameID);
    }
  }

  /**
   * 销毁场景节点并清理资源。
   */
  dispose() {
    this.unsubscribeTf();

    // 将清理责任委托给子对象自己
    this.children.forEach((child) => {
      if (typeof child.dispose === "function") {
        child.dispose();
      } else {
        // 如果子对象没有自己的dispose方法，则尝试清理其几何体和材质
        if (
          child instanceof THREE.Mesh ||
          child instanceof THREE.Line ||
          child instanceof THREE.Points ||
          child instanceof THREE.Sprite
        ) {
          if (child.geometry) {
            // Sprites don't have geometry
            child.geometry.dispose();
          }
          if (child.material) {
            // 材质可能是数组，也可能是单个材质
            if (Array.isArray(child.material)) {
              child.material.forEach((material) => {
                if (material.map) material.map.dispose(); // Dispose texture
                material.dispose();
              });
            } else {
              if (child.material.map) child.material.map.dispose(); // Dispose texture
              child.material.dispose();
            }
          }
        }
      }
    });

    // 移除自身
    if (this.parent) {
      this.parent.remove(this);
    }

    logger.debug("SceneNode已销毁");
  }
}
