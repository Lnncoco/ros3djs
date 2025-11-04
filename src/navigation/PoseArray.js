/**
 * @fileOverview PoseArray - 用于显示ROS geometry_msgs/PoseArray消息的客户端。
 */

import * as THREE from "three";
import ROSLIB from "roslib";
import { SceneNode } from "../visualization/SceneNode.js";
import { getLogger } from "../utils/Logger.js";

const logger = getLogger("PoseArray");

/**
 * @class PoseArray
 * @description 一个监听给定PoseArray主题并显示一组箭头来表示位姿数组的客户端。
 */
export class PoseArray {
  /**
   * @param {object} options - 配置选项。
   * @param {ROSLIB.Ros} options.ros - ROSLIB.Ros的连接句柄。
   * @param {string} [options.topic='/particlecloud'] - 要监听的PoseArray主题。
   * @param {object} options.tfClient - TF客户端句柄。
   * @param {THREE.Object3D} [options.rootObject] - 用于添加此位姿数组的根对象。
   * @param {number} [options.color=0xcc00ff] - 箭头的颜色。
   * @param {number} [options.length=1.0] - 箭头的长度。
   * @param {number} [options.headLength] - 箭头头部的长度，默认为length * 0.2。
   * @param {number} [options.headDiameter] - 箭头头部的直径，默认为length * 0.1。
   * @param {number} [options.throttle_rate] - 消息节流速率（毫秒）。
   */
  constructor(options = {}) {
    this.ros = options.ros;
    this.topicName = options.topic || "/particlecloud";
    this.tfClient = options.tfClient;
    this.color = options.color || 0xcc00ff;
    this.length = options.length || 1.0;
    this.headLength = options.headLength || this.length * 0.2;
    this.headDiameter = options.headDiameter || this.length * 0.1;
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
   * @method _clearPoseArray
   * @description 从场景中移除并清理当前的位姿数组对象。
   */
  _clearPoseArray() {
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
    this._clearPoseArray();
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
      messageType: "geometry_msgs/PoseArray",
      queue_length: 1,
      throttle_rate: this.throttle_rate,
    });
    this.rosTopic.subscribe(this.processMessage);
    logger.info(`Subscribed to PoseArray topic: ${this.topicName}`);
  }

  /**
   * @private
   * @method processMessage
   * @description 高效地处理接收到的PoseArray消息，使用LineSegments一次性绘制所有箭头。
   * @param {object} message - `geometry_msgs/PoseArray` 消息。
   */
  processMessage(message) {
    this._clearPoseArray(); // 清理旧的位姿数组

    if (message.poses.length === 0) return;

    // 每个箭头由4条线段组成（杆、头侧1、头底、头侧2），每条线段2个顶点
    const points = new Float32Array(message.poses.length * 4 * 2 * 3);
    let currentPoint = 0;

    const shaftLength = this.length - this.headLength;

    for (let i = 0; i < message.poses.length; i++) {
      const pose = message.poses[i];
      const position = new THREE.Vector3(
        pose.position.x,
        pose.position.y,
        pose.position.z
      );
      const orientation = new THREE.Quaternion(
        pose.orientation.x,
        pose.orientation.y,
        pose.orientation.z,
        pose.orientation.w
      );

      // 计算箭头顶点
      const tip = new THREE.Vector3(this.length, 0, 0);
      tip.applyQuaternion(orientation).add(position);

      const side1 = new THREE.Vector3(shaftLength, this.headDiameter / 2, 0);
      side1.applyQuaternion(orientation).add(position);

      const side2 = new THREE.Vector3(shaftLength, -this.headDiameter / 2, 0);
      side2.applyQuaternion(orientation).add(position);

      // 1. 杆 (position -> tip)
      points.set([position.x, position.y, position.z], currentPoint);
      currentPoint += 3;
      points.set([tip.x, tip.y, tip.z], currentPoint);
      currentPoint += 3;

      // 2. 头侧1 (tip -> side1)
      points.set([tip.x, tip.y, tip.z], currentPoint);
      currentPoint += 3;
      points.set([side1.x, side1.y, side1.z], currentPoint);
      currentPoint += 3;

      // 3. 头底 (side1 -> side2)
      points.set([side1.x, side1.y, side1.z], currentPoint);
      currentPoint += 3;
      points.set([side2.x, side2.y, side2.z], currentPoint);
      currentPoint += 3;

      // 4. 头侧2 (side2 -> tip)
      points.set([side2.x, side2.y, side2.z], currentPoint);
      currentPoint += 3;
      points.set([tip.x, tip.y, tip.z], currentPoint);
      currentPoint += 3;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(points, 3));

    const material = new THREE.LineBasicMaterial({ color: this.color });
    const lineSegments = new THREE.LineSegments(geometry, material);

    this.sn = new SceneNode({
      frameID: message.header.frame_id,
      tfClient: this.tfClient,
      object: lineSegments,
    });

    this.rootObject.add(this.sn);
  }
}
