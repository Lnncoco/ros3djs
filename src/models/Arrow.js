/**
 * @fileOverview
 * @author David Gossow - dgossow@willowgarage.com
 */

import * as THREE from 'three';

/**
 * A Arrow is a THREE object that can be used to display an arrow model.
 */
export class Arrow extends THREE.Object3D {
  /**
   * @param options - object with following keys:
   *   * origin (optional) - the origin of the arrow
   *   * direction (optional) - the direction vector of the arrow
   *   * length (optional) - the length of the arrow
   *   * headLength (optional) - the head length of the arrow
   *   * shaftDiameter (optional) - the shaft diameter of the arrow
   *   * headDiameter (optional) - the head diameter of the arrow
   *   * material (optional) - the material to use for this arrow
   */
  constructor(options = {}) {
    super();
    const origin = options.origin || new THREE.Vector3(0, 0, 0);
    const direction = options.direction || new THREE.Vector3(1, 0, 0);
    const length = options.length || 1;
    const headLength = options.headLength || (length * 0.2);
    const shaftDiameter = options.shaftDiameter || (length * 0.05);
    const headDiameter = options.headDiameter || (length * 0.1);
    const material = options.material || new THREE.MeshBasicMaterial({ color: 0xcc00ff });

    // Apply the origin
    this.position.copy(origin);

    // Create the arrow
    const shaftLength = length - headLength;
    
    // Create shaft
    const shaftGeometry = new THREE.CylinderGeometry(
      shaftDiameter / 2, 
      shaftDiameter / 2, 
      shaftLength, 
      16
    );
    const shaft = new THREE.Mesh(shaftGeometry, material);
    shaft.rotation.x = Math.PI / 2; // Rotate to align with X axis
    shaft.position.x = shaftLength / 2; // Center it at origin

    // Create head
    const headGeometry = new THREE.ConeGeometry(
      headDiameter / 2, 
      headLength, 
      16
    );
    const head = new THREE.Mesh(headGeometry, material);
    head.rotation.x = Math.PI / 2; // Rotate to align with X axis
    head.position.x = shaftLength + headLength / 2; // Position at the end of shaft

    // Add the shaft and head to this object
    this.add(shaft);
    this.add(head);

    // Set the direction
    this.setDirection(direction);
  }

  /**
   * Set the direction of this arrow to that of the given vector.
   *
   * @param direction - the direction to set this marker to
   */
  setDirection(direction) {
    // Create a quaternion from the direction vector
    const d = direction.clone().normalize();
    const arrowDirection = new THREE.Vector3(1, 0, 0); // Initial direction
    const quaternion = new THREE.Quaternion();
    quaternion.setFromUnitVectors(arrowDirection, d);
    this.quaternion.copy(quaternion);
  }

  /**
   * Set the length of this arrow to the given value.
   *
   * @param length - the new length of the arrow
   */
  setLength(length, headLength, shaftDiameter, headDiameter) {
    // For simplicity, we'll update the scale
    // Find shaft and head in children and update their geometries
    // In this basic implementation, we'll just recreate the arrow
    const direction = new THREE.Vector3(1, 0, 0);
    direction.applyQuaternion(this.quaternion);
    
    // Remove current children
    while(this.children.length > 0) {
      this.remove(this.children[0]);
    }
    
    // Create new arrow with updated size
    const newArrow = new Arrow({
      origin: new THREE.Vector3(0, 0, 0), // Origin is now the object's position
      direction: direction,
      length: length,
      headLength: headLength,
      shaftDiameter: shaftDiameter,
      headDiameter: headDiameter
    });
    
    // Copy position and add the children to this object
    this.position.copy(newArrow.position);
    this.add(...newArrow.children);
  }
}