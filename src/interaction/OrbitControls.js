/**
 * @fileOverview
 * @author David Gossow - dgossow@willowgarage.com
 * @author Xueqiao Xu - xueqiaoxu@gmail.com
 * @author Mr.doob - http://mrdoob.com
 * @author AlteredQualia - http://alteredqualia.com
 */

import * as THREE from 'three';
import { Axes } from '../models/Axes';

/**
 * 行为类似于 THREE.OrbitControls，但使用右手坐标系和 z 作为上向量。
 */
export class OrbitControls extends THREE.EventDispatcher {
  /**
   * @constructor
   * @param options - 包含以下键的对象：
   *   - scene: 要使用的全局场景
   *   - camera: 要使用的相机
   *   - userZoomSpeed (可选): 缩放速度
   *   - userRotateSpeed (可选): 旋转速度
   *   - autoRotate (可选): 是否自动旋转
   *   - autoRotateSpeed (可选): 自动旋转速度
   *   - displayPanAndZoomFrame: 是否显示平移/缩放帧
   *                            (默认为 true)
   *   - lineTypePanAndZoomFrame: 平移/缩放时显示帧的线型。仅当
   *                            displayPanAndZoomFrame 设置为 true 时有效。
   */
  constructor(options = {}) {
    super();
    const that = this;
    options = options || {};
    const scene = options.scene;
    this.camera = options.camera;
    this.center = new THREE.Vector3();
    this.userZoom = true;
    this.userZoomSpeed = options.userZoomSpeed || 1.0;
    this.userRotate = true;
    this.userRotateSpeed = options.userRotateSpeed || 1.0;
    this.autoRotate = options.autoRotate;
    this.autoRotateSpeed = options.autoRotateSpeed || 2.0;
    this.displayPanAndZoomFrame = (options.displayPanAndZoomFrame === undefined) ?
        true :
        !!options.displayPanAndZoomFrame;
    this.lineTypePanAndZoomFrame = options.lineTypePanAndZoomFrame || 'full';
    // 在 ROS 中，z 指向上方
    this.camera.up = new THREE.Vector3(0, 0, 1);

    // 内部参数
    const pixelsPerRound = 1800;
    const touchMoveThreshold = 10;
    const rotateStart = new THREE.Vector2();
    const rotateEnd = new THREE.Vector2();
    const rotateDelta = new THREE.Vector2();
    const zoomStart = new THREE.Vector2();
    const zoomEnd = new THREE.Vector2();
    const zoomDelta = new THREE.Vector2();
    const moveStartCenter = new THREE.Vector3();
    const moveStartNormal = new THREE.Vector3();
    const moveStartPosition = new THREE.Vector3();
    const moveStartIntersection = new THREE.Vector3();
    const touchStartPosition = new Array(2);
    const touchMoveVector = new Array(2);
    this.phiDelta = 0;
    this.thetaDelta = 0;
    this.scale = 1;
    this.lastPosition = new THREE.Vector3();
    // 内部状态
    const STATE = {
      NONE : -1,
      ROTATE : 0,
      ZOOM : 1,
      MOVE : 2
    };
    let state = STATE.NONE;

    this.axes = new Axes({
      shaftRadius : 0.025,
      headRadius : 0.07,
      headLength : 0.2,
      lineType: this.lineTypePanAndZoomFrame
    });
    if (this.displayPanAndZoomFrame) {
      // 初始时不可见
      scene.add(this.axes);
      this.axes.traverse(function(obj) {
        obj.visible = false;
      });
    }

    /**
     * 处理 mousedown 3D 事件。
     *
     * @param event3D - 要处理的 3D 事件
     */
    function onMouseDown(event3D) {
      const event = event3D.domEvent;
      event.preventDefault();

      switch (event.button) {
        case 0:
          state = STATE.ROTATE;
          rotateStart.set(event.clientX, event.clientY);
          break;
        case 1:
          state = STATE.MOVE;

          moveStartNormal.copy(new THREE.Vector3(0, 0, 1));
          const rMat = new THREE.Matrix4().extractRotation(that.camera.matrix);
          moveStartNormal.applyMatrix4(rMat);

          moveStartCenter.copy(that.center);
          moveStartPosition.copy(that.camera.position);
          moveStartIntersection.copy(intersectViewPlane(event3D.mouseRay,
                                                     moveStartCenter,
                                                     moveStartNormal));
          break;
        case 2:
          state = STATE.ZOOM;
          zoomStart.set(event.clientX, event.clientY);
          break;
      }

      that.showAxes();
    }

    /**
     * 处理 mousemove 3D 事件。
     *
     * @param event3D - 要处理的 3D 事件
     */
    function onMouseMove(event3D) {
      const event = event3D.domEvent;
      if (state === STATE.ROTATE) {

        rotateEnd.set(event.clientX, event.clientY);
        rotateDelta.subVectors(rotateEnd, rotateStart);

        that.rotateLeft(2 * Math.PI * rotateDelta.x / pixelsPerRound * that.userRotateSpeed);
        that.rotateUp(2 * Math.PI * rotateDelta.y / pixelsPerRound * that.userRotateSpeed);

        rotateStart.copy(rotateEnd);
        that.showAxes();
      } else if (state === STATE.ZOOM) {
        zoomEnd.set(event.clientX, event.clientY);
        zoomDelta.subVectors(zoomEnd, zoomStart);

        if (zoomDelta.y > 0) {
          that.zoomIn();
        } else {
          that.zoomOut();
        }

        zoomStart.copy(zoomEnd);
        that.showAxes();

      } else if (state === STATE.MOVE) {
        const intersection = intersectViewPlane(event3D.mouseRay, that.center, moveStartNormal);

        if (!intersection) {
          return;
        }

        const delta = new THREE.Vector3().subVectors(moveStartIntersection.clone(), intersection
            .clone());

        that.center.addVectors(moveStartCenter.clone(), delta.clone());
        that.camera.position.addVectors(moveStartPosition.clone(), delta.clone());
        that.update();
        that.camera.updateMatrixWorld();
        that.showAxes();
      }
    }

    /**
     * 用于跟踪相机移动期间的移动。
     *
     * @param mouseRay - 要相交的鼠标射线
     * @param planeOrigin - 平面原点
     * @param planeNormal - 平面法线
     * @returns 相交点
     */
    function intersectViewPlane(mouseRay, planeOrigin, planeNormal) {

      const vector = new THREE.Vector3();
      const intersection = new THREE.Vector3();

      vector.subVectors(planeOrigin, mouseRay.origin);
      const dot = mouseRay.direction.dot(planeNormal);

      // 如果射线和平面平行则退出
      if (Math.abs(dot) < mouseRay.precision) {
        return null;
      }

      // 计算到平面的距离
      const scalar = planeNormal.dot(vector) / dot;

      intersection.copy(mouseRay.direction.clone().multiplyScalar(scalar));
      return intersection;
    }

    /**
     * 处理 mouseup 3D 事件。
     *
     * @param event3D - 要处理的 3D 事件
     */
    function onMouseUp(event3D) {
      if (!that.userRotate) {
        return;
      }

      state = STATE.NONE;
    }

    /**
     * 处理 mousewheel 3D 事件。
     *
     * @param event3D - 要处理的 3D 事件
     */
    function onMouseWheel(event3D) {
      if (!that.userZoom) {
        return;
      }

      const event = event3D.domEvent;
      // wheelDelta --> Chrome, detail --> Firefox
      let delta;
      if (typeof (event.wheelDelta) !== 'undefined') {
        delta = event.wheelDelta;
      } else {
        delta = -event.detail;
      }
      if (delta > 0) {
        that.zoomIn();
      } else {
        that.zoomOut();
      }

      that.showAxes();
    }

    /**
     * 处理 touchdown 3D 事件。
     *
     * @param event3D - 要处理的 3D 事件
     */
    function onTouchDown(event3D) {
      const event = event3D.domEvent;
      switch (event.touches.length) {
        case 1:
          state = STATE.ROTATE;
          rotateStart.set(event.touches[0].pageX - window.scrollX,
                          event.touches[0].pageY - window.scrollY);
          break;
        case 2:
          state = STATE.NONE;
          /* ready for move */
          moveStartNormal.copy(new THREE.Vector3(0, 0, 1));
          const rMat = new THREE.Matrix4().extractRotation(that.camera.matrix);
          moveStartNormal.applyMatrix4(rMat);
          moveStartCenter.copy(that.center);
          moveStartPosition.copy(that.camera.position);
          moveStartIntersection.copy(intersectViewPlane(event3D.mouseRay,
                                                     moveStartCenter,
                                                     moveStartNormal));
          touchStartPosition[0] = new THREE.Vector2(event.touches[0].pageX,
                                                    event.touches[0].pageY);
          touchStartPosition[1] = new THREE.Vector2(event.touches[1].pageX,
                                                    event.touches[1].pageY);
          touchMoveVector[0] = new THREE.Vector2(0, 0);
          touchMoveVector[1] = new THREE.Vector2(0, 0);
          break;
      }

      that.showAxes();

      event.preventDefault();
    }

    /**
     * 处理 touchmove 3D 事件。
     *
     * @param event3D - 要处理的 3D 事件
     */
    function onTouchMove(event3D) {
      const event = event3D.domEvent;
      if (state === STATE.ROTATE) {

        rotateEnd.set(event.touches[0].pageX - window.scrollX, event.touches[0].pageY - window.scrollY);
        rotateDelta.subVectors(rotateEnd, rotateStart);

        that.rotateLeft(2 * Math.PI * rotateDelta.x / pixelsPerRound * that.userRotateSpeed);
        that.rotateUp(2 * Math.PI * rotateDelta.y / pixelsPerRound * that.userRotateSpeed);

        rotateStart.copy(rotateEnd);
        that.showAxes();
      } else {
        touchMoveVector[0].set(touchStartPosition[0].x - event.touches[0].pageX,
                               touchStartPosition[0].y - event.touches[0].pageY);
        touchMoveVector[1].set(touchStartPosition[1].x - event.touches[1].pageX,
                               touchStartPosition[1].y - event.touches[1].pageY);
        if (touchMoveVector[0].lengthSq() > touchMoveThreshold &&
            touchMoveVector[1].lengthSq() > touchMoveThreshold) {
          touchStartPosition[0].set(event.touches[0].pageX,
                                    event.touches[0].pageY);
          touchStartPosition[1].set(event.touches[1].pageX,
                                    event.touches[1].pageY);
          if (touchMoveVector[0].dot(touchMoveVector[1]) > 0 &&
              state !== STATE.ZOOM) {
            state = STATE.MOVE;
          } else if (touchMoveVector[0].dot(touchMoveVector[1]) < 0 &&
                     state !== STATE.MOVE) {
            state = STATE.ZOOM;
          }
          if (state === STATE.ZOOM) {
            const tmpVector = new THREE.Vector2();
            tmpVector.subVectors(touchStartPosition[0],
                                 touchStartPosition[1]);
            if (touchMoveVector[0].dot(tmpVector) < 0 &&
                touchMoveVector[1].dot(tmpVector) > 0) {
              that.zoomOut();
            } else if (touchMoveVector[0].dot(tmpVector) > 0 &&
                       touchMoveVector[1].dot(tmpVector) < 0) {
              that.zoomIn();
            }
          }
        }
        if (state === STATE.MOVE) {
          const intersection = intersectViewPlane(event3D.mouseRay,
                                                that.center,
                                                moveStartNormal);
          if (!intersection) {
            return;
          }
          const delta = new THREE.Vector3().subVectors(moveStartIntersection.clone(),
                                                     intersection.clone());
          that.center.addVectors(moveStartCenter.clone(), delta.clone());
          that.camera.position.addVectors(moveStartPosition.clone(), delta.clone());
          that.update();
          that.camera.updateMatrixWorld();
        }

        that.showAxes();

        event.preventDefault();
      }
    }

    function onTouchEnd(event3D) {
      const event = event3D.domEvent;
      if (event.touches.length === 1 &&
          state !== STATE.ROTATE) {
        state = STATE.ROTATE;
        rotateStart.set(event.touches[0].pageX - window.scrollX,
                        event.touches[0].pageY - window.scrollY);
      }
      else {
          state = STATE.NONE;
      }
    }

    // 添加事件监听器
    this.addEventListener('mousedown', onMouseDown);
    this.addEventListener('mouseup', onMouseUp);
    this.addEventListener('mousemove', onMouseMove);
    this.addEventListener('touchstart', onTouchDown);
    this.addEventListener('touchmove', onTouchMove);
    this.addEventListener('touchend', onTouchEnd);
    // Chrome/Firefox 在这里有不同的事件
    this.addEventListener('mousewheel', onMouseWheel);
    this.addEventListener('DOMMouseScroll', onMouseWheel);
  }

