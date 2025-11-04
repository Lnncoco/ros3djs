/**
 * @fileOverview 交互式标记客户端 - 订阅ROS交互式标记主题并将其显示在3D场景中。
 */

import { EventEmitter } from "eventemitter3";
import ROSLIB from "roslib";
import { InteractiveMarker } from "./InteractiveMarker.js";
import { getLogger } from "../utils/Logger.js";
import {
  FEEDBACK_POSE_UPDATE,
  FEEDBACK_MOUSE_DOWN,
  FEEDBACK_MOUSE_UP,
  FEEDBACK_BUTTON_CLICK,
  FEEDBACK_MENU_SELECT,
} from "../constants/interactiveMarker.constants.js";

const logger = getLogger("InteractiveMarkerClient");

/**
 * @class InteractiveMarkerClient
 * @description 一个监听给定交互式标记主题的客户端。
 * @param {object} options - 配置选项。
 * @param {ROSLIB.Ros} options.ros - ROSLIB.Ros 的连接句柄。
 * @param {ROSLIB.TFClient} options.tfClient - TF 客户端句柄。
 * @param {string} options.topic - 要订阅的主题，例如 '/basic_controls'。
 * @param {THREE.Camera} options.camera - 与此查看器关联的主相机。
 * @param {THREE.Object3D} [options.rootObject] - 用于渲染的根 THREE 3D 对象。
 * @param {string} [options.path='/'] - 将加载的任何网格的基础路径。
 * @param {object} [options.loader] - 要使用的 Collada 加载器。
 */
export class InteractiveMarkerClient extends EventEmitter {
  constructor(options = {}) {
    super();
    const {
      ros,
      tfClient,
      topic,
      camera,
      rootObject = new THREE.Object3D(),
      path = "/",
      loader,
      menuFontSize,
    } = options;

    this.ros = ros;
    this.tfClient = tfClient;
    this.topicName = topic;
    this.camera = camera;
    this.rootObject = rootObject;
    this.path = path;
    this.loader = loader;
    this.menuFontSize = menuFontSize;

    this.interactiveMarkers = {};
    this.updateTopic = null;
    this.feedbackTopic = null;
    this.initService = null;

    this.processInit = this.processInit.bind(this);
    this.processUpdate = this.processUpdate.bind(this);

    if (this.topicName) {
      this.subscribe(this.topicName);
    }
  }

  /**
   * @method subscribe
   * @description 订阅给定的交互式标记主题。这将取消订阅任何当前的主题。
   * @param {string} topic - 要订阅的主题，例如 '/basic_controls'。
   */
  subscribe(topic) {
    this.unsubscribe();

    this.updateTopic = new ROSLIB.Topic({
      ros: this.ros,
      name: `${topic}/tunneled/update`,
      messageType: "visualization_msgs/InteractiveMarkerUpdate",
      compression: "png",
    });
    this.updateTopic.subscribe(this.processUpdate);

    this.feedbackTopic = new ROSLIB.Topic({
      ros: this.ros,
      name: `${topic}/feedback`,
      messageType: "visualization_msgs/InteractiveMarkerFeedback",
      compression: "png",
    });
    this.feedbackTopic.advertise();

    this.initService = new ROSLIB.Service({
      ros: this.ros,
      name: `${topic}/tunneled/get_init`,
      serviceType: "demo_interactive_markers/GetInit",
    });

    const request = new ROSLIB.ServiceRequest({});
    this.initService.callService(request, this.processInit);
  }

  /**
   * @method unsubscribe
   * @description 取消订阅当前的交互式标记主题。
   */
  unsubscribe() {
    if (this.updateTopic) {
      this.updateTopic.unsubscribe(this.processUpdate);
      this.updateTopic = null;
    }
    if (this.feedbackTopic) {
      this.feedbackTopic.unadvertise();
      this.feedbackTopic = null;
    }
    // 清除所有标记
    for (const intMarkerName in this.interactiveMarkers) {
      this.eraseIntMarker(intMarkerName);
    }
    this.interactiveMarkers = {};
  }

  /**
   * @method dispose
   * @description 清理所有资源，包括标记和订阅。
   */
  dispose() {
    this.unsubscribe();
  }

  /**
   * @private
   * @method processInit
   * @description 处理交互式标记初始化消息。
   * @param {object} initMessage - 交互式标记初始化消息。
   */
  processInit(initMessage) {
    const message = initMessage.msg;
    message.erases = Object.keys(this.interactiveMarkers);
    message.poses = [];
    this.processUpdate(message);
  }

  /**
   * @private
   * @method processUpdate
   * @description 处理交互式标记更新消息。
   * @param {object} message - 交互式标记更新消息。
   */
  processUpdate(message) {
    // 删除所有需要删除的标记
    message.erases.forEach((name) => this.eraseIntMarker(name));

    // 更新标记的位姿
    message.poses.forEach((poseMessage) => {
      const marker = this.interactiveMarkers[poseMessage.name];
      if (marker) {
        marker.onServerSetPose({ pose: poseMessage.pose });
      }
    });

    // 添加新的标记
    message.markers.forEach((msg) => {
      // 如果存在同名标记，则先删除
      if (this.interactiveMarkers[msg.name]) {
        this.eraseIntMarker(msg.name);
      }

      // 创建交互式标记
      const intMarker = new InteractiveMarker({
        handle: {
          // 新的 InteractiveMarker 仍然需要一个 'handle' 对象
          message: msg,
          pose: msg.pose,
          name: msg.name,
          controls: msg.controls,
          menuEntries: msg.menu_entries,
          menuFontSize: this.menuFontSize,
        },
        camera: this.camera,
        path: this.path,
        loader: this.loader,
      });
      intMarker.message = msg; // 存储消息以备后用

      // 事件处理逻辑
      intMarker.setPoseFromClient = (event) => {
        const pose = new ROSLIB.Pose(event);
        const inv = new ROSLIB.Transform(intMarker.tfTransform).inverse();
        pose.applyTransform(inv);
        this.sendFeedback(
          FEEDBACK_POSE_UPDATE,
          pose,
          undefined,
          event.controlName,
          intMarker,
          undefined
        );
      };

      intMarker.onMouseDown = (event) => {
        this.sendFeedback(
          FEEDBACK_MOUSE_DOWN,
          undefined,
          event.controlName,
          intMarker,
          event.clickPosition
        );
      };

      intMarker.onMouseUp = (event) => {
        this.sendFeedback(
          FEEDBACK_MOUSE_UP,
          undefined,
          event.controlName,
          intMarker,
          event.clickPosition
        );
      };

      intMarker.onButtonClick = (event) => {
        this.sendFeedback(
          FEEDBACK_BUTTON_CLICK,
          undefined,
          event.controlName,
          intMarker,
          event.clickPosition
        );
      };

      intMarker.onMenuSelect = (event) => {
        this.sendFeedback(
          FEEDBACK_MENU_SELECT,
          undefined,
          event.id,
          event.controlName,
          intMarker
        );
      };

      // 添加事件监听器
      intMarker.addEventListener(
        "user-pose-change",
        intMarker.setPoseFromClient
      );
      intMarker.addEventListener("user-mousedown", intMarker.onMouseDown);
      intMarker.addEventListener("user-mouseup", intMarker.onMouseUp);
      intMarker.addEventListener("user-button-click", intMarker.onButtonClick);
      intMarker.addEventListener("menu-select", intMarker.onMenuSelect);

      // TF 订阅
      intMarker.tfTransform = new ROSLIB.Transform();
      intMarker.tfUpdate = (tf) => {
        intMarker.tfTransform = new ROSLIB.Transform(tf);
        const poseTransformed = new ROSLIB.Pose(intMarker.message.pose);
        poseTransformed.applyTransform(intMarker.tfTransform);
        intMarker.onServerSetPose({ pose: poseTransformed });
      };
      if (msg.header.stamp.secs === 0 && msg.header.stamp.nsecs === 0) {
        this.tfClient.subscribe(msg.header.frame_id, intMarker.tfUpdate);
      }

      this.interactiveMarkers[msg.name] = intMarker;
      this.rootObject.add(intMarker);
      logger.info(`Added interactive marker: ${msg.name}`);
    });
  }

  /**
   * @private
   * @method eraseIntMarker
   * @description 删除具有给定名称的交互式标记。
   * @param {string} name - 要删除的交互式标记的名称。
   */
  eraseIntMarker(name) {
    const marker = this.interactiveMarkers[name];
    if (marker) {
      // 取消 TF 订阅
      if (marker.tfUpdate) {
        this.tfClient.unsubscribe(
          marker.message.header.frame_id,
          marker.tfUpdate
        );
      }

      // 移除事件监听器
      marker.removeEventListener("user-pose-change", marker.setPoseFromClient);
      marker.removeEventListener("user-mousedown", marker.onMouseDown);
      marker.removeEventListener("user-mouseup", marker.onMouseUp);
      marker.removeEventListener("user-button-click", marker.onButtonClick);
      marker.removeEventListener("menu-select", marker.onMenuSelect);

      // 从场景中移除并释放资源
      this.rootObject.remove(marker);
      marker.dispose();
      delete this.interactiveMarkers[name];
      logger.info(`Erased interactive marker: ${name}`);
    }
  }

  /**
   * @private
   * @method sendFeedback
   * @description 发送反馈到交互式标记服务器。
   * @param {number} eventType - 事件类型。
   * @param {ROSLIB.Pose} [pose] - 交互式标记的位姿。
   * @param {number} [menuEntryID] - 关联的菜单条目ID。
   * @param {string} controlName - 控件的名称。
   * @param {InteractiveMarker} marker - 相关的交互式标记。
   */
  sendFeedback(
    eventType,
    pose,
    menuEntryID,
    controlName,
    marker,
    clickPosition
  ) {
    const feedback = {
      header: marker.message.header,
      client_id: this.ros.id,
      marker_name: marker.name,
      control_name: controlName,
      event_type: eventType,
      pose: pose || {
        position: marker.position,
        orientation: marker.quaternion,
      },
      mouse_point: clickPosition || { x: 0, y: 0, z: 0 },
      mouse_point_valid: !!clickPosition,
      menu_entry_id: menuEntryID,
    };
    this.feedbackTopic.publish(feedback);
  }
}
