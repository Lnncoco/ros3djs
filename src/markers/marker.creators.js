/**
 * @fileOverview
 *
 * 标记创建函数
 */

import * as THREE from "three";
import { Arrow } from "../models/Arrow.js";
import { TriangleList } from "../models/TriangleList.js";
import { MeshResource } from "../models/MeshResource.js";

/**
 * 创建 THREE 材质，基于给定的 RGBA 值
 * @param {number} r - 红色值
 * @param {number} g - 绿色值
 * @param {number} b - 蓝色值
 * @param {number} a - 透明度值
 * @returns {THREE.Material} THREE 材质
 */
export const makeColorMaterial = (r, g, b, a) => {
  const color = new THREE.Color();
  color.setRGB(r, g, b);
  if (a <= 0.99) {
    return new THREE.MeshBasicMaterial({
      color: color.getHex(),
      opacity: a + 0.1,
      transparent: true,
      depthWrite: true,
      blending: THREE.NormalBlending,
    });
  } else {
    return new THREE.MeshPhongMaterial({
      color: color.getHex(),
      opacity: a,
      blending: THREE.NormalBlending,
    });
  }
};

/**
 * 创建立方体标记
 * @param {Object} message - 标记消息
 * @param {THREE.Material} material - 材质
 * @returns {THREE.Mesh} 立方体网格
 */
export const createCubeMarker = (message, material) => {
  const geometry = new THREE.BoxGeometry(
    message.scale.x,
    message.scale.y,
    message.scale.z
  );
  return new THREE.Mesh(geometry, material);
};

/**
 * 创建球体标记
 * @param {Object} message - 标记消息
 * @param {THREE.Material} material - 材质
 * @returns {THREE.Mesh} 球体网格
 */
export const createSphereMarker = (message, material) => {
  const geometry = new THREE.SphereGeometry(0.5);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.scale.set(message.scale.x, message.scale.y, message.scale.z);
  return mesh;
};

/**
 * 创建圆柱体标记
 * @param {Object} message - 标记消息
 * @param {THREE.Material} material - 材质
 * @returns {THREE.Mesh} 圆柱体网格
 */
export const createCylinderMarker = (message, material) => {
  const geometry = new THREE.CylinderGeometry(0.5, 0.5, 1, 16, 1, false);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.quaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI * 0.5);
  mesh.scale.set(message.scale.x, message.scale.z, message.scale.y);
  return mesh;
};

/**
 * 创建线段标记（LINE_STRIP 或 LINE_LIST）
 * @param {Object} message - 标记消息
 * @param {THREE.Material} baseMaterial - 基础材质
 * @param {boolean} isStrip - 是否为线段(strip)而非线段列表(list)
 * @returns {THREE.Line|THREE.LineSegments} 线条对象
 */
export const createLineMarker = (message, baseMaterial, isStrip = true) => {
  const geometry = new THREE.BufferGeometry();
  const material = new THREE.LineBasicMaterial({
    linewidth: message.scale.x,
    color: new THREE.Color().setRGB(
      baseMaterial.color.r,
      baseMaterial.color.g,
      baseMaterial.color.b
    ),
  });

  // 创建位置数组
  const positions = new Float32Array(message.points.length * 3);
  for (let i = 0; i < message.points.length; i++) {
    positions[i * 3] = message.points[i].x;
    positions[i * 3 + 1] = message.points[i].y;
    positions[i * 3 + 2] = message.points[i].z;
  }

  // 设置位置属性
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

  // 确定颜色
  if (message.colors && message.colors.length === message.points.length) {
    material.vertexColors = true;
    const colors = new Float32Array(message.colors.length * 3);
    for (let i = 0; i < message.colors.length; i++) {
      colors[i * 3] = message.colors[i].r;
      colors[i * 3 + 1] = message.colors[i].g;
      colors[i * 3 + 2] = message.colors[i].b;
    }
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  } else {
    material.color.setRGB(
      baseMaterial.color.r,
      baseMaterial.color.g,
      baseMaterial.color.b
    );
  }

  // 返回线条对象
  return isStrip
    ? new THREE.Line(geometry, material)
    : new THREE.LineSegments(geometry, material);
};

