/**
 * @fileOverview 行为类似于 THREE.OrbitControls，但使用右手坐标系和 z 作为上向量。
 *
 * 注意：鼠标交互行为经过核对调整，请勿随意修改：
 * - 左键：旋转
 * - 中键：缩放
 * - 右键：平移
 * - 滚轮：向上缩小/向下放大（原先是相反的）
 */

import * as THREE from "three";
import { Axes } from "@models/Axes";
import { intersectViewPlane } from "./interaction.utils";
import {
  handleRotateMove,
  handleZoomMove,
  handlePanMove,
  handleTouchMoveLogic,
} from "./orbit.handlers";

/**
 * 行为类似于 THREE.OrbitControls，但使用右手坐标系和 z 作为上向量。
 */
export class OrbitControls extends THREE.EventDispatcher {
  /**
   * @param {Object} options - 配置选项。
   * @param {THREE.Scene} options.scene - 要使用的全局场景。
   * @param {THREE.Camera} options.camera - 要使用的相机。
   * @param {number} [options.userZoomSpeed=1.0] - 缩放速度。
   * @param {number} [options.userRotateSpeed=1.0] - 旋转速度。
   * @param {boolean} [options.autoRotate=false] - 是否自动旋转。
   * @param {number} [options.autoRotateSpeed=2.0] - 自动旋转速度。
   * @param {boolean} [options.displayPanAndZoomFrame=true] - 是否显示平移/缩放帧。
   * @param {string} [options.lineTypePanAndZoomFrame='full'] - 平移/缩放时显示帧的线型。
   */
  constructor(options = {}) {
    super();

    const {
      scene,
      camera,
      userZoomSpeed = 1.0,
      userRotateSpeed = 1.0,
      autoRotate = false,
      autoRotateSpeed = 2.0,
      displayPanAndZoomFrame = true,
      lineTypePanAndZoomFrame = "full",
    } = options;

    this.camera = camera;
    this.scene = scene; // 保存场景引用，用于添加/移除辅助轴

    this.userZoomSpeed = userZoomSpeed;
    this.userRotateSpeed = userRotateSpeed;
    this.autoRotate = autoRotate;
    this.autoRotateSpeed = autoRotateSpeed;
    this.displayPanAndZoomFrame = displayPanAndZoomFrame;
    this.lineTypePanAndZoomFrame = lineTypePanAndZoomFrame;

    this.#initializeState();
    this.#setupAxesDisplay();
    this.#attachEventListeners();

    // 在 ROS 中，z 指向上方
    this.camera.up = new THREE.Vector3(0, 0, 1);
  }

  #initializeState() {
    this.center = new THREE.Vector3();
    this.userZoom = true;
    this.userRotate = true;

    this.rotateStart = new THREE.Vector2();
    this.rotateEnd = new THREE.Vector2();
    this.rotateDelta = new THREE.Vector2();

    this.zoomStart = new THREE.Vector2();
    this.zoomEnd = new THREE.Vector2();
    this.zoomDelta = new THREE.Vector2();

    this.moveStartCenter = new THREE.Vector3();
    this.moveStartNormal = new THREE.Vector3();
    this.moveStartPosition = new THREE.Vector3();
    this.moveStartIntersection = new THREE.Vector3();

    this.touchStartPosition = new Array(2);
    this.touchMoveVector = new Array(2);

    this.phiDelta = 0;
    this.thetaDelta = 0;
    this.scale = 1;
    this.lastPosition = new THREE.Vector3();

