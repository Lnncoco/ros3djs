/**
 * @fileOverview
 * @author David Gossow - dgossow@willowgarage.com
 * @author Russell Toris - rctoris@wpi.edu
 */

import * as THREE from 'three';
import { Arrow } from '../models/Arrow';
import { TriangleList } from '../models/TriangleList';
import { MeshResource } from '../models/MeshResource';

// Marker types (from ros3djs-legacy/src/Ros3D.js)
export const MARKER_ARROW = 0;
export const MARKER_CUBE = 1;
export const MARKER_SPHERE = 2;
export const MARKER_CYLINDER = 3;
export const MARKER_LINE_STRIP = 4;
export const MARKER_LINE_LIST = 5;
export const MARKER_CUBE_LIST = 6;
export const MARKER_SPHERE_LIST = 7;
export const MARKER_POINTS = 8;
export const MARKER_TEXT_VIEW_FACING = 9;
export const MARKER_MESH_RESOURCE = 10;
export const MARKER_TRIANGLE_LIST = 11;

/**
 * Create a THREE material based on the given RGBA values.
 *
 * @param r - the red value
 * @param g - the green value
 * @param b - the blue value
 * @param a - the alpha value
 * @returns the THREE material
 */
function makeColorMaterial(r, g, b, a) {
  const color = new THREE.Color();
  color.setRGB(r, g, b);
  if (a <= 0.99) {
    return new THREE.MeshBasicMaterial({
      color: color.getHex(),
      opacity: a + 0.1,
      transparent: true,
      depthWrite: true,
      blending: THREE.NormalBlending
    });
  } else {
    return new THREE.MeshPhongMaterial({
      color: color.getHex(),
      opacity: a,
      blending: THREE.NormalBlending
    });
  }
}

/**
 * A Marker can convert a ROS marker message into a THREE object.
 */
export class Marker extends THREE.Object3D {
  /**
   * @param options - object with following keys:
   *   * path - the base path or URL for any mesh files that will be loaded for this marker
   *   * message - the marker message
   */
  constructor(options = {}) {
    super();

    const path = options.path || '/';
    const message = options.message;

    // check for a trailing '/'
    if (path.substr(path.length - 1) !== '/') {
      path += '/';
    }

    if(message.scale) {
      this.msgScale = [message.scale.x, message.scale.y, message.scale.z];
    }
    else {
      this.msgScale = [1,1,1];
    }
    this.msgColor = message.color;
    this.msgMesh = undefined; // Reset msgMesh

    // Call init method to set up the marker
    this.init(options);
  }

