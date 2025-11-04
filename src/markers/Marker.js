import * as THREE from "three";
import { Arrow } from "@models/Arrow";
import { TriangleList } from "@models/TriangleList";
import { MeshResource } from "@models/MeshResource";
import { makeColorMaterial, createMarkerObject } from "./marker.creators";
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
 * Marker 类，可以将 ROS 标记消息转换为 THREE 对象。
 */
export class Marker extends THREE.Object3D {
  /**
   * @param {Object} options - 对象，包含以下键:
   *   * path - 为此标记加载的网格文件的基路径或 URL
   *   * message - 标记消息
   */
  constructor(options = {}) {
    super();

    const path = options.path || "/";
    const message = options.message;

    // 检查路径尾部是否有 '/'
    this.normalizedPath =
      path.substr(path.length - 1) !== "/" ? path + "/" : path;

    if (message.scale) {
      this.msgScale = [message.scale.x, message.scale.y, message.scale.z];
    } else {
      this.msgScale = [1, 1, 1];
    }
    this.msgColor = message.color;
    this.msgMesh = undefined; // 重置 msgMesh

    // 调用 init 方法设置标记
    this.init(options);
  }

  /**
   * 使用新选项初始化或重新初始化标记
   */
  init(options = {}) {
    const path = options.path || this.normalizedPath;
    const message = options.message;

    // 如果重新初始化，清除现有子项
    this.children.forEach((child) => {
      // 如果子项有 dispose 方法，释放资源
      if (child.dispose && typeof child.dispose === "function") {
        child.dispose();
      }
      this.remove(child);
    });

    if (message.scale) {
      this.msgScale = [message.scale.x, message.scale.y, message.scale.z];
    } else {
      this.msgScale = [1, 1, 1];
    }
    this.msgColor = message.color;
    if (message.type === MARKER_MESH_RESOURCE && message.mesh_resource) {
      this.msgMesh = message.mesh_resource.startsWith("package://")
        ? message.mesh_resource.substring(10)
        : message.mesh_resource;
    } else {
      this.msgMesh = undefined;
    }

    // 设置位姿并获取颜色
    this.setPose(message.pose);
    const colorMaterial = makeColorMaterial(
      this.msgColor.r,
      this.msgColor.g,
      this.msgColor.b,
      this.msgColor.a
    );

    // 基于类型创建对象
    const markerObject = createMarkerObject(message, path, colorMaterial);
    this.add(markerObject);
  }

  /**
   * 设置此标记的位姿为给定值
   * @param {Object} pose - 要设置的位姿
   */
  setPose(pose) {
    this.position.set(pose.position.x, pose.position.y, pose.position.z);
    this.quaternion.set(
      pose.orientation.x,
      pose.orientation.y,
      pose.orientation.z,
      pose.orientation.w
    );
    this.quaternion.normalize();
    this.updateMatrixWorld();
  }

  /**
   * 更新此标记
   * @param {Object} message - 标记消息
   * @return {boolean} 成功时返回 true，否则返回 false
   */
  update(message) {
    // 设置位姿并获取颜色
    this.setPose(message.pose);

    // 更新颜色
    if (
      message.color.r !== this.msgColor.r ||
      message.color.g !== this.msgColor.g ||
      message.color.b !== this.msgColor.b ||
      message.color.a !== this.msgColor.a
    ) {
      const colorMaterial = makeColorMaterial(
        message.color.r,
        message.color.g,
        message.color.b,
        message.color.a
      );

      switch (message.type) {
        case MARKER_LINE_STRIP:
        case MARKER_LINE_LIST:
        case MARKER_POINTS:
          break;
        case MARKER_ARROW:
        case MARKER_CUBE:
        case MARKER_SPHERE:
        case MARKER_CYLINDER:
        case MARKER_TRIANGLE_LIST:
        case MARKER_TEXT_VIEW_FACING:
          this.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              child.material = colorMaterial;
            }
          });
          break;
        case MARKER_MESH_RESOURCE:
          // 处理网格资源的材质更新
          let meshColorMaterial = null;
          if (
            message.color.r !== 0 ||
            message.color.g !== 0 ||
            message.color.b !== 0 ||
            message.color.a !== 0
          ) {
            meshColorMaterial = colorMaterial;
          }
          this.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              child.material = meshColorMaterial;
            }
          });
          break;
        case MARKER_CUBE_LIST:
        case MARKER_SPHERE_LIST:
          const instancedMesh = this.children[0];
          // 如果点数发生变化，无法就地更新，因此强制重新创建
          if (
            !instancedMesh ||
            (message.points && message.points.length !== instancedMesh.count)
          ) {
            return false;
          }

          const matrix = new THREE.Matrix4();
          const position = new THREE.Vector3();
          const scale = new THREE.Vector3(1, 1, 1); // 尺寸由几何体处理
          const quaternion = new THREE.Quaternion();

          // 为每个实例更新位置
          for (let i = 0; i < message.points.length; i++) {
            position.set(
              message.points[i].x,
              message.points[i].y,
              message.points[i].z
            );
            matrix.compose(position, quaternion, scale);
            instancedMesh.setMatrixAt(i, matrix);
          }
          instancedMesh.instanceMatrix.needsUpdate = true;
          return true;
        default:
          return false;
      }

      this.msgColor = message.color;
    }

    // 更新几何体
    const scaleChanged =
      Math.abs(this.msgScale[0] - message.scale.x) > 1.0e-6 ||
      Math.abs(this.msgScale[1] - message.scale.y) > 1.0e-6 ||
      Math.abs(this.msgScale[2] - message.scale.z) > 1.0e-6;
    this.msgScale = [message.scale.x, message.scale.y, message.scale.z];

    switch (message.type) {
      case MARKER_CUBE:
      case MARKER_SPHERE:
      case MARKER_CYLINDER:
        if (scaleChanged) {
          return false;
        }
        break;
      case MARKER_TEXT_VIEW_FACING:
        if (scaleChanged || this.text !== message.text) {
          return false;
        }
        break;
      case MARKER_MESH_RESOURCE:
        const newMesh = message.mesh_resource
          ? message.mesh_resource.startsWith("package://")
            ? message.mesh_resource.substring(10)
            : message.mesh_resource
          : "";
        if (newMesh !== this.msgMesh) {
          return false;
        }
        if (scaleChanged) {
          return false;
        }
        break;
      case MARKER_ARROW:
      case MARKER_LINE_STRIP:
      case MARKER_LINE_LIST:
      case MARKER_CUBE_LIST:
      case MARKER_SPHERE_LIST:
      case MARKER_POINTS:
      case MARKER_TRIANGLE_LIST:
        // TODO: 检查几何体是否已更改
        return false;
      default:
        break;
    }

    return true;
  }

  /**
   * 释放此标记中的元素内存
   */
  dispose() {
    this.children.forEach((child) => {
      // 遵循“谁创建，谁负责”的原则，将清理责任委托给子对象自己。
      // 假设所有子对象（如Arrow, MeshResource, 或普通的THREE.Mesh）都有自己的dispose方法。
      if (typeof child.dispose === "function") {
        child.dispose();
      }
    });
    this.children = []; // 清空子对象数组
  }
}
