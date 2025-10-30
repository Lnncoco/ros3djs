/**
 * @fileOverview
 * @author Russell Toris - rctoris@wpi.edu
 */

import * as THREE from 'three';

/**
 * Create a grid object.
 */
export class Grid extends THREE.Object3D {
  /**
   * @param options - object with following keys:
   *  * num_cells (optional) - The number of cells of the grid
   *  * color (optional) - the line color of the grid, like '#cccccc'
   *  * lineWidth (optional) - the width of the lines in the grid
   *  * cellSize (optional) - The length, in meters, of the side of each cell
   */
  constructor(options = {}) {
    super();
    const num_cells = options.num_cells || 10;
    const color = options.color || '#cccccc';
    const lineWidth = options.lineWidth || 1;
    const cellSize = options.cellSize || 1;

    // Create the mesh
    const grid = new THREE.GridHelper(num_cells * cellSize, num_cells, color, color);
    grid.type = 'GridHelper';
    this.add(grid);
  }
}