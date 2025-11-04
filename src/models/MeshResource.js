/**
 * @fileOverview 定义了 MeshResource 类，用于加载外部3D模型文件。
 */

import * as THREE from "three";
import { loadDAE, loadOBJ, loadSTL } from "./mesh.loaders";

// 将文件后缀映射到对应的加载函数
const loaderMapping = {
  dae: loadDAE,
  obj: loadOBJ,
  stl: loadSTL,
};

/**
 * MeshResource 是一个 THREE.Object3D，它会从外部模型文件异步加载并显示模型。
 */
export class MeshResource extends THREE.Object3D {
  /**
   * @param {object} options - 配置选项。
   * @param {string} [options.path='/'] - 模型文件的基础路径。
   * @param {string} options.resource - 要加载的资源文件名。
   * @param {THREE.Material} [options.material] - （可选）用于模型的材质，主要对STL格式有效。
   * @param {boolean} [options.warnings=false] - （可选）是否在加载过程中打印警告。
   */
  constructor(options = {}) {
    super();

    const {
      path = "/",
      resource,
      ...loaderOptions // 将 material, warnings 等透传给加载函数
    } = options;

    if (!resource) {
      console.error("错误: MeshResource 的构造函数缺少 resource 参数。");
      return;
    }

    let uri;
    if (resource.startsWith('http://') || resource.startsWith('https://')) {
      uri = resource;
    } else {
      // 规范化路径，确保以 '/' 结尾
      const normalizedPath = path.endsWith('/') ? path : `${path}/`;
      uri = normalizedPath + resource;
    }

    const fileType = uri.substring(uri.lastIndexOf('.') + 1).toLowerCase();

    const loaderFunc = loaderMapping[fileType];

    if (loaderFunc) {
      loaderFunc(uri, loaderOptions)
        .then((model) => {
          if (model) {
            this.add(model);
          } else {
            console.warn(`加载模型 '${uri}' 成功，但返回了空模型。`);
          }
        })
        .catch((error) => {
          console.error(`加载模型 '${uri}' 时出错:`, error);
        });
    } else {
      console.warn(`不支持的模型文件类型: '${fileType}'`);
    }
  }

  /**
   * 销毁此对象加载的所有资源，包括几何体、材质和纹理。
   */
  dispose() {
    // 辅助函数，用于销毁材质及其纹理
    const disposeMaterial = (material) => {
      // 遍历材质的所有属性
      Object.keys(material).forEach((key) => {
        const value = material[key];
        // 如果属性是一个纹理，则销毁它
        if (value && typeof value.dispose === "function" && value.isTexture) {
          value.dispose();
        }
      });
      // 销毁材质本身
      material.dispose();
    };

    this.traverse((object) => {
      if (object.isMesh) {
        // 销毁几何体
        if (object.geometry) {
          object.geometry.dispose();
        }

        // 销毁材质
        if (object.material) {
          if (Array.isArray(object.material)) {
            // 如果材质是一个数组
            object.material.forEach(disposeMaterial);
          } else {
            // 如果是单个材质
            disposeMaterial(object.material);
          }
        }
      }
    });
  }
}
