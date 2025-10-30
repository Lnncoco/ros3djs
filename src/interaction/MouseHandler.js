/**
 * @fileOverview ROS3D 鼠标处理器 - 将鼠标事件传播到 three.js 对象
 */

import * as THREE from 'three';

/**
 * 将鼠标事件传播到 three.js 对象
 */
export class MouseHandler extends THREE.EventDispatcher {
  /**
   * @param {Object} options - 选项对象
   * @param {THREE.WebGLRenderer} options.renderer - WebGL渲染器
   * @param {THREE.Camera} options.camera - 相机
   * @param {THREE.Group} options.rootObject - 根对象
   * @param {Object} [options.fallbackTarget] - 备用目标
   */
  constructor(options) {
    super();
    this.renderer = options.renderer;
    this.camera = options.camera;
    this.rootObject = options.rootObject;
    this.fallbackTarget = options.fallbackTarget;
    this.lastTarget = this.fallbackTarget;
    this.dragging = false;

    // 监听DOM事件
    const eventNames = ['contextmenu', 'click', 'dblclick', 'mouseout', 'mousedown', 'mouseup',
        'mousemove', 'mousewheel', 'DOMMouseScroll', 'touchstart', 'touchend', 'touchcancel',
        'touchleave', 'touchmove'];
    this.listeners = {};

    // 为相关鼠标事件添加事件监听器
    eventNames.forEach(function(eventName) {
      this.listeners[eventName] = this.processDomEvent.bind(this);
      this.renderer.domElement.addEventListener(eventName, this.listeners[eventName], false);
    }, this);
  }

