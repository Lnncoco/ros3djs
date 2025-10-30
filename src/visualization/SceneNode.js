/**
 * @fileOverview
 * @author Jihoon Lee - jihoonlee.in@gmail.com
 * @author Russell Toris - rctoris@wpi.edu
 */

import * as THREE from 'three';

/**
 * A SceneNode can be used to keep track of a 3D object with respect to a ROS frame within a scene.
 */
export class SceneNode extends THREE.Object3D {
  /**
   * @param options - object with following keys:
   *  * tfClient - a handle to the TF client
   *  * frameID - the frame ID this object belongs to
   *  * pose (optional) - the pose associated with this object
   *  * object - the THREE 3D object to be rendered
   */
  constructor(options = {}) {
    super();
    this.tfClient = options.tfClient;
    this.frameID = options.frameID;
    const object = options.object;
    this.pose = options.pose || new THREE.Pose();

    // Add the object to the scene node
    if (object) {
      this.add(object);
    }

    // Subscribe to the TF topic
    if (this.tfClient) {
      this.tfClient.subscribe(this.frameID, (transform) => {
        // Update the position and orientation of the object
        if (transform) {
          this.position.set(transform.translation.x, transform.translation.y, transform.translation.z);
          this.quaternion.set(transform.rotation.x, transform.rotation.y, transform.rotation.z, transform.rotation.w);
        }
      });
    } else {
      // Set the pose if no TF client is available
      if (options.pose) {
        this.position.set(options.pose.position.x, options.pose.position.y, options.pose.position.z);
        this.quaternion.set(options.pose.orientation.x, options.pose.orientation.y, options.pose.orientation.z, options.pose.orientation.w);
      }
    }
  }
}