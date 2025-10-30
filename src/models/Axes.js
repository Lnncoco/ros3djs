/**
 * @fileOverview
 * @author David Gossow - dgossow@willowgarage.com
 */

import * as THREE from 'three';

/**
 * An Axes object can be used to display the axis of a particular coordinate frame.
 */
export class Axes extends THREE.Object3D {
  /**
   * @param options - object with following keys:
   *   * shaftRadius (optional) - the radius of the shaft to render
   *   * headRadius (optional) - the radius of the head to render
   *   * headLength (optional) - the length of the head to render
   *   * scale (optional) - the scale of the frame (defaults to 1.0)
   *   * lineType (optional) - the line type for the axes. Supported line types:
   *                           'dashed' and 'full'.
   *   * lineDashLength (optional) - the length of the dashes, relative to the length of the axis.
   *                                 Maximum value is 1, which means the dash length is
   *                                 equal to the length of the axis. Parameter only applies when
   *                                 lineType is set to dashed.
   */
  constructor(options = {}) {
    super();
    const shaftRadius = options.shaftRadius || 0.025;
    const headRadius = options.headRadius || 0.07;
    const headLength = options.headLength || 0.2;
    const scale = options.scale || 1.0;
    const lineType = options.lineType || 'full';
    const lineDashLength = options.lineDashLength || 0.1;

    // Create the three axis (note: x = red, y = green, z = blue)
    // X Axis
    const xAxisgeo = new THREE.CylinderGeometry(shaftRadius, shaftRadius, 1.0, 64);
    const xAxis = new THREE.Mesh(xAxisgeo, new THREE.MeshBasicMaterial({ color: 0xFF0000 }));
    xAxis.rotation.z = -Math.PI / 2;
    xAxis.position.x = 0.5 * scale;
    this.add(xAxis);

    const xHead = new THREE.ConeGeometry(headRadius, headLength, 64);
    const xMarker = new THREE.Mesh(xHead, new THREE.MeshBasicMaterial({ color: 0xFF0000 }));
    xMarker.position.x = scale;
    xMarker.rotation.z = -Math.PI / 2;
    this.add(xMarker);

    // Y Axis
    const yAxisgeo = new THREE.CylinderGeometry(shaftRadius, shaftRadius, 1.0, 64);
    const yAxis = new THREE.Mesh(yAxisgeo, new THREE.MeshBasicMaterial({ color: 0x00FF00 }));
    yAxis.position.y = 0.5 * scale;
    this.add(yAxis);

    const yHead = new THREE.ConeGeometry(headRadius, headLength, 64);
    const yMarker = new THREE.Mesh(yHead, new THREE.MeshBasicMaterial({ color: 0x00FF00 }));
    yMarker.position.y = scale;
    this.add(yMarker);

    // Z Axis
    const zAxisgeo = new THREE.CylinderGeometry(shaftRadius, shaftRadius, 1.0, 64);
    const zAxis = new THREE.Mesh(zAxisgeo, new THREE.MeshBasicMaterial({ color: 0x0000FF }));
    zAxis.rotation.x = Math.PI / 2;
    zAxis.position.z = 0.5 * scale;
    this.add(zAxis);

    const zHead = new THREE.ConeGeometry(headRadius, headLength, 64);
    const zMarker = new THREE.Mesh(zHead, new THREE.MeshBasicMaterial({ color: 0x0000FF }));
    zMarker.position.z = scale;
    zMarker.rotation.x = Math.PI / 2;
    this.add(zMarker);

    // Scale the whole axis
    this.scale.set(scale, scale, scale);
  }
}