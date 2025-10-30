/**
 * @fileOverview
 * @author David Gossow - dgossow@willowgarage.com
 */

import * as THREE from 'three';

/**
 * A mouseover highlighter for 3D objects in the scene.
 */
export class Highlighter {
  /**
   * @param options - object with following keys:
   *   * mouseHandler - the handler for the mouseover and mouseout events
   */
  constructor(options = {}) {
    this.mouseHandler = options.mouseHandler;
    this.hoverObjs = {};

    // bind the mouse events
    this.mouseHandler.addEventListener('mouseover', this.onMouseOver.bind(this));
    this.mouseHandler.addEventListener('mouseout', this.onMouseOut.bind(this));
  }

  /**
   * Add hover effects to the given object.
   *
   * @param obj3d - the THREE Object3D to apply the highlight to
   * @param color - the highlight color
   */
  addHighlightable(obj3d, color) {
    // save original material
    obj3d.__originalMaterial = obj3d.material;

    // bind mouseover event for highlighting
    obj3d.addEventListener('mouseover', (event3d) => {
      // save old color
      obj3d.__oldColor = obj3d.__originalMaterial.color.clone();
      // highlight with new color
      obj3d.__originalMaterial.color = color;
      // update scene
      obj3d.needsUpdate = true;
    });

    obj3d.addEventListener('mouseout', (event3d) => {
      // restore color
      if (obj3d.__oldColor) {
        obj3d.__originalMaterial.color = obj3d.__oldColor;
        // update scene
        obj3d.needsUpdate = true;
      }
    });
  }

  /**
   * Remove highlight effects to the given object.
   *
   * @param obj3d - the THREE Object3D to remove the highlight from
   */
  removeHighlightable(obj3d) {
    // remove events
    obj3d.removeAllEventListeners();

    // remove reference to original material
    delete obj3d.__originalMaterial;
    delete obj3d.__oldColor;
  }

  /**
   * Callback for mouseover events.
   *
   * @param event3d - the 3D mouse event
   */
  onMouseOver(event3d) {
    // do not highlight clickable objects
    if (event3d.currentTarget) {
      this.hoverObjs[event3d.currentTarget.id] = event3d.currentTarget;
    }
  }

  /**
   * Callback for mouseout events.
   *
   * @param event3d - the 3D mouse event
   */
  onMouseOut(event3d) {
    // do not highlight clickable objects
    if (event3d.currentTarget && this.hoverObjs[event3d.currentTarget.id]) {
      delete this.hoverObjs[event3d.currentTarget.id];
    }
  }

  /**
   * Render the highlights for mouseover effects.
   *
   * @param scene - the scene to render to
   * @param renderer - the renderer to use
   * @param camera - the camera to use
   */
  renderHighlights(scene, renderer, camera) {
    // render each object
    for (const id in this.hoverObjs) {
      const obj = this.hoverObjs[id];
      if (obj) {
        // set the wireframe
        obj.material.wireframe = true;
        // render the update
        renderer.render(scene, camera);
        // unset the wireframe
        obj.material.wireframe = false;
      }
    }
  }
}