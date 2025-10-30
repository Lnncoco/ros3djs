/**
 * @fileOverview ROS3D 场景节点 - 用于跟踪与ROS帧关联的3D对象
 */

import * as THREE from 'three';

/**
 * 场景节点可用于跟踪与ROS帧关联的3D对象
 */
export class SceneNode extends THREE.Object3D {
  /**
   * @param {Object} options - 选项对象
   * @param {Object} options.tfClient - TF客户端句柄
   * @param {string} options.frameID - 此对象所属的帧ID
   * @param {Object} [options.pose] - 与此对象关联的姿态
   * @param {THREE.Object3D} options.object - 要渲染的 THREE 3D 对象
   */
  constructor(options = {}) {
    super();
    
    this.tfClient = options.tfClient;
    this.frameID = options.frameID;
    this.object = options.object;
    this.pose = options.pose || { 
      position: { x: 0, y: 0, z: 0 }, 
      orientation: { x: 0, y: 0, z: 0, w: 1 } 
    };

    // 在收到TF更新之前不渲染此对象
    this.visible = false;

    // 添加模型
    if (this.object) {
      this.add(this.object);
    }

    // 设置初始姿态
    this.updatePose(this.pose);

    // 保存TF处理程序以便以后可以删除它
    this.tfUpdate = this.handleTfUpdate.bind(this);
    
    // 监听TF更新
    if (this.tfClient && this.frameID) {
      this.tfClient.subscribe(this.frameID, this.tfUpdate);
    }
  }

  /**
   * 处理TF更新
   * @param {Object} msg - TF消息
   */
  handleTfUpdate(msg) {
    // 应用变换
    // 这里应该应用从TF消息到当前姿态的变换
    // 由于ROSlibjs的具体API可能不同，这里简化处理
    const poseTransformed = this.applyTransform(msg, this.pose);

    // 更新世界
    this.updatePose(poseTransformed);
    this.visible = true;
  }

  /**
   * 应用变换
   * @param {Object} transform - 变换
   * @param {Object} pose - 姿态
   * @returns {Object} 变换后的姿态
   */
  applyTransform(transform, pose) {
    // 简化的变换应用逻辑
    // 在实际实现中，这里会进行复杂的四元数和向量运算
    return {
      position: {
        x: pose.position.x + (transform.translation ? transform.translation.x : 0),
        y: pose.position.y + (transform.translation ? transform.translation.y : 0),
        z: pose.position.z + (transform.translation ? transform.translation.z : 0)
      },
      orientation: {
        x: pose.orientation.x,
        y: pose.orientation.y,
        z: pose.orientation.z,
        w: pose.orientation.w
      }
    };
  }

  /**
   * 设置关联模型的姿态
   * @param {Object} pose - 要更新的姿态
   */
  updatePose(pose) {
    if (pose && pose.position) {
      this.position.set(
        pose.position.x,
        pose.position.y,
        pose.position.z
      );
    }
    
    if (pose && pose.orientation) {
      this.quaternion.set(
        pose.orientation.x,
        pose.orientation.y,
        pose.orientation.z,
        pose.orientation.w
      );
      this.quaternion.normalize();
    }
    
    this.updateMatrixWorld(true);
  }

  /**
   * 取消订阅TF
   */
  unsubscribeTf() {
    if (this.tfClient && this.frameID) {
      this.tfClient.unsubscribe(this.frameID, this.tfUpdate);
    }
  }
  
  /**
   * 销毁场景节点
   */
  dispose() {
    this.unsubscribeTf();
    
    // 清理子对象
    this.traverse((child) => {
      if (child.geometry) {
        child.geometry.dispose();
      }
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach(material => material.dispose());
        } else {
          child.material.dispose();
        }
      }
    });
  }
}