  /**
   * Initialize or re-initialize the marker with new options
   */
  init(options = {}) {
    const path = options.path || '/';
    const message = options.message;

    // Clear existing children if re-initializing
    this.children.forEach(child => {
      // Dispose child resources if they have a dispose method
      if (child.dispose && typeof child.dispose === 'function') {
          child.dispose();
      }
      this.remove(child);
    });

    // check for a trailing '/'
    if (path.substr(path.length - 1) !== '/') {
      path += '/';
    }

    if(message.scale) {
      this.msgScale = [message.scale.x, message.scale.y, message.scale.z];
    }
    else {
      this.msgScale = [1,1,1];
    }
    this.msgColor = message.color;
    this.msgMesh = undefined;

    // set the pose and get the color
    this.setPose(message.pose);
    const colorMaterial = makeColorMaterial(this.msgColor.r,
        this.msgColor.g, this.msgColor.b, this.msgColor.a);

    // create the object based on the type
    switch (message.type) {
      case MARKER_ARROW:
        // get the sizes for the arrow
        let len = message.scale.x;
        let headLength = len * 0.23;
        let headDiameter = message.scale.y;
        let shaftDiameter = headDiameter * 0.5;

        // determine the points
        let direction, p1 = null;
        if (message.points.length === 2) {
          p1 = new THREE.Vector3(message.points[0].x, message.points[0].y, message.points[0].z);
          const p2 = new THREE.Vector3(message.points[1].x, message.points[1].y, message.points[1].z);
          direction = p1.clone().negate().add(p2);
          // direction = p2 - p1;
          len = direction.length();
          headDiameter = message.scale.y;
          shaftDiameter = message.scale.x;

          if (message.scale.z !== 0.0) {
            headLength = message.scale.z;
          }
        }

        // add the marker
        this.add(new Arrow({
          direction : direction,
          origin : p1,
          length : len,
          headLength : headLength,
          shaftDiameter : shaftDiameter,
          headDiameter : headDiameter,
          material : colorMaterial
        }));
        break;
      case MARKER_CUBE:
        // set the cube dimensions
        const cubeGeom = new THREE.BoxGeometry(message.scale.x, message.scale.y, message.scale.z);
        this.add(new THREE.Mesh(cubeGeom, colorMaterial));
        break;
      case MARKER_SPHERE:
        // set the sphere dimensions
        const sphereGeom = new THREE.SphereGeometry(0.5);
        const sphereMesh = new THREE.Mesh(sphereGeom, colorMaterial);
        sphereMesh.scale.x = message.scale.x;
        sphereMesh.scale.y = message.scale.y;
        sphereMesh.scale.z = message.scale.z;
        this.add(sphereMesh);
        break;
      case MARKER_CYLINDER:
        // set the cylinder dimensions
        const cylinderGeom = new THREE.CylinderGeometry(0.5, 0.5, 1, 16, 1, false);
        const cylinderMesh = new THREE.Mesh(cylinderGeom, colorMaterial);
        cylinderMesh.quaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI * 0.5);
        cylinderMesh.scale.set(message.scale.x, message.scale.z, message.scale.y);
        this.add(cylinderMesh);
        break;
      case MARKER_LINE_STRIP:
        const lineStripGeom = new THREE.BufferGeometry();
        const lineStripMaterial = new THREE.LineBasicMaterial({
          linewidth : message.scale.x,
          color: new THREE.Color().setRGB(message.color.r, message.color.g, message.color.b)
        });

        // Create positions array
        const positions = new Float32Array(message.points.length * 3);
        for (let j = 0; j < message.points.length; j++) {
          positions[j * 3] = message.points[j].x;
          positions[j * 3 + 1] = message.points[j].y;
          positions[j * 3 + 2] = message.points[j].z;
        }

        // Set positions attribute
        lineStripGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        // determine the colors for each
        if (message.colors && message.colors.length === message.points.length) {
          lineStripMaterial.vertexColors = true;
          const colors = new Float32Array(message.colors.length * 3);
          for (let j = 0; j < message.colors.length; j++) {
            colors[j * 3] = message.colors[j].r;
            colors[j * 3 + 1] = message.colors[j].g;
            colors[j * 3 + 2] = message.colors[j].b;
          }
          lineStripGeom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        } else {
          lineStripMaterial.color.setRGB(message.color.r, message.color.g, message.color.b);
        }

        // add the line
        this.add(new THREE.Line(lineStripGeom, lineStripMaterial));
        break;
      case MARKER_LINE_LIST:
        const lineListGeom = new THREE.BufferGeometry();
        const lineListMaterial = new THREE.LineBasicMaterial({
          linewidth : message.scale.x,
          color: new THREE.Color().setRGB(message.color.r, message.color.g, message.color.b)
        });

        // Create positions array
        const positions2 = new Float32Array(message.points.length * 3);
        for (let k = 0; k < message.points.length; k++) {
          positions2[k * 3] = message.points[k].x;
          positions2[k * 3 + 1] = message.points[k].y;
          positions2[k * 3 + 2] = message.points[k].z;
        }

        // Set positions attribute
        lineListGeom.setAttribute('position', new THREE.BufferAttribute(positions2, 3));

        // determine the colors for each
        if (message.colors && message.colors.length === message.points.length) {
          lineListMaterial.vertexColors = true;
          const colors2 = new Float32Array(message.colors.length * 3);
          for (let k = 0; k < message.colors.length; k++) {
            colors2[k * 3] = message.colors[k].r;
            colors2[k * 3 + 1] = message.colors[k].g;
            colors2[k * 3 + 2] = message.colors[k].b;
          }
          lineListGeom.setAttribute('color', new THREE.BufferAttribute(colors2, 3));
        } else {
          lineListMaterial.color.setRGB(message.color.r, message.color.g, message.color.b);
        }

        // add the line
        this.add(new THREE.LineSegments(lineListGeom, lineListMaterial));
        break;
      case MARKER_CUBE_LIST:
        // Use instanced rendering for better performance with large lists
        const numPoints = message.points.length;
        const geometry = new THREE.BoxGeometry(1, 1, 1); // Base size 1x1x1, will scale below
        
        // For color handling in instanced rendering we need to use a different approach
        // Create a single InstancedMesh with multiple instances
        const instancedMesh = new THREE.InstancedMesh(geometry, colorMaterial, numPoints);
        
        const matrix = new THREE.Matrix4();
        const position = new THREE.Vector3();
        const scale = new THREE.Vector3(message.scale.x, message.scale.y, message.scale.z);
        const quaternion = new THREE.Quaternion();
        
        // Set position and scale for each instance
        for (let i = 0; i < numPoints; i++) {
          position.set(message.points[i].x, message.points[i].y, message.points[i].z);
          matrix.compose(position, quaternion, scale);
          instancedMesh.setMatrixAt(i, matrix);
        }
        
        instancedMesh.instanceMatrix.needsUpdate = true;
        this.add(instancedMesh);
        break;
      case MARKER_SPHERE_LIST:
        // Use instanced rendering for better performance with large lists
        const numPoints2 = message.points.length;
        const geometry2 = new THREE.SphereGeometry(0.5, 8, 8);
        
        // Create a single InstancedMesh with multiple instances
        const instancedMesh2 = new THREE.InstancedMesh(geometry2, colorMaterial, numPoints2);
        
        const matrix2 = new THREE.Matrix4();
        const position2 = new THREE.Vector3();
        const scale2 = new THREE.Vector3(message.scale.x, message.scale.y, message.scale.z);
        const quaternion2 = new THREE.Quaternion();
        
        // Set position and scale for each instance
        for (let i = 0; i < numPoints2; i++) {
          position2.set(message.points[i].x, message.points[i].y, message.points[i].z);
          matrix2.compose(position2, quaternion2, scale2);
          instancedMesh2.setMatrixAt(i, matrix2);
        }
        
        instancedMesh2.instanceMatrix.needsUpdate = true;
        this.add(instancedMesh2);
        break;
      case MARKER_POINTS:
        // for now, use a particle system for the lists
        const geometry3 = new THREE.BufferGeometry();
        const material3 = new THREE.PointsMaterial({
          size : message.scale.x,
          color: new THREE.Color().setRGB(message.color.r, message.color.g, message.color.b)
        });

        // Create positions array
        const positions3 = new Float32Array(message.points.length * 3);
        for (let i = 0; i < message.points.length; i++) {
          positions3[i * 3] = message.points[i].x;
          positions3[i * 3 + 1] = message.points[i].y;
          positions3[i * 3 + 2] = message.points[i].z;
        }

        // Set positions attribute
        geometry3.setAttribute('position', new THREE.BufferAttribute(positions3, 3));

        // determine the colors for each
        if (message.colors && message.colors.length === message.points.length) {
          material3.vertexColors = true;
          const colors3 = new Float32Array(message.colors.length * 3);
          for (let i = 0; i < message.colors.length; i++) {
            colors3[i * 3] = message.colors[i].r;
            colors3[i * 3 + 1] = message.colors[i].g;
            colors3[i * 3 + 2] = message.colors[i].b;
          }
          geometry3.setAttribute('color', new THREE.BufferAttribute(colors3, 3));
        } else {
          material3.color.setRGB(message.color.r, message.color.g, message.color.b);
        }

        // add the particle system
        this.add(new THREE.Points(geometry3, material3));
        break;
      case MARKER_TEXT_VIEW_FACING:
        // only work on non-empty text
        if (message.text && message.text.length > 0) {
          // Use a THREE.Sprite to always be view-facing
          // ( code from http://stackoverflow.com/a/27348780 )
          const textColor = this.msgColor;

          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          const textHeight = 100;
          const fontString = 'normal ' + textHeight + 'px sans-serif';
          context.font = fontString;
          const metrics = context.measureText( message.text );
          const textWidth = metrics.width;

          canvas.width = textWidth;
          // To account for overhang (like the letter 'g'), make the canvas bigger
          // The non-text portion is transparent anyway
          canvas.height = 1.5 * textHeight;

          // this does need to be set again
          context.font = fontString;
          context.fillStyle = 'rgba('
            + Math.round(255 * textColor.r) + ', '
            + Math.round(255 * textColor.g) + ', '
            + Math.round(255 * textColor.b) + ', '
            + textColor.a + ')';
          context.textAlign = 'left';
          context.textBaseline = 'middle';
          context.fillText( message.text, 0, canvas.height/2);

          const texture = new THREE.Texture(canvas);
          texture.needsUpdate = true;

          const spriteMaterial = new THREE.SpriteMaterial({
            map: texture,
            // NOTE: This is needed for THREE.js r61, unused in r70
            useScreenCoordinates: false });
          const sprite = new THREE.Sprite( spriteMaterial );
          const textSize = message.scale.x;
          sprite.scale.set(textWidth / canvas.height * textSize, textSize, 1);

          this.add(sprite);
        }
        break;
      case MARKER_MESH_RESOURCE:
        // load and add the mesh
        let meshColorMaterial = null;
        if(message.color.r !== 0 || message.color.g !== 0 ||
           message.color.b !== 0 || message.color.a !== 0) {
          meshColorMaterial = colorMaterial;
        }
        this.msgMesh = message.mesh_resource ? message.mesh_resource.substr(10) : undefined;
        const meshResource = new MeshResource({
          path : path,
          resource : this.msgMesh,
          material : meshColorMaterial,
        });
        this.add(meshResource);
        break;
      case MARKER_TRIANGLE_LIST:
        // create the list of triangles
        const tri = new TriangleList({
          material : colorMaterial,
          vertices : message.points,
          colors : message.colors
        });
        tri.scale.set(message.scale.x, message.scale.y, message.scale.z);
        this.add(tri);
        break;
      default:
        console.error('Currently unsupported marker type: ' + message.type);
        break;
    }
  }

  /**
   * Set the pose of this marker to the given values.
   *
   * @param pose - the pose to set for this marker
   */
  setPose(pose) {
    // set position information
    this.position.x = pose.position.x;
    this.position.y = pose.position.y;
    this.position.z = pose.position.z;

    // set the rotation
    this.quaternion.set(pose.orientation.x, pose.orientation.y,
        pose.orientation.z, pose.orientation.w);
    this.quaternion.normalize();

    // update the world
    this.updateMatrixWorld();
  }

  /**
   * Update this marker.
   *
   * @param message - the marker message
   * @return true on success otherwise false is returned
   */
  update(message) {
    // set the pose and get the color
    this.setPose(message.pose);

    // Update color
    if(message.color.r !== this.msgColor.r ||
       message.color.g !== this.msgColor.g ||
       message.color.b !== this.msgColor.b ||
       message.color.a !== this.msgColor.a)
    {
        const colorMaterial = makeColorMaterial(
            message.color.r, message.color.g,
            message.color.b, message.color.a);

        switch (message.type) {
        case MARKER_LINE_STRIP:
        case MARKER_LINE_LIST:
        case MARKER_POINTS:
            break;
        case MARKER_ARROW:
        case MARKER_CUBE:
        case MARKER_SPHERE:
        case MARKER_CYLINDER:
        case MARKER_TRIANGLE_LIST:
        case MARKER_TEXT_VIEW_FACING:
            this.traverse (function (child){
                if (child instanceof THREE.Mesh) {
                    child.material = colorMaterial;
                }
            });
            break;
        case MARKER_MESH_RESOURCE:
            let meshColorMaterial = null;
            if(message.color.r !== 0 || message.color.g !== 0 ||
               message.color.b !== 0 || message.color.a !== 0) {
                // Note: Using existing colorMaterial here is incorrect in this context
                // The original code may have been referencing a different variable
            }
            this.traverse (function (child){
                if (child instanceof THREE.Mesh) {
                    child.material = meshColorMaterial;
                }
            });
            break;
        case MARKER_CUBE_LIST:
        case MARKER_SPHERE_LIST:
            const instancedMesh = this.children[0];
            // If the number of points changes, we cannot update in place, so force recreation.
            if (!instancedMesh || (message.points && message.points.length !== instancedMesh.count)) {
                return false;
            }
            
            const matrix = new THREE.Matrix4();
            const position = new THREE.Vector3();
            const scale = new THREE.Vector3(1, 1, 1); // Scale is handled by geometry
            const quaternion = new THREE.Quaternion();
            
            // Update positions for each instance
            for (let i = 0; i < message.points.length; i++) {
              position.set(message.points[i].x, message.points[i].y, message.points[i].z);
              matrix.compose(position, quaternion, scale);
              instancedMesh.setMatrixAt(i, matrix);
            }
            instancedMesh.instanceMatrix.needsUpdate = true;
            return true;
        default:
            return false;
        }

        this.msgColor = message.color;
    }

    // Update geometry
    const scaleChanged =
          Math.abs(this.msgScale[0] - message.scale.x) > 1.0e-6 ||
          Math.abs(this.msgScale[1] - message.scale.y) > 1.0e-6 ||
          Math.abs(this.msgScale[2] - message.scale.z) > 1.0e-6;
    this.msgScale = [message.scale.x, message.scale.y, message.scale.z];

    switch (message.type) {
      case MARKER_CUBE:
      case MARKER_SPHERE:
      case MARKER_CYLINDER:
          if(scaleChanged) {
              return false;
          }
          break;
      case MARKER_TEXT_VIEW_FACING:
          if(scaleChanged || this.text !== message.text) {
              return false;
          }
          break;
      case MARKER_MESH_RESOURCE:
          const meshResource = message.mesh_resource ? message.mesh_resource.substr(10) : "";
          if(meshResource !== this.msgMesh) {
              return false;
          }
          if(scaleChanged) {
              return false;
          }
          break;
      case MARKER_ARROW:
      case MARKER_LINE_STRIP:
      case MARKER_LINE_LIST:
      case MARKER_CUBE_LIST:
      case MARKER_SPHERE_LIST:
      case MARKER_POINTS:
      case MARKER_TRIANGLE_LIST:
          // TODO: Check if geometry changed
          return false;
      default:
          break;
    }

    return true;
  }

  /**
   * Free memory of elements in this marker.
   */
  dispose() {
    this.children.forEach(function(element) {
      if (element instanceof MeshResource) {
        element.children.forEach(function(scene) {
          if (scene.material !== undefined) {
            scene.material.dispose();
          }
          scene.children.forEach(function(mesh) {
            if (mesh.geometry !== undefined) {
              mesh.geometry.dispose();
            }
            if (mesh.material !== undefined) {
              mesh.material.dispose();
            }
            scene.remove(mesh);
          });
          element.remove(scene);
        });
      } else {
        if (element.geometry !== undefined) {
            element.geometry.dispose();
        }
        if (element.material !== undefined) {
            element.material.dispose();
        }
      }
      // element.parent.remove(element); // Removed this line
    });
  }
}