/**
 * @fileOverview 提供了用于加载不同格式3D模型文件的现代加载器函数。
 */

import * as THREE from "three";
import { ColladaLoader } from "three/examples/jsm/loaders/ColladaLoader";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader";
import { MTLLoader } from "three/examples/jsm/loaders/MTLLoader";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader";

const onError = (error) => {
  console.error("模型加载出错:", error);
};

/**
 * 异步加载 DAE (Collada) 文件。
 * @param {string} uri - 文件的完整URI。
 * @param {object} options - 加载选项。
 * @returns {Promise<THREE.Scene>} 返回一个包含加载模型的Promise。
 */
export async function loadDAE(uri, options) {
  const loader = new ColladaLoader(options.loader);

  // 将相对路径转换为绝对路径，以确保资源（如贴图）能被正确找到
  const absoluteUrl = new URL(uri, window.location.href).href;
  const resourcePath = absoluteUrl.substring(0, absoluteUrl.lastIndexOf('/') + 1);
  loader.setResourcePath(resourcePath);

  try {
    const collada = await loader.loadAsync(uri);
    if (!collada || !collada.scene) {
      throw new Error(`加载的DAE文件内容无效: ${uri}`);
    }
    return collada.scene;
  } catch (error) {
    console.error(`DAE文件加载失败: ${uri}`, error);
    throw error; // 重新抛出错误让调用方处理
  }
}

/**
 * 异步加载 OBJ 文件，并自动处理其关联的 MTL 材质文件。
 * @param {string} uri - 文件的完整URI。
 * @param {object} options - 加载选项。
 * @returns {Promise<THREE.Group>} 返回一个包含加载模型的Promise。
 */
export async function loadOBJ(uri, options) {
  const objLoader = new OBJLoader(options.loader);
  const mtlLoader = new MTLLoader(options.loader);

  const baseUri = THREE.LoaderUtils.extractUrlBase(uri);
  const model = await objLoader.loadAsync(uri);

  if (model.materialLibraries.length > 0) {
    const materialUri = model.materialLibraries[0];
    mtlLoader.setPath(baseUri);
    const materials = await mtlLoader.loadAsync(materialUri);
    materials.preload();
    objLoader.setMaterials(materials);
    // 重新加载以应用材质 (这是OBJLoader的一个特性)
    return await objLoader.loadAsync(uri);
  }

  return model;
}

/**
 * 异步加载 STL 文件。
 * @param {string} uri - 文件的完整URI。
 * @param {object} options - 加载选项，包含可选的材质。
 * @returns {Promise<THREE.Mesh>} 返回一个包含加载模型的Promise。
 */
export async function loadSTL(uri, options) {
  const loader = new STLLoader(options.loader);
  const geometry = await loader.loadAsync(uri);
  geometry.computeVertexNormals();

  const material =
    options.material || new THREE.MeshBasicMaterial({ color: 0x999999 });
  const mesh = new THREE.Mesh(geometry, material);
  return mesh;
}
