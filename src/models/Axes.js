/**
 * @fileOverview 定义了 Axes 类，用于显示一个坐标系的三色轴。
 */

import * as THREE from "three";

/**
 * Axes 对象可用于显示特定坐标框架的轴（X-红, Y-绿, Z-蓝）。
 */
export class Axes extends THREE.Object3D {
  /**
   * 创建单个坐标轴（带箭头）的内部静态方法。
   * @private
   */
  static #createAxis(options) {
    const {
      axisVector,
      shaftRadius,
      headRadius,
      headLength,
      lineType,
      lineDashLength,
    } = options;

    const axisObject = new THREE.Object3D();

    const color = new THREE.Color();
    color.setRGB(axisVector.x, axisVector.y, axisVector.z);
    const material = new THREE.MeshBasicMaterial({ color: color.getHex() });

    // 计算从默认的Y轴正方向到目标轴方向的旋转
    const rotAxis = new THREE.Vector3();
    rotAxis.crossVectors(new THREE.Vector3(0, 1, 0), axisVector).normalize();
    const angle = Math.acos(new THREE.Vector3(0, 1, 0).dot(axisVector));
    const rot = new THREE.Quaternion().setFromAxisAngle(rotAxis, angle);

    // 箭头头部
    const headGeom = new THREE.CylinderGeometry(0, headRadius, headLength);
    const head = new THREE.Mesh(headGeom, material);
    head.position.copy(axisVector).multiplyScalar(1.0 - headLength / 2);
    head.quaternion.copy(rot);
    axisObject.add(head);

    // 轴线
    if (lineType === "full") {
      const lineGeom = new THREE.CylinderGeometry(
        shaftRadius,
        shaftRadius,
        1.0 - headLength
      );
      const line = new THREE.Mesh(lineGeom, material);
      line.position.copy(axisVector).multiplyScalar((1.0 - headLength) / 2);
      line.quaternion.copy(rot);
      axisObject.add(line);
    } else if (lineType === "dashed") {
      const dashLen = lineDashLength;
      const totalLen = 1.0 - headLength;
      const numDashes = Math.floor(totalLen / (1.5 * dashLen));
      const dashSpacing = totalLen / numDashes;

      for (let i = 0; i < numDashes; i++) {
        const dashGeom = new THREE.CylinderGeometry(
          shaftRadius,
          shaftRadius,
          dashLen
        );
        const line = new THREE.Mesh(dashGeom, material);
        const pos = i * dashSpacing + dashSpacing / 2;
        line.position.copy(axisVector).multiplyScalar(pos);
        line.quaternion.copy(rot);
        axisObject.add(line);
      }
    }

    return axisObject;
  }

  /**
   * @param {object} options - 配置选项。
   * @param {number} [options.shaftRadius=0.008] - 轴的半径。
   * @param {number} [options.headRadius=0.023] - 箭头头部的半径。
   * @param {number} [options.headLength=0.1] - 箭头头部的长度。
   * @param {number} [options.scale=1.0] - 整个坐标轴的缩放比例。
   * @param {string} [options.lineType='full'] - 轴的线型，支持 'full' (实线) 和 'dashed' (虚线)。
   * @param {number} [options.lineDashLength=0.1] - 虚线的单段长度，仅在 lineType 为 'dashed' 时有效。
   */
  constructor(options = {}) {
    super();

    const { scale = 1.0, ...axisOptions } = options;

    this.scale.set(scale, scale, scale);

    const axesVectors = [
      new THREE.Vector3(1, 0, 0), // X 轴
      new THREE.Vector3(0, 1, 0), // Y 轴
      new THREE.Vector3(0, 0, 1), // Z 轴
    ];

    axesVectors.forEach((axisVector) => {
      const axis = this.constructor.#createAxis({ ...axisOptions, axisVector });
      this.add(axis);
    });
  }

  /**
   * 销毁并释放所有相关的GPU资源。
   */
  dispose() {
    this.traverse((object) => {
      if (object.isMesh) {
        if (object.geometry) {
          object.geometry.dispose();
        }
        if (object.material) {
          object.material.dispose();
        }
      }
    });
  }
}
