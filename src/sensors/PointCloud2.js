/**
 * @fileOverview PointCloud2 - 用于显示ROS PointCloud2消息的客户端。
 */

import * as THREE from "three";
import ROSLIB from "roslib";
import { Points } from "./Points.js";
import { getLogger } from "../utils/Logger.js";
import { decode64 } from "../utils/encoding.js";

const logger = getLogger("PointCloud2");

/**
 * @class PointCloud2
 * @description 一个监听给定主题并显示点云的客户端。
 * @extends THREE.Object3D
 */
export class PointCloud2 extends THREE.Object3D {
  /**
   * @param {object} options - 选项对象。
   * @param {ROSLIB.Ros} options.ros - ROSLIB.Ros 的连接句柄。
   * @param {string} [options.topic='/points'] - 要监听的 `sensor_msgs/PointCloud2` 主题。
   * @param {object} options.tfClient - 用于坐标变换的TF客户端。
   * @param {number} [options.throttle_rate] - 消息节流速率（毫秒）。
   * @param {string} [options.compression='cbor'] - 消息压缩方式。
   * @param {number} [options.max_pts=10000] - 要绘制的最大点数。
   * @param {THREE.Object3D} [options.rootObject] - 用于添加点云的根对象。
   * @param {string} [options.colorsrc] - 用于着色的字段名。
   * @param {function} [options.colormap] - 将颜色字段值转换为颜色的函数。
   */
  constructor(options = {}) {
    super();
    logger.info("Initializing PointCloud2 component");
    logger.debug("PointCloud2 configuration options:", options);

    const {
      ros,
      topic = "/points",
      throttle_rate = null,
      compression = "cbor",
      rootObject,
      ...pointsOptions // 收集其余所有参数给Points
    } = options;

    this.ros = ros;
    this.topicName = topic;
    this.throttle_rate = throttle_rate;
    this.compression = compression;

    // 传递正确的 rootObject 及其他参数给 Points
    this.points = new Points({ ...pointsOptions, rootObject: this });

    this.rosTopic = null;
    this.buffer = null;

    this.processMessage = this.processMessage.bind(this);

    // 将自身添加到父级 rootObject
    if (rootObject) {
      rootObject.add(this);
    }

    logger.debug(
      "PointCloud2 component initialized for topic:",
      this.topicName
    );
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
      messageType: "sensor_msgs/PointCloud2",
      throttle_rate: this.throttle_rate,
      queue_length: 1,
      compression: this.compression,
    });
    this.rosTopic.subscribe(this.processMessage);
    logger.info("Subscribed to PointCloud2 topic:", this.topicName);
  }

  /**
   * @private
   * @method processMessage
   * @description 处理接收到的PointCloud2消息。
   * @param {object} msg - `sensor_msgs/PointCloud2` 消息。
   */
  processMessage(msg) {
    if (!this.points.setup(msg.header.frame_id, msg.point_step, msg.fields)) {
      logger.debug("Points setup not ready, skipping message processing");
      return;
    }

    let n;
    let pointRatio = this.points.pointRatio;
    const bufSz = this.points.max_pts * msg.point_step;
    let dv;

    if (typeof msg.data === "string") {
      if (!this.buffer || this.buffer.byteLength < bufSz) {
        this.buffer = new Uint8Array(bufSz);
      }
      n = decode64(msg.data, this.buffer, msg.point_step, pointRatio);
      dv = new DataView(this.buffer.buffer);
      pointRatio = 1;
      logger.debug(`Decoded base64 data, processing ${n} points`);
    } else {
      const sourceData = msg.data;
      const slicedData = sourceData.slice(
        0,
        Math.min(sourceData.byteLength, bufSz)
      );
      dv = new DataView(slicedData.buffer);
      n = Math.floor(
        Math.min(
          (msg.height * msg.width) / pointRatio,
          this.points.positions.array.length / 3
        )
      );
    }

    const littleEndian = !msg.is_bigendian;
    const { x, y, z } = this.points.fields;

    if (!x || !y || !z) {
      logger.error("PointCloud2 message is missing x, y, or z fields.");
      return;
    }

    for (let i = 0; i < n; i++) {
      const base = i * pointRatio * msg.point_step;
      this.points.positions.array[3 * i] = dv.getFloat32(
        base + x.offset,
        littleEndian
      );
      this.points.positions.array[3 * i + 1] = dv.getFloat32(
        base + y.offset,
        littleEndian
      );
      this.points.positions.array[3 * i + 2] = dv.getFloat32(
        base + z.offset,
        littleEndian
      );

      if (this.points.colors) {
        const colorVal = this.points.getColor(dv, base, littleEndian);
        let color;

        const colorField = this.points.fields[this.points.colorsrc];
        if (colorField && colorField.datatype === 7) {
          // 7 is float32
          const colorBuffer = new ArrayBuffer(4);
          const floatView = new Float32Array(colorBuffer);
          const byteView = new Uint8Array(colorBuffer);
          floatView[0] = colorVal;
          color = new THREE.Color(
            byteView[2] / 255.0, // r
            byteView[1] / 255.0, // g
            byteView[0] / 255.0 // b
          );
        } else {
          color = this.points.colormap(colorVal);
        }

        this.points.colors.array[3 * i] = color.r;
        this.points.colors.array[3 * i + 1] = color.g;
        this.points.colors.array[3 * i + 2] = color.b;
      }
    }
    this.points.update(n);
    logger.debug(`PointCloud2 data processed, updated ${n} points`);
  }
}
