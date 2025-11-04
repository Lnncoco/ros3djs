import * as THREE from "three";
import { InteractiveMarkerControl } from "./InteractiveMarkerControl.js";
import { InteractiveMarkerMenu } from "./InteractiveMarkerMenu.js";
import { closestAxisPoint, intersectPlane } from "../utils/geometry.utils.js";

/**
 * 主交互式标记对象。
 */
export class InteractiveMarker extends THREE.Object3D {
  /**
   * @param {Object} options - 包含以下键的对象:
   *  * handle - 此标记的ROS3D.InteractiveMarkerHandle
   *  * camera - 与此标记关联的查看器的主相机
   *  * path (可选) - 要加载的任何网格的基路径
   *  * loader (可选) - 要使用的Collada加载器（例如，ROS3D.COLLADA_LOADER的实例）
   */
  constructor(options = {}) {
    super();
    options = options || {};
    const handle = options.handle;
    this.name = handle.name;
    const camera = options.camera;
    const path = options.path || "/";
    const loader = options.loader;
    this.dragging = false;

    // 设置初始姿态
    this.onServerSetPose({
      pose: handle.pose,
    });

    // 有关拖动开始位置的信息
    this.dragStart = {
      position: new THREE.Vector3(),
      orientation: new THREE.Quaternion(),
      positionWorld: new THREE.Vector3(),
      orientationWorld: new THREE.Quaternion(),
      event3d: {},
    };

    // 添加每个控制消息
    handle.controls.forEach((controlMessage) => {
      this.add(
        new InteractiveMarkerControl({
          parent: this,
          handle: handle,
          message: controlMessage,
          camera: camera,
          path: path,
          loader: loader,
        })
      );
    });

    // 检查是否有任何菜单
    if (handle.menuEntries && handle.menuEntries.length > 0) {
      this.menu = new InteractiveMarkerMenu({
        menuEntries: handle.menuEntries,
        menuFontSize: handle.menuFontSize,
      });

      // 转发菜单选择事件
      this.menu.on("menu-select", (event) => {
        this.dispatchEvent(event);
      });
    }
  }

  /**
   * 显示与此标记关联的交互式标记菜单。
   *
   * @param {Object} control - 要使用的控制
   * @param {Object} event - 导致此事件的事件
   */
  showMenu(control, event) {
    if (this.menu) {
      this.menu.show(control, event);
    }
  }

  /**
   * 根据给定的事件信息移动轴。
   *
   * @param {Object} control - 要使用的控制
   * @param {Object} origAxis - 轴的原点
   * @param {Object} event3d - 导致此事件的事件
   */
  moveAxis(control, origAxis, event3d) {
    if (this.dragging) {
      const currentControlOri = control.currentControlOri;
      const axis = origAxis.clone().applyQuaternion(currentControlOri);
      // 在世界坐标中获取移动轴
      const originWorld = this.dragStart.event3d.intersection.point;
      const axisWorld = axis
        .clone()
        .applyQuaternion(this.dragStart.orientationWorld.clone());

      const axisRay = new THREE.Ray(originWorld, axisWorld);

      // 在轴上找到鼠标最近的点
      const t = closestAxisPoint(axisRay, event3d.camera, event3d.mousePos);

      // 从拖动开始位置偏移
      const p = new THREE.Vector3();
      p.addVectors(
        this.dragStart.position,
        axis
          .clone()
          .applyQuaternion(this.dragStart.orientation)
          .multiplyScalar(t)
      );
      this.setPosition(control, p);

      event3d.stopPropagation();
    }
  }

  /**
   * 基于控制和事件相对于平面移动。
   *
   * @param {Object} control - 要使用的控制
   * @param {Object} origNormal - 原点的法线
   * @param {Object} event3d - 导致此事件的事件
   */
  move3d(control, origNormal, event3d) {
    // 默认情况下，在平面上移动
    if (this.dragging) {
      if (control.isShift) {
        // 不支持shift操作
      } else {
        // 我们想使用最接近相机的原点平面
        const cameraVector = control.camera.getWorldDirection();
        const x = Math.abs(cameraVector.x);
        const y = Math.abs(cameraVector.y);
        const z = Math.abs(cameraVector.z);
        let controlOri = new THREE.Quaternion(1, 0, 0, 1);
        if (y > x && y > z) {
          // 控制的方向
          controlOri = new THREE.Quaternion(0, 0, 1, 1);
        } else if (z > x && z > y) {
          // 控制的方向
          controlOri = new THREE.Quaternion(0, 1, 0, 1);
        }
        controlOri.normalize();

        // 将x轴转换到局部框架
        origNormal = new THREE.Vector3(1, 0, 0);
        origNormal.applyQuaternion(controlOri);
        this.movePlane(control, origNormal, event3d);
      }
    }
  }

  /**
   * 基于控制和事件相对于平面移动。
   *
   * @param {Object} control - 要使用的控制
   * @param {Object} origNormal - 原点的法线
   * @param {Object} event3d - 导致此事件的事件
   */
  movePlane(control, origNormal, event3d) {
    if (this.dragging) {
      const currentControlOri = control.currentControlOri;
      const normal = origNormal.clone().applyQuaternion(currentControlOri);
      // 在世界坐标中获取平面参数
      const originWorld = this.dragStart.event3d.intersection.point;
      const normalWorld = normal
        .clone()
        .applyQuaternion(this.dragStart.orientationWorld);
      const intersection = intersectPlane(
        event3d.mouseRay,
        originWorld,
        normalWorld
      );

      if (intersection) {
        // 从拖动开始位置偏移
        const p = new THREE.Vector3();
        p.subVectors(intersection, originWorld);
        p.add(this.dragStart.positionWorld);
        this.setPosition(control, p);
        event3d.stopPropagation();
      }
    }
  }

