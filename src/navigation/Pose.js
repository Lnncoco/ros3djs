/**
 * @fileOverview Pose - 用于显示ROS geometry_msgs/PoseStamped消息的客户端。
 */

import * as THREE from "three";
import ROSLIB from "roslib";
import { SceneNode } from "../visualization/SceneNode.js";
import { Arrow } from "../models/Arrow.js";
import { getLogger } from "../utils/Logger.js";

const logger = getLogger("Pose");

/**
 * @class Pose
 * @description 一个监听给定PoseStamped主题并显示一个箭头来表示位姿的客户端。
 */
export class Pose {
  /**
   * @param {object} options - 配置选项。
   * @param {ROSLIB.Ros} options.ros - ROSLIB.Ros的连接句柄。
   * @param {string} [options.topic='/pose'] - 要监听的PoseStamped主题。
   * @param {object} options.tfClient - TF客户端句柄。
   * @param {THREE.Object3D} [options.rootObject] - 用于添加此位姿的根对象。
   * @param {number} [options.color=0xcc00ff] - 箭头的颜色。
   * @param {number} [options.length=1.0] - 箭头的长度。
   * @param {number} [options.headLength=0.2] - 箭头头部的长度。
   * @param {number} [options.shaftDiameter=0.05] - 箭头轴的直径。
   * @param {number} [options.headDiameter=0.1] - 箭头头部的直径。
   * @param {number} [options.throttle_rate] - 消息节流速率（毫秒）。
   */
  constructor(options = {}) {
    this.ros = options.ros;
    this.topicName = options.topic || "/pose";
    this.tfClient = options.tfClient;
    this.color = options.color || 0xcc00ff;
    this.rootObject = options.rootObject || new THREE.Object3D();
    this.throttle_rate = options.throttle_rate || null;
    this.arrowOptions = { ...options }; // 存储用于创建箭头的选项

    this.sn = null;

    this.processMessage = this.processMessage.bind(this);
    if (this.ros) {
      this.subscribe();
    }
  }

  /**
   * @private
   * @method _clearPose
   * @description 从场景中移除并清理当前的位姿对象。
   */
  _clearPose() {
    if (this.sn) {
      this.rootObject.remove(this.sn);
      this.sn.dispose();
      this.sn = null;
    }
  }

  /**
   * @method dispose
   * @description 清理资源，取消订阅并从场景中移除对象。
   */
  dispose() {
    this.unsubscribe();
    this._clearPose();
  }

  /**
   * @method unsubscribe
   * @description 取消订阅ROS主题。
   */
  unsubscribe() {
    if (this.rosTopic) {
      this.rosTopic.unsubscribe(this.processMessage);
      this.rosTopic = null;
    }
  }

  /**
   * @method subscribe
   * @description 订阅ROS主题。
   */
  subscribe() {
    this.unsubscribe();

    this.rosTopic = new ROSLIB.Topic({
      ros: this.ros,
      name: this.topicName,
      messageType: "geometry_msgs/PoseStamped",
      queue_length: 1,
      throttle_rate: this.throttle_rate,
    });
    this.rosTopic.subscribe(this.processMessage);
    logger.info(`Subscribed to Pose topic: ${this.topicName}`);
  }

  /**
   * @private
   * @method processMessage
   * @description 处理接收到的PoseStamped消息。
   * @param {object} message - `geometry_msgs/PoseStamped` 消息。
   */
  processMessage(message) {
    this._clearPose(); // 清理旧的位姿

    const origin = new THREE.Vector3(
      message.pose.position.x,
      message.pose.position.y,
      message.pose.position.z
    );

    const orientation = new THREE.Quaternion(
      message.pose.orientation.x,
      message.pose.orientation.y,
      message.pose.orientation.z,
      message.pose.orientation.w
    );
    const direction = new THREE.Vector3(1, 0, 0);
    direction.applyQuaternion(orientation);

    const arrow = new Arrow({
      ...this.arrowOptions,
      origin,
      direction,
      material: new THREE.MeshBasicMaterial({ color: this.color }),
    });

    this.sn = new SceneNode({
      frameID: message.header.frame_id,
      tfClient: this.tfClient,
      object: arrow,
    });

    this.rootObject.add(this.sn);
  }
}
