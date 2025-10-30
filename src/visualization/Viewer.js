/**
 * @fileOverview ROS3D 查看器 - 用于将交互式 3D 场景渲染到 HTML5 画布的组件
 * @author David Gossow - dgossow@willowgarage.com
 * @author Russell Toris - rctoris@wpi.edu
 * @author Jihoon Lee - jihoonlee.in@gmail.com
 */

import * as THREE from 'three';
import { OrbitControls } from '../interaction/OrbitControls';
import { MouseHandler } from '../interaction/MouseHandler';
import { Highlighter } from '../interaction/Highlighter';

/**
 * 查看器可用于将交互式 3D 场景渲染到 HTML5 画布。
 */
export class Viewer {
  /**
   * @param {Object} options - 对象，包含以下键:
   *   - divID: 放置查看器的 div 的 ID
   *   - elem: 放置查看器的元素（如果提供则覆盖 divID）
   *   - width: 画布的初始宽度（以像素为单位）
   *   - height: 画布的初始高度（以像素为单位）
   *   - background (可选): 渲染背景的颜色，如 '#efefef'
   *   - alpha (可选): 背景的透明度
   *   - antialias (可选): 是否使用抗锯齿
   *   - intensity (可选): 使用的光照强度设置
   *   - cameraPosition (可选): 相机的起始位置
   *   - displayPanAndZoomFrame (可选): 是否显示平移/缩放帧。默认为 true
   *   - lineTypePanAndZoomFrame: 平移/缩放时显示的帧的线型。仅在 displayPanAndZoomFrame 设置为 true 时有效
   */
  constructor(options = {}) {
    const {
      divID,
      elem,
      width,
      height,
      background = '#ffffff',
      antialias,
      intensity = 2.5,
      near = 0.01,
      far = 1000,
      alpha = 1.0,
      cameraPose: cameraPosition = { x: 3, y: 3, z: 7 },
      cameraZoomSpeed = 0.5,
      displayPanAndZoomFrame = true,
      lineTypePanAndZoomFrame = 'full'
    } = options;

    // 创建用于渲染的画布
    this.renderer = new THREE.WebGLRenderer({
      antialias,
      alpha: true
    });
    this.renderer.setClearColor(parseInt(background.replace('#', '0x'), 16), alpha);
    this.renderer.setSize(width, height);
    this.renderer.shadowMap.enabled = true;
    this.renderer.autoClear = false;

    // 创建全局场景
    this.scene = new THREE.Scene();

    // 创建全局相机
    this.camera = new THREE.PerspectiveCamera(40, width / height, near, far);
    this.camera.position.x = cameraPosition.x;
    this.camera.position.y = cameraPosition.y;
    this.camera.position.z = cameraPosition.z;
    
    // 为相机添加控制
    this.cameraControls = new OrbitControls({
      scene: this.scene,
      camera: this.camera,
      displayPanAndZoomFrame,
      lineTypePanAndZoomFrame
    });
    this.cameraControls.userZoomSpeed = cameraZoomSpeed;

    // 光源
    this.directionalLight = new THREE.DirectionalLight(0xffffff, intensity);
    this.scene.add(this.directionalLight);

    // 将鼠标事件传播到 three.js 对象
    this.selectableObjects = new THREE.Group();
    this.scene.add(this.selectableObjects);
    const mouseHandler = new MouseHandler({
      renderer: this.renderer,
      camera: this.camera,
      rootObject: this.selectableObjects,
      fallbackTarget: this.cameraControls
    });

    // 高亮鼠标事件的接收者
    this.highlighter = new Highlighter({
      mouseHandler
    });

    this.stopped = true;
    this.animationRequestId = undefined;

    // 将渲染器添加到页面
    const node = elem || document.getElementById(divID);
    if (node) {
      node.appendChild(this.renderer.domElement);
    }

    // 开始渲染循环
    this.start();
  }

  /**
   * 开始渲染循环
   */
  start() {
    this.stopped = false;
    this.draw();
  }

  /**
   * 将关联场景渲染到查看器
   */
  draw() {
    if (this.stopped) {
      // 如果停止则不执行任何操作
      return;
    }

    // 更新控制
    this.cameraControls.update();

    // 更新方向光源位置以跟随相机
    this.directionalLight.position.copy(this.camera.position);
    this.directionalLight.position.add(new THREE.Vector3(0, 1, 1)); // 调整此向量以设置光源偏移

    // 设置方向光以投射阴影
    this.directionalLight.castShadow = true;
    this.directionalLight.shadow.mapSize.width = 2024;
    this.directionalLight.shadow.mapSize.height = 1024;
    this.directionalLight.shadow.bias = -0.005; // 防止阴影粉刺（阴影伪影）
    this.directionalLight.shadow.radius = 5; // 更大的半径创建更柔和的阴影

    // 清除场景并渲染
    this.renderer.clear(true, true, true);
    this.renderer.render(this.scene, this.camera);
    this.highlighter.renderHighlights(this.scene, this.renderer, this.camera);

    // 绘制帧
    this.animationRequestId = requestAnimationFrame(this.draw.bind(this));
  }

  /**
   * 停止渲染循环
   */
  stop() {
    if (!this.stopped) {
      // 停止动画渲染循环
      cancelAnimationFrame(this.animationRequestId);
    }
    this.stopped = true;
  }

  /**
   * 将给定的 THREE Object3D 添加到查看器中的全局场景。
   * @param {THREE.Object3D} object - 要添加的 THREE Object3D
   * @param {boolean} [selectable] - 对象是否应添加到可选择列表中
   */
  addObject(object, selectable) {
    if (selectable) {
      this.selectableObjects.add(object);
    } else {
      this.scene.add(object);
    }
  }

  /**
   * 调整 3D 查看器大小
   * @param {number} width - 新的宽度值
   * @param {number} height - 新的高度值
   */
  resize(width, height) {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }
}