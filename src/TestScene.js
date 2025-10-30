/**
 * @fileOverview
 * @author ROS3D development team
 */

import { Axes } from './models/Axes.js';
import { Grid } from './models/Grid.js';
import { Arrow } from './models/Arrow.js';

/**
 * A simple test scene to verify basic functionality without ROS connection.
 */
export class TestScene {
  /**
   * @param viewer - the Viewer object to add test objects to
   */
  constructor(viewer) {
    // Add a coordinate frame
    const axes = new Axes({
      shaftRadius: 0.05,
      headRadius: 0.1,
      headLength: 0.2
    });
    viewer.addObject(axes, false);

    // Add a grid
    const grid = new Grid({
      num_cells: 10,
      cellSize: 1,
      color: '#cccccc'
    });
    viewer.addObject(grid, false);

    // Add some basic shapes
    const arrow = new Arrow({
      origin: new THREE.Vector3(-2, 0, 0),
      direction: new THREE.Vector3(1, 0, 0),
      length: 2,
      headLength: 0.3,
      headDiameter: 0.2,
      shaftDiameter: 0.05
    });
    viewer.addObject(arrow, false);

    // Create a simple cube manually
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshPhongMaterial({ 
      color: 0x00ff00,
      transparent: true,
      opacity: 0.8
    });
    const cube = new THREE.Mesh(geometry, material);
    cube.position.set(2, 0, 0);
    viewer.addObject(cube, false);

    // Create a sphere
    const sphereGeometry = new THREE.SphereGeometry(0.5, 32, 32);
    const sphereMaterial = new THREE.MeshPhongMaterial({ 
      color: 0xff0000,
      transparent: true,
      opacity: 0.8
    });
    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    sphere.position.set(0, 2, 0);
    viewer.addObject(sphere, false);

    // Create a cylinder
    const cylinderGeometry = new THREE.CylinderGeometry(0.3, 0.3, 1, 32);
    const cylinderMaterial = new THREE.MeshPhongMaterial({ 
      color: 0x0000ff,
      transparent: true,
      opacity: 0.8
    });
    const cylinder = new THREE.Mesh(cylinderGeometry, cylinderMaterial);
    cylinder.position.set(0, -2, 0);
    viewer.addObject(cylinder, false);
  }
}