  /**
   * 显示主轴1秒。
   */
  showAxes() {
    const that = this;

    this.axes.traverse(function(obj) {
      obj.visible = true;
    });
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
    }
    this.hideTimeout = setTimeout(function() {
      that.axes.traverse(function(obj) {
        obj.visible = false;
      });
      that.hideTimeout = false;
    }, 1000);
  }

  /**
   * 按给定角度向左旋转相机。
   *
   * @param angle (可选) - 要旋转的角度
   */
  rotateLeft(angle) {
    if (angle === undefined) {
      angle = 2 * Math.PI / 60 / 60 * this.autoRotateSpeed;
    }
    this.thetaDelta -= angle;
  }

  /**
   * 按给定角度向右旋转相机。
   *
   * @param angle (可选) - 要旋转的角度
   */
  rotateRight(angle) {
    if (angle === undefined) {
      angle = 2 * Math.PI / 60 / 60 * this.autoRotateSpeed;
    }
    this.thetaDelta += angle;
  }

  /**
   * 按给定角度向上旋转相机。
   *
   * @param angle (可选) - 要旋转的角度
   */
  rotateUp(angle) {
    if (angle === undefined) {
      angle = 2 * Math.PI / 60 / 60 * this.autoRotateSpeed;
    }
    this.phiDelta -= angle;
  }

  /**
   * 按给定角度向下旋转相机。
   *
   * @param angle (可选) - 要旋转的角度
   */
  rotateDown(angle) {
    if (angle === undefined) {
      angle = 2 * Math.PI / 60 / 60 * this.autoRotateSpeed;
    }
    this.phiDelta += angle;
  }

  /**
   * 按给定比例放大。
   *
   * @param zoomScale (可选) - 要放大的比例
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
   * @param zoomScale (可选) - 要缩小的比例
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
    // x->y, y->z, z->x
    const position = this.camera.position;
    const offset = position.clone().sub(this.center);

    // 绕 y 轴的 z 轴角度
    let theta = Math.atan2(offset.y, offset.x);

    // 从 y 轴的角度
    let phi = Math.atan2(Math.sqrt(offset.y * offset.y + offset.x * offset.x), offset.z);

    if (this.autoRotate) {
      this.rotateLeft(2 * Math.PI / 60 / 60 * this.autoRotateSpeed);
    }

    theta += this.thetaDelta;
    phi += this.phiDelta;

    // 限制 phi 在 EPS 和 PI-EPS 之间
    const eps = 0.000001;
    const clampedPhi = Math.max(eps, Math.min(Math.PI - eps, phi));

    let radius = offset.length();
    offset.set(
      radius * Math.sin(phi) * Math.cos(theta),
      radius * Math.sin(phi) * Math.sin(theta),
      radius * Math.cos(phi)
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
        type : 'change'
      });
      this.lastPosition.copy(this.camera.position);
    }
  }
}