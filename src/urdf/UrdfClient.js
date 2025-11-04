/**
 * @fileOverview UrdfClient - 从ROS参数服务器加载URDF并进行显示。
 */

import { EventEmitter } from "eventemitter3";
import ROSLIB from "roslib";
import { Urdf } from "./Urdf.js";
import { getLogger } from "../utils/Logger.js";

const logger = getLogger("UrdfClient");

/**
 * @class UrdfClient
 * @description 一个URDF客户端，可用于从ROS参数服务器加载URDF及其关联模型到3D对象中。
 * @extends EventEmitter
 */
export class UrdfClient extends EventEmitter {
  /**
   * @param {object} options - 配置选项。
   * @param {ROSLIB.Ros} options.ros - ROSLIB.Ros的连接句柄。
   * @param {string} [options.param='robot_description'] - 加载URDF的参数名称。
   * @param {object} options.tfClient - 用于坐标变换的TF客户端。
   * @param {string} [options.path='/'] - 关联模型文件的基础路径。
   * @param {THREE.Object3D} [options.rootObject] - 用于添加此模型的根对象。
   * @param {string} [options.tfPrefix=''] - 用于多机器人场景的TF前缀。
   */
  constructor(options = {}) {
    super();
    const {
      ros,
      param = "robot_description",
      tfClient,
      path = "/",
      rootObject = new THREE.Object3D(),
      tfPrefix = "",
      string: urdfString, // 从 options 中解构 string，并重命名为 urdfString
    } = options;

    this.ros = ros;
    this.paramName = param;
    this.tfClient = tfClient;
    this.path = path;
    this.rootObject = rootObject;
    this.tfPrefix = tfPrefix;
    this.urdf = null;

    // 优先处理直接传入的 URDF 字符串
    if (urdfString) {
      this.loadFromString(urdfString);
    } else if (this.ros) {
      // 否则，从 ROS 参数服务器加载
      this.loadFromServer();
    } else {
      logger.error(
        "UrdfClient must be configured with either a ROS connection or a URDF string."
      );
    }
  }

  /**
   * @private
   * @method loadFromString
   * @description 直接从URDF XML字符串加载并处理模型。
   * @param {string} xml - URDF的XML字符串。
   */
  loadFromString(xml) {
    try {
      const urdfModel = new ROSLIB.UrdfModel({ string: xml });
      this.urdf = new Urdf({
        urdfModel,
        path: this.path,
        tfClient: this.tfClient,
        tfPrefix: this.tfPrefix,
      });
      this.rootObject.add(this.urdf);
      logger.info("URDF model loaded from string and added to the scene.");
      this.emit("change", this.urdf);
    } catch (e) {
      logger.error("Error parsing URDF XML from string: ", e);
    }
  }

  /**
   * @private
   * @method loadFromServer
   * @description 从ROS参数服务器加载URDF模型。
   */
  loadFromServer() {
    const param = new ROSLIB.Param({
      ros: this.ros,
      name: this.paramName,
    });

    param.get((xml) => {
      if (!xml) {
        logger.error(
          `Failed to retrieve URDF from param server at '${this.paramName}'`
        );
        return;
      }

      try {
        const urdfModel = new ROSLIB.UrdfModel({ string: xml });
        this.urdf = new Urdf({
          urdfModel,
          path: this.path,
          tfClient: this.tfClient,
          tfPrefix: this.tfPrefix,
        });
        this.rootObject.add(this.urdf);
        logger.info("URDF model loaded and added to the scene.");
        this.emit("change", this.urdf);
      } catch (e) {
        logger.error("Error parsing URDF XML: ", e);
      }
    });
  }

  /**
   * @method dispose
   * @description 销毁此客户端并清理所有相关资源。
   */
  dispose() {
    if (this.urdf) {
      this.rootObject.remove(this.urdf);
      this.urdf.dispose();
      this.urdf = null;
      logger.info("URDFClient disposed.");
    }
  }
}
