/**
 * @fileOverview Polygon - 用于显示ROS geometry_msgs/PolygonStamped消息的客户端。
 */

import * as THREE from "three";
import ROSLIB from "roslib";
import { SceneNode } from "../visualization/SceneNode.js";
import { getLogger } from "../utils/Logger.js";

const logger = getLogger("Polygon");

/**
 * @class Polygon
 * @description 一个监听给定PolygonStamped主题并显示多边形边界的客户端。
 */
export class Polygon {
  /**
   * @param {object} options - 配置选项。
   * @param {ROSLIB.Ros} options.ros - ROSLIB.Ros的连接句柄。
   * @param {string} [options.topic='/polygon'] - 要监听的PolygonStamped主题。
   * @param {object} options.tfClient - TF客户端句柄。
   * @param {THREE.Object3D} [options.rootObject] - 用于添加此多边形的根对象。
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
    this.subscribe();
  }

  /**
   * @private
   * @method _clearPolygon
   * @description 从场景中移除并清理当前的多边形对象。
   */
  _clearPolygon() {
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
    this._clearPolygon();
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
      messageType: "geometry_msgs/PolygonStamped",
      queue_length: 1,
      throttle_rate: this.throttle_rate,
    });
    this.rosTopic.subscribe(this.processMessage);
    logger.info(`Subscribed to Polygon topic: ${this.topicName}`);
  }

  /**
   * @private
   * @method processMessage
   * @description 处理接收到的PolygonStamped消息。
   * @param {object} message - `geometry_msgs/PolygonStamped` 消息。
   */
  processMessage(message) {
    this._clearPolygon(); // 清理旧的多边形

    const points = message.polygon.points;
    if (points.length < 1) return; // 无点则不处理

    const lineGeometry = new THREE.BufferGeometry();
    // 多边形需要闭合循环，所以顶点数是 points.length + 1
    const positions = new Float32Array((points.length + 1) * 3);
    for (let i = 0; i < points.length; i++) {
      const { x, y, z } = points[i];
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
    }
    // 闭合循环
    positions[points.length * 3] = points[0].x;
    positions[points.length * 3 + 1] = points[0].y;
    positions[points.length * 3 + 2] = points[0].z;

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
