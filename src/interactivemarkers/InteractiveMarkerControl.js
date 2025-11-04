/**
 * @fileOverview
 * @author David Gossow - dgossow@willowgarage.com
 * @author ROS3D development team
 */

import * as THREE from 'three';
import { Marker } from '@markers/Marker.js';
import {
  INTERACTIVE_MARKER_NONE,
  INTERACTIVE_MARKER_MENU,
  INTERACTIVE_MARKER_BUTTON,
  INTERACTIVE_MARKER_MOVE_AXIS,
  INTERACTIVE_MARKER_MOVE_PLANE,
  INTERACTIVE_MARKER_ROTATE_AXIS,
  INTERACTIVE_MARKER_MOVE_ROTATE,
  INTERACTIVE_MARKER_MOVE_3D,
  INTERACTIVE_MARKER_ROTATE_3D,
  INTERACTIVE_MARKER_MOVE_ROTATE_3D,
  INTERACTIVE_MARKER_INHERIT,
  INTERACTIVE_MARKER_FIXED,
  INTERACTIVE_MARKER_VIEW_FACING,
} from '../constants/interactiveMarker.constants.js';

/**
 * 交互式标记的主要控制对象。
 */
export class InteractiveMarkerControl extends THREE.Object3D {
  /**
   * @param {Object} options - 包含以下键的对象:
   *  * parent - 此控制的父对象
   *  * message - 交互式标记控制消息
   *  * camera - 与此标记客户端关联的主相机
   *  * path (可选) - 要加载的任何网格的基路径
   *  * loader (可选) - 要使用的Collada加载器（例如，ROS3D.COLLADA_LOADER的实例）
   */
  constructor(options = {}) {
    super();
    const that = this;

    const {
      parent,
      handle,
      message,
      camera,
      path = '/',
      loader,
    } = options;

    this.parent = parent;
    this.message = message;
    this.name = message.name;
    this.camera = camera;
    this.path = path;
    this.loader = loader;
    this.dragging = false;
    this.startMousePos = new THREE.Vector2();
    this.isShift = false;

    // 控制的方向
    const controlOri = new THREE.Quaternion(message.orientation.x, message.orientation.y,
        message.orientation.z, message.orientation.w);
    controlOri.normalize();

    // 将x轴转换到局部框架
    const controlAxis = new THREE.Vector3(1, 0, 0);
    controlAxis.applyQuaternion(controlOri);

    this.currentControlOri = new THREE.Quaternion();

    // 确定鼠标交互
    switch (message.interaction_mode) {
      case INTERACTIVE_MARKER_MOVE_ROTATE_3D:
      case INTERACTIVE_MARKER_MOVE_3D:
        this.addEventListener('mousemove', this.parent.move3d.bind(this.parent, this, controlAxis));
        break;
      case INTERACTIVE_MARKER_MOVE_AXIS:
        this.addEventListener('mousemove', this.parent.moveAxis.bind(this.parent, this, controlAxis));
        this.addEventListener('touchmove', this.parent.moveAxis.bind(this.parent, this, controlAxis));
        break;
      case INTERACTIVE_MARKER_ROTATE_AXIS:
        this
            .addEventListener('mousemove', this.parent.rotateAxis.bind(this.parent, this, controlOri));
        break;
      case INTERACTIVE_MARKER_MOVE_PLANE:
        this
            .addEventListener('mousemove', this.parent.movePlane.bind(this.parent, this, controlAxis));
        break;
      case INTERACTIVE_MARKER_BUTTON:
        this.addEventListener('click', this.parent.buttonClick.bind(this.parent, this));
        break;
      default:
        break;
    }

    /**
     * 安装高亮/拖动的默认监听器。
     *
     * @param {Object} event - 要停止的事件
     */
    function stopPropagation(event) {
      event.stopPropagation();
    }

    // 检查模式
    if (message.interaction_mode !== INTERACTIVE_MARKER_NONE) {
      this.addEventListener('mousedown', this.parent.startDrag.bind(this.parent, this));
      this.addEventListener('mouseup', this.parent.stopDrag.bind(this.parent, this));
      this.addEventListener('contextmenu', this.parent.showMenu.bind(this.parent, this));
      this.addEventListener('mouseup', function(event3d) {
        if (that.startMousePos.distanceToSquared(event3d.mousePos) === 0) {
          event3d.type = 'contextmenu';
          that.dispatchEvent(event3d);
        }
      });
      this.addEventListener('mouseover', stopPropagation);
      this.addEventListener('mouseout', stopPropagation);
      this.addEventListener('click', stopPropagation);
      this.addEventListener('mousedown', function(event3d) {
        that.startMousePos = event3d.mousePos;
      });

      // 触摸支持
      this.addEventListener('touchstart', function(event3d) {
        if (event3d.domEvent.touches.length === 1) {
          event3d.type = 'mousedown';
          event3d.domEvent.button = 0;
          that.dispatchEvent(event3d);
        }
      });
      this.addEventListener('touchmove', function(event3d) {
        if (event3d.domEvent.touches.length === 1) {
          event3d.type = 'mousemove';
          event3d.domEvent.button = 0;
          that.dispatchEvent(event3d);
        }
      });
      this.addEventListener('touchend', function(event3d) {
        if (event3d.domEvent.touches.length === 0) {
          event3d.domEvent.button = 0;
          event3d.type = 'mouseup';
          that.dispatchEvent(event3d);
          event3d.type = 'click';
          that.dispatchEvent(event3d);
        }
      });

      this.onKeydown = (event) => {
        if(event.keyCode === 16){
          that.isShift = true;
        }
      };
      this.onKeyup = (event) => {
        if(event.keyCode === 16){
          that.isShift = false;
        }
      };
      window.addEventListener('keydown', this.onKeydown);
      window.addEventListener('keyup', this.onKeyup);
    }

    // 旋转行为
    let rotInv = new THREE.Quaternion();
    const posInv = this.parent.position.clone().multiplyScalar(-1);
    switch (message.orientation_mode) {
      case INTERACTIVE_MARKER_INHERIT:
        rotInv = this.parent.quaternion.clone().inverse();
        break;
      case INTERACTIVE_MARKER_FIXED:
        break;
      case INTERACTIVE_MARKER_VIEW_FACING:
        break;
      default:
        console.error('未知方向模式: ' + message.orientation_mode);
        break;
    }

    // 临时TFClient以获取从InteractiveMarker框架到潜在子Marker框架的变换
    this.localTfClient = new ROSLIB.TFClient({
      ros: handle.tfClient.ros,
      fixedFrame: handle.message.header.frame_id,
      serverName: handle.tfClient.serverName
    });
    const localTfClient = this.localTfClient;

    // 创建可视化（标记）
    message.markers.forEach(function(markerMsg) {
      const addMarker = function(transformMsg) {
        const markerHelper = new Marker({
          message: markerMsg,
          path: that.path,
          loader: that.loader
        });

        // 如果transformMsg不为null，则这是由TFClient调用的
        if (transformMsg !== null) {
          // 获取当前位置作为ROSLIB.Pose...
          const newPose = new ROSLIB.Pose({
            position: markerHelper.position,
            orientation: markerHelper.quaternion
          });
          // 所以我们可以应用TFClient提供的变换
          newPose.applyTransform(new ROSLIB.Transform(transformMsg));

          // 获取父标记位置与其框架之间的变换
          // 将其应用于子标记位置以获取相对于父标记的子标记位置
          const transformMarker = new Marker({
            message: markerMsg,
            path: that.path,
            loader: that.loader
          });
          transformMarker.position.add(posInv);
          transformMarker.position.applyQuaternion(rotInv);
          transformMarker.quaternion.multiplyQuaternions(rotInv, transformMarker.quaternion);
          const translation = new THREE.Vector3(transformMarker.position.x, transformMarker.position.y, transformMarker.position.z);
          const transform = new ROSLIB.Transform({
            translation: translation,
            orientation: transformMarker.quaternion
          });

          // 应用那个变换
          newPose.applyTransform(transform);

          markerHelper.setPose(newPose);

          markerHelper.updateMatrixWorld();
          // 我们只需要设置一次姿态 - 至少，这是RViz似乎正在做的，未来可能会改变
          localTfClient.unsubscribe(markerMsg.header.frame_id);
        }

        // 添加标记
        that.add(markerHelper);
      };

      // 如果标记不相对于父标记的位置，
      // 询问*本地*TFClient获取从InteractiveMarker框架到子标记框架的变换
      if (markerMsg.header.frame_id !== '') {
        localTfClient.subscribe(markerMsg.header.frame_id, addMarker);
      }
      // 如果不是，只需添加标记而不改变其姿态
      else {
        addMarker(null);
      }
    });
  }

  updateMatrixWorld(force) {
    const that = this;
    const message = this.message;
    switch (message.orientation_mode) {
      case INTERACTIVE_MARKER_INHERIT:
        super.updateMatrixWorld(force);
        that.currentControlOri.copy(that.quaternion);
        that.currentControlOri.normalize();
        break;
      case INTERACTIVE_MARKER_FIXED:
        that.quaternion.copy(that.parent.quaternion.clone().inverse());
        that.updateMatrix();
        that.matrixWorldNeedsUpdate = true;
        super.updateMatrixWorld(force);
        that.currentControlOri.copy(that.quaternion);
        break;
      case INTERACTIVE_MARKER_VIEW_FACING:
        that.camera.updateMatrixWorld();
        const cameraRot = new THREE.Matrix4().extractRotation(that.camera.matrixWorld);

        const ros2Gl = new THREE.Matrix4();
        const r90 = Math.PI * 0.5;
        const rv = new THREE.Euler(-r90, 0, r90);
        ros2Gl.makeRotationFromEuler(rv);

        const worldToLocal = new THREE.Matrix4();
        worldToLocal.getInverse(that.parent.matrixWorld);

        cameraRot.multiplyMatrices(cameraRot, ros2Gl);
        cameraRot.multiplyMatrices(worldToLocal, cameraRot);

        that.currentControlOri.setFromRotationMatrix(cameraRot);

        // 检查方向
        if (!message.independent_marker_orientation) {
          that.quaternion.copy(that.currentControlOri);
          that.updateMatrix();
          that.matrixWorldNeedsUpdate = true;
        }
        super.updateMatrixWorld(force);
        break;
      default:
        console.error('未知方向模式: ' + message.orientation_mode);
        break;
    }
  }

  /**
   * @method dispose
   * @description 销毁此对象并释放所有相关资源。
   */
  dispose() {
    // 移除所有子对象
    this.children.forEach(child => {
      if (typeof child.dispose === 'function') {
        child.dispose();
      }
      this.remove(child);
    });
    this.children = [];

    // 移除事件监听器
    window.removeEventListener('keydown', this.onKeydown);
    window.removeEventListener('keyup', this.onKeyup);
  }
}