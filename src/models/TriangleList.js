/**
 * @fileOverview
 * @author David Gossow - dgossow@willowgarage.com
 */

import * as THREE from 'three';

/**
 * A TriangleList is a THREE object that can be used to display a list of triangles as a geometry.
 */
export class TriangleList extends THREE.Object3D {
  /**
   * @param options - object with following keys:
   *   * material (optional) - the material to use for the object
   *   * vertices - the array of vertices to use
   *   * colors - the associated array of colors to use
   */
  constructor(options = {}) {
    super();
    const material = options.material || new THREE.MeshBasicMaterial();
    const vertices = options.vertices;
    const colors = options.colors;

    // Create the three.js geometry
    const geometry = new THREE.BufferGeometry();

    // Convert the vertices to three.js vertices
    const verticesArray = [];
    for (let i = 0; i < vertices.length; i++) {
      verticesArray.push(vertices[i].x);
      verticesArray.push(vertices[i].y);
      verticesArray.push(vertices[i].z);
    }

    // Set the geometry
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(verticesArray, 3));

    // Apply the colors if they exist
    if (colors) {
      const colorsArray = [];
      for (let i = 0; i < colors.length; i++) {
        colorsArray.push(colors[i].r);
        colorsArray.push(colors[i].g);
        colorsArray.push(colors[i].b);
      }
      geometry.setAttribute('color', new THREE.Float32BufferAttribute(colorsArray, 3));
      material.vertexColors = true;
    }

    // Set indices if there are more than 3 vertices
    if (vertices.length >= 3) {
      const indices = [];
      for (let i = 0; i < vertices.length; i += 3) {
        // Assuming triangles (3 points per triangle)
        if (i + 2 < vertices.length) {
          indices.push(i, i + 1, i + 2);
        }
      }
      geometry.setIndex(indices);
    }

    // Create the mesh
    const mesh = new THREE.Mesh(geometry, material);
    this.add(mesh);
  }
}