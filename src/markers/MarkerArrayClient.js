/**
 * @fileOverview MarkerArrayClient - 订阅ROS MarkerArray消息并将其显示在3D场景中。
 * @author Russell Toris - rctoris@wpi.edu
 * @author Nils Berg - berg.nils@gmail.com
 */

import * as THREE from 'three';
import { EventEmitter } from 'eventemitter3';
import ROSLIB from 'roslib';
import { Marker } from './Marker.js';
import { SceneNode } from '../visualization/SceneNode.js';

/**
 * @class MarkerArrayClient
 * @description 一个监听给定MarkerArray主题的客户端。
 * @param {object} options - 选项
 * @param {ROSLIB.Ros} options.ros - ROSLIB.Ros连接句柄。
 * @param {string} options.topic - 要监听的标记主题。
 * @param {object} options.tfClient - TF客户端句柄。
 * @param {THREE.Object3D} [options.rootObject] - 要将标记添加到的根对象。
 * @param {string} [options.path] - 将加载的任何网格的基本路径。
 */
export class MarkerArrayClient extends EventEmitter {
  constructor(options) {
    super();
    this.ros = options.ros;
    this.topicName = options.topic;
    this.tfClient = options.tfClient;
    this.rootObject = options.rootObject || new THREE.Object3D();
    this.path = options.path || '/';

    this.markers = {};
    this.rosTopic = null;

    this.processMessage = this.processMessage.bind(this);
    this.subscribe();
  }

  /**
   * @method subscribe
   * @description 订阅MarkerArray主题。
   */
  subscribe() {
    this.unsubscribe();

    this.rosTopic = new ROSLIB.Topic({
      ros: this.ros,
      name: this.topicName,
      messageType: 'visualization_msgs/MarkerArray',
      compression: 'png',
    });
    this.rosTopic.subscribe(this.processMessage);
  }

  /**
   * @method unsubscribe
   * @description 取消订阅MarkerArray主题。
   */
  unsubscribe() {
    if (this.rosTopic) {
      this.rosTopic.unsubscribe(this.processMessage);
      this.rosTopic = null;
    }
  }

  /**
   * @method dispose
   * @description 清理所有资源，包括标记和订阅。
   */
  dispose() {
    this.unsubscribe();
    this.removeAllMarkers();
    this.emit('change');
  }

  /**
   * @private
   * @method processMessage
   * @description 处理接收到的ROS MarkerArray消息。
   * @param {object} arrayMessage - ROS MarkerArray消息。
   */
  processMessage(arrayMessage) {
    arrayMessage.markers.forEach((message) => {
      const key = `${message.ns}/${message.id}`;

      // ADD/MODIFY
      if (message.action === 0) {
        let updated = false;
        if (this.markers[key]) {
          const marker = this.markers[key].children[0];
          if (marker && marker.update) {
            updated = marker.update(message);
          }
          if (!updated) {
            this.removeMarker(key);
          }
        }

        if (!updated) {
          const newMarker = new Marker({
            message: message,
            path: this.path,
          });

          this.markers[key] = new SceneNode({
            frameID: message.header.frame_id,
            tfClient: this.tfClient,
            object: newMarker,
            pose: message.pose,
          });
          this.rootObject.add(this.markers[key]);
        }
      } 
      // DEPRECATED
      else if (message.action === 1) {
        console.warn('Received marker message with deprecated action identifier "1"');
      }
      // DELETE
      else if (message.action === 2) {
        this.removeMarker(key);
      }
      // DELETEALL
      else if (message.action === 3) {
        this.removeAllMarkers();
      }
      else {
        console.warn(`Received marker message with unknown action identifier "${message.action}"`);
      }
    });

    this.emit('change');
  }

  /**
   * @private
   * @method removeMarker
   * @description 移除指定的标记。
   * @param {string} key - 要移除的标记的键 (ns/id)。
   */
  removeMarker(key) {
    const markerNode = this.markers[key];
    if (markerNode) {
      markerNode.dispose();
      this.rootObject.remove(markerNode);
      delete this.markers[key];
    }
  }

  /**
   * @private
   * @method removeAllMarkers
   * @description 移除所有标记。
   */
  removeAllMarkers() {
    for (const key in this.markers) {
      this.removeMarker(key);
    }
    this.markers = {};
  }
}
