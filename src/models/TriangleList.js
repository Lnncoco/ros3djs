/**
 * @fileOverview 定义了 TriangleList 类，用于将顶点列表显示为三角形集合。
 */

import * as THREE from "three";

/**
 * TriangleList 是一个 THREE.Object3D，用于将顶点列表显示为一系列的三角形。
 */
export class TriangleList extends THREE.Object3D {
  /**
   * 内部静态方法，根据顶点和颜色数据构建几何体。
   * @private
   */
  static #buildGeometry(vertices, colors) {
    const geometry = new THREE.BufferGeometry();

    // 1. 处理顶点
    const verticesArray = new Float32Array(vertices.length * 3);
    for (let i = 0; i < vertices.length; i++) {
      verticesArray[i * 3] = vertices[i].x;
      verticesArray[i * 3 + 1] = vertices[i].y;
      verticesArray[i * 3 + 2] = vertices[i].z;
    }
    geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(verticesArray, 3)
    );

    // 2. 处理颜色
    const numVertices = vertices.length;
    const colorsArray = new Float32Array(numVertices * 3);
    let useVertexColors = true;

    if (colors && colors.length === numVertices) {
      // 模式一：逐顶点着色
      for (let i = 0; i < numVertices; i++) {
        colorsArray[i * 3] = colors[i].r;
        colorsArray[i * 3 + 1] = colors[i].g;
        colorsArray[i * 3 + 2] = colors[i].b;
      }
    } else if (colors && colors.length === numVertices / 3) {
      // 模式二：逐三角形着色
      for (let i = 0; i < colors.length; i++) {
        const triColor = colors[i];
        const baseIndex = i * 9; // 每个三角形3个顶点，每个顶点3个颜色分量
        for (let j = 0; j < 3; j++) {
          // 为一个三角形的3个顶点设置相同颜色
          colorsArray[baseIndex + j * 3] = triColor.r;
          colorsArray[baseIndex + j * 3 + 1] = triColor.g;
          colorsArray[baseIndex + j * 3 + 2] = triColor.b;
        }
      }
    } else {
      // 模式三：使用材质颜色（不设置顶点色）
      useVertexColors = false;
    }

    if (useVertexColors) {
      geometry.setAttribute("color", new THREE.BufferAttribute(colorsArray, 3));
    }

    // 3. 计算法线以支持光照
    geometry.computeVertexNormals();

    return { geometry, useVertexColors };
  }

  /**
   * @param {object} options - 配置选项。
   * @param {THREE.Vector3[]} options.vertices - 顶点数组。
   * @param {object[]} [options.colors] - 颜色数组，可逐顶点或逐三角形。
   * @param {THREE.Material} [options.material] - （可选）用于对象的材质。
   */
  constructor(options = {}) {
    super();

    const {
      vertices = [],
      colors = [],
      material = new THREE.MeshBasicMaterial(),
    } = options;

    // 设置材质为双面渲染，这对于非闭合的三角形列表很重要
    material.side = THREE.DoubleSide;

    const { geometry, useVertexColors } = this.constructor.#buildGeometry(
      vertices,
      colors
    );
    material.vertexColors = useVertexColors;

    this.mesh = new THREE.Mesh(geometry, material);
    this.add(this.mesh);
  }

  /**
   * 设置对象的颜色。注意：只有在未使用顶点色的情况下才有效。
   * @param {THREE.Color | number | string} color - 要设置的颜色。
   */
  setColor(color) {
    if (this.mesh && this.mesh.material && !this.mesh.material.vertexColors) {
      this.mesh.material.color.set(color);
    }
  }

  /**
   * @method dispose
   * @description 销毁此对象并释放所有相关资源。
   */
  dispose() {
    if (this.mesh) {
      this.remove(this.mesh);
      if (this.mesh.geometry) {
        this.mesh.geometry.dispose();
      }
      if (this.mesh.material) {
        // 材质可能是数组，也可能是单个材质
        if (Array.isArray(this.mesh.material)) {
          this.mesh.material.forEach(material => material.dispose());
        } else {
          this.mesh.material.dispose();
        }
      }
      this.mesh = null;
    }
  }
}
