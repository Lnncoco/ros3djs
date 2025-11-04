/**
 * @fileOverview TFAxes - 用于显示给定TF坐标系轴的辅助类。
 */

import { Axes } from "../models/Axes.js";
import { SceneNode } from "../visualization/SceneNode.js";
import { getLogger } from "../utils/Logger.js";

const logger = getLogger("TFAxes");

/**
 * @class TFAxes
 * @description 一个可以用于显示特定坐标系轴的节点。
 */
export class TFAxes {
  /**
   * @param {object} options - 选项对象。
   * @param {string} options.frameID - 要可视化的坐标系ID。
   * @param {object} options.tfClient - TF客户端句柄。
   * @param {THREE.Object3D} [options.rootObject] - 用于添加轴的根对象。
   * @param {number} [options.shaftRadius] - 轴的半径。
   * @param {number} [options.headRadius] - 箭头头部的半径。
   * @param {number} [options.headLength] - 箭头头部的长度。
   * @param {number} [options.scale=1.0] - 坐标系的缩放比例。
   * @param {string} [options.lineType='full'] - 轴的线型（'dashed'或'full'）。
   * @param {number} [options.lineDashLength=0.1] - 虚线的长度。
   */
  constructor(options = {}) {
    logger.info("Initializing TFAxes component");
    this.frameID = options.frameID;
    this.tfClient = options.tfClient;
    this.rootObject = options.rootObject || new THREE.Object3D();

    this.axes = new Axes({
      shaftRadius: options.shaftRadius || 0.025,
      headRadius: options.headRadius || 0.07,
      headLength: options.headLength || 0.2,
      scale: options.scale || 1.0,
      lineType: options.lineType || "full",
      lineDashLength: options.lineDashLength || 0.1,
    });

    this.sn = new SceneNode({
      frameID: this.frameID,
      tfClient: this.tfClient,
      object: this.axes,
    });

    this.rootObject.add(this.sn);
    logger.debug(`TFAxes for frame '${this.frameID}' added to the scene.`);
  }

  /**
   * @method dispose
   * @description 清理资源并从场景中移除轴。
   */
  dispose() {
    if (this.sn) {
      this.rootObject.remove(this.sn);
      this.sn.dispose();
      this.sn = null;
      logger.debug(`TFAxes for frame '${this.frameID}' disposed.`);
    }
  }
}
