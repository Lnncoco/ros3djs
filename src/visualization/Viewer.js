/**
 * @fileOverview ROS3D 查看器 - 用于将交互式 3D 场景渲染到 HTML5 画布的组件
 */

import * as THREE from "three";
import * as ROSLIB from "roslib";
import { OrbitControls } from "../interaction/OrbitControls";
import { MouseHandler } from "../interaction/MouseHandler";
import { Highlighter } from "../interaction/Highlighter";
import { getLogger } from "../utils/Logger.js";

const logger = getLogger("Viewer");

/**
 * 查看器可用于将交互式 3D 场景渲染到 HTML5 画布。
 */
export class Viewer {
  /**
   * @param {Object} options - 包含配置选项的对象
   * @param {ROSLIB.Ros} options.ros - ROSLIB.Ros 的连接句柄。
   * @param {string} [options.fixedFrame='map'] - 视图的固定坐标系。
   */
  constructor(options = {}) {
    logger.info("初始化Viewer组件...");
    logger.debug("Viewer配置选项:", options);

    // 仅当用户提供了ros句柄时才设置TF客户端
    if (options.ros) {
      this.#setupTFClient(options);
    } else {
      this.tfClient = null;
      logger.warn(
        "未提供ROS实例，TFClient将不会被创建。请手动为需要TF的组件提供客户端。"
      );
    }

    this.#setupRenderer(options);
    this.#setupSceneAndLights(options);
    this.#setupCameraAndControls(options);
    this.#setupInteractions(options);
    this.#attachToDOM(options);

    this.stopped = true;
    this.animationRequestId = undefined;

    this.start();
    logger.info("Viewer初始化完成");
  }

  #setupTFClient({ ros, fixedFrame = "map", tf_rate = 10 }) {
    this.tfClient = new ROSLIB.TFClient({
      ros,
      fixedFrame,
      angularThres: 0.01,
      transThres: 0.01,
      rate: tf_rate,
    });
    logger.info(`TFClient 已创建，Fixed Frame: ${fixedFrame}`);
  }

  #setupRenderer({
    antialias,
    background = "#ffffff",
    alpha = 1.0,
    width,
    height,
  }) {
    this.renderer = new THREE.WebGLRenderer({ antialias, alpha: true });
    this.renderer.setClearColor(
      parseInt(background.replace("#", "0x"), 16),
      alpha
    );
    this.renderer.setSize(width, height);
    this.renderer.shadowMap.enabled = true;
    this.renderer.autoClear = false;
    logger.debug("渲染器初始化完成");
  }

  #setupSceneAndLights({ intensity = 2.5 }) {
    this.scene = new THREE.Scene();
    this.directionalLight = new THREE.DirectionalLight(0xffffff, intensity);
    this.scene.add(this.directionalLight);
    logger.debug("场景和光源初始化完成");
  }

  #setupCameraAndControls({
    width,
    height,
    near = 0.01,
    far = 1000,
    cameraPose = { x: 3, y: 3, z: 7 },
    cameraZoomSpeed = 0.5,
    displayPanAndZoomFrame = true,
    lineTypePanAndZoomFrame = "full",
  }) {
    this.camera = new THREE.PerspectiveCamera(40, width / height, near, far);
    this.camera.position.set(cameraPose.x, cameraPose.y, cameraPose.z);
    this.camera.up.set(0, 0, 1); // 确保相机的上方向为Z轴正方向

    this.cameraControls = new OrbitControls({
      scene: this.scene,
      camera: this.camera,
      displayPanAndZoomFrame,
      lineTypePanAndZoomFrame,
    });
    this.cameraControls.userZoomSpeed = cameraZoomSpeed;
    logger.debug("相机和控制器初始化完成");
  }

  #setupInteractions() {
    this.selectableObjects = new THREE.Group();
    this.scene.add(this.selectableObjects);

    this.mouseHandler = new MouseHandler({
      renderer: this.renderer,
      camera: this.camera,
      rootObject: this.selectableObjects,
      fallbackTarget: this.cameraControls,
    });

    this.highlighter = new Highlighter({ mouseHandler: this.mouseHandler });
    logger.debug("鼠标交互和高亮处理器初始化完成");
  }

  #attachToDOM({ elem, divID }) {
    const node = elem || document.getElementById(divID);
    if (node) {
      node.appendChild(this.renderer.domElement);
      logger.info("渲染器已添加到DOM元素");
    } else {
      logger.warn("未找到指定的DOM元素，无法添加渲染器");
    }
  }

  /**
   * 开始渲染循环
   */
  start() {
    logger.debug("开始渲染循环");
    this.stopped = false;
    this.draw();
  }

  /**
   * 将关联场景渲染到查看器
   */
  draw() {
    if (this.stopped) {
      logger.debug("渲染循环已停止");
      return;
    }

    this.animationRequestId = requestAnimationFrame(this.draw.bind(this));

    this.cameraControls.update();

    this.directionalLight.position
      .copy(this.camera.position)
      .add(new THREE.Vector3(0, 1, 1));
    this.directionalLight.castShadow = true;
    this.directionalLight.shadow.mapSize.width = 2024;
    this.directionalLight.shadow.mapSize.height = 1024;
    this.directionalLight.shadow.bias = -0.005;
    this.directionalLight.shadow.radius = 5;

    this.renderer.clear(true, true, true);
    this.renderer.render(this.scene, this.camera);
    this.highlighter.renderHighlights(this.scene, this.renderer, this.camera);
  }

  /**
   * 停止渲染循环
   */
  stop() {
    logger.debug("停止渲染循环");
    if (!this.stopped) {
      cancelAnimationFrame(this.animationRequestId);
      logger.debug("已取消动画帧请求");
    }
    this.stopped = true;
  }

  /**
   * 销毁查看器并释放所有相关资源。
   */
  dispose() {
    logger.info("销毁Viewer实例...");
    this.stop();

    if (this.tfClient) {
      this.tfClient.dispose();
    }

    // 销毁交互处理器和控制器，它们会移除自己的DOM事件监听器
    this.highlighter.dispose();
    this.cameraControls.dispose();
    this.mouseHandler.dispose();

    // 销毁渲染器，释放WebGL上下文
    if (this.renderer) {
      this.renderer.dispose();
      if (this.renderer.domElement.parentElement) {
        this.renderer.domElement.parentElement.removeChild(
          this.renderer.domElement
        );
      }
    }

    // 清理场景中的灯光等直属对象
    if (this.directionalLight) {
      this.scene.remove(this.directionalLight);
    }

    logger.info("Viewer销毁完成");
  }

  /**
   * 将给定的 THREE Object3D 添加到查看器中的全局场景。
   * @param {THREE.Object3D} object - 要添加的 THREE Object3D
   * @param {boolean} [selectable] - 对象是否应添加到可选择列表中
   */
  addObject(object, selectable) {
    logger.debug("添加对象到场景:", object, "可选择:", selectable);
    const target = selectable ? this.selectableObjects : this.scene;
    target.add(object);
  }

  /**
   * 从查看器中移除给定的 THREE Object3D。
   * @param {THREE.Object3D} object - 要移除的 THREE Object3D
   */
  removeObject(object) {
    logger.debug("从场景中移除对象:", object);
    this.scene.remove(object);
    this.selectableObjects.remove(object);
  }

  /**
   * 调整 3D 查看器大小
   * @param {number} width - 新的宽度值
   * @param {number} height - 新的高度值
   */
  resize(width, height) {
    logger.debug("调整查看器大小，新尺寸:", width, "x", height);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    logger.debug("查看器大小调整完成");
  }
}
