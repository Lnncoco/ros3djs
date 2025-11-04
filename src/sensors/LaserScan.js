import * as THREE from "three";
import * as ROSLIB from 'roslib';
import { Points } from "./Points.js";
import { getLogger } from "../utils/Logger.js";

const logger = getLogger("LaserScan");

/**
 * @class LaserScan
 * @description 一个监听给定主题并显示激光扫描点云的客户端。
 * @extends THREE.Object3D
 */
export class LaserScan extends THREE.Object3D {
  /**
   * @param {object} options - 选项对象。
   * @param {ROSLIB.Ros} options.ros - ROSLIB.Ros 的连接句柄。
   * @param {string} [options.topic='/scan'] - 要监听的 `sensor_msgs/LaserScan` 主题。
   * @param {object} options.tfClient - 用于坐标变换的TF客户端。
   * @param {number} [options.throttle_rate] - 消息节流速率（毫秒）。
   * @param {string} [options.compression='cbor'] - 消息压缩方式。
   * @param {number} [options.max_pts=10000] - 要绘制的最大点数。
   * @param {number} [options.pointRatio=1] - 点的子采样率，例如，设置为2则每隔一个点绘制一个。
   * @param {object} [options.material] - 用于点的材质，例如 `{ color: 0xff0000, size: 0.1 }`。
   * @param {THREE.Object3D} [options.rootObject] - 用于添加此对象的根对象。
   */
  constructor(options = {}) {
    super();
    logger.info("Initializing LaserScan component");
    logger.debug("LaserScan configuration options:", options);

    const {
      ros,
      topic = "/scan",
      throttle_rate = null,
      compression = "cbor",
      rootObject,
      ...pointsOptions // 收集其余所有参数给Points
    } = options;

    this.ros = ros;
    this.topicName = topic;
    this.throttle_rate = throttle_rate;
    this.compression = compression;
    
    // 将 this 作为 rootObject 传递给 Points，并传入其他相关参数
    this.points = new Points({ ...pointsOptions, rootObject: this });

    this.rosTopic = null;
    this.processMessage = this.processMessage.bind(this);

    // 将自身添加到父级 rootObject
    if (rootObject) {
      rootObject.add(this);
    }

    logger.debug("LaserScan component initialized for topic:", this.topicName);
    if (this.ros) {
      this.subscribe();
    }
  }

  /**
   * @method dispose
   * @description 清理资源，取消订阅ROS主题。
   */
  dispose() {
    this.unsubscribe();
    this.points.dispose();
    if (this.parent) {
      this.parent.remove(this);
    }
  }

  /**
   * @method unsubscribe
   * @description 取消订阅ROS主题。
   */
  unsubscribe() {
    if (this.rosTopic) {
      logger.debug("Unsubscribing from topic:", this.topicName);
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

    logger.debug("Subscribing to topic:", this.topicName);
    this.rosTopic = new ROSLIB.Topic({
      ros: this.ros,
      name: this.topicName,
      throttle_rate: this.throttle_rate,
      compression: this.compression,
      queue_length: 1,
      messageType: "sensor_msgs/LaserScan",
    });
    this.rosTopic.subscribe(this.processMessage);
    logger.info("Subscribed to LaserScan topic:", this.topicName);
  }

  /**
   * @private
   * @method processMessage
   * @description 处理接收到的LaserScan消息，并将其转换为点云。
   * @param {object} message - `sensor_msgs/LaserScan` 消息。
   */
  processMessage(message) {
    if (!this.points.setup(message.header.frame_id)) {
      logger.debug("Points setup not ready, skipping message processing");
      return;
    }

    const n = message.ranges.length;
    let j = 0;
    for (let i = 0; i < n; i += this.points.pointRatio) {
      const range = message.ranges[i];
      if (range >= message.range_min && range <= message.range_max) {
        const angle = message.angle_min + i * message.angle_increment;
        this.points.positions.array[j++] = range * Math.cos(angle);
        this.points.positions.array[j++] = range * Math.sin(angle);
        this.points.positions.array[j++] = 0.0;
      }
    }
    this.points.update(Math.floor(j / 3));

    logger.debug(
      `Processed ${Math.floor(j / 3)} valid points from LaserScan message`
    );
  }
}