  /**
   * 基于控制和事件旋转。
   *
   * @param {Object} control - 要使用的控制
   * @param {Object} origOrientation - 原点的方向
   * @param {Object} event3d - 导致此事件的事件
   */
  rotateAxis(control, origOrientation, event3d) {
    if (this.dragging) {
      control.updateMatrixWorld();

      const currentControlOri = control.currentControlOri;
      const orientation = currentControlOri
        .clone()
        .multiply(origOrientation.clone());

      const normal = new THREE.Vector3(1, 0, 0).applyQuaternion(orientation);

      // 在世界坐标中获取平面参数
      const originWorld = this.dragStart.event3d.intersection.point;
      const normalWorld = normal
        .clone()
        .applyQuaternion(this.dragStart.orientationWorld);

      // 与平面相交的鼠标射线
      const intersection = intersectPlane(
        event3d.mouseRay,
        originWorld,
        normalWorld
      );

      if (intersection) {
        // 将局部原点偏移到相交平面上
        const normalRay = new THREE.Ray(
          this.dragStart.positionWorld,
          normalWorld
        );
        const rotOrigin = intersectPlane(normalRay, originWorld, normalWorld);

        if (rotOrigin) {
          // 从世界到平面坐标的旋转
          const orientationWorld = this.dragStart.orientationWorld
            .clone()
            .multiply(orientation);
          const orientationWorldInv = orientationWorld.clone().inverse();

          // 将原始和当前交点旋转到局部坐标
          intersection.sub(rotOrigin);
          intersection.applyQuaternion(orientationWorldInv);

          const origIntersection =
            this.dragStart.event3d.intersection.point.clone();
          origIntersection.sub(rotOrigin);
          origIntersection.applyQuaternion(orientationWorldInv);

          // 计算相对2D角度
          const a1 = Math.atan2(intersection.y, intersection.z);
          const a2 = Math.atan2(origIntersection.y, origIntersection.z);
          const a = a2 - a1;

          const rot = new THREE.Quaternion();
          rot.setFromAxisAngle(normal, a);

          // 旋转
          this.setOrientation(
            control,
            rot.multiply(this.dragStart.orientationWorld)
          );

          // 从拖动开始位置偏移
          event3d.stopPropagation();
        }
      }
    }
  }

  /**
   * 分发给定事件类型。
   *
   * @param {string} type - 事件类型
   * @param {Object} control - 要使用的控制
   */
  feedbackEvent(type, control) {
    this.dispatchEvent({
      type: type,
      position: this.position.clone(),
      orientation: this.quaternion.clone(),
      controlName: control.name,
    });
  }

  /**
   * 开始拖动操作。
   *
   * @param {Object} control - 要使用的控制
   * @param {Object} event3d - 导致此事件的事件
   */
  startDrag(control, event3d) {
    if (event3d.domEvent.button === 0) {
      event3d.stopPropagation();
      this.dragging = true;
      this.updateMatrixWorld(true);
      const scale = new THREE.Vector3();
      this.matrixWorld.decompose(
        this.dragStart.positionWorld,
        this.dragStart.orientationWorld,
        scale
      );
      this.dragStart.position = this.position.clone();
      this.dragStart.orientation = this.quaternion.clone();
      this.dragStart.event3d = event3d;

      this.feedbackEvent("user-mousedown", control);
    }
  }

  /**
   * 停止拖动操作。
   *
   * @param {Object} control - 要使用的控制
   * @param {Object} event3d - 导致此事件的事件
   */
  stopDrag(control, event3d) {
    if (event3d.domEvent.button === 0) {
      event3d.stopPropagation();
      this.dragging = false;
      this.dragStart.event3d = {};
      this.onServerSetPose(this.bufferedPoseEvent);
      this.bufferedPoseEvent = undefined;

      this.feedbackEvent("user-mouseup", control);
    }
  }

  /**
   * 处理按钮点击。
   *
   * @param {Object} control - 要使用的控制
   * @param {Object} event3d - 导致此事件的事件
   */
  buttonClick(control, event3d) {
    event3d.stopPropagation();
    this.feedbackEvent("user-button-click", control);
  }

  /**
   * 处理位置的用户姿态更改。
   *
   * @param {Object} control - 要使用的控制
   * @param {Object} event3d - 导致此事件的事件
   */
  setPosition(control, position) {
    this.position.copy(position);
    this.feedbackEvent("user-pose-change", control);
  }

  /**
   * 处理方向的用户姿态更改。
   *
   * @param {Object} control - 要使用的控制
   * @param {Object} event3d - 导致此事件的事件
   */
  setOrientation(control, orientation) {
    orientation.normalize();
    this.quaternion.copy(orientation);
    this.feedbackEvent("user-pose-change", control);
  }

  /**
   * 当从服务器设置姿态时更新标记。
   *
   * @param {Object} event - 导致此事件的事件
   */
  onServerSetPose(event) {
    if (event !== undefined) {
      // 拖动时不更新
      if (this.dragging) {
        this.bufferedPoseEvent = event;
      } else {
        const pose = event.pose;
        this.position.copy(pose.position);
        this.quaternion.copy(pose.orientation);
        this.updateMatrixWorld(true);
      }
    }
  }

  /**
   * 释放此标记中元素的内存。
   */
  dispose() {
    if (this.menu) {
      this.menu.dispose();
    }
    this.children.forEach((child) => {
      if (typeof child.dispose === "function") {
        child.dispose();
      }
      this.remove(child);
    });
    this.children = [];
  }
}

// 添加事件分发器功能
Object.assign(InteractiveMarker.prototype, THREE.EventDispatcher.prototype);
