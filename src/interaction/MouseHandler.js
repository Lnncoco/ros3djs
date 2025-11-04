/**
 * @fileOverview ROS3D 鼠标处理器 - 将鼠标事件传播到 three.js 对象
 */

import * as THREE from 'three';
import { computeMouseData } from './interaction.utils';
import { MouseEventStatus } from '../constants/interaction.constants.js';

/**
 * @class
 * @name MouseHandler
 * @description 将鼠标和触摸事件从DOM传播到three.js对象。
 * @extends THREE.EventDispatcher
 */
export class MouseHandler extends THREE.EventDispatcher {
  /**
   * @param {object} options - 选项
   * @param {THREE.WebGLRenderer} options.renderer - 用于获取DOM元素和尺寸的WebGL渲染器。
   * @param {THREE.Camera} options.camera - 用于射线投射的相机。
   * @param {THREE.Object3D} options.rootObject - 用于对象拾取的根 `THREE.Object3D`。
   * @param {object} [options.fallbackTarget] - 当没有拾取到对象时，事件将发送到此备用目标。
   */
  constructor(options) {
    super();
    const {
      renderer,
      camera,
      rootObject,
      fallbackTarget,
    } = options;

    this.renderer = renderer;
    this.camera = camera;
    this.rootObject = rootObject;
    this.fallbackTarget = fallbackTarget;
    this.lastTarget = this.fallbackTarget;
    this.dragging = false;
    this.listeners = {};

    const eventNames = [
      'contextmenu', 'click', 'dblclick', 'mouseout', 'mousedown', 'mouseup',
      'mousemove', 'wheel', 'DOMMouseScroll', 'touchstart', 'touchend', 'touchcancel',
      'touchleave', 'touchmove'
    ];

    eventNames.forEach(eventName => {
      const listener = this.processDomEvent.bind(this);
      this.listeners[eventName] = listener;
      this.renderer.domElement.addEventListener(eventName, listener, false);
    });
  }

  /**
   * @method dispose
   * @description 移除所有附加的DOM事件监听器，以防止内存泄漏。
   */
  dispose() {
    Object.entries(this.listeners).forEach(([eventName, listener]) => {
      this.renderer.domElement.removeEventListener(eventName, listener, false);
    });
    this.listeners = {};
  }

  /**
   * @private
   * @method processDomEvent
   * @description 基于鼠标在场景中的位置处理发生的特定DOM事件。
   * @param {Event} domEvent - 要处理的DOM事件。
   */
  processDomEvent(domEvent) {
    domEvent.preventDefault();

    const mouseData = computeMouseData(domEvent, this.renderer, this.camera);
    const event3D = {
      mousePos: mouseData.mousePos,
      mouseRay: mouseData.mouseRaycaster.ray,
      domEvent: domEvent,
      camera: this.camera,
      intersection: this.lastIntersection,
    };

    const isMouseOut = domEvent.type === 'mouseout';
    const isTouchEnd = ['touchleave', 'touchend', 'touchcancel'].includes(domEvent.type);

    if (isMouseOut || isTouchEnd) {
      if (this.dragging) {
        this.notify(this.lastTarget, 'mouseup', event3D); // 'mouseup' for dragging logic
        this.dragging = false;
      }
      this.notify(this.lastTarget, isMouseOut ? 'mouseout' : 'touchend', event3D);
      this.lastTarget = null;
      return;
    }

    if (this.dragging) {
      this.notify(this.lastTarget, domEvent.type, event3D);
      const isDragEnd = (domEvent.type === 'mouseup' && domEvent.button === 2) || domEvent.type === 'click' || domEvent.type === 'touchend';
      if (isDragEnd) {
        this.dragging = false;
      }
      return;
    }

    const intersections = mouseData.mouseRaycaster.intersectObject(this.rootObject, true);
    let targetObj = this.fallbackTarget;

    if (intersections.length > 0) {
      targetObj = intersections[0].object;
      event3D.intersection = this.lastIntersection = intersections[0];
    }

    if (targetObj !== this.lastTarget) {
      this.handleTargetChange(targetObj, event3D);
    }

    this.notify(targetObj, domEvent.type, event3D);
    if (['mousedown', 'touchstart', 'touchmove'].includes(domEvent.type)) {
      this.dragging = true;
    }
    this.lastTarget = targetObj;
  }

  /**
   * @private
   * @method handleTargetChange
   * @description 处理鼠标或触摸目标对象的变更。
   * @param {THREE.Object3D} newTarget - 新的目标对象。
   * @param {object} event3D - 3D事件对象。
   */
  handleTargetChange(newTarget, event3D) {
    const { domEvent } = event3D;
    const isMouseEvent = domEvent.type.includes('mouse');
    const isTouchEvent = domEvent.type.includes('touch');

    if (isMouseEvent) {
      const eventStatus = this.notify(newTarget, 'mouseover', event3D);
      if (eventStatus === MouseEventStatus.ACCEPTED) {
        this.notify(this.lastTarget, 'mouseout', event3D);
      } else if (eventStatus === MouseEventStatus.FAILED) {
        if (newTarget !== this.fallbackTarget) {
          this.notify(this.fallbackTarget, 'mouseover', event3D);
          this.notify(this.lastTarget, 'mouseout', event3D);
        }
      }
    } else if (isTouchEvent) {
      const eventStatus = this.notify(newTarget, domEvent.type, event3D);
      if (eventStatus === MouseEventStatus.ACCEPTED) {
        this.notify(this.lastTarget, 'touchleave', event3D);
        this.notify(this.lastTarget, 'touchend', event3D);
      } else if (eventStatus === MouseEventStatus.FAILED) {
        if (newTarget !== this.fallbackTarget) {
          this.notify(this.lastTarget, 'touchmove', event3D);
          this.notify(this.lastTarget, 'touchend', event3D);
        }
      }
    }
  }

  /**
   * @private
   * @method notify
   * @description 将事件分派给目标对象及其父级，直到事件被处理或到达场景根部。
   * @param {THREE.Object3D} target - 事件的初始目标。
   * @param {string} type - 事件类型 (例如, 'click', 'mouseover')。
   * @param {object} event3D - 包含事件详细信息的3D事件对象。
   * @returns {MouseEventStatus} 事件处理的状态。
   */
  notify(target, type, event3D) {
    if (!target) {
      return MouseEventStatus.FAILED;
    }

    event3D.type = type;
    event3D.cancelBubble = false;
    event3D.continueBubble = false;
    event3D.stopPropagation = () => {
      event3D.cancelBubble = true;
    };
    event3D.continuePropagation = () => {
      event3D.continueBubble = true;
    };

    let currentTarget = target;
    while (currentTarget) {
      event3D.currentTarget = currentTarget;
      if (typeof currentTarget.dispatchEvent === 'function') {
        currentTarget.dispatchEvent(event3D);
        if (event3D.cancelBubble) {
          this.dispatchEvent(event3D);
          return MouseEventStatus.ACCEPTED;
        }
        if (event3D.continueBubble) {
          return MouseEventStatus.CONTINUED;
        }
      }
      currentTarget = currentTarget.parent;
    }

    return MouseEventStatus.FAILED;
  }
}