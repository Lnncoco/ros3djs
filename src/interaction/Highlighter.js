/**
 * @fileOverview 用于3D对象鼠标悬停高亮效果的后期处理高亮器。
 */

import * as THREE from "three";

/**
 * @class Highlighter
 * @description 为场景中的3D对象提供鼠标悬停高亮效果。
 * 该高亮器采用后期处理（或覆盖渲染）的方式实现。
 */
export class Highlighter {
  /**
   * @param {object} options - 选项对象。
   * @param {MouseHandler} options.mouseHandler - 用于mouseover和mouseout事件的鼠标处理器。
   */
  constructor(options = {}) {
    const { mouseHandler } = options;
    this.mouseHandler = mouseHandler;
    this.hoverObjs = {};

    // 绑定鼠标事件
    this.onMouseOver = this.onMouseOver.bind(this);
    this.onMouseOut = this.onMouseOut.bind(this);
    this.mouseHandler.addEventListener("mouseover", this.onMouseOver);
    this.mouseHandler.addEventListener("mouseout", this.onMouseOut);
  }

  /**
   * @method dispose
   * @description 清理资源，移除事件监听器。
   */
  dispose() {
    this.mouseHandler.removeEventListener("mouseover", this.onMouseOver);
    this.mouseHandler.removeEventListener("mouseout", this.onMouseOut);
    this.hoverObjs = {};
  }

  /**
   * @private
   * @method onMouseOver
   * @description `mouseover` 事件的回调函数，将当前目标添加到悬停对象列表中。
   * @param {object} event - 包含鼠标悬停目标的事件对象。
   */
  onMouseOver(event) {
    if (event.currentTarget) {
      this.hoverObjs[event.currentTarget.uuid] = event.currentTarget;
    }
  }

  /**
   * @private
   * @method onMouseOut
   * @description `mouseout` 事件的回调函数，从悬停对象列表中移除当前目标。
   * @param {object} event - 包含鼠标移出目标的事件对象。
   */
  onMouseOut(event) {
    if (event.currentTarget) {
      const { uuid } = event.currentTarget;
      if (uuid in this.hoverObjs) {
        delete this.hoverObjs[uuid];
      }
    }
  }

  /**
   * @method renderHighlights
   * @description 渲染当前所有高亮对象的高亮效果。
   * 此方法应在清理渲染器和渲染常规场景之后执行。
   *
   * @param {THREE.Scene} scene - 当前场景，应包含高亮对象。
   * @param {THREE.WebGLRenderer} renderer - 用于渲染场景的渲染器。
   * @param {THREE.Camera} camera - 场景的相机。
   */
  renderHighlights(scene, renderer, camera) {
    if (Object.keys(this.hoverObjs).length === 0) {
      return;
    }

    this._makeEverythingInvisible(scene);
    this._makeHighlightedVisible();

    const originalOverrideMaterial = scene.overrideMaterial;
    scene.overrideMaterial = new THREE.MeshBasicMaterial({
      fog: false,
      opacity: 0.5,
      transparent: true,
      depthTest: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetUnits: -1,
      side: THREE.DoubleSide,
    });

    renderer.render(scene, camera);

    scene.overrideMaterial = originalOverrideMaterial;
    this._restoreVisibility(scene);
  }

  /**
   * @private
   * @method _makeEverythingInvisible
   * @description 遍历给定对象，使其所有网格、线条或精灵类型的子对象不可见，并保存其原始可见性状态。
   * @param {THREE.Object3D} object - 要遍历的对象。
   */
  _makeEverythingInvisible(object) {
    object.traverse((currentObject) => {
      if (
        currentObject instanceof THREE.Mesh ||
        currentObject instanceof THREE.Line ||
        currentObject instanceof THREE.Sprite
      ) {
        currentObject.previousVisibility = currentObject.visible;
        currentObject.visible = false;
      }
    });
  }

  /**
   * @private
   * @method _makeHighlightedVisible
   * @description 使当前高亮的对象（及其所有子对象）可见。
   */
  _makeHighlightedVisible() {
    const makeVisible = (currentObject) => {
      if (
        currentObject instanceof THREE.Mesh ||
        currentObject instanceof THREE.Line ||
        currentObject instanceof THREE.Sprite
      ) {
        currentObject.visible = true;
      }
    };

    for (const uuid in this.hoverObjs) {
      const selectedObject = this.hoverObjs[uuid];
      if (selectedObject) {
        selectedObject.visible = true;
        selectedObject.traverse(makeVisible);
      }
    }
  }

  /**
   * @private
   * @method _restoreVisibility
   * @description 恢复由 `_makeEverythingInvisible` 保存的旧的可见性状态。
   * @param {THREE.Object3D} object - 要遍历的对象。
   */
  _restoreVisibility(object) {
    object.traverse((currentObject) => {
      if (
        Object.prototype.hasOwnProperty.call(
          currentObject,
          "previousVisibility"
        )
      ) {
        currentObject.visible = currentObject.previousVisibility;
        delete currentObject.previousVisibility;
      }
    });
  }
}