  /**
   * 基于鼠标在场景中的位置处理发生的特定DOM事件
   *
   * @param domEvent - 要处理的DOM事件
   */
  processDomEvent(domEvent) {
    // 不处理默认处理程序
    domEvent.preventDefault();

    // 计算归一化设备坐标和3D鼠标射线
    const target = domEvent.target;
    const rect = target.getBoundingClientRect();
    let pos_x, pos_y;

    if(domEvent.type.indexOf('touch') !== -1) {
      pos_x = 0;
      pos_y = 0;
      for(let i=0; i<domEvent.touches.length; ++i) {
          pos_x += domEvent.touches[i].clientX;
          pos_y += domEvent.touches[i].clientY;
      }
      pos_x /= domEvent.touches.length;
      pos_y /= domEvent.touches.length;
    }
    else {
      pos_x = domEvent.clientX;
      pos_y = domEvent.clientY;
    }
    const left = pos_x - rect.left - target.clientLeft + target.scrollLeft;
    const top = pos_y - rect.top - target.clientTop + target.scrollTop;
    const deviceX = left / target.clientWidth * 2 - 1;
    const deviceY = -top / target.clientHeight * 2 + 1;
    const mousePos = new THREE.Vector2(deviceX, deviceY);

    const mouseRaycaster = new THREE.Raycaster();
    // 根据 Three.js 版本兼容性设置 line precision
    if (mouseRaycaster.params && mouseRaycaster.params.Line) {
      mouseRaycaster.params.Line.threshold = 0.001;
    } else {
      // 旧版本兼容性
      mouseRaycaster.linePrecision = 0.001;
    }
    mouseRaycaster.setFromCamera(mousePos, this.camera);
    const mouseRay = mouseRaycaster.ray;

    // 创建我们的3D鼠标事件
    const event3D = {
      mousePos : mousePos,
      mouseRay : mouseRay,
      domEvent : domEvent,
      camera : this.camera,
      intersection : this.lastIntersection
    };

    // 如果鼠标离开DOM元素，停止所有操作
    if (domEvent.type === 'mouseout') {
      if (this.dragging) {
        this.notify(this.lastTarget, 'mouseup', event3D);
        this.dragging = false;
      }
      this.notify(this.lastTarget, 'mouseout', event3D);
      this.lastTarget = null;
      return;
    }

    // 如果触摸离开DOM元素，停止所有操作
    if (domEvent.type === 'touchleave' || domEvent.type === 'touchend') {
      if (this.dragging) {
        this.notify(this.lastTarget, 'mouseup', event3D);
        this.dragging = false;
      }
      this.notify(this.lastTarget, 'touchend', event3D);
      this.lastTarget = null;
      return;
    }

    // 当用户按住鼠标时，保持在同一目标上
    if (this.dragging) {
      this.notify(this.lastTarget, domEvent.type, event3D);
      // 检查右键或左键鼠标按钮
      if ((domEvent.type === 'mouseup' && domEvent.button === 2) || domEvent.type === 'click' || domEvent.type === 'touchend') {
        this.dragging = false;
      }
      return;
    }

    // 在正常情况下，我们需要检查鼠标下是什么
    let targetObj = this.lastTarget;
    let intersections = [];
    intersections = mouseRaycaster.intersectObject(this.rootObject, true);

    if (intersections.length > 0) {
      targetObj = intersections[0].object;
      event3D.intersection = this.lastIntersection = intersections[0];
    } else {
      targetObj = this.fallbackTarget;
    }

    // 如果鼠标从一个对象移动到另一个对象（或从/到'null'对象），通知两者
    if (targetObj !== this.lastTarget && domEvent.type.match(/mouse/)) {

      // 事件状态。TODO: 作为枚举制作
      // 0: 已接受
      // 1: 失败
      // 2: 继续
      const eventStatus = this.notify(targetObj, 'mouseover', event3D);
      if (eventStatus === 0) {
        this.notify(this.lastTarget, 'mouseout', event3D);
      } else if(eventStatus === 1) {
        // 如果目标为空或没有目标捕获我们的事件，则回退
        targetObj = this.fallbackTarget;
        if (targetObj !== this.lastTarget) {
          this.notify(targetObj, 'mouseover', event3D);
          this.notify(this.lastTarget, 'mouseout', event3D);
        }
      }
    }

    // 如果手指从一个对象移动到另一个对象（或从/到'null'对象），通知两者
    if (targetObj !== this.lastTarget && domEvent.type.match(/touch/)) {
      const toucheventAccepted = this.notify(targetObj, domEvent.type, event3D);
      if (toucheventAccepted) {
        this.notify(this.lastTarget, 'touchleave', event3D);
        this.notify(this.lastTarget, 'touchend', event3D);
      } else {
        // 如果目标为空或没有目标捕获我们的事件，则回退
        targetObj = this.fallbackTarget;
        if (targetObj !== this.lastTarget) {
          this.notify(this.lastTarget, 'touchmove', event3D);
          this.notify(this.lastTarget, 'touchend', event3D);
        }
      }
    }

    // 传递事件
    this.notify(targetObj, domEvent.type, event3D);
    if (domEvent.type === 'mousedown' || domEvent.type === 'touchstart' || domEvent.type === 'touchmove') {
      this.dragging = true;
    }
    this.lastTarget = targetObj;
  }

  /**
   * 通知侦听器发生的事件类型
   *
   * @param target - 事件的目标
   * @param type - 发生的事件类型
   * @param event3D - 3D鼠标事件信息
   * @returns 事件是否被取消
   */
  notify(target, type, event3D) {
    // 确保类型被设置
    event3D.type = type;

    // 使事件可取消
    event3D.cancelBubble = false;
    event3D.continueBubble = false;
    event3D.stopPropagation = function() {
      event3D.cancelBubble = true;
    };

    // 它击中了可选择对象但不要突出显示
    event3D.continuePropagation = function () {
      event3D.continueBubble = true;
    };

    // 遍历图直到事件被取消或到达根节点
    event3D.currentTarget = target;

    while (event3D.currentTarget) {
      // 尝试在对象上触发事件
      if (event3D.currentTarget.dispatchEvent
          && event3D.currentTarget.dispatchEvent instanceof Function) {
        event3D.currentTarget.dispatchEvent(event3D);
        if (event3D.cancelBubble) {
          this.dispatchEvent(event3D);
          return 0; // 事件接受
        }
        else if(event3D.continueBubble) {
          return 2; // 事件继续
        }
      }
      // 向上遍历
      event3D.currentTarget = event3D.currentTarget.parent;
    }

    return 1; // 事件失败
  }
}