    this.STATE = {
      NONE: -1,
      ROTATE: 0,
      ZOOM: 1,
      MOVE: 2,
    };
    this.state = this.STATE.NONE;
  }

  #setupAxesDisplay() {
    this.axes = new Axes({
      shaftRadius: 0.025,
      headRadius: 0.07,
      headLength: 0.2,
      lineType: this.lineTypePanAndZoomFrame,
    });
    if (this.displayPanAndZoomFrame) {
      this.scene.add(this.axes);
      this.axes.traverse((obj) => {
        obj.visible = false;
      });
    }
  }

  #attachEventListeners() {
    this.addEventListener("mousedown", this.#onMouseDown.bind(this));
    this.addEventListener("mouseup", this.#onMouseUp.bind(this));
    this.addEventListener("mousemove", this.#onMouseMove.bind(this));
    this.addEventListener("touchstart", this.#onTouchDown.bind(this));
    this.addEventListener("touchmove", this.#onTouchMove.bind(this));
    this.addEventListener("touchend", this.#onTouchEnd.bind(this));
    this.addEventListener("mousewheel", this.#onMouseWheel.bind(this));
    this.addEventListener("DOMMouseScroll", this.#onMouseWheel.bind(this));
    this.addEventListener("wheel", this.#onWheel.bind(this));
    this.addEventListener("contextmenu", this.#onContextMenu.bind(this));
  }

  /**
   * 处理 mousedown 3D 事件。
   * @param {Object} event3D - 要处理的 3D 事件
   */
  #onMouseDown(event3D) {
    const event = event3D.domEvent;
    event.preventDefault();

    switch (event.button) {
      case 0:
        this.state = this.STATE.ROTATE;
        this.rotateStart.set(event.clientX, event.clientY);
        break;
      case 1:
        this.state = this.STATE.ZOOM;
        this.zoomStart.set(event.clientX, event.clientY);
        break;
      case 2:
        this.state = this.STATE.MOVE;
        this.moveStartNormal.copy(new THREE.Vector3(0, 0, 1));
        const rMat = new THREE.Matrix4().extractRotation(this.camera.matrix);
        this.moveStartNormal.applyMatrix4(rMat);

        this.moveStartCenter.copy(this.center);
        this.moveStartPosition.copy(this.camera.position);
        this.moveStartIntersection.copy(
          intersectViewPlane(
            event3D.mouseRay,
            this.moveStartCenter,
            this.moveStartNormal
          )
        );
        break;
    }

    this.showAxes();
  }

  /**
   * 处理 mousemove 3D 事件。
   * @param {Object} event3D - 要处理的 3D 事件
   */
  #onMouseMove(event3D) {
    const event = event3D.domEvent;
    if (this.state === this.STATE.ROTATE) {
      this.rotateEnd.set(event.clientX, event.clientY);
      this.rotateDelta.subVectors(this.rotateEnd, this.rotateStart);
      handleRotateMove(this, this.rotateDelta); // 调用处理函数
      this.rotateStart.copy(this.rotateEnd);
      this.showAxes();
    } else if (this.state === this.STATE.ZOOM) {
      this.zoomEnd.set(event.clientX, event.clientY);
      this.zoomDelta.subVectors(this.zoomEnd, this.zoomStart);
      handleZoomMove(this, this.zoomDelta); // 调用处理函数
      this.zoomStart.copy(this.zoomEnd);
      this.showAxes();
    } else if (this.state === this.STATE.MOVE) {
      handlePanMove(
        this,
        event3D,
        this.moveStartCenter,
        this.moveStartPosition,
        this.moveStartIntersection,
        this.moveStartNormal
      ); // 调用处理函数
      this.showAxes();
    }
  }

  /**
   * 处理 mouseup 3D 事件。
   * @param {Object} event3D - 要处理的 3D 事件
   */
  #onMouseUp(event3D) {
    if (!this.userRotate) {
      return;
    }
    this.state = this.STATE.NONE;
  }

  /**
   * 处理 wheel 3D 事件 (现代浏览器)。
   * @param {Object} event3D - 要处理的 3D 事件
   */
  #onWheel(event3D) {
    if (!this.userZoom) {
      return;
    }

    const event = event3D.domEvent;
    event.preventDefault(); // 阻止页面滚动

    // 根据用户反馈，调整滚轮方向以符合Windows标准
    if (event.deltaY < 0) {
      this.zoomOut(); // 向上滚动缩小
    } else {
      this.zoomIn(); // 向下滚动放大
    }

    this.showAxes();
  }

  /**
   * 处理 mousewheel 3D 事件 (旧版浏览器)。
   * @param {Object} event3D - 要处理的 3D 事件
   */
  #onMouseWheel(event3D) {
    if (!this.userZoom) {
      return;
    }

    const event = event3D.domEvent;
    event.preventDefault(); // 阻止页面滚动

    let delta;
    if (typeof event.wheelDelta !== "undefined") {
      delta = event.wheelDelta;
    } else {
      delta = -event.detail;
    }
    if (delta > 0) {
      this.zoomOut(); // 正向滚动缩小
    } else {
      this.zoomIn(); // 负向滚动放大
    }

    this.showAxes();
  }

  /**
   * 处理 contextmenu 事件，阻止默认行为。
   * @param {Object} event3D - 要处理的 3D 事件
   */
  #onContextMenu(event3D) {
    event3D.domEvent.preventDefault();
  }

  /**
   * 处理 touchdown 3D 事件。
   * @param {Object} event3D - 要处理的 3D 事件
   */
  #onTouchDown(event3D) {
    const event = event3D.domEvent;
    switch (event.touches.length) {
      case 1:
        this.state = this.STATE.ROTATE;
        this.rotateStart.set(
          event.touches[0].pageX - window.scrollX,
          event.touches[0].pageY - window.scrollY
        );
        break;
      case 2:
        this.state = this.STATE.NONE;
        this.moveStartNormal.copy(new THREE.Vector3(0, 0, 1));
        const rMat = new THREE.Matrix4().extractRotation(this.camera.matrix);
        this.moveStartNormal.applyMatrix4(rMat);
        this.moveStartCenter.copy(this.center);
        this.moveStartPosition.copy(this.camera.position);
        this.moveStartIntersection.copy(
          intersectViewPlane(
            event3D.mouseRay,
            this.moveStartCenter,
            this.moveStartNormal
          )
        );
        this.touchStartPosition[0] = new THREE.Vector2(
          event.touches[0].pageX,
          event.touches[0].pageY
        );
        this.touchStartPosition[1] = new THREE.Vector2(
          event.touches[1].pageX,
          event.touches[1].pageY
        );
        this.touchMoveVector[0] = new THREE.Vector2(0, 0);
        this.touchMoveVector[1] = new THREE.Vector2(0, 0);
        break;
    }

    this.showAxes();

    event.preventDefault();
  }

  /**
   * 处理 touchmove 3D 事件。
   * @param {Object} event3D - 要处理的 3D 事件
   */
  #onTouchMove(event3D) {
    const event = event3D.domEvent;
    // 触摸旋转逻辑与鼠标旋转逻辑分离
    if (this.state === this.STATE.ROTATE) {
      this.rotateEnd.set(
        event.touches[0].pageX - window.scrollX,
        event.touches[0].pageY - window.scrollY
      );
      this.rotateDelta.subVectors(this.rotateEnd, this.rotateStart);

      handleRotateMove(this, this.rotateDelta); // 调用处理函数

      this.rotateStart.copy(this.rotateEnd);
      this.showAxes();
    } else {
      handleTouchMoveLogic(
        this,
        event3D,
        this.touchMoveVector,
        this.touchStartPosition,
        this.moveStartCenter,
        this.moveStartPosition,
        this.moveStartIntersection,
        this.moveStartNormal
      ); // 调用处理函数
      this.showAxes();
      event.preventDefault();
    }
  }

  #onTouchEnd(event3D) {
    const event = event3D.domEvent;
    if (event.touches.length === 1 && this.state !== this.STATE.ROTATE) {
      this.state = this.STATE.ROTATE;
      this.rotateStart.set(
        event.touches[0].pageX - window.scrollX,
        event.touches[0].pageY - window.scrollY
      );
    } else {
      this.state = this.STATE.NONE;
    }
  }

  /**
   * 显示主轴1秒。
   */
  showAxes() {
    this.axes.traverse((obj) => {
      obj.visible = true;
    });
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
    }
    this.hideTimeout = setTimeout(() => {
      this.axes.traverse((obj) => {
        obj.visible = false;
      });
      this.hideTimeout = false;
    }, 1000);
  }

  /**
   * 按给定角度向左旋转相机。
   *
   * @param {number} [angle] - 要旋转的角度
   */
  rotateLeft(angle) {
    if (angle === undefined) {
      angle = ((2 * Math.PI) / 60 / 60) * this.autoRotateSpeed;
    }
    this.thetaDelta -= angle;
  }

  /**
   * 按给定角度向右旋转相机。
   *
   * @param {number} [angle] - 要旋转的角度
   */
  rotateRight(angle) {
    if (angle === undefined) {
      angle = ((2 * Math.PI) / 60 / 60) * this.autoRotateSpeed;
    }
    this.thetaDelta += angle;
  }

  /**
   * 按给定角度向上旋转相机。
   *
   * @param {number} [angle] - 要旋转的角度
   */
  rotateUp(angle) {
    if (angle === undefined) {
      angle = ((2 * Math.PI) / 60 / 60) * this.autoRotateSpeed;
    }
    this.phiDelta -= angle;
  }

  /**
   * 按给定角度向下旋转相机。
   *
   * @param {number} [angle] - 要旋转的角度
   */
  rotateDown(angle) {
    if (angle === undefined) {
      angle = ((2 * Math.PI) / 60 / 60) * this.autoRotateSpeed;
    }
    this.phiDelta += angle;
  }

  /**
   * 按给定比例放大。
   *
   * @param {number} [zoomScale] - 要放大的比例
   */
  zoomIn(zoomScale) {
    if (zoomScale === undefined) {
      zoomScale = Math.pow(0.95, this.userZoomSpeed);
    }
    this.scale /= zoomScale;
  }

  /**
   * 按给定比例缩小。
   *
   * @param {number} [zoomScale] - 要缩小的比例
   */
  zoomOut(zoomScale) {
    if (zoomScale === undefined) {
      zoomScale = Math.pow(0.95, this.userZoomSpeed);
    }
    this.scale *= zoomScale;
  }

  /**
   * 将相机更新到当前设置。
   */
  update() {
    const position = this.camera.position;
    const offset = position.clone().sub(this.center);

    // 计算球坐标 - 在ROS坐标系中，Z轴向上
    // theta: 绕Z轴的方位角 (在XY平面上的角度)
    // phi: 从Z轴正方向测量的极角 (与Z轴的夹角)
    let theta = Math.atan2(offset.y, offset.x);
    let phi = Math.atan2(
      Math.sqrt(offset.x * offset.x + offset.y * offset.y),
      offset.z
    );

    if (this.autoRotate) {
      this.rotateLeft(((2 * Math.PI) / 60 / 60) * this.autoRotateSpeed);
    }

    theta += this.thetaDelta;
    phi += this.phiDelta;

    // 限制 phi 在 EPS 和 PI-EPS 之间，确保不会翻转到下方
    const eps = 0.000001;
    const clampedPhi = Math.max(eps, Math.min(Math.PI - eps, phi));

    let radius = offset.length();
    // 使用球坐标转换公式计算新位置
    // x = r * sin(phi) * cos(theta)
    // y = r * sin(phi) * sin(theta)
    // z = r * cos(phi)
    offset.set(
      radius * Math.sin(clampedPhi) * Math.cos(theta),
      radius * Math.sin(clampedPhi) * Math.sin(theta),
      radius * Math.cos(clampedPhi)
    );
    offset.multiplyScalar(this.scale);

    position.copy(this.center).add(offset);

    this.camera.lookAt(this.center);

    radius = offset.length();
    this.axes.position.copy(this.center);
    this.axes.scale.set(radius * 0.05, radius * 0.05, radius * 0.05);
    this.axes.updateMatrixWorld(true);

    this.thetaDelta = 0;
    this.phiDelta = 0;
    this.scale = 1;

    if (this.lastPosition.distanceTo(this.camera.position) > 0) {
      this.dispatchEvent({
        type: "change",
      });
      this.lastPosition.copy(this.camera.position);
    }
  }

  /**
   * 销毁并清理所有资源。
   */
  dispose() {
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
    }
    if (this.axes) {
      this.scene.remove(this.axes);
      this.axes.dispose();
    }
    // 注意：此类中的事件监听器是内部的，由MouseHandler分发。
    // 当MouseHandler被正确销毁时，这些监听器将不再被调用。
  }
}
