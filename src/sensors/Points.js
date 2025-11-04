/**
 * @fileOverview Points - 一个管理和显示点云数据的辅助类。
 */

import * as THREE from "three";
import { SceneNode } from "@visualization/SceneNode.js";
import { getLogger } from "../utils/Logger.js";

const logger = getLogger("Points");

/**
 * @class Points
 * @description 一个管理三维点集合的辅助类，被 PointCloud2 和 LaserScan 使用。
 * 它负责创建`THREE.Points`对象、设置其几何体和材质，并将其包装在`SceneNode`中以进行TF变换。
 */
export class Points {
  /**
   * @param {object} options - 选项对象。
   * @param {object} options.tfClient - 用于坐标变换的TF客户端。
   * @param {THREE.Object3D} [options.rootObject] - 用于添加点云的根对象。
   * @param {number} [options.max_pts=10000] - 要绘制的最大点数。
   * @param {number} [options.pointRatio=1] - 点的子采样率。
   * @param {number} [options.messageRatio=1] - 消息的子采样率。
   * @param {object} [options.material] - 用于构造`THREE.PointsMaterial`的选项。
   * @param {string} [options.colorsrc] - 用于着色的字段名，如 'rgb' 或 'intensity'。
   * @param {function} [options.colormap] - 将颜色字段值转换为THREE.Color的函数。
   */
  constructor(options = {}) {
    logger.info("Initializing Points component");
    logger.debug("Points configuration options:", options);

    const {
      tfClient,
      rootObject = new THREE.Object3D(),
      max_pts = 10000,
      pointRatio = 1,
      messageRatio = 1,
      material = {},
      colorsrc,
      colormap,
    } = options;

    this.tfClient = tfClient;
    this.rootObject = rootObject;
    this.max_pts = max_pts;
    this.pointRatio = pointRatio;
    this.messageRatio = messageRatio;
    this.messageCount = 0;
    this.material = material;
    this.colorsrc = colorsrc;
    this.colormap = colormap;

    if ("color" in options || "size" in options || "texture" in options) {
      console.warn(
        'Top-level "color", "size", and "texture" options are deprecated. ' +
          'They should be provided within a "material" option, e.g., ' +
          "{ tfClient, material: { color: 0xff0000, size: 0.1 } }"
      );
    }

    this.sn = null;
    this.fields = {};
    this.geom = null;
    this.positions = null;
    this.colors = null;
    this.object = null;
    this.getColor = null;

    logger.debug("Points component initialized");
  }

  /**
   * @method dispose
   * @description 清理并释放所有相关资源。
   */
  dispose() {
    if (this.sn) {
      this.rootObject.remove(this.sn);
      this.sn.dispose();
      this.sn = null;
    }
    if (this.geom) {
      this.geom.dispose();
      this.geom = null;
    }
    if (this.material) {
      this.material.dispose();
      this.material = null;
    }
  }

  /**
   * @method setup
   * @description 延迟初始化点云的几何体和场景节点。
   * @param {string} frame - 坐标系ID。
   * @param {number} [point_step] - 单个点的字节长度。
   * @param {Array<object>} [fields] - 点云消息的字段定义。
   * @returns {boolean} 是否应处理当前消息（基于`messageRatio`）。
   */
  setup(frame, point_step, fields) {
    if (this.sn === null) {
      logger.debug("Setting up Points geometry for frame:", frame);

      fields = fields || [];
      this.fields = {};
      fields.forEach((field) => {
        this.fields[field.name] = field;
      });

      this.geom = new THREE.BufferGeometry();
      this.positions = new THREE.BufferAttribute(
        new Float32Array(this.max_pts * 3),
        3,
        false
      );
      this.positions.setUsage(THREE.DynamicDrawUsage);
      this.geom.setAttribute("position", this.positions);

      if (!this.colorsrc) {
        // 如果未明确提供colorsrc
        // 自动检测常见的颜色字段名
        const commonColorFields = ["rgb", "rgb_float", "rgba"];
        for (const fieldName of commonColorFields) {
          if (this.fields[fieldName]) {
            this.colorsrc = fieldName;
            logger.debug(
              `Automatically detected color source field: '${fieldName}'`
            );
            break; // 使用找到的第一个字段
          }
        }
      }

      if (this.colorsrc) {
        const field = this.fields[this.colorsrc];
        if (field) {
          this.colors = new THREE.BufferAttribute(
            new Float32Array(this.max_pts * 3),
            3,
            false
          );
          this.colors.setUsage(THREE.DynamicDrawUsage);
          this.geom.setAttribute("color", this.colors);

          const { offset, datatype } = field;
          const colorFunctions = [
            (dv, base, le) => dv.getInt8(base + offset, le),
            (dv, base, le) => dv.getUint8(base + offset, le),
            (dv, base, le) => dv.getInt16(base + offset, le),
            (dv, base, le) => dv.getUint16(base + offset, le),
            (dv, base, le) => dv.getInt32(base + offset, le),
            (dv, base, le) => dv.getUint32(base + offset, le),
            (dv, base, le) => dv.getFloat32(base + offset, le),
            (dv, base, le) => dv.getFloat64(base + offset, le),
          ];
          this.getColor = colorFunctions[datatype - 1];

          this.colormap = this.colormap || ((x) => new THREE.Color(x));
        } else {
          logger.warn(
            `Color source field "${this.colorsrc}" is not available.`
          );
        }
      }

      if (!this.material.isMaterial) {
        // 为复现旧版three.js的行为，我们显式地将sizeAttenuation设置为false，
        // 使点的大小以像素为单位，而不是随距离缩放的世界单位。
        const materialOptions = {
          size: 1.0,
          sizeAttenuation: false,
          ...this.material, // 用户提供的选项将覆盖这些默认值
        };

        if (this.colors && materialOptions.vertexColors === undefined) {
          materialOptions.vertexColors = true;
        }
        this.material = new THREE.PointsMaterial(materialOptions);
        logger.debug(
          "Created THREE.PointsMaterial with options:",
          materialOptions
        );
      }

      this.object = new THREE.Points(this.geom, this.material);
      this.sn = new SceneNode({
        frameID: frame,
        tfClient: this.tfClient,
        object: this.object,
      });
      this.rootObject.add(this.sn);
      logger.debug("SceneNode created and added to the root object");
    }

    const shouldProcess = this.messageCount++ % this.messageRatio === 0;
    return shouldProcess;
  }

  /**
   * @method update
   * @description 更新点云的几何体以反映新的点数据。
   * @param {number} n - 要渲染的点的数量。
   */
  update(n) {
    this.geom.setDrawRange(0, n);
    this.positions.needsUpdate = true;
    this.positions.count = n;

    if (this.colors) {
      this.colors.needsUpdate = true;
      this.colors.count = n;
    }
    logger.debug(`Updated points geometry with ${n} points`);
  }
}