/**
 * 创建点标记
 * @param {Object} message - 标记消息
 * @param {THREE.Material} baseMaterial - 基础材质
 * @returns {THREE.Points} 点系统
 */
export const createPointsMarker = (message, baseMaterial) => {
  const geometry = new THREE.BufferGeometry();
  const material = new THREE.PointsMaterial({
    size: message.scale.x,
    color: new THREE.Color().setRGB(
      baseMaterial.color.r,
      baseMaterial.color.g,
      baseMaterial.color.b
    ),
  });

  // 创建位置数组
  const positions = new Float32Array(message.points.length * 3);
  for (let i = 0; i < message.points.length; i++) {
    positions[i * 3] = message.points[i].x;
    positions[i * 3 + 1] = message.points[i].y;
    positions[i * 3 + 2] = message.points[i].z;
  }

  // 设置位置属性
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

  // 确定颜色
  if (message.colors && message.colors.length === message.points.length) {
    material.vertexColors = true;
    const colors = new Float32Array(message.colors.length * 3);
    for (let i = 0; i < message.colors.length; i++) {
      colors[i * 3] = message.colors[i].r;
      colors[i * 3 + 1] = message.colors[i].g;
      colors[i * 3 + 2] = message.colors[i].b;
    }
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  } else {
    material.color.setRGB(
      baseMaterial.color.r,
      baseMaterial.color.g,
      baseMaterial.color.b
    );
  }

  return new THREE.Points(geometry, material);
};

/**
 * 创建箭头标记
 * @param {Object} message - 标记消息
 * @param {THREE.Material} material - 材质
 * @returns {Arrow} 箭头对象
 */
export const createArrowMarker = (message, material) => {
  let len = message.scale.x;
  let headLength = len * 0.23;
  let headDiameter = message.scale.y;
  let shaftDiameter = headDiameter * 0.5;

  // 确定点
  let direction,
    origin = null;
  if (message.points && message.points.length === 2) {
    origin = new THREE.Vector3(
      message.points[0].x,
      message.points[0].y,
      message.points[0].z
    );
    const p2 = new THREE.Vector3(
      message.points[1].x,
      message.points[1].y,
      message.points[1].z
    );
    direction = origin.clone().negate().add(p2);
    len = direction.length();
    headDiameter = message.scale.y;
    shaftDiameter = message.scale.x;

    if (message.scale.z !== 0.0) {
      headLength = message.scale.z;
    }
  } else {
    direction = new THREE.Vector3(1, 0, 0); // 默认方向
    origin = new THREE.Vector3(0, 0, 0); // 默认原点
  }

  return new Arrow({
    direction: direction,
    origin: origin,
    length: len,
    headLength: headLength,
    shaftDiameter: shaftDiameter,
    headDiameter: headDiameter,
    material: material,
  });
};

/**
 * 创建实例化网格标记（用于列表类型）
 * @param {Object} message - 标记消息
 * @param {THREE.Material} material - 材质
 * @param {Function} geometryCreator - 几何体创建函数
 * @returns {THREE.InstancedMesh} 实例化网格
 */
export const createInstancedMeshMarker = (
  message,
  material,
  geometryCreator
) => {
  const numPoints = message.points.length;
  const geometry = geometryCreator();

  const instancedMesh = new THREE.InstancedMesh(geometry, material, numPoints);

  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const scale = new THREE.Vector3(
    message.scale.x,
    message.scale.y,
    message.scale.z
  );
  const quaternion = new THREE.Quaternion();

  // 为每个实例设置位置
  for (let i = 0; i < numPoints; i++) {
    position.set(message.points[i].x, message.points[i].y, message.points[i].z);
    matrix.compose(position, quaternion, scale);
    instancedMesh.setMatrixAt(i, matrix);
  }

  instancedMesh.instanceMatrix.needsUpdate = true;
  return instancedMesh;
};

