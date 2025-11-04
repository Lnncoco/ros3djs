/**
 * @fileOverview 定义了 Arrow 类，一个可配置的箭头三维对象。
 */

import * as THREE from "three";
import { createArrow } from "./arrow.creator";

/**
 * Arrow 是一个 THREE.Object3D，可用于显示一个可编程的箭头模型。
 * 默认沿Y轴正方向创建，然后通过 setDirection旋转到指定方向。
 */
export class Arrow extends THREE.Object3D {
  /**
   * @param {object} options - 配置选项。
   * @param {THREE.Vector3} [options.origin=new THREE.Vector3(0, 0, 0)] - 箭头的原点。
   * @param {THREE.Vector3} [options.direction=new THREE.Vector3(1, 0, 0)] - 箭头的方向向量。
   * @param {number} [options.length=1] - 箭头的总长度。
   * @param {number} [options.headLength=0.2*length] - 箭头头部的长度。
   * @param {number} [options.shaftDiameter=0.05*length] - 箭头轴的直径。
   * @param {number} [options.headDiameter=0.1*length] - 箭头头部的直径。
   * @param {THREE.Material} [options.material] - 用于此箭头的材质。如果未提供，则创建一个新的紫色BasicMaterial。
   */
  constructor(options = {}) {
    super();

    const { 
      length = 1,
      origin = new THREE.Vector3(0, 0, 0),
      direction = new THREE.Vector3(1, 0, 0),
      headLength = 0.2,
      shaftDiameter = 0.05,
      headDiameter = 0.1,
      material = new THREE.MeshBasicMaterial({ color: 0xcc00ff }),
    } = options;

    this.length = length;
    this.headLength = headLength;
    this.shaftDiameter = shaftDiameter;
    this.headDiameter = headDiameter;
    this.material = material;

    const shaftLength = this.length - this.headLength;
    this.initialShaftLength = shaftLength; // 保存初始箭杆长度

    // 使用创建器生成箭头的视觉部分
    this.arrowGroup = createArrow({
      shaftLength,
      shaftDiameter: this.shaftDiameter,
      headLength: this.headLength,
      headDiameter: this.headDiameter,
      material: this.material,
    });

    this.add(this.arrowGroup);

    this.position.copy(origin);
    this.setDirection(direction);
  }

  /**
   * 将此箭头的方向设置为给定向量的方向。
   * @param {THREE.Vector3} direction - 要设置的方向向量。
   */
  setDirection(direction) {
    const axis = new THREE.Vector3(0, 1, 0); // 箭头模型默认沿Y轴
    this.quaternion.setFromUnitVectors(axis, direction.clone().normalize());
  }

  /**
   * 设置箭头的新长度。此方法通过缩放轴并移动头部来高效更新，而无需重新创建几何体。
   * @param {number} length - 箭头的新总长度。
   */
  setLength(length) {
    if (this.initialShaftLength <= 0) return; // 防止除以零或负数

    this.length = length;
    const newShaftLength = this.length - this.headLength;

    const shaft = this.arrowGroup.getObjectByName("shaft");
    const head = this.arrowGroup.getObjectByName("head");

    if (shaft) {
      // 始终基于初始几何体长度进行缩放
      shaft.scale.y = newShaftLength / this.initialShaftLength;
      shaft.position.y = newShaftLength / 2;
    }
    if (head) {
      head.position.y = newShaftLength + this.headLength / 2;
    }
  }

  /**
   * 设置箭头的颜色。
   * @param {THREE.Color | number | string} color - 要设置的颜色。
   */
  setColor(color) {
    if (this.material) {
      this.material.color.set(color);
    }
  }

  /**
   * 释放此对象占用的GPU资源。
   */
  dispose() {
    this.arrowGroup.children.forEach((child) => {
      if (child.geometry) {
        child.geometry.dispose();
      }
    });
    if (this.material) {
      this.material.dispose();
    }
  }
}
