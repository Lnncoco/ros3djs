/**
 * @fileOverview NavSatFix - 用于显示ROS NavSatFix消息的客户端。
 */

import * as THREE from "three";
import ROSLIB from "roslib";
import { getLogger } from "../utils/Logger.js";

const logger = getLogger("NavSatFix");

/**
 * @class NavSatFix
 * @description 一个监听给定NavSatFix主题并显示连接GPS定位点的轨迹线的客户端。
 */
export class NavSatFix {
  /**
   * @param {object} options - 选项对象。
   * @param {ROSLIB.Ros} options.ros - ROSLIB.Ros的连接句柄。
   * @param {string} [options.topic='/gps/fix'] - 要监听的NavSatFix主题。
   * @param {THREE.Object3D} [options.rootObject] - 用于添加轨迹线和GPS标记的根对象。
   * @param {THREE.Object3D} [options.object3d] - 将由GPS位置转换的3D对象。
   * @param {object} [options.material] - THREE.js材质或传递给THREE.LineBasicMaterial的选项。
   * @param {number} [options.altitudeNaN=0] - 当消息高度为NaN时的默认高度。
   * @param {number} [options.keep=100] - 要保留的GPS定位点数量。
   * @param {function} [options.convert] - 从经/纬/高转换为THREE.Vector3的函数。
   */
  constructor(options = {}) {
    logger.info("Initializing NavSatFix component");
    this.ros = options.ros;
    this.topicName = options.topic || "/gps/fix";
    this.rootObject = options.rootObject || new THREE.Object3D();
    this.object3d = options.object3d || new THREE.Object3D();
    this.altitudeNaN = options.altitudeNaN || 0;
    this.keep = options.keep || 100;
    this.convert =
      options.convert || ((lon, lat, alt) => new THREE.Vector3(lon, lat, alt));
    this.count = 0;
    this.next1 = 0;
    this.next2 = this.keep;

    const materialOptions = options.material || {};
    this.geom = new THREE.BufferGeometry();
    this.vertices = new THREE.BufferAttribute(
      new Float32Array(6 * this.keep),
      3
    );
    this.geom.setAttribute("position", this.vertices);
    this.material = materialOptions.isMaterial
      ? materialOptions
      : new THREE.LineBasicMaterial(materialOptions);
    this.line = new THREE.Line(this.geom, this.material);

    this.rootObject.add(this.object3d);
    this.rootObject.add(this.line);

    this.rosTopic = null;
    this.processMessage = this.processMessage.bind(this);
    this.subscribe();
  }

  /**
   * @method dispose
   * @description 清理资源，取消订阅并从场景中移除对象。
   */
  dispose() {
    this.unsubscribe();
    this.rootObject.remove(this.object3d);
    this.rootObject.remove(this.line);
    if (this.geom) {
      this.geom.dispose();
    }
    if (this.material) {
      this.material.dispose();
    }
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
      queue_length: 1,
      messageType: "sensor_msgs/NavSatFix",
    });
    this.rosTopic.subscribe(this.processMessage);
    logger.info(`Subscribed to NavSatFix topic: ${this.topicName}`);
  }

  /**
   * @private
   * @method processMessage
   * @description 处理接收到的NavSatFix消息。
   * @param {object} message - `sensor_msgs/NavSatFix` 消息。
   */
  processMessage(message) {
    const altitude = isNaN(message.altitude)
      ? this.altitudeNaN
      : message.altitude;
    const p = this.convert(message.longitude, message.latitude, altitude);

    // 移动3D对象到GPS位置
    this.object3d.position.copy(p);
    this.object3d.updateMatrixWorld(true);

    // 将位置复制到循环缓冲区的两个部分
    this.vertices.array[3 * this.next1] = p.x;
    this.vertices.array[3 * this.next1 + 1] = p.y;
    this.vertices.array[3 * this.next1 + 2] = p.z;
    this.vertices.array[3 * this.next2] = p.x;
    this.vertices.array[3 * this.next2 + 1] = p.y;
    this.vertices.array[3 * this.next2 + 2] = p.z;
    this.vertices.needsUpdate = true;

    this.next1 = (this.next1 + 1) % this.keep;
    this.next2 = this.next1 + this.keep;
    this.count = Math.min(this.count + 1, this.keep);
    this.geom.setDrawRange(this.next2 - this.count, this.count);
  }
}
