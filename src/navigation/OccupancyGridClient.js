/**
 * @fileOverview OccupancyGridClient - 用于显示ROS占据栅格地图的客户端。
 */

import { EventEmitter } from "eventemitter3";
import ROSLIB from "roslib";
import { OccupancyGrid } from "./OccupancyGrid.js";
import { SceneNode } from "../visualization/SceneNode.js";
import { getLogger } from "../utils/Logger.js";

const logger = getLogger("OccupancyGridClient");

/**
 * @class OccupancyGridClient
 * @description 一个监听给定地图主题的占据栅格客户端。
 * @extends EventEmitter
 */
export class OccupancyGridClient extends EventEmitter {
  /**
   * @param {object} options - 配置选项。
   * @param {ROSLIB.Ros} options.ros - ROSLIB.Ros的连接句柄。
   * @param {string} [options.topic='/map'] - 要监听的地图主题。
   * @param {boolean} [options.continuous=false] - 地图是否应连续加载（例如，用于SLAM）。
   * @param {object} [options.tfClient] - 用于场景节点的TF客户端句柄。
   * @param {string} [options.compression='cbor'] - 消息压缩方式。
   * @param {THREE.Object3D} [options.rootObject] - 用于添加此地图的根对象。
   * @param {ROSLIB.Pose} [options.offsetPose] - 栅格可视化的偏移位姿。
   * @param {object} [options.color] - 可视化栅格的颜色。
   * @param {number} [options.opacity] - 可视化栅格的不透明度。
   */
  constructor(options = {}) {
    super();
    this.ros = options.ros;
    this.topicName = options.topic || "/map";
    this.continuous = options.continuous || false;
    this.tfClient = options.tfClient;
    this.rootObject = options.rootObject || new THREE.Object3D();
    this.offsetPose = options.offsetPose || new ROSLIB.Pose();
    this.color = options.color;
    this.opacity = options.opacity;
    this.compression = options.compression || "cbor";

    this.currentGrid = null;
    this.sceneNode = null;

    this.processMessage = this.processMessage.bind(this);
    this.subscribe();
  }

  /**
   * @method dispose
   * @description 清理所有资源，取消订阅并移除地图。
   */
  dispose() {
    this.unsubscribe();

    if (this.sceneNode) {
      // 如果存在 sceneNode，它就是顶级对象。
      this.rootObject.remove(this.sceneNode);
      this.sceneNode.dispose(); // 释放 sceneNode 及其子对象的资源。
      this.sceneNode = null;
    } else if (this.currentGrid) {
      // 否则，栅格本身是顶级对象。
      this.rootObject.remove(this.currentGrid);
      this.currentGrid.dispose();
    }

    this.currentGrid = null;
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
      messageType: "nav_msgs/OccupancyGrid",
      queue_length: 1,
      compression: this.compression,
    });
    this.rosTopic.subscribe(this.processMessage);
    logger.info(`Subscribed to OccupancyGrid topic: ${this.topicName}`);
  }

  /**
   * @private
   * @method processMessage
   * @description 处理接收到的地图消息。
   * @param {object} message - `nav_msgs/OccupancyGrid` 消息。
   */
  processMessage(message) {
    // 清理旧地图
    if (this.currentGrid) {
      this.currentGrid.dispose();
      if (this.sceneNode) {
        this.sceneNode.remove(this.currentGrid);
      } else {
        this.rootObject.remove(this.currentGrid);
      }
    }

    const newGrid = new OccupancyGrid({
      message: message,
      color: this.color,
      opacity: this.opacity,
    });
    this.currentGrid = newGrid;

    // 如果有TF客户端，则使用SceneNode包装
    if (this.tfClient) {
      if (!this.sceneNode) {
        this.sceneNode = new SceneNode({
          frameID: message.header.frame_id,
          tfClient: this.tfClient,
          object: newGrid,
          pose: this.offsetPose,
        });
        this.rootObject.add(this.sceneNode);
      } else {
        this.sceneNode.add(newGrid);
      }
    } else {
      this.rootObject.add(newGrid);
    }

    this.emit("change");

    // 如果不连续，则取消订阅
    if (!this.continuous) {
      this.unsubscribe();
    }
  }
}