import {
  MARKER_ARROW,
  MARKER_CUBE,
  MARKER_SPHERE,
  MARKER_CYLINDER,
  MARKER_LINE_STRIP,
  MARKER_LINE_LIST,
  MARKER_CUBE_LIST,
  MARKER_SPHERE_LIST,
  MARKER_POINTS,
  MARKER_TEXT_VIEW_FACING,
  MARKER_MESH_RESOURCE,
  MARKER_TRIANGLE_LIST,
} from "../constants/marker.constants.js";

/**
 * 创建标记的工厂函数
 * @param {Object} message - 标记消息
 * @param {string} path - 路径
 * @param {THREE.Material} colorMaterial - 颜色材质
 * @returns {THREE.Object3D} 标记对象
 */
export const createMarkerObject = (message, path, colorMaterial) => {
  switch (message.type) {
    case MARKER_ARROW:
      return createArrowMarker(message, colorMaterial);
    case MARKER_CUBE:
      return createCubeMarker(message, colorMaterial);
    case MARKER_SPHERE:
      return createSphereMarker(message, colorMaterial);
    case MARKER_CYLINDER:
      return createCylinderMarker(message, colorMaterial);
    case MARKER_LINE_STRIP:
      return createLineMarker(message, colorMaterial, true);
    case MARKER_LINE_LIST:
      return createLineMarker(message, colorMaterial, false);
    case MARKER_CUBE_LIST:
      return createInstancedMeshMarker(
        message,
        colorMaterial,
        () => new THREE.BoxGeometry(1, 1, 1)
      );
    case MARKER_SPHERE_LIST:
      return createInstancedMeshMarker(
        message,
        colorMaterial,
        () => new THREE.SphereGeometry(0.5, 8, 8)
      );
    case MARKER_POINTS:
      return createPointsMarker(message, colorMaterial);
    case MARKER_TRIANGLE_LIST:
      const tri = new TriangleList({
        material: colorMaterial,
        vertices: message.points,
        colors: message.colors,
      });
      tri.scale.set(message.scale.x, message.scale.y, message.scale.z);
      return tri;
    case MARKER_MESH_RESOURCE:
      const meshColorMaterial =
        message.color.r !== 0 ||
        message.color.g !== 0 ||
        message.color.b !== 0 ||
        message.color.a !== 0
          ? colorMaterial
          : null;
      if (!message.mesh_resource) {
        console.warn("MARKER_MESH_RESOURCE 类型的标记缺少 mesh_resource 属性");
        return new THREE.Object3D(); // 返回空对象而不是 undefined
      }
      const resourceUrl = message.mesh_resource.startsWith("package://")
        ? message.mesh_resource.substring(10)
        : message.mesh_resource;
      const meshResource = new MeshResource({
        path: path,
        resource: resourceUrl,
        material: meshColorMaterial,
      });
      return meshResource;
    case MARKER_TEXT_VIEW_FACING:
      // 文本标记的实现保持原样
      if (message.text && message.text.length > 0) {
        const textColor = {
          r: message.color.r,
          g: message.color.g,
          b: message.color.b,
          a: message.color.a,
        };
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        const textHeight = 100;
        const fontString = "normal " + textHeight + "px sans-serif";
        context.font = fontString;
        const metrics = context.measureText(message.text);
        const textWidth = metrics.width;

        canvas.width = textWidth;
        canvas.height = 1.5 * textHeight;

        context.font = fontString;
        context.fillStyle =
          "rgba(" +
          Math.round(255 * textColor.r) +
          ", " +
          Math.round(255 * textColor.g) +
          ", " +
          Math.round(255 * textColor.b) +
          ", " +
          textColor.a +
          ")";
        context.textAlign = "left";
        context.textBaseline = "middle";
        context.fillText(message.text, 0, canvas.height / 2);

        const texture = new THREE.Texture(canvas);
        texture.needsUpdate = true;

        const spriteMaterial = new THREE.SpriteMaterial({
          map: texture,
        });
        const sprite = new THREE.Sprite(spriteMaterial);
        const textSize = message.scale.x;
        sprite.scale.set((textWidth / canvas.height) * textSize, textSize, 1);

        return sprite;
      }
      return new THREE.Object3D(); // 空对象
    default:
      console.error("Currently unsupported marker type: " + message.type);
      return new THREE.Object3D(); // 空对象
  }
};
