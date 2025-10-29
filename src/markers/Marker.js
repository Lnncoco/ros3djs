/**
 * @fileOverview
 * @author David Gossow - dgossow@willowgarage.com
 * @author Russell Toris - rctoris@wpi.edu
 */

/**
 * A Marker can convert a ROS marker message into a THREE object.
 *
 * @constructor
 * @param options - object with following keys:
 *
 *   * path - the base path or URL for any mesh files that will be loaded for this marker
 *   * message - the marker message
 */
ROS3D.Marker = function(options) {
  THREE.Object3D.call(this);

  options = options || {};
  var path = options.path || '/';
  var message = options.message;

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
  var colorMaterial = ROS3D.makeColorMaterial(this.msgColor.r,
      this.msgColor.g, this.msgColor.b, this.msgColor.a);

  // create the object based on the type
  switch (message.type) {
    case ROS3D.MARKER_ARROW:
      // get the sizes for the arrow
      var len = message.scale.x;
      var headLength = len * 0.23;
      var headDiameter = message.scale.y;
      var shaftDiameter = headDiameter * 0.5;

      // determine the points
      var direction, p1 = null;
      if (message.points.length === 2) {
        p1 = new THREE.Vector3(message.points[0].x, message.points[0].y, message.points[0].z);
        var p2 = new THREE.Vector3(message.points[1].x, message.points[1].y, message.points[1].z);
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
      this.add(new ROS3D.Arrow({
        direction : direction,
        origin : p1,
        length : len,
        headLength : headLength,
        shaftDiameter : shaftDiameter,
        headDiameter : headDiameter,
        material : colorMaterial
      }));
      break;
    case ROS3D.MARKER_CUBE:
      // set the cube dimensions
      var cubeGeom = new THREE.BoxGeometry(message.scale.x, message.scale.y, message.scale.z);
      this.add(new THREE.Mesh(cubeGeom, colorMaterial));
      break;
    case ROS3D.MARKER_SPHERE:
      // set the sphere dimensions
      var sphereGeom = new THREE.SphereGeometry(0.5);
      var sphereMesh = new THREE.Mesh(sphereGeom, colorMaterial);
      sphereMesh.scale.x = message.scale.x;
      sphereMesh.scale.y = message.scale.y;
      sphereMesh.scale.z = message.scale.z;
      this.add(sphereMesh);
      break;
    case ROS3D.MARKER_CYLINDER:
      // set the cylinder dimensions
      var cylinderGeom = new THREE.CylinderGeometry(0.5, 0.5, 1, 16, 1, false);
      var cylinderMesh = new THREE.Mesh(cylinderGeom, colorMaterial);
      cylinderMesh.quaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI * 0.5);
      cylinderMesh.scale.set(message.scale.x, message.scale.z, message.scale.y);
      this.add(cylinderMesh);
      break;
    case ROS3D.MARKER_LINE_STRIP:
      var lineStripGeom = new THREE.BufferGeometry();
      var lineStripMaterial = new THREE.LineBasicMaterial({
        linewidth : message.scale.x
      });

      // Create positions array
      var positions = new Float32Array(message.points.length * 3);
      for (var j = 0; j < message.points.length; j++) {
        positions[j * 3] = message.points[j].x;
        positions[j * 3 + 1] = message.points[j].y;
        positions[j * 3 + 2] = message.points[j].z;
      }

      // Set positions attribute
      lineStripGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3));

      // determine the colors for each
      if (message.colors.length === message.points.length) {
        lineStripMaterial.vertexColors = true;
        var colors = new Float32Array(message.colors.length * 3);
        for (var j = 0; j < message.colors.length; j++) {
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
    case ROS3D.MARKER_LINE_LIST:
      var lineListGeom = new THREE.BufferGeometry();
      var lineListMaterial = new THREE.LineBasicMaterial({
        linewidth : message.scale.x
      });

      // Create positions array
      var positions = new Float32Array(message.points.length * 3);
      for (var k = 0; k < message.points.length; k++) {
        positions[k * 3] = message.points[k].x;
        positions[k * 3 + 1] = message.points[k].y;
        positions[k * 3 + 2] = message.points[k].z;
      }

      // Set positions attribute
      lineListGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3));

      // determine the colors for each
      if (message.colors.length === message.points.length) {
        lineListMaterial.vertexColors = true;
        var colors = new Float32Array(message.colors.length * 3);
        for (var k = 0; k < message.colors.length; k++) {
          colors[k * 3] = message.colors[k].r;
          colors[k * 3 + 1] = message.colors[k].g;
          colors[k * 3 + 2] = message.colors[k].b;
        }
        lineListGeom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      } else {
        lineListMaterial.color.setRGB(message.color.r, message.color.g, message.color.b);
      }

      // add the line
      this.add(new THREE.LineSegments(lineListGeom, lineListMaterial));
      break;
    case ROS3D.MARKER_CUBE_LIST:
      // Use instanced rendering for better performance with large lists
      var numPoints = message.points.length;
      var geometry = new THREE.BoxGeometry(message.scale.x, message.scale.y, message.scale.z);
      
      // For color handling in instanced rendering we need to use a different approach
      // Create a single InstancedMesh with multiple instances
      var instancedMesh = new THREE.InstancedMesh(geometry, colorMaterial, numPoints);
      
      var matrix = new THREE.Matrix4();
      var position = new THREE.Vector3();
      var scale = new THREE.Vector3(1, 1, 1); // scale is handled by geometry
      var quaternion = new THREE.Quaternion();
      
      // Set position for each instance
      for (var i = 0; i < numPoints; i++) {
        position.set(message.points[i].x, message.points[i].y, message.points[i].z);
        matrix.compose(position, quaternion, scale);
        instancedMesh.setMatrixAt(i, matrix);
      }
      
      instancedMesh.instanceMatrix.needsUpdate = true;
      this.add(instancedMesh);
      break;
    case ROS3D.MARKER_SPHERE_LIST:
      // Use instanced rendering for better performance with large lists
      var numPoints = message.points.length;
      var geometry = new THREE.SphereGeometry(0.5, 8, 8);
      
      // Create a single InstancedMesh with multiple instances
      var instancedMesh = new THREE.InstancedMesh(geometry, colorMaterial, numPoints);
      
      var matrix = new THREE.Matrix4();
      var position = new THREE.Vector3();
      var scale = new THREE.Vector3(message.scale.x, message.scale.y, message.scale.z);
      var quaternion = new THREE.Quaternion();
      
      // Set position and scale for each instance
      for (var i = 0; i < numPoints; i++) {
        position.set(message.points[i].x, message.points[i].y, message.points[i].z);
        matrix.compose(position, quaternion, scale);
        instancedMesh.setMatrixAt(i, matrix);
      }
      
      instancedMesh.instanceMatrix.needsUpdate = true;
      this.add(instancedMesh);
      break;
    case ROS3D.MARKER_POINTS:
      // for now, use a particle system for the lists
      var geometry = new THREE.BufferGeometry();
      var material = new THREE.PointsMaterial({
        size : message.scale.x
      });

      // Create positions array
      var positions = new Float32Array(message.points.length * 3);
      for (var i = 0; i < message.points.length; i++) {
        positions[i * 3] = message.points[i].x;
        positions[i * 3 + 1] = message.points[i].y;
        positions[i * 3 + 2] = message.points[i].z;
      }

      // Set positions attribute
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

      // determine the colors for each
      if (message.colors.length === message.points.length) {
        material.vertexColors = true;
        var colors = new Float32Array(message.colors.length * 3);
        for (var i = 0; i < message.colors.length; i++) {
          colors[i * 3] = message.colors[i].r;
          colors[i * 3 + 1] = message.colors[i].g;
          colors[i * 3 + 2] = message.colors[i].b;
        }
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      } else {
        material.color.setRGB(message.color.r, message.color.g, message.color.b);
      }

      // add the particle system
      this.add(new THREE.Points(geometry, material));
      break;
    case ROS3D.MARKER_TEXT_VIEW_FACING:
      // only work on non-empty text
      if (message.text.length > 0) {
        // Use a THREE.Sprite to always be view-facing
        // ( code from http://stackoverflow.com/a/27348780 )
        var textColor = this.msgColor;

        var canvas = document.createElement('canvas');
        var context = canvas.getContext('2d');
        var textHeight = 100;
        var fontString = 'normal ' + textHeight + 'px sans-serif';
        context.font = fontString;
        var metrics = context.measureText( message.text );
        var textWidth = metrics.width;

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

        var texture = new THREE.Texture(canvas);
        texture.needsUpdate = true;

        var spriteMaterial = new THREE.SpriteMaterial({
          map: texture,
          // NOTE: This is needed for THREE.js r61, unused in r70
          useScreenCoordinates: false });
        var sprite = new THREE.Sprite( spriteMaterial );
        var textSize = message.scale.x;
        sprite.scale.set(textWidth / canvas.height * textSize, textSize, 1);

        this.add(sprite);      }
      break;
    case ROS3D.MARKER_MESH_RESOURCE:
      // load and add the mesh
      var meshColorMaterial = null;
      if(message.color.r !== 0 || message.color.g !== 0 ||
         message.color.b !== 0 || message.color.a !== 0) {
        meshColorMaterial = colorMaterial;
      }
      this.msgMesh = message.mesh_resource.substr(10);
      var meshResource = new ROS3D.MeshResource({
        path : path,
        resource :  this.msgMesh,
        material : meshColorMaterial,
      });
      this.add(meshResource);
      break;
    case ROS3D.MARKER_TRIANGLE_LIST:
      // create the list of triangles
      var tri = new ROS3D.TriangleList({
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
};
ROS3D.Marker.prototype.__proto__ = THREE.Object3D.prototype;

/**
 * Set the pose of this marker to the given values.
 *
 * @param pose - the pose to set for this marker
 */
ROS3D.Marker.prototype.setPose = function(pose) {
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
};

/**
 * Update this marker.
 *
 * @param message - the marker message
 * @return true on success otherwhise false is returned
 */
ROS3D.Marker.prototype.update = function(message) {
  // set the pose and get the color
  this.setPose(message.pose);

  // Update color
  if(message.color.r !== this.msgColor.r ||
     message.color.g !== this.msgColor.g ||
     message.color.b !== this.msgColor.b ||
     message.color.a !== this.msgColor.a)
  {
      var colorMaterial = ROS3D.makeColorMaterial(
          message.color.r, message.color.g,
          message.color.b, message.color.a);

      switch (message.type) {
      case ROS3D.MARKER_LINE_STRIP:
      case ROS3D.MARKER_LINE_LIST:
      case ROS3D.MARKER_POINTS:
          break;
      case ROS3D.MARKER_ARROW:
      case ROS3D.MARKER_CUBE:
      case ROS3D.MARKER_SPHERE:
      case ROS3D.MARKER_CYLINDER:
      case ROS3D.MARKER_TRIANGLE_LIST:
      case ROS3D.MARKER_TEXT_VIEW_FACING:
          this.traverse (function (child){
              if (child instanceof THREE.Mesh) {
                  child.material = colorMaterial;
              }
          });
          break;
      case ROS3D.MARKER_MESH_RESOURCE:
          var meshColorMaterial = null;
          if(message.color.r !== 0 || message.color.g !== 0 ||
             message.color.b !== 0 || message.color.a !== 0) {
              meshColorMaterial = this.colorMaterial;
          }
          this.traverse (function (child){
              if (child instanceof THREE.Mesh) {
                  child.material = meshColorMaterial;
              }
          });
          break;
      case ROS3D.MARKER_CUBE_LIST:
      case ROS3D.MARKER_SPHERE_LIST:
          // TODO Support to update color for MARKER_CUBE_LIST & MARKER_SPHERE_LIST
          return false;
      default:
          return false;
      }

      this.msgColor = message.color;
  }

  // Update geometry
  var scaleChanged =
        Math.abs(this.msgScale[0] - message.scale.x) > 1.0e-6 ||
        Math.abs(this.msgScale[1] - message.scale.y) > 1.0e-6 ||
        Math.abs(this.msgScale[2] - message.scale.z) > 1.0e-6;
  this.msgScale = [message.scale.x, message.scale.y, message.scale.z];

  switch (message.type) {
    case ROS3D.MARKER_CUBE:
    case ROS3D.MARKER_SPHERE:
    case ROS3D.MARKER_CYLINDER:
        if(scaleChanged) {
            return false;
        }
        break;
    case ROS3D.MARKER_TEXT_VIEW_FACING:
        if(scaleChanged || this.text !== message.text) {
            return false;
        }
        break;
    case ROS3D.MARKER_MESH_RESOURCE:
        var meshResource = message.mesh_resource.substr(10);
        if(meshResource !== this.msgMesh) {
            return false;
        }
        if(scaleChanged) {
            return false;
        }
        break;
    case ROS3D.MARKER_ARROW:
    case ROS3D.MARKER_LINE_STRIP:
    case ROS3D.MARKER_LINE_LIST:
    case ROS3D.MARKER_CUBE_LIST:
    case ROS3D.MARKER_SPHERE_LIST:
    case ROS3D.MARKER_POINTS:
    case ROS3D.MARKER_TRIANGLE_LIST:
        // TODO: Check if geometry changed
        return false;
    default:
        break;
  }

  return true;
};

/*
 * Free memory of elements in this marker.
 */
ROS3D.Marker.prototype.dispose = function() {
  this.children.forEach(function(element) {
    if (element instanceof ROS3D.MeshResource) {
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
    element.parent.remove(element);
  });
};
