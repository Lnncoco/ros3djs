/**
 * @fileOverview Odometry - 用于显示ROS nav_msgs/Odometry消息的客户端。
 */

import * as THREE from "three";
import ROSLIB from "roslib";
import { SceneNode } from "../visualization/SceneNode.js";
import { Arrow } from "../models/Arrow.js";
import { getLogger } from "../utils/Logger.js";

const logger = getLogger("Odometry");

/**
 * @class Odometry
 * @description 一个监听给定Odometry主题并显示一个箭头轨迹来表示里程计历史的客户端。
 */
export class Odometry {
  /**
   * @param {object} options - 配置选项。
   * @param {ROSLIB.Ros} options.ros - ROSLIB.Ros的连接句柄。
   * @param {string} [options.topic='/odom'] - 要监听的Odometry主题。
   * @param {object} options.tfClient - TF客户端句柄。
   * @param {THREE.Object3D} [options.rootObject] - 用于添加此里程计可视化的根对象。
   * @param {number} [options.keep=1] - 要保留的标记数量。
   * @param {number} [options.color=0xcc00ff] - 箭头的颜色。
   * @param {number} [options.length=1.0] - 箭头的长度。
   * @param {number} [options.throttle_rate] - 消息节流速率（毫秒）。
   */
  constructor(options = {}) {
    this.ros = options.ros;
    this.topicName = options.topic || "/particlecloud";
    this.tfClient = options.tfClient;
    this.color = options.color || 0xcc00ff;
    this.rootObject = options.rootObject || new THREE.Object3D();
    this.keep = options.keep || 1;
    this.throttle_rate = options.throttle_rate || null;

    // 明确提取与Arrow相关的参数，避免无关参数传入
    this.arrowOptions = {
      length: options.length,
      headLength: options.headLength,
      shaftDiameter: options.shaftDiameter,
      headDiameter: options.headDiameter,
    };

    this.sceneNodes = [];

    this.processMessage = this.processMessage.bind(this);
    if (this.ros) {
      this.subscribe();
    }
  }

  /**
   * @method dispose
   * @description 清理资源，取消订阅并从场景中移除所有对象。
   */
  dispose() {
    this.unsubscribe();
    this.sceneNodes.forEach((sn) => {
      this.rootObject.remove(sn);
      sn.dispose();
    });
    this.sceneNodes = [];
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
      messageType: "nav_msgs/Odometry",
      queue_length: 1,
      throttle_rate: this.throttle_rate,
    });
    this.rosTopic.subscribe(this.processMessage);
    logger.info(`Subscribed to Odometry topic: ${this.topicName}`);
  }

  /**
   * @private
   * @method processMessage
   * @description 处理接收到的Odometry消息。
   * @param {object} message - `nav_msgs/Odometry` 消息。
   */
  processMessage(message) {
    if (this.sceneNodes.length >= this.keep) {
      const oldSceneNode = this.sceneNodes.shift();
      this.rootObject.remove(oldSceneNode);
      oldSceneNode.dispose();
    }

    const { position, orientation } = message.pose.pose;
    const origin = new THREE.Vector3(position.x, position.y, position.z);
    const quat = new THREE.Quaternion(
      orientation.x,
      orientation.y,
      orientation.z,
      orientation.w
    );
    const direction = new THREE.Vector3(1, 0, 0);
    direction.applyQuaternion(quat);

    const arrow = new Arrow({
      ...this.arrowOptions,
      origin,
      direction,
      material: new THREE.MeshBasicMaterial({ color: this.color }),
    });

    const sceneNode = new SceneNode({
      frameID: message.header.frame_id,
      tfClient: this.tfClient,
      object: arrow,
    });

    this.sceneNodes.push(sceneNode);
    this.rootObject.add(sceneNode);
  }
}
