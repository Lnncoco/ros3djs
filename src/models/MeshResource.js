/**
 * @fileOverview
 * @author Jihoon Lee - jihoonlee.in@gmail.com
 * @author Russell Toris - rctoris@wpi.edu
 */

import * as THREE from 'three';

/**
 * A MeshResource is a THREE object that will load from a external mesh file.
 */
export class MeshResource extends THREE.Object3D {
  /**
   * @param options - object with following keys:
   *  * path (optional) - the base path to the associated models that will be loaded
   *  * resource - the resource file name to load
   *  * material (optional) - the material to use for the object
   *  * warnings (optional) - if warnings should be printed
   */
  constructor(options = {}) {
    super();
    const path = options.path || '/';
    const resource = options.resource;
    const material = options.material || new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const warnings = options.warnings;

    // Check for a trailing '/'
    if (path.charAt(path.length - 1) !== '/') {
      path += '/';
    }

    // Set the resource
    this.resource = resource;
    // Set the path
    this.path = path;
    // Set the material
    this.material = material;
    // Set warnings
    this.warnings = warnings;

    // Load the model
    this.loadMesh();
  }

  /**
   * Load the mesh.
   */
  loadMesh() {
    // For now, just create a placeholder geometry
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const mesh = new THREE.Mesh(geometry, this.material);
    this.add(mesh);
  }
}