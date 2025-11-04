/**
 * @fileOverview 定义了 Grid 类，用于在场景中创建一个二维网格。
 */

import * as THREE from "three";

/**
 * 一个用于场景的网格对象。
 * 通过 options 对象进行配置。
 */
export class Grid extends THREE.Object3D {
  /**
   * 创建一个支持自定义线宽的网格的内部静态方法。
   * @private
   */
  static #createGrid(num_cells, cellSize, color, lineWidth) {
    const vertices = [];
    const halfSize = (num_cells * cellSize) / 2;

    for (let i = 0; i <= num_cells; i++) {
      const pos = -halfSize + i * cellSize;
      // 添加平行于 Y 轴的线
      vertices.push(-halfSize, pos, 0);
      vertices.push(halfSize, pos, 0);
      // 添加平行于 X 轴的线
      vertices.push(pos, -halfSize, 0);
      vertices.push(pos, halfSize, 0);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(vertices, 3)
    );

    const material = new THREE.LineBasicMaterial({
      color,
      linewidth: lineWidth,
    });

    const grid = new THREE.LineSegments(geometry, material);
    grid.type = "Grid";

    return grid;
  }

  /**
   * @param {object} options - 配置选项。
   * @param {number} [options.num_cells=10] - 网格的单元格数量。
   * @param {string} [options.color='#cccccc'] - 网格的颜色。
   * @param {number} [options.lineWidth=1] - 网格线的宽度。
   * @param {number} [options.cellSize=1] - 每个单元格的大小。
   */
  constructor(options = {}) {
    super();

    const {
      num_cells: numCells = 10,
      color = "#cccccc",
      lineWidth = 1,
      cellSize = 1,
    } = options;

    // 使用内部静态方法创建网格并添加到当前对象
    this.add(
      this.constructor.#createGrid(numCells, cellSize, color, lineWidth)
    );
  }

  /**
   * @method dispose
   * @description 销毁此对象并释放所有相关资源。
   */
  dispose() {
    this.children.forEach(child => {
      if (child instanceof THREE.LineSegments) {
        if (child.geometry) {
          child.geometry.dispose();
        }
        if (child.material) {
          // 材质可能是数组，也可能是单个材质
          if (Array.isArray(child.material)) {
            child.material.forEach(material => material.dispose());
          } else {
            child.material.dispose();
          }
        }
        this.remove(child);
      }
    });
    this.children = []; // 清空子对象数组
  }
}
