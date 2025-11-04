/**
 * @fileOverview Path - 用于显示ROS nav_msgs/Path消息的客户端。
 */

import * as THREE from "three";
import ROSLIB from "roslib";
import { SceneNode } from "../visualization/SceneNode.js";
import { getLogger } from "../utils/Logger.js";

const logger = getLogger("Path");

/**
 * @class Path
 * @description 一个监听给定Path主题并显示连接位姿的线的客户端。
 */
export class Path {
  /**
   * @param {object} options - 配置选项。
   * @param {ROSLIB.Ros} options.ros - ROSLIB.Ros的连接句柄。
   * @param {string} [options.topic='/path'] - 要监听的Path主题。
   * @param {object} options.tfClient - TF客户端句柄。
   * @param {THREE.Object3D} [options.rootObject] - 用于添加此路径的根对象。
   * @param {number} [options.color=0xcc00ff] - 线的颜色。
   * @param {number} [options.throttle_rate] - 消息节流速率（毫秒）。
   */
  constructor(options = {}) {
    this.ros = options.ros;
    this.topicName = options.topic || "/path";
    this.tfClient = options.tfClient;
    this.color = options.color || 0xcc00ff;
    this.rootObject = options.rootObject || new THREE.Object3D();
    this.throttle_rate = options.throttle_rate || null;

    this.sn = null;

    this.processMessage = this.processMessage.bind(this);
    if (this.ros) {
      this.subscribe();
    }
  }

  /**
   * @private
   * @method _clearPath
   * @description 从场景中移除并清理当前的路径对象。
   */
  _clearPath() {
    if (this.sn) {
      this.rootObject.remove(this.sn);
      this.sn.dispose(); // SceneNode的dispose会处理其子对象
      this.sn = null;
    }
  }

  /**
   * @method dispose
   * @description 清理资源，取消订阅并从场景中移除对象。
   */
  dispose() {
    this.unsubscribe();
    this._clearPath();
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
      messageType: "nav_msgs/Path",
      queue_length: 1,
      throttle_rate: this.throttle_rate,
    });
    this.rosTopic.subscribe(this.processMessage);
    logger.info(`Subscribed to Path topic: ${this.topicName}`);
  }

  /**
   * @private
   * @method processMessage
   * @description 处理接收到的Path消息。
   * @param {object} message - `nav_msgs/Path` 消息。
   */
  processMessage(message) {
    this._clearPath(); // 清理旧的路径

    const lineGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(message.poses.length * 3);
    for (let i = 0; i < message.poses.length; i++) {
      const { x, y, z } = message.poses[i].pose.position;
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
    }
    lineGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(positions, 3)
    );

    const lineMaterial = new THREE.LineBasicMaterial({ color: this.color });
    const line = new THREE.Line(lineGeometry, lineMaterial);

    this.sn = new SceneNode({
      frameID: message.header.frame_id,
      tfClient: this.tfClient,
      object: line,
    });

    this.rootObject.add(this.sn);
  }
}
