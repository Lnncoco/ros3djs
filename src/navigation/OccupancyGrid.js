/**
 * @fileOverview OccupancyGrid - 用于显示ROS占据栅格地图的组件。
 */

import * as THREE from "three";
import { getLogger } from "../utils/Logger.js";

const logger = getLogger("OccupancyGrid");

/**
 * @class OccupancyGrid
 * @description 一个可以将ROS `nav_msgs/OccupancyGrid` 消息转换为可渲染的THREE.js对象的组件。
 * @extends THREE.Mesh
 */
export class OccupancyGrid extends THREE.Mesh {
  /**
   * @param {object} options - 配置选项。
   * @param {object} options.message - `nav_msgs/OccupancyGrid` 消息。
   * @param {object} [options.color={r:0, g:0, b:0}] - 占据空间（100）的颜色。
   * @param {object} [options.unknownColor={r:128, g:128, b:128}] - 未知空间（-1）的颜色。
   * @param {number} [options.opacity=1.0] - 可视化栅格的不透明度。
   */
  constructor(options = {}) {
    logger.info("Initializing OccupancyGrid component");
    logger.debug("OccupancyGrid configuration options:", options);

    const {
      message,
      opacity = 1.0,
      color = { r: 0, g: 0, b: 0 },
      unknownColor = { r: 128, g: 128, b: 128 },
    } = options;

    const { info, data } = message;
    const { width, height, resolution, origin } = info;

    const geom = new THREE.PlaneGeometry(width, height);
    logger.debug(`Created OccupancyGrid geometry of size: ${width}x${height}`);

    const imageData = new Uint8Array(width * height * 4);
    const texture = new THREE.DataTexture(
      imageData,
      width,
      height,
      THREE.RGBAFormat
    );
    texture.flipY = true;
    texture.minFilter = THREE.NearestFilter;
    texture.magFilter = THREE.NearestFilter;

    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true, // 总是允许透明，以便显示空闲空间
      opacity: opacity,
      side: THREE.DoubleSide,
    });

    super(geom, material);

    this.color = color;
    this.unknownColor = unknownColor;

    this.quaternion.copy(origin.orientation);
    this.scale.set(resolution, resolution, 1);
    this.position.set(
      (width * resolution) / 2 + origin.position.x,
      (height * resolution) / 2 + origin.position.y,
      origin.position.z
    );

    logger.debug("Processing OccupancyGrid data...");
    for (let row = 0; row < height; row++) {
      for (let col = 0; col < width; col++) {
        const mapI = col + (height - 1 - row) * width;
        const val = data[mapI];
        const color = this.getColor(val);
        const imgI = (col + row * width) * 4;
        imageData.set(color, imgI);
      }
    }

    texture.needsUpdate = true;
    logger.info("OccupancyGrid component initialized successfully");
  }

  /**
   * @method dispose
   * @description 释放此对象占用的资源。
   */
  dispose() {
    logger.debug("Disposing OccupancyGrid resources");
    if (this.material.map) {
      this.material.map.dispose();
    }
    this.material.dispose();
    this.geometry.dispose();
  }

  /**
   * @private
   * @method getColor
   * @description 根据占据值计算并返回颜色。
   * - -1（未知）: 返回 `unknownColor`。
   * - 0（空闲）: 返回完全透明的颜色。
   * - 1-100（占据）: 返回基于 `color` 的灰度插值颜色。
   * @param {number} value - 单元格的占据值 (-1, 0-100)。
   * @returns {Array<number>} RGBA颜色数组，值范围为0-255。
   */
  getColor(value) {
    if (value === -1) {
      return [
        this.unknownColor.r,
        this.unknownColor.g,
        this.unknownColor.b,
        255,
      ];
    } else if (value === 0) {
      return [0, 0, 0, 0]; // 完全透明
    } else {
      const val = 1.0 - value / 100.0;
      return [this.color.r * val, this.color.g * val, this.color.b * val, 255];
    }
  }
}
