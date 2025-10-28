/**
 * @fileOverview
 * @author Russell Toris - rctoris@wpi.edu
 * @author David Gossow - dgossow@willowgarage.com
 */

var ROS3D = ROS3D || {
  /**
   * @default
   * @description Library version
   */
  REVISION : '1.1.0'
};

// Marker types
ROS3D.MARKER_ARROW = 0;
ROS3D.MARKER_CUBE = 1;
ROS3D.MARKER_SPHERE = 2;
ROS3D.MARKER_CYLINDER = 3;
ROS3D.MARKER_LINE_STRIP = 4;
ROS3D.MARKER_LINE_LIST = 5;
ROS3D.MARKER_CUBE_LIST = 6;
ROS3D.MARKER_SPHERE_LIST = 7;
ROS3D.MARKER_POINTS = 8;
ROS3D.MARKER_TEXT_VIEW_FACING = 9;
ROS3D.MARKER_MESH_RESOURCE = 10;
ROS3D.MARKER_TRIANGLE_LIST = 11;

// Interactive marker feedback types
ROS3D.INTERACTIVE_MARKER_KEEP_ALIVE = 0;
ROS3D.INTERACTIVE_MARKER_POSE_UPDATE = 1;
ROS3D.INTERACTIVE_MARKER_MENU_SELECT = 2;
ROS3D.INTERACTIVE_MARKER_BUTTON_CLICK = 3;
ROS3D.INTERACTIVE_MARKER_MOUSE_DOWN = 4;
ROS3D.INTERACTIVE_MARKER_MOUSE_UP = 5;

// Interactive marker control types
ROS3D.INTERACTIVE_MARKER_NONE = 0;
ROS3D.INTERACTIVE_MARKER_MENU = 1;
ROS3D.INTERACTIVE_MARKER_BUTTON = 2;
ROS3D.INTERACTIVE_MARKER_MOVE_AXIS = 3;
ROS3D.INTERACTIVE_MARKER_MOVE_PLANE = 4;
ROS3D.INTERACTIVE_MARKER_ROTATE_AXIS = 5;
ROS3D.INTERACTIVE_MARKER_MOVE_ROTATE = 6;
ROS3D.INTERACTIVE_MARKER_MOVE_3D = 7;
ROS3D.INTERACTIVE_MARKER_ROTATE_3D = 8;
ROS3D.INTERACTIVE_MARKER_MOVE_ROTATE_3D = 9;

// Interactive marker rotation behavior
ROS3D.INTERACTIVE_MARKER_INHERIT = 0;
ROS3D.INTERACTIVE_MARKER_FIXED = 1;
ROS3D.INTERACTIVE_MARKER_VIEW_FACING = 2;

/**
 * @function makeColorMaterial
 * @description Create a THREE material based on the given RGBA values.
 *
 * @param r - the red value
 * @param g - the green value
 * @param b - the blue value
 * @param a - the alpha value
 * @returns the THREE material
 */
ROS3D.makeColorMaterial = function(r, g, b, a) {
  var color = new THREE.Color();
  color.setRGB(r, g, b);
  if (a <= 0.99) {
    return new THREE.MeshBasicMaterial({
      color : color.getHex(),
      opacity : a + 0.1,
      transparent : true,
      depthWrite : true,
      blendSrc : THREE.SrcAlphaFactor,
      blendDst : THREE.OneMinusSrcAlphaFactor,
      blendEquation : THREE.ReverseSubtractEquation,
      blending : THREE.NormalBlending
    });
  } else {
    return new THREE.MeshPhongMaterial({
      color : color.getHex(),
      opacity : a,
      blending : THREE.NormalBlending
    });
  }
};

/**
 * @function intersectPlane
 * @description Return the intersection between the mouseray and the plane.
 *
 * @param mouseRay - the mouse ray
 * @param planeOrigin - the origin of the plane
 * @param planeNormal - the normal of the plane
 * @returns the intersection point
 */
ROS3D.intersectPlane = function(mouseRay, planeOrigin, planeNormal) {
  var vector = new THREE.Vector3();
  var intersectPoint = new THREE.Vector3();
  vector.subVectors(planeOrigin, mouseRay.origin);
  var dot = mouseRay.direction.dot(planeNormal);

  // bail if ray and plane are parallel
  if (Math.abs(dot) < mouseRay.precision) {
    return undefined;
  }

  // calc distance to plane
  var scalar = planeNormal.dot(vector) / dot;

  intersectPoint.addVectors(mouseRay.origin, mouseRay.direction.clone().multiplyScalar(scalar));
  return intersectPoint;
};

/**
 * @function findClosestPoint
 * @description Find the closest point on targetRay to any point on mouseRay. Math taken from
 * http://paulbourke.net/geometry/lineline3d/
 *
 * @param targetRay - the target ray to use
 * @param mouseRay - the mouse ray
 * @param the closest point between the two rays
 */
ROS3D.findClosestPoint = function(targetRay, mouseRay) {
  var v13 = new THREE.Vector3();
  v13.subVectors(targetRay.origin, mouseRay.origin);
  var v43 = mouseRay.direction.clone();
  var v21 = targetRay.direction.clone();
  var d1343 = v13.dot(v43);
  var d4321 = v43.dot(v21);
  var d1321 = v13.dot(v21);
  var d4343 = v43.dot(v43);
  var d2121 = v21.dot(v21);

  var denom = d2121 * d4343 - d4321 * d4321;
  // check within a delta
  if (Math.abs(denom) <= 0.0001) {
    return undefined;
  }
  var numer = d1343 * d4321 - d1321 * d4343;

  var mua = numer / denom;
  return mua;
};

/**
 * @function closestAxisPoint
 * @description Find the closest point between the axis and the mouse.
 *
 * @param axisRay - the ray from the axis
 * @param camera - the camera to project from
 * @param mousePos - the mouse position
 * @returns the closest axis point
 */
ROS3D.closestAxisPoint = function(axisRay, camera, mousePos) {
  // project axis onto screen
  var o = axisRay.origin.clone();
  o.project(camera);
  var o2 = axisRay.direction.clone().add(axisRay.origin);
  o2.project(camera);

  // d is the axis vector in screen space (d = o2-o)
  var d = o2.clone().sub(o);

  // t is the 2d ray param of perpendicular projection of mousePos onto o
  var tmp = new THREE.Vector2();
  // (t = (mousePos - o) * d / (d*d))
  var t = tmp.subVectors(mousePos, o).dot(d) / d.dot(d);

  // mp is the final 2d-projected mouse pos (mp = o + d*t)
  var mp = new THREE.Vector2();
  mp.addVectors(o, d.clone().multiplyScalar(t));

  // go back to 3d by shooting a ray
  var vector = new THREE.Vector3(mp.x, mp.y, 0.5);
  vector.unproject(camera);
  var mpRay = new THREE.Ray(camera.position, vector.sub(camera.position).normalize());

  return ROS3D.findClosestPoint(axisRay, mpRay);
};

/**
 * @fileOverview
 * @author Peter Sari - sari@photoneo.com
 */

/**
 * Base node type that represents one voxel as a node of the tree
 */

ROS3D.OcTreeBaseNode = function () {
  this._children = [null, null, null, null, null, null, null, null];
  this.value = null;
};

ROS3D.OcTreeBaseNode.prototype.createChildNodeAt = function (newNode, index) {
  this._children[index % 8] = newNode;
};

ROS3D.OcTreeBaseNode.prototype.hasChildAt = function (index) {
  return this._children[index % 8] !== null;
};

ROS3D.OcTreeBaseNode.prototype.getChildAt = function (index) {
  return this._children[index % 8];
};

ROS3D.OcTreeBaseNode.prototype.isLeafNode = function () {
  for (let i = 0; i < 8; ++i) {
    if (this._children[i] !== null) { return false; }
  }
  return true;
};

ROS3D.OcTreeBaseNode.prototype.hasChildren = function () {
  for (let i = 0; i < 8; ++i) {
    if (this._children[i] !== null) { return true; }
  }
  return false;
};

/**
 * @fileOverview
 * @author Peter Sari - sari@photoneo.com
 */

/**
 * Toggles voxel visibility
 *
 *    * `occupied` - only voxels that are above or equal to the occupation threshold are shown
 *    * `free` - only voxels that are below the occupation threshold are shown
 *    * `all` - all allocated voxels are shown
 */
ROS3D.OcTreeVoxelRenderMode = {
  OCCUPIED: 'occupied',
  FREE: 'free',
  ALL: 'all',
};

/**
 * Coloring modes for each voxel
 *
 *     * 'solid' - voxels will have a single solid color set by the tree globally
 *     * 'occupancy' - voxels are false colored by their occupancy value. Fall back for `solid` if not available.
 *     * 'color' - voxels will colorized by their
 */
ROS3D.OcTreeColorMode = {
  SOLID: 'solid',
  OCCUPANCY: 'occupancy',
  COLOR: 'color'
};

// ----- ----- ----- ----- ----- ----- ----- ----- ----- ----- ----- ----- -----

/**
 Quick and dirty helper class
 to read ArrayBuffer in a streamed data-like fashion with mixed types in it
*/
function InStream(data, isLittleEndian) {
  this.buffer = data.buffer;
  this.length = data.length;
  this.isLittleEndian = (typeof isLittleEndian !== 'undefined') ? !!isLittleEndian : true;
  this._dataView = new DataView(this.buffer);
  this._cursor = 0;

  // Creates a set of wrapper functions for DataView
  // also flattens all dependencies
  [
    { kind: 'Int8', width: 1 },
    { kind: 'Uint8', width: 1 },
    { kind: 'Int16', width: 2 },
    { kind: 'Uint16', width: 2 },
    { kind: 'Int32', width: 4 },
    { kind: 'Uint32', width: 4 },
    { kind: 'BigInt64', width: 8 },
    { kind: 'BigUint64', width: 8 },
    { kind: 'Float32', width: 4 },
    { kind: 'Float64', width: 8 },
  ]
    .forEach(wrap => {
      const interfaceFunction = 'read' + wrap.kind;
      const wrappedFunction = 'get' + wrap.kind;       // Function name which going to be wrapped from DataView

      this[interfaceFunction] = () => {
        if (this._cursor + wrap.width > this.length) { throw new Error('Cannot read data stream. Overflow. Len=' + this.length + ' crsr=' + this._cursor); }
        const returningValue = this._dataView[wrappedFunction](this._cursor, this.isLittleEndian);
        this._cursor += wrap.width;
        return returningValue;
      };
    });

  Object.defineProperty(this, 'isEnd', { get: () => this.cursor >= this.data.length });
  return this;
};

// ----- ----- ----- ----- ----- ----- ----- ----- ----- ----- ----- ----- -----

/**
 * Represensta a BaseTree that can be build from ros message and create a THREE node from it.
 * Due a tree can be represented different ways in a message, this class is also a base class to
 * represent specialized versions fo the ree.
 *
 * @constructor
 * @param options - object with following keys:
 *
 *    * resolution - the size of leaf nodes in meter
 *    * color - color of the visualized map (if solid coloring option was set)
 *    * voxelRenderMode - toggle between rendering modes @see ROS3D.OcTreeVoxelRenderMode
 */
ROS3D.OcTreeBase = function(options) {

  this.resolution = (typeof options.resolution !== 'undefined') ? options.resolution : 1.;
  this.color = new THREE.Color((typeof options.color !== 'undefined') ? options.color : 'green');
  this.opacity = (typeof options.opacity !== 'undefined') ? options.opacity : 1.;

  this.voxelRenderMode = (typeof options.voxelRenderMode !== 'undefined') ? options.voxelRenderMode : ROS3D.OcTreeVoxelRenderMode.OCCUPIED;

  this._rootNode = null;
  this._treeDepth = 16;
  this._treeMaxKeyVal = 32768;

  this._BINARY_UNALLOCATED = 0b00;
  this._BINARY_LEAF_FREE = 0b01;
  this._BINARY_LEAF_OCCUPIED = 0b10;
  this._BINARY_HAS_CHILDREN = 0b11;

  this._BINARY_CHILD_BUILD_TABLE = {};

  this._BINARY_CHILD_BUILD_TABLE[this._BINARY_LEAF_FREE] = function (child) {
    child.value = this._defaultFreeValue;
  };

  this._BINARY_CHILD_BUILD_TABLE[this._BINARY_LEAF_OCCUPIED] = function (child) {
    child.value = this._defaultOccupiedValue;
  };

  this._BINARY_CHILD_BUILD_TABLE[this._BINARY_HAS_CHILDREN] = function (child) {
    child.value = null;
  };

  /**
   * Table which we are building the geometry data from.
   */
  this._FACES = [
    { // 0. left (x=0)
      normal: [-1, 0, 0,],
      vertices: [
        [0, 1, 0],
        [0, 0, 0],
        [0, 1, 1],
        [0, 0, 1],
      ],
      childIndex: [
        0b001,
        0b011,
        0b101,
        0b111
      ]
    },
    { // 1. right (x=1)
      normal: [1, 0, 0,],
      vertices: [
        [1, 1, 1],
        [1, 0, 1],
        [1, 1, 0],
        [1, 0, 0],
      ],

      childIndex: [
        0b000,
        0b010,
        0b100,
        0b110
      ]
    },
    { // 2. bottom (y=0)
      normal: [0, -1, 0,],
      vertices: [
        [1, 0, 1],
        [0, 0, 1],
        [1, 0, 0],
        [0, 0, 0],
      ],
      childIndex: [
        0b010,
        0b011,
        0b110,
        0b111
      ]
    },
    { // 3. top (y=1)
      normal: [0, 1, 0,],
      vertices: [
        [0, 1, 1],
        [1, 1, 1],
        [0, 1, 0],
        [1, 1, 0],
      ],
      childIndex: [
        0b000,
        0b001,
        0b100,
        0b101
      ]
    },
    { // 4. back (z=0)
      normal: [0, 0, -1,],
      vertices: [
        [1, 0, 0],
        [0, 0, 0],
        [1, 1, 0],
        [0, 1, 0],
      ],
      childIndex: [
        0b100,
        0b101,
        0b110,
        0b111
      ]
    },
    { // 5.front (z=1)
      normal: [0, 0, 1,],
      vertices: [
        [0, 0, 1],
        [1, 0, 1],
        [0, 1, 1],
        [1, 1, 1],
      ],
      childIndex: [
        0b000,
        0b001,
        0b010,
        0b011
      ]
    },
  ];

  // Table of voxel size for each level of the tree
  this.nodeSizeTable = new Array(this._treeDepth);
  let _val = this.resolution;
  for (let i = this._treeDepth - 1; i >= 0; --i) {
    this.nodeSizeTable[i] = _val;
    _val = 2. * _val;
  }

  this._defaultOccupiedValue = true;
  this._defaultFreeValue = false;

  this.object = null;
};


/*
 * Finds a key in a given depth. Search is performed on the lowest level by default.
 * @return the node at given position, null if not found
 */
ROS3D.OcTreeBase.prototype.searchAtDepth = function (key, depth) {
  depth = (typeof depth !== 'undefined') ? (depth > 0 ? depth : this._treeDepth) : this._treeDepth;

  const keyAtDepth = this._adjustKeyAtDepth(key, depth);
  const diff = this._treeDepth - depth;
  let currentNode = this._rootNode;

  // follow nodes down to requested level (for diff = 0 it's the last level)
  // Return the closest node, or null if not any

  for (let i = (this._treeDepth - 1); i >= diff; --i) {
    const pos = this._computeChildIdx(keyAtDepth, i);
    if (currentNode.hasChildAt(pos)) {
      currentNode = currentNode.getChildAt(pos);
    } else {
      // we expected a child but did not get it
      // is the current node a leaf already?
      if (!currentNode.hasChildren()) { return currentNode; }
      // it is not, search failed
      return null;
    }
  }

  return currentNode;

};

/**
 *
 */
ROS3D.OcTreeBase.prototype._computeCoordFromKey = function (key) {
  return key.map(keyVal => this.resolution * (keyVal - this._treeMaxKeyVal));
};

ROS3D.OcTreeBase.prototype._computeChildIdx = function (key, depth) {
  let pos = 0;
  if (key[0] & (1 << depth)) { pos += 1; }
  if (key[1] & (1 << depth)) { pos += 2; }
  if (key[2] & (1 << depth)) { pos += 4; }

  return pos;
};

ROS3D.OcTreeBase.prototype._computeKeyFromChildIdx = function (index, offset, depth) {
  const diff = this._treeDepth - depth - 1;

  return [
    offset[0] + (!!(index & 1) << diff),
    offset[1] + (!!(index & 2) << diff),
    offset[2] + (!!(index & 4) << diff),
  ];

};

ROS3D.OcTreeBase.prototype._adjustKeyAtDepth = function (key, depth) {
  // generate appropriate key_at_depth for queried depth
  let diff = this._treeDepth - depth;
  if (diff === 0) { return key; }

  return key.map(keyVal => (((keyVal - this._treeMaxKeyVal) >> diff) << diff) + (1 << (diff - 1)) + this._treeMaxKeyVal);
};

ROS3D.OcTreeBase.prototype._newNode = function () { return new ROS3D.OcTreeBaseNode(); };

/*
 * Reads and builds a tree which was represented in a binary form from a message
 * Binary form only contains the tree structure to be allocated, all the data of voxels are stripped,
 * occupation is represented as a binary value.
 * Each node is represented as a 2-bit value which makes up the 8 child nodes of the parent (16 bits in total)
 * starting with the root node.
 */

ROS3D.OcTreeBase.prototype.readBinary = function (data) {
  if (this._rootNode !== null) {
    delete this._rootNode;
  }
  this._rootNode = this._newNode();

  let dataStream = new InStream(data, true);

  let stack = new Array();
  stack.push(this._rootNode);

  while (stack.length > 0) {
    let node = stack.pop();

    // 2 bits per children, 16 bit total
    const childAllocationMap = dataStream.readUint16();

    // Insert all children and leaves
    let index = 8;
    while (index !== 0) {
      --index;
      const allocation = (childAllocationMap & (0b11 << (2 * index))) >> (2 * index);

      if (allocation !== this._BINARY_UNALLOCATED) {
        let child = this._newNode();

        const fn = this._BINARY_CHILD_BUILD_TABLE[allocation].bind(this);
        fn(child);

        node.createChildNodeAt(child, index);
        if (allocation === this._BINARY_HAS_CHILDREN) { stack.push(child); }
      }
    }
  }

};

/**
 * Reads a full tree (with node data) from a message.
 * A pacjet starts with the node data, followed by the allocation map of their children.
 * Each type of tree has different data structure @see ROS3DJS.OcTreeBase._readNodeData
 */
ROS3D.OcTreeBase.prototype.read = function (data) {
  if (this._rootNode !== null) {
    delete this._rootNode;
  }

  this._rootNode = this._newNode();

  let dataStream = new InStream(data, true);

  let stack = new Array();
  stack.push(this._rootNode);

  while (stack.length > 0) {
    let node = stack.pop();

    // Data comes first
    this._readNodeData(dataStream, node);

    const childAllocationMap = dataStream.readUint8();

    // Insert all children and leaves
    let index = 8;
    while (index !== 0) {
      --index;
      const hasChild = childAllocationMap & (1 << index);
      if (hasChild) {
        let child = this._newNode();
        child.value = null;
        node.createChildNodeAt(child, index);
        stack.push(child);
      }
    }
  }

};

/**
 * Abstract function; Reads and sets data of a node
 */
ROS3D.OcTreeBase.prototype._readNodeData = function (dataStream, node) {
  // This needs to be implemented by specialized tree
  console.error('Not implemented');
};

/**
* Builds up THREE.js geometry from tree data.
*/
ROS3D.OcTreeBase.prototype.buildGeometry = function () {
  console.assert(this._rootNode !== null, 'No tree data');
  const { vertices, normals, colors, indices } = this._buildFaces();

  const geometry = new THREE.BufferGeometry();

  const material = new THREE.MeshBasicMaterial({
    color: 'white',
    flatShading: true,
    vertexColors: THREE.VertexColors,
    transparent: this.opacity < 1.0,
    opacity: this.opacity
  });

  geometry.addAttribute('position', new THREE.BufferAttribute(new Float32Array(vertices), 3));
  geometry.addAttribute('normal', new THREE.BufferAttribute(new Float32Array(normals), 3));
  geometry.addAttribute('color', new THREE.BufferAttribute(new Float32Array(colors), 3));

  geometry.setIndex(indices);

  const mesh = new THREE.Mesh(geometry, material);
  this.object = new THREE.Object3D();
  this.object.add(mesh);
};

ROS3D.OcTreeBase.prototype._traverseLeaves = function (callback) {
  let stack = new Array();
  stack.push({ node: this._rootNode, depth: 0, key: [0, 0, 0] });

  while (stack.length > 0) {
    let current = stack.pop();
    if (current.node.isLeafNode()) {
      callback(current.node, current.key, current.depth - 1);
    } else {
      for (let index = 0; index < 8; ++index) {
        if (current.node.hasChildAt(index)) {
          const key = this._computeKeyFromChildIdx(index, current.key, current.depth);
          stack.push({
            node: current.node.getChildAt(index),
            depth: current.depth + 1,
            key
          });
        }
      }
    }
  }
};

/**
 * Abstract function; to implement different coloring schemes
 */
ROS3D.OcTreeBase.prototype._obtainColor = function (node) {
  return this.color;
};

ROS3D.OcTreeBase.prototype._checkOccupied = function (node) {
  return node.value !== false;
};

ROS3D.OcTreeBase.prototype._buildFaces = function () {
  let geometry = {
    vertices: [],
    indices: [],
    normals: [],
    colors: [],

    _insertFace: function (face, pos, size, color) {
      const indexCount = this.vertices.length / 3;

      face.vertices.forEach(function(vertex) {
        this.vertices.push(
          pos[0] + vertex[0] * size,
          pos[1] + vertex[1] * size,
          pos[2] + vertex[2] * size
        );
      });

      const colorArr = [color.r, color.g, color.b];

      this.colors.push(...colorArr, ...colorArr, ...colorArr, ...colorArr);
      this.normals.push(...face.normal, ...face.normal, ...face.normal, ...face.normal);

      this.indices.push(
        indexCount, indexCount + 1, indexCount + 2,
        indexCount + 2, indexCount + 1, indexCount + 3
      );
    },

    _checkNeighborsTouchingFace: function (face, neighborNode, voxelRenderMode) {
      // Finds if there's not a node at a given position, aka a 'hole'
      let stack = new Array();
      stack.push(neighborNode);
      while (stack.length !== 0) {
        const node = stack.pop();
        if (node.hasChildren()) {
          face.childIndex.forEach(function(childIndex) {
            if (node.hasChildAt(childIndex)) {
              const child = node.getChildAt(childIndex);

              // filter occupancy
              const isOccupied = this._checkOccupied(node);
              const isNeedsToRender = (isOccupied && voxelRenderMode === ROS3D.OcTreeVoxelRenderMode.OCCUPIED) || (!isOccupied && voxelRenderMode === ROS3D.OcTreeVoxelRenderMode.FREE);

              if (isNeedsToRender) { stack.push(child); }
            }
            else {
              return true;
            }
          });
        }
      }
      return false;
    }

  };

  this._traverseLeaves((node, key, depth) => {
    const pos = this._computeCoordFromKey(key);
    const size = this.nodeSizeTable[depth];
    const diff = this._treeDepth - depth;

    const isOccupied = this._checkOccupied(node);

    // By default it will show ALL
    // Hide free voxels if set
    if (!isOccupied && this.voxelRenderMode === ROS3D.OcTreeVoxelRenderMode.OCCUPIED) { return; }

    // Hide occuped voxels if set.
    if (isOccupied && this.voxelRenderMode === ROS3D.OcTreeVoxelRenderMode.FREE) { return; }

    this._FACES.forEach(function(face) {
      // Add geometry where there is no neighbor voxel
      const neighborKey = [
        key[0] + face.normal[0] * diff * diff,
        key[1] + face.normal[1] * diff * diff,
        key[2] + face.normal[2] * diff * diff,
      ];
      const neighborNode = this.searchAtDepth(neighborKey);
      if (neighborNode === null) {
        // 1. Simply add geometry where there is no neighbors
        geometry._insertFace(face, pos, size, this._obtainColor(node));
      } else if (depth < this._treeDepth) {
        // 2. Special case, when a node (voxel) is not on the lowest level
        // of the tree, but also need to add a geometry, because might
        // not be "fully covered" by neighboring voxels on the lowest level

        if (geometry._checkNeighborsTouchingFace(face, neighborNode, this.voxelRenderMode)) {
          geometry._insertFace(face, pos, size, this._obtainColor(node));
        }
      }

    });

  });

  // return geometry;
  return {
    vertices: geometry.vertices,
    normals: geometry.normals,
    colors: geometry.colors,
    indices: geometry.indices
  };

};

/**
 * @fileOverview
 * @author Peter Sari - sari@photoneo.com
 */

/**
 * Specilaization of BaseOcTree
 *
 * @constructor
 * @param options - object with following keys:
 *    * inherited from BaseOctree
 *    * occupancyThreshold (optional) - threshold value that separates occupied and free voxels from each other. (Default: 0)
 *    * colorMode (optional) - Coloring mode @see ROS3D.OcTreeColorMode.
 *    * palette (optional) - Palette used for false-coloring (default: predefined palette)
 *    * paletteSclae (optional) - Scale of palette to represent a wider range of values (default: 1.)
 */

ROS3D.OcTree = function(options) {
  ROS3D.OcTreeBase.call(this, options);

  this._defaultOccupiedValue = 1.;
  this._defaultFreeValue = -1.;

  this.occupancyThreshold = (typeof options.occupancyThreshold !== 'undefined') ? options.occupancyThreshold : 0.0000001;

  this.useFlatColoring = (typeof options.colorMode !== 'undefined') && options.colorMode === ROS3D.OcTreeColorMode.SOLID;

  this.palette = (typeof options.palette !== 'undefined') ? options.palette.map(color => new THREE.Color(color)) :
    [
      { r: 0, g: 0, b: 128, }, // dark blue (low)
      { r: 0, g: 255, b: 0, }, // green
      { r: 255, g: 255, b: 0, }, // yellow (mid)
      { r: 255, g: 128, b: 0, }, // orange
      { r: 255, g: 0, b: 0, } // red (high)
    ];

  this.paletteScale = (typeof options.paletteScale !== 'undefined') ? options.paletteScale : 1.;
};

ROS3D.OcTree.prototype.__proto__ = ROS3D.OcTreeBase.prototype;

ROS3D.OcTree.prototype._readNodeData = function (dataStream, node) {
  node.value = dataStream.readFloat32();
};

ROS3D.OcTree.prototype._obtainColor = function (node) {
  if (this.useFlatColoring) {
    return this.color;
  }

  // Use a simple sigmoid curve to fit values from -inf..inf into 0..1 range
  const value = 1. / (1. + Math.exp(-node.value * this.paletteScale)) * this.palette.length; // Normalize

  const intVal = Math.trunc(value);
  const fracVal = value - intVal;

  if (intVal < 0) { return this.palette[0]; }
  if (intVal >= this.palette.length - 1) { return this.palette[this.palette.length - 1]; }

  // Simple lerp
  return {
    r: fracVal * this.palette[intVal].r + (1. - fracVal) * this.palette[intVal + 1].r,
    g: fracVal * this.palette[intVal].g + (1. - fracVal) * this.palette[intVal + 1].g,
    b: fracVal * this.palette[intVal].b + (1. - fracVal) * this.palette[intVal + 1].b,
  };

};

ROS3D.OcTree.prototype._checkOccupied = function (node) {
  return node.value >= this.occupancyThreshold;
};

/**
 * @fileOverview
 * @author Peter Sari - sari@photoneo.com
 */

ROS3D.ColorOcTree = function(options) {
  ROS3D.OcTree.call(this, options);
  this.useOwnColor = (typeof options.palette !== 'undefined') && options.colorMode === ROS3D.OcTreeColorMode.COLOR;
};

ROS3D.ColorOcTree.prototype.__proto__ = ROS3D.OcTree.prototype;

ROS3D.ColorOcTree.prototype._readNodeData = function (dataStream, node) {
  node.value = dataStream.readFloat32(); // occupancy
  node.color = {
    r: dataStream.readUint8(), // red
    g: dataStream.readUint8(), // green
    b: dataStream.readUint8(), // blue
  };

};

ROS3D.ColorOcTree.prototype._obtainColor = function (node) {
  if (!this.useOwnColor) { return ROS3D.OcTree.prototype._obtainColor.call(this, node); }
  return node.color;
};

/**
 * @fileOverview
 * @author Julius Kammerl - jkammerl@willowgarage.com
 */

/**
 * The DepthCloud object.
 *
 * @constructor
 * @param options - object with following keys:
 *
 *   * url - the URL of the stream
 *   * streamType (optional) - the stream type: mjpeg or vp8 video (defaults to vp8)
 *   * f (optional) - the camera's focal length (defaults to standard Kinect calibration)
 *   * maxDepthPerTile (optional) - the factor with which we control the desired depth range (defaults to 1.0)
 *   * pointSize (optional) - point size (pixels) for rendered point cloud
 *   * width (optional) - width of the video stream
 *   * height (optional) - height of the video stream
 *   * whiteness (optional) - blends rgb values to white (0..100)
 *   * varianceThreshold (optional) - threshold for variance filter, used for compression artifact removal
 */
ROS3D.DepthCloud = function(options) {
  THREE.Object3D.call(this);
  options = options || {};

  this.url = options.url;
  this.streamType = options.streamType || 'vp8';
  this.f = options.f || 526;
  this.maxDepthPerTile = options.maxDepthPerTile || 1.0;
  this.pointSize = options.pointSize || 3;
  this.width = options.width || 1024;
  this.height = options.height || 1024;
  this.resolutionFactor = Math.max(this.width, this.height) / 1024;
  this.whiteness = options.whiteness || 0;
  this.varianceThreshold = options.varianceThreshold || 0.000016667;

  this.isMjpeg = this.streamType.toLowerCase() === 'mjpeg';

  this.video = document.createElement(this.isMjpeg ? 'img' : 'video');
  this.video.crossOrigin = 'Anonymous';
  this.video.addEventListener(this.isMjpeg ? 'load' : 'loadedmetadata', this.metaLoaded.bind(this), false);

  if (!this.isMjpeg) {
    this.video.loop = true;
  }

  this.video.src = this.url;
  this.video.setAttribute('crossorigin', 'Anonymous');

  // define custom shaders
  this.vertex_shader = [
    'uniform sampler2D map;',
    '',
    'uniform float width;',
    'uniform float height;',
    'uniform float nearClipping, farClipping;',
    '',
    'uniform float pointSize;',
    'uniform float zOffset;',
    '',
    'uniform float focallength;',
    'uniform float maxDepthPerTile;',
    'uniform float resolutionFactor;',
    '',
    'varying vec2 vUvP;',
    'varying vec2 colorP;',
    '',
    'varying float depthVariance;',
    'varying float maskVal;',
    '',
    'float sampleDepth(vec2 pos)',
    '  {',
    '    float depth;',
    '    ',
    '    vec2 vUv = vec2( pos.x / (width*2.0), pos.y / (height*2.0)+0.5 );',
    '    vec2 vUv2 = vec2( pos.x / (width*2.0)+0.5, pos.y / (height*2.0)+0.5 );',
    '    ',
    '    vec4 depthColor = texture2D( map, vUv );',
    '    ',
    '    depth = ( depthColor.r + depthColor.g + depthColor.b ) / 3.0 ;',
    '    ',
    '    if (depth>0.99)',
    '    {',
    '      vec4 depthColor2 = texture2D( map, vUv2 );',
    '      float depth2 = ( depthColor2.r + depthColor2.g + depthColor2.b ) / 3.0 ;',
    '      depth = 0.99+depth2;',
    '    }',
    '    ',
    '    return depth;',
    '  }',
    '',
    'float median(float a, float b, float c)',
    '  {',
    '    float r=a;',
    '    ',
    '    if ( (a<b) && (b<c) )',
    '    {',
    '      r = b;',
    '    }',
    '    if ( (a<c) && (c<b) )',
    '    {',
    '      r = c;',
    '    }',
    '    return r;',
    '  }',
    '',
    'float variance(float d1, float d2, float d3, float d4, float d5, float d6, float d7, float d8, float d9)',
    '  {',
    '    float mean = (d1 + d2 + d3 + d4 + d5 + d6 + d7 + d8 + d9) / 9.0;',
    '    float t1 = (d1-mean);',
    '    float t2 = (d2-mean);',
    '    float t3 = (d3-mean);',
    '    float t4 = (d4-mean);',
    '    float t5 = (d5-mean);',
    '    float t6 = (d6-mean);',
    '    float t7 = (d7-mean);',
    '    float t8 = (d8-mean);',
    '    float t9 = (d9-mean);',
    '    float v = (t1*t1+t2*t2+t3*t3+t4*t4+t5*t5+t6*t6+t7*t7+t8*t8+t9*t9)/9.0;',
    '    return v;',
    '  }',
    '',
    'vec2 decodeDepth(vec2 pos)',
    '  {',
    '    vec2 ret;',
    '    ',
    '    ',
    '    float depth1 = sampleDepth(vec2(position.x-1.0, position.y-1.0));',
    '    float depth2 = sampleDepth(vec2(position.x, position.y-1.0));',
    '    float depth3 = sampleDepth(vec2(position.x+1.0, position.y-1.0));',
    '    float depth4 = sampleDepth(vec2(position.x-1.0, position.y));',
    '    float depth5 = sampleDepth(vec2(position.x, position.y));',
    '    float depth6 = sampleDepth(vec2(position.x+1.0, position.y));',
    '    float depth7 = sampleDepth(vec2(position.x-1.0, position.y+1.0));',
    '    float depth8 = sampleDepth(vec2(position.x, position.y+1.0));',
    '    float depth9 = sampleDepth(vec2(position.x+1.0, position.y+1.0));',
    '    ',
    '    float median1 = median(depth1, depth2, depth3);',
    '    float median2 = median(depth4, depth5, depth6);',
    '    float median3 = median(depth7, depth8, depth9);',
    '    ',
    '    ret.x = median(median1, median2, median3);',
    '    ret.y = variance(depth1, depth2, depth3, depth4, depth5, depth6, depth7, depth8, depth9);',
    '    ',
    '    return ret;',
    '    ',
    '  }',
    '',
    '',
    'void main() {',
    '  ',
    '  vUvP = vec2( position.x / (width*2.0), position.y / (height*2.0)+0.5 );',
    '  colorP = vec2( position.x / (width*2.0)+0.5 , position.y / (height*2.0)  );',
    '  ',
    '  vec4 pos = vec4(0.0,0.0,0.0,0.0);',
    '  depthVariance = 0.0;',
    '  ',
    '  if ( (vUvP.x<0.0)|| (vUvP.x>0.5) || (vUvP.y<0.5) || (vUvP.y>0.0))',
    '  {',
    '    vec2 smp = decodeDepth(vec2(position.x, position.y));',
    '    float depth = smp.x;',
    '    depthVariance = smp.y;',
    '    ',
    '    float z = -depth;',
    '    ',
    '    pos = vec4(',
    '      ( position.x / width - 0.5 ) * z * 0.5 * maxDepthPerTile * resolutionFactor * (1000.0/focallength) * -1.0,',
    '      ( position.y / height - 0.5 ) * z * 0.5 * maxDepthPerTile * resolutionFactor * (1000.0/focallength),',
    '      (- z + zOffset / 1000.0) * maxDepthPerTile,',
    '      1.0);',
    '    ',
    '    vec2 maskP = vec2( position.x / (width*2.0), position.y / (height*2.0)  );',
    '    vec4 maskColor = texture2D( map, maskP );',
    '    maskVal = ( maskColor.r + maskColor.g + maskColor.b ) / 3.0 ;',
    '  }',
    '  ',
    '  gl_PointSize = pointSize;',
    '  gl_Position = projectionMatrix * modelViewMatrix * pos;',
    '  ',
    '}'
    ].join('\n');

  this.fragment_shader = [
    'uniform sampler2D map;',
    'uniform float varianceThreshold;',
    'uniform float whiteness;',
    '',
    'varying vec2 vUvP;',
    'varying vec2 colorP;',
    '',
    'varying float depthVariance;',
    'varying float maskVal;',
    '',
    '',
    'void main() {',
    '  ',
    '  vec4 color;',
    '  ',
    '  if ( (depthVariance>varianceThreshold) || (maskVal>0.5) ||(vUvP.x<0.0)|| (vUvP.x>0.5) || (vUvP.y<0.5) || (vUvP.y>1.0))',
    '  {  ',
    '    discard;',
    '  }',
    '  else ',
    '  {',
    '    color = texture2D( map, colorP );',
    '    ',
    '    float fader = whiteness /100.0;',
    '    ',
    '    color.r = color.r * (1.0-fader)+ fader;',
    '    ',
    '    color.g = color.g * (1.0-fader)+ fader;',
    '    ',
    '    color.b = color.b * (1.0-fader)+ fader;',
    '    ',
    '    color.a = 1.0;//smoothstep( 20000.0, -20000.0, gl_FragCoord.z / gl_FragCoord.w );',
    '  }',
    '  ',
    '  gl_FragColor = vec4( color.r, color.g, color.b, color.a );',
    '  ',
    '}'
    ].join('\n');
};
ROS3D.DepthCloud.prototype.__proto__ = THREE.Object3D.prototype;

/**
 * Callback called when video metadata is ready
 */
ROS3D.DepthCloud.prototype.metaLoaded = function() {
  this.metaLoaded = true;
  this.initStreamer();
};

/**
 * Callback called when video metadata is ready
 */
ROS3D.DepthCloud.prototype.initStreamer = function() {

  if (this.metaLoaded) {
    this.texture = new THREE.Texture(this.video);
    this.geometry = new THREE.Geometry();

    for (var i = 0, l = this.width * this.height; i < l; i++) {

      var vertex = new THREE.Vector3();
      vertex.x = (i % this.width);
      vertex.y = Math.floor(i / this.width);

      this.geometry.vertices.push(vertex);
    }

    this.material = new THREE.ShaderMaterial({
      uniforms : {
        'map' : {
          type : 't',
          value : this.texture
        },
        'width' : {
          type : 'f',
          value : this.width
        },
        'height' : {
          type : 'f',
          value : this.height
        },
        'focallength' : {
          type : 'f',
          value : this.f
        },
        'pointSize' : {
          type : 'f',
          value : this.pointSize
        },
        'zOffset' : {
          type : 'f',
          value : 0
        },
        'whiteness' : {
          type : 'f',
          value : this.whiteness
        },
        'varianceThreshold' : {
          type : 'f',
          value : this.varianceThreshold
        },
        'maxDepthPerTile': {
          type : 'f',
          value : this.maxDepthPerTile
        },
        'resolutionFactor': {
          type : 'f',
          value : this.resolutionFactor
        },
      },
      vertexShader : this.vertex_shader,
      fragmentShader : this.fragment_shader
    });

    this.mesh = new THREE.ParticleSystem(this.geometry, this.material);
    this.mesh.position.x = 0;
    this.mesh.position.y = 0;
    this.add(this.mesh);

    setInterval(() => {
      if (this.isMjpeg || this.video.readyState === this.video.HAVE_ENOUGH_DATA) {
        this.texture.needsUpdate = true;
      }
    }, 1000 / 30);
  }
};

/**
 * Start video playback
 */
ROS3D.DepthCloud.prototype.startStream = function() {
  if (!this.isMjpeg) {
    this.video.play();
  }
};

/**
 * Stop video playback
 */
ROS3D.DepthCloud.prototype.stopStream = function() {
  if (!this.isMjpeg) {
    this.video.pause();
  }
};

/**
 * @fileOverview
 * @author David Gossow - dgossow@willowgarage.com
 */

/**
 * Handle with signals for a single interactive marker.
 *
 * Emits the following events:
 *
 *  * 'pose' - emitted when a new pose comes from the server
 *
 * @constructor
 * @param options - object with following keys:
 *
 *  * message - the interactive marker message
 *  * feedbackTopic - the ROSLIB.Topic associated with the feedback
 *  * tfClient - a handle to the TF client to use
 *  * menuFontSize (optional) - the menu font size
 */
ROS3D.InteractiveMarkerHandle = function(options) {
  options = options || {};
  this.message = options.message;
  this.feedbackTopic = options.feedbackTopic;
  this.tfClient = options.tfClient;
  this.menuFontSize = options.menuFontSize || '0.8em';
  this.name = this.message.name;
  this.header = this.message.header;
  this.controls = this.message.controls;
  this.menuEntries = this.message.menu_entries;
  this.dragging = false;
  this.timeoutHandle = null;
  this.tfTransform = new ROSLIB.Transform();
  this.pose = new ROSLIB.Pose();

  this.setPoseFromClientBound = this.setPoseFromClient.bind(this);
  this.onMouseDownBound = this.onMouseDown.bind(this);
  this.onMouseUpBound = this.onMouseUp.bind(this);
  this.onButtonClickBound = this.onButtonClick.bind(this);
  this.onMenuSelectBound = this.onMenuSelect.bind(this);

  // start by setting the pose
  this.setPoseFromServer(this.message.pose);
  this.tfUpdateBound = this.tfUpdate.bind(this);
};
ROS3D.InteractiveMarkerHandle.prototype.__proto__ = EventEmitter3.prototype;

/**
 * Subscribe to the TF associated with this interactive marker.
 */
ROS3D.InteractiveMarkerHandle.prototype.subscribeTf = function() {
  // subscribe to tf updates if frame-fixed
  if (this.message.header.stamp.secs === 0.0 && this.message.header.stamp.nsecs === 0.0) {
    this.tfClient.subscribe(this.message.header.frame_id, this.tfUpdateBound);
  }
};

ROS3D.InteractiveMarkerHandle.prototype.unsubscribeTf = function() {
  this.tfClient.unsubscribe(this.message.header.frame_id, this.tfUpdateBound);
};

/**
 * Emit the new pose that has come from the server.
 */
ROS3D.InteractiveMarkerHandle.prototype.emitServerPoseUpdate = function() {
  var poseTransformed = new ROSLIB.Pose(this.pose);
  poseTransformed.applyTransform(this.tfTransform);
  this.emit('pose', poseTransformed);
};

/**
 * Update the pose based on the pose given by the server.
 *
 * @param poseMsg - the pose given by the server
 */
ROS3D.InteractiveMarkerHandle.prototype.setPoseFromServer = function(poseMsg) {
  this.pose = new ROSLIB.Pose(poseMsg);
  this.emitServerPoseUpdate();
};

/**
 * Update the pose based on the TF given by the server.
 *
 * @param transformMsg - the TF given by the server
 */
ROS3D.InteractiveMarkerHandle.prototype.tfUpdate = function(transformMsg) {
  this.tfTransform = new ROSLIB.Transform(transformMsg);
  this.emitServerPoseUpdate();
};

/**
 * Set the pose from the client based on the given event.
 *
 * @param event - the event to base the change off of
 */
ROS3D.InteractiveMarkerHandle.prototype.setPoseFromClient = function(event) {
  // apply the transform
  this.pose = new ROSLIB.Pose(event);
  var inv = this.tfTransform.clone();
  inv.rotation.invert();
  inv.translation.multiplyQuaternion(inv.rotation);
  inv.translation.x *= -1;
  inv.translation.y *= -1;
  inv.translation.z *= -1;
  this.pose.applyTransform(inv);

  // send feedback to the server
  this.sendFeedback(ROS3D.INTERACTIVE_MARKER_POSE_UPDATE, undefined, 0, event.controlName);

  // keep sending pose feedback until the mouse goes up
  if (this.dragging) {
    if (this.timeoutHandle) {
      clearTimeout(this.timeoutHandle);
    }
    this.timeoutHandle = setTimeout(this.setPoseFromClient.bind(this, event), 250);
  }
};

/**
 * Send the button click feedback to the server.
 *
 * @param event - the event associated with the button click
 */
ROS3D.InteractiveMarkerHandle.prototype.onButtonClick = function(event) {
  this.sendFeedback(ROS3D.INTERACTIVE_MARKER_BUTTON_CLICK, event.clickPosition, 0,
      event.controlName);
};

/**
 * Send the mousedown feedback to the server.
 *
 * @param event - the event associated with the mousedown
 */
ROS3D.InteractiveMarkerHandle.prototype.onMouseDown = function(event) {
  this.sendFeedback(ROS3D.INTERACTIVE_MARKER_MOUSE_DOWN, event.clickPosition, 0, event.controlName);
  this.dragging = true;
};

/**
 * Send the mouseup feedback to the server.
 *
 * @param event - the event associated with the mouseup
 */
ROS3D.InteractiveMarkerHandle.prototype.onMouseUp = function(event) {
  this.sendFeedback(ROS3D.INTERACTIVE_MARKER_MOUSE_UP, event.clickPosition, 0, event.controlName);
  this.dragging = false;
  if (this.timeoutHandle) {
    clearTimeout(this.timeoutHandle);
  }
};

/**
 * Send the menu select feedback to the server.
 *
 * @param event - the event associated with the menu select
 */
ROS3D.InteractiveMarkerHandle.prototype.onMenuSelect = function(event) {
  this.sendFeedback(ROS3D.INTERACTIVE_MARKER_MENU_SELECT, undefined, event.id, event.controlName);
};

/**
 * Send feedback to the interactive marker server.
 *
 * @param eventType - the type of event that happened
 * @param clickPosition (optional) - the position in ROS space the click happened
 * @param menuEntryID (optional) - the menu entry ID that is associated
 * @param controlName - the name of the control
 */
ROS3D.InteractiveMarkerHandle.prototype.sendFeedback = function(eventType, clickPosition,
    menuEntryID, controlName) {

  // check for the click position
  var mousePointValid = clickPosition !== undefined;
  clickPosition = clickPosition || {
    x : 0,
    y : 0,
    z : 0
  };

  var feedback = {
    header : this.header,
    client_id : this.clientID,
    marker_name : this.name,
    control_name : controlName,
    event_type : eventType,
    pose : this.pose,
    mouse_point : clickPosition,
    mouse_point_valid : mousePointValid,
    menu_entry_id : menuEntryID
  };
  this.feedbackTopic.publish(feedback);
};

/**
 * @fileOverview
 * @author David Gossow - dgossow@willowgarage.com
 */

/**
 * A menu for an interactive marker. This will be overlayed on the canvas.
 *
 * @constructor
 * @param options - object with following keys:
 *
 *  * menuEntries - the menu entries to add
 *  * className (optional) - a custom CSS class for the menu div
 *  * entryClassName (optional) - a custom CSS class for the menu entry
 *  * overlayClassName (optional) - a custom CSS class for the menu overlay
 *  * menuFontSize (optional) - the menu font size
 */
ROS3D.InteractiveMarkerMenu = function(options) {
  THREE.EventDispatcher.call(this);
  var that = this;
  options = options || {};
  var menuEntries = options.menuEntries;
  var className = options.className || 'default-interactive-marker-menu';
  var entryClassName = options.entryClassName || 'default-interactive-marker-menu-entry';
  var overlayClassName = options.overlayClassName || 'default-interactive-marker-overlay';
  var menuFontSize = options.menuFontSize || '0.8em';

  // holds the menu tree
  var allMenus = [];
  allMenus[0] = {
    children : []
  };


  // create the CSS for this marker if it has not been created
  if (document.getElementById('default-interactive-marker-menu-css') === null) {
    var style = document.createElement('style');
    style.id = 'default-interactive-marker-menu-css';
    style.type = 'text/css';
    style.innerHTML = '.default-interactive-marker-menu {' + 'background-color: #444444;'
        + 'border: 1px solid #888888;' + 'border: 1px solid #888888;' + 'padding: 0px 0px 0px 0px;'
        + 'color: #FFFFFF;' + 'font-family: sans-serif;' + 'font-size: ' + menuFontSize +';' + 'z-index: 1002;'
        + '}' + '.default-interactive-marker-menu ul {' + 'padding: 0px 0px 5px 0px;'
        + 'margin: 0px;' + 'list-style-type: none;' + '}'
        + '.default-interactive-marker-menu ul li div {' + '-webkit-touch-callout: none;'
        + '-webkit-user-select: none;' + '-khtml-user-select: none;' + '-moz-user-select: none;'
        + '-ms-user-select: none;' + 'user-select: none;' + 'cursor: default;'
        + 'padding: 3px 10px 3px 10px;' + '}' + '.default-interactive-marker-menu-entry:hover {'
        + '  background-color: #666666;' + '  cursor: pointer;' + '}'
        + '.default-interactive-marker-menu ul ul {' + '  font-style: italic;'
        + '  padding-left: 10px;' + '}' + '.default-interactive-marker-overlay {'
        + '  position: absolute;' + '  top: 0%;' + '  left: 0%;' + '  width: 100%;'
        + '  height: 100%;' + '  background-color: black;' + '  z-index: 1001;'
        + '  -moz-opacity: 0.0;' + '  opacity: .0;' + '  filter: alpha(opacity = 0);' + '}';
    document.getElementsByTagName('head')[0].appendChild(style);
  }

  // place the menu in a div
  this.menuDomElem = document.createElement('div');
  this.menuDomElem.style.position = 'absolute';
  this.menuDomElem.className = className;
  this.menuDomElem.addEventListener('contextmenu', function(event) {
    event.preventDefault();
  });

  // create the overlay DOM
  this.overlayDomElem = document.createElement('div');
  this.overlayDomElem.className = overlayClassName;

  this.hideListener = this.hide.bind(this);
  this.overlayDomElem.addEventListener('contextmenu', this.hideListener);
  this.overlayDomElem.addEventListener('click', this.hideListener);
  this.overlayDomElem.addEventListener('touchstart', this.hideListener);

  // parse all entries and link children to parents
  var i, entry, id;
  for ( i = 0; i < menuEntries.length; i++) {
    entry = menuEntries[i];
    id = entry.id;
    allMenus[id] = {
      title : entry.title,
      id : id,
      children : []
    };
  }
  for ( i = 0; i < menuEntries.length; i++) {
    entry = menuEntries[i];
    id = entry.id;
    var menu = allMenus[id];
    var parent = allMenus[entry.parent_id];
    parent.children.push(menu);
  }

  function emitMenuSelect(menuEntry, domEvent) {
    this.dispatchEvent({
      type : 'menu-select',
      domEvent : domEvent,
      id : menuEntry.id,
      controlName : this.controlName
    });
    this.hide(domEvent);
  }

  /**
   * Create the HTML UL element for the menu and link it to the parent.
   *
   * @param parentDomElem - the parent DOM element
   * @param parentMenu - the parent menu
   */
  function makeUl(parentDomElem, parentMenu) {

    var ulElem = document.createElement('ul');
    parentDomElem.appendChild(ulElem);

    var children = parentMenu.children;

    for ( var i = 0; i < children.length; i++) {
      var liElem = document.createElement('li');
      var divElem = document.createElement('div');
      divElem.appendChild(document.createTextNode(children[i].title));
      ulElem.appendChild(liElem);
      liElem.appendChild(divElem);

      if (children[i].children.length > 0) {
        makeUl(liElem, children[i]);
        divElem.addEventListener('click', that.hide.bind(that));
        divElem.addEventListener('touchstart', that.hide.bind(that));
      } else {
        divElem.addEventListener('click', emitMenuSelect.bind(that, children[i]));
        divElem.addEventListener('touchstart', emitMenuSelect.bind(that, children[i]));
        divElem.className = 'default-interactive-marker-menu-entry';
      }
    }

  }

  // construct DOM element
  makeUl(this.menuDomElem, allMenus[0]);
};

/**
 * Shoe the menu DOM element.
 *
 * @param control - the control for the menu
 * @param event - the event that caused this
 */
ROS3D.InteractiveMarkerMenu.prototype.show = function(control, event) {
  if (event && event.preventDefault) {
    event.preventDefault();
  }

  this.controlName = control.name;

  // position it on the click
  if (event.domEvent.changedTouches !== undefined) {
    // touch click
    this.menuDomElem.style.left = event.domEvent.changedTouches[0].pageX + 'px';
    this.menuDomElem.style.top = event.domEvent.changedTouches[0].pageY + 'px';
  } else {
    // mouse click
    this.menuDomElem.style.left = event.domEvent.clientX + 'px';
    this.menuDomElem.style.top = event.domEvent.clientY + 'px';
  }
  document.body.appendChild(this.overlayDomElem);
  document.body.appendChild(this.menuDomElem);
};

/**
 * Hide the menu DOM element.
 *
 * @param event (optional) - the event that caused this
 */
ROS3D.InteractiveMarkerMenu.prototype.hide = function(event) {
  if (event && event.preventDefault) {
    event.preventDefault();
  }

  document.body.removeChild(this.overlayDomElem);
  document.body.removeChild(this.menuDomElem);
};

Object.assign(ROS3D.InteractiveMarkerMenu.prototype, THREE.EventDispatcher.prototype);

/**
 * @fileOverview
 * @author David Gossow - dgossow@willowgarage.com
 */

/**
 * The main interactive marker object.
 *
 * @constructor
 * @param options - object with following keys:
 *
 *  * handle - the ROS3D.InteractiveMarkerHandle for this marker
 *  * camera - the main camera associated with the viewer for this marker
 *  * path (optional) - the base path to any meshes that will be loaded
 *  * loader (optional) - the Collada loader to use (e.g., an instance of ROS3D.COLLADA_LOADER)
 */
ROS3D.InteractiveMarker = function(options) {
  THREE.Object3D.call(this);
  options = options || {};
  var handle = options.handle;
  this.name = handle.name;
  var camera = options.camera;
  var path = options.path || '/';
  var loader = options.loader;
  this.dragging = false;

  // set the initial pose
  this.onServerSetPose({
    pose : handle.pose
  });

  // information on where the drag started
  this.dragStart = {
    position : new THREE.Vector3(),
    orientation : new THREE.Quaternion(),
    positionWorld : new THREE.Vector3(),
    orientationWorld : new THREE.Quaternion(),
    event3d : {}
  };

  // add each control message
  handle.controls.forEach(function(controlMessage) {
    this.add(new ROS3D.InteractiveMarkerControl({
      parent : this,
      handle : handle,
      message : controlMessage,
      camera : camera,
      path : path,
      loader : loader
    }));
  }.bind(this));

  // check for any menus
  if (handle.menuEntries.length > 0) {
    this.menu = new ROS3D.InteractiveMarkerMenu({
      menuEntries : handle.menuEntries,
      menuFontSize : handle.menuFontSize
    });

    // forward menu select events
    this.menu.addEventListener('menu-select', function(event) {
      this.dispatchEvent(event);
    }.bind(this));
  }
};
ROS3D.InteractiveMarker.prototype.__proto__ = THREE.Object3D.prototype;

/**
 * Show the interactive marker menu associated with this marker.
 *
 * @param control - the control to use
 * @param event - the event that caused this
 */
ROS3D.InteractiveMarker.prototype.showMenu = function(control, event) {
  if (this.menu) {
    this.menu.show(control, event);
  }
};

/**
 * Move the axis based on the given event information.
 *
 * @param control - the control to use
 * @param origAxis - the origin of the axis
 * @param event3d - the event that caused this
 */
ROS3D.InteractiveMarker.prototype.moveAxis = function(control, origAxis, event3d) {
  if (this.dragging) {
    var currentControlOri = control.currentControlOri;
    var axis = origAxis.clone().applyQuaternion(currentControlOri);
    // get move axis in world coords
    var originWorld = this.dragStart.event3d.intersection.point;
    var axisWorld = axis.clone().applyQuaternion(this.dragStart.orientationWorld.clone());

    var axisRay = new THREE.Ray(originWorld, axisWorld);

    // find closest point to mouse on axis
    var t = ROS3D.closestAxisPoint(axisRay, event3d.camera, event3d.mousePos);

    // offset from drag start position
    var p = new THREE.Vector3();
    p.addVectors(this.dragStart.position, axis.clone().applyQuaternion(this.dragStart.orientation)
        .multiplyScalar(t));
    this.setPosition(control, p);


    event3d.stopPropagation();
  }
};


/**
 * Move with respect to the plane based on the contorl and event.
 *
 * @param control - the control to use
 * @param origNormal - the normal of the origin
 * @param event3d - the event that caused this
 */
ROS3D.InteractiveMarker.prototype.move3d = function(control, origNormal, event3d) {
  // by default, move in a plane
  if (this.dragging) {

    if(control.isShift){
      // this doesn't work
      // // use the camera position and the marker position to determine the axis
      // var newAxis = control.camera.position.clone();
      // newAxis.sub(this.position);
      // // now mimic same steps constructor uses to create origAxis
      // var controlOri = new THREE.Quaternion(newAxis.x, newAxis.y,
      //     newAxis.z, 1);
      // controlOri.normalize();
      // var controlAxis = new THREE.Vector3(1, 0, 0);
      // controlAxis.applyQuaternion(controlOri);
      // origAxis = controlAxis;
    }else{
      // we want to use the origin plane that is closest to the camera
      var cameraVector = control.camera.getWorldDirection();
      var x = Math.abs(cameraVector.x);
      var y = Math.abs(cameraVector.y);
      var z = Math.abs(cameraVector.z);
      var controlOri = new THREE.Quaternion(1, 0, 0, 1);
      if(y > x && y > z){
        // orientation for the control
        controlOri = new THREE.Quaternion(0, 0, 1, 1);
      }else if(z > x && z > y){
        // orientation for the control
        controlOri = new THREE.Quaternion(0, 1, 0, 1);
      }
      controlOri.normalize();

      // transform x axis into local frame
      origNormal = new THREE.Vector3(1, 0, 0);
      origNormal.applyQuaternion(controlOri);
      this.movePlane(control, origNormal, event3d);
    }
  }
};

/**
 * Move with respect to the plane based on the contorl and event.
 *
 * @param control - the control to use
 * @param origNormal - the normal of the origin
 * @param event3d - the event that caused this
 */
ROS3D.InteractiveMarker.prototype.movePlane = function(control, origNormal, event3d) {
  if (this.dragging) {
    var currentControlOri = control.currentControlOri;
    var normal = origNormal.clone().applyQuaternion(currentControlOri);
    // get plane params in world coords
    var originWorld = this.dragStart.event3d.intersection.point;
    var normalWorld = normal.clone().applyQuaternion(this.dragStart.orientationWorld);

    // intersect mouse ray with plane
    var intersection = ROS3D.intersectPlane(event3d.mouseRay, originWorld, normalWorld);

    // offset from drag start position
    var p = new THREE.Vector3();
    p.subVectors(intersection, originWorld);
    p.add(this.dragStart.positionWorld);
    this.setPosition(control, p);
    event3d.stopPropagation();
  }
};

/**
 * Rotate based on the control and event given.
 *
 * @param control - the control to use
 * @param origOrientation - the orientation of the origin
 * @param event3d - the event that caused this
 */
ROS3D.InteractiveMarker.prototype.rotateAxis = function(control, origOrientation, event3d) {
  if (this.dragging) {
    control.updateMatrixWorld();

    var currentControlOri = control.currentControlOri;
    var orientation = currentControlOri.clone().multiply(origOrientation.clone());

    var normal = (new THREE.Vector3(1, 0, 0)).applyQuaternion(orientation);

    // get plane params in world coords
    var originWorld = this.dragStart.event3d.intersection.point;
    var normalWorld = normal.applyQuaternion(this.dragStart.orientationWorld);

    // intersect mouse ray with plane
    var intersection = ROS3D.intersectPlane(event3d.mouseRay, originWorld, normalWorld);

    // offset local origin to lie on intersection plane
    var normalRay = new THREE.Ray(this.dragStart.positionWorld, normalWorld);
    var rotOrigin = ROS3D.intersectPlane(normalRay, originWorld, normalWorld);

    // rotates from world to plane coords
    var orientationWorld = this.dragStart.orientationWorld.clone().multiply(orientation);
    var orientationWorldInv = orientationWorld.clone().inverse();

    // rotate original and current intersection into local coords
    intersection.sub(rotOrigin);
    intersection.applyQuaternion(orientationWorldInv);

    var origIntersection = this.dragStart.event3d.intersection.point.clone();
    origIntersection.sub(rotOrigin);
    origIntersection.applyQuaternion(orientationWorldInv);

    // compute relative 2d angle
    var a1 = Math.atan2(intersection.y, intersection.z);
    var a2 = Math.atan2(origIntersection.y, origIntersection.z);
    var a = a2 - a1;

    var rot = new THREE.Quaternion();
    rot.setFromAxisAngle(normal, a);

    // rotate
    this.setOrientation(control, rot.multiply(this.dragStart.orientationWorld));

    // offset from drag start position
    event3d.stopPropagation();
  }
};

/**
 * Dispatch the given event type.
 *
 * @param type - the type of event
 * @param control - the control to use
 */
ROS3D.InteractiveMarker.prototype.feedbackEvent = function(type, control) {
  this.dispatchEvent({
    type : type,
    position : this.position.clone(),
    orientation : this.quaternion.clone(),
    controlName : control.name
  });
};

/**
 * Start a drag action.
 *
 * @param control - the control to use
 * @param event3d - the event that caused this
 */
ROS3D.InteractiveMarker.prototype.startDrag = function(control, event3d) {
  if (event3d.domEvent.button === 0) {
    event3d.stopPropagation();
    this.dragging = true;
    this.updateMatrixWorld(true);
    var scale = new THREE.Vector3();
    this.matrixWorld
        .decompose(this.dragStart.positionWorld, this.dragStart.orientationWorld, scale);
    this.dragStart.position = this.position.clone();
    this.dragStart.orientation = this.quaternion.clone();
    this.dragStart.event3d = event3d;

    this.feedbackEvent('user-mousedown', control);
  }
};

/**
 * Stop a drag action.
 *
 * @param control - the control to use
 * @param event3d - the event that caused this
 */
ROS3D.InteractiveMarker.prototype.stopDrag = function(control, event3d) {
  if (event3d.domEvent.button === 0) {
    event3d.stopPropagation();
    this.dragging = false;
    this.dragStart.event3d = {};
    this.onServerSetPose(this.bufferedPoseEvent);
    this.bufferedPoseEvent = undefined;

    this.feedbackEvent('user-mouseup', control);
  }
};

/**
 * Handle a button click.
 *
 * @param control - the control to use
 * @param event3d - the event that caused this
 */
ROS3D.InteractiveMarker.prototype.buttonClick = function(control, event3d) {
  event3d.stopPropagation();
  this.feedbackEvent('user-button-click', control);
};

/**
 * Handle a user pose change for the position.
 *
 * @param control - the control to use
 * @param event3d - the event that caused this
 */
ROS3D.InteractiveMarker.prototype.setPosition = function(control, position) {
  this.position.copy(position);
  this.feedbackEvent('user-pose-change', control);
};

/**
 * Handle a user pose change for the orientation.
 *
 * @param control - the control to use
 * @param event3d - the event that caused this
 */
ROS3D.InteractiveMarker.prototype.setOrientation = function(control, orientation) {
  orientation.normalize();
  this.quaternion.copy(orientation);
  this.feedbackEvent('user-pose-change', control);
};

/**
 * Update the marker based when the pose is set from the server.
 *
 * @param event - the event that caused this
 */
ROS3D.InteractiveMarker.prototype.onServerSetPose = function(event) {
  if (event !== undefined) {
    // don't update while dragging
    if (this.dragging) {
      this.bufferedPoseEvent = event;
    } else {
      var pose = event.pose;
      this.position.copy(pose.position);
      this.quaternion.copy(pose.orientation);
      this.updateMatrixWorld(true);
    }
  }
};

/**
 * Free memory of elements in this marker.
 */
ROS3D.InteractiveMarker.prototype.dispose = function() {
  this.children.forEach(function(intMarkerControl) {
    intMarkerControl.children.forEach(function(marker) {
      marker.dispose();
      intMarkerControl.remove(marker);
    });
    this.remove(intMarkerControl);
  }.bind(this));
};

Object.assign(ROS3D.InteractiveMarker.prototype, THREE.EventDispatcher.prototype);

/**
 * @fileOverview
 * @author David Gossow - dgossow@willowgarage.com
 */

/**
 * The main marker control object for an interactive marker.
 *
 * @constructor
 * @param options - object with following keys:
 *
 *  * parent - the parent of this control
 *  * message - the interactive marker control message
 *  * camera - the main camera associated with the viewer for this marker client
 *  * path (optional) - the base path to any meshes that will be loaded
 *  * loader (optional) - the Collada loader to use (e.g., an instance of ROS3D.COLLADA_LOADER)
 */
ROS3D.InteractiveMarkerControl = function(options) {
  THREE.Object3D.call(this);
  var that = this;

  options = options || {};
  this.parent = options.parent;
  var handle = options.handle;
  var message = options.message;
  this.message = message;
  this.name = message.name;
  this.camera = options.camera;
  this.path = options.path || '/';
  this.loader = options.loader;
  this.dragging = false;
  this.startMousePos = new THREE.Vector2();
  this.isShift = false;


  // orientation for the control
  var controlOri = new THREE.Quaternion(message.orientation.x, message.orientation.y,
      message.orientation.z, message.orientation.w);
  controlOri.normalize();

  // transform x axis into local frame
  var controlAxis = new THREE.Vector3(1, 0, 0);
  controlAxis.applyQuaternion(controlOri);

  this.currentControlOri = new THREE.Quaternion();

  // determine mouse interaction
  switch (message.interaction_mode) {
    case ROS3D.INTERACTIVE_MARKER_MOVE_ROTATE_3D:
    case ROS3D.INTERACTIVE_MARKER_MOVE_3D:
      this.addEventListener('mousemove', this.parent.move3d.bind(this.parent, this, controlAxis));
      break;
    case ROS3D.INTERACTIVE_MARKER_MOVE_AXIS:
      this.addEventListener('mousemove', this.parent.moveAxis.bind(this.parent, this, controlAxis));
      this.addEventListener('touchmove', this.parent.moveAxis.bind(this.parent, this, controlAxis));
      break;
    case ROS3D.INTERACTIVE_MARKER_ROTATE_AXIS:
      this
          .addEventListener('mousemove', this.parent.rotateAxis.bind(this.parent, this, controlOri));
      break;
    case ROS3D.INTERACTIVE_MARKER_MOVE_PLANE:
      this
          .addEventListener('mousemove', this.parent.movePlane.bind(this.parent, this, controlAxis));
      break;
    case ROS3D.INTERACTIVE_MARKER_BUTTON:
      this.addEventListener('click', this.parent.buttonClick.bind(this.parent, this));
      break;
    default:
      break;
  }

  /**
   * Install default listeners for highlighting / dragging.
   *
   * @param event - the event to stop
   */
  function stopPropagation(event) {
    event.stopPropagation();
  }

  // check the mode
  if (message.interaction_mode !== ROS3D.INTERACTIVE_MARKER_NONE) {
    this.addEventListener('mousedown', this.parent.startDrag.bind(this.parent, this));
    this.addEventListener('mouseup', this.parent.stopDrag.bind(this.parent, this));
    this.addEventListener('contextmenu', this.parent.showMenu.bind(this.parent, this));
    this.addEventListener('mouseup', function(event3d) {
      if (that.startMousePos.distanceToSquared(event3d.mousePos) === 0) {
        event3d.type = 'contextmenu';
        that.dispatchEvent(event3d);
      }
    });
    this.addEventListener('mouseover', stopPropagation);
    this.addEventListener('mouseout', stopPropagation);
    this.addEventListener('click', stopPropagation);
    this.addEventListener('mousedown', function(event3d) {
      that.startMousePos = event3d.mousePos;
    });

    // touch support
    this.addEventListener('touchstart', function(event3d) {
      if (event3d.domEvent.touches.length === 1) {
        event3d.type = 'mousedown';
        event3d.domEvent.button = 0;
        that.dispatchEvent(event3d);
      }
    });
    this.addEventListener('touchmove', function(event3d) {
      if (event3d.domEvent.touches.length === 1) {
        event3d.type = 'mousemove';
        event3d.domEvent.button = 0;
        that.dispatchEvent(event3d);
      }
    });
    this.addEventListener('touchend', function(event3d) {
      if (event3d.domEvent.touches.length === 0) {
        event3d.domEvent.button = 0;
        event3d.type = 'mouseup';
        that.dispatchEvent(event3d);
        event3d.type = 'click';
        that.dispatchEvent(event3d);
      }
    });

    window.addEventListener('keydown', function(event){
      if(event.keyCode === 16){
        that.isShift = true;
      }
    });
    window.addEventListener('keyup', function(event){
      if(event.keyCode === 16){
        that.isShift = false;
      }
    });
  }

  // rotation behavior
  var rotInv = new THREE.Quaternion();
  var posInv = this.parent.position.clone().multiplyScalar(-1);
  switch (message.orientation_mode) {
    case ROS3D.INTERACTIVE_MARKER_INHERIT:
      rotInv = this.parent.quaternion.clone().inverse();
      break;
    case ROS3D.INTERACTIVE_MARKER_FIXED:
      break;
    case ROS3D.INTERACTIVE_MARKER_VIEW_FACING:
      break;
    default:
      console.error('Unkown orientation mode: ' + message.orientation_mode);
      break;
  }

  // temporary TFClient to get transformations from InteractiveMarker
  // frame to potential child Marker frames
  var localTfClient = new ROSLIB.TFClient({
    ros : handle.tfClient.ros,
    fixedFrame : handle.message.header.frame_id,
    serverName : handle.tfClient.serverName
  });

  // create visuals (markers)
  message.markers.forEach(function(markerMsg) {
    var addMarker = function(transformMsg) {
      var markerHelper = new ROS3D.Marker({
        message : markerMsg,
        path : that.path,
        loader : that.loader
      });

      // if transformMsg isn't null, this was called by TFClient
      if (transformMsg !== null) {
        // get the current pose as a ROSLIB.Pose...
        var newPose = new ROSLIB.Pose({
          position : markerHelper.position,
          orientation : markerHelper.quaternion
        });
        // so we can apply the transform provided by the TFClient
        newPose.applyTransform(new ROSLIB.Transform(transformMsg));

        // get transform between parent marker's location and its frame
        // apply it to sub-marker position to get sub-marker position
        // relative to parent marker
        var transformMarker = new ROS3D.Marker({
          message : markerMsg,
          path : that.path,
          loader : that.loader
        });
        transformMarker.position.add(posInv);
        transformMarker.position.applyQuaternion(rotInv);
        transformMarker.quaternion.multiplyQuaternions(rotInv, transformMarker.quaternion);
        var translation = new THREE.Vector3(transformMarker.position.x, transformMarker.position.y, transformMarker.position.z);
        var transform = new ROSLIB.Transform({
          translation : translation,
          orientation : transformMarker.quaternion
        });

        // apply that transform too
        newPose.applyTransform(transform);

        markerHelper.setPose(newPose);

        markerHelper.updateMatrixWorld();
        // we only need to set the pose once - at least, this is what RViz seems to be doing, might change in the future
        localTfClient.unsubscribe(markerMsg.header.frame_id);
      }

      // add the marker
      that.add(markerHelper);
    };

    // If the marker is not relative to the parent marker's position,
    // ask the *local* TFClient for the transformation from the
    // InteractiveMarker frame to the sub-Marker frame
    if (markerMsg.header.frame_id !== '') {
      localTfClient.subscribe(markerMsg.header.frame_id, addMarker);
    }
    // If not, just add the marker without changing its pose
    else {
      addMarker(null);
    }
  });
};
ROS3D.InteractiveMarkerControl.prototype.__proto__ = THREE.Object3D.prototype;

ROS3D.InteractiveMarkerControl.prototype.updateMatrixWorld = function (force) {
  var that = this;
  var message = this.message;
  switch (message.orientation_mode) {
    case ROS3D.INTERACTIVE_MARKER_INHERIT:
      ROS3D.InteractiveMarkerControl.prototype.updateMatrixWorld.call(that, force);
      that.currentControlOri.copy(that.quaternion);
      that.currentControlOri.normalize();
      break;
    case ROS3D.INTERACTIVE_MARKER_FIXED:
      that.quaternion.copy(that.parent.quaternion.clone().inverse());
      that.updateMatrix();
      that.matrixWorldNeedsUpdate = true;
      ROS3D.InteractiveMarkerControl.prototype.updateMatrixWorld.call(that, force);
      that.currentControlOri.copy(that.quaternion);
      break;
    case ROS3D.INTERACTIVE_MARKER_VIEW_FACING:
      that.camera.updateMatrixWorld();
      var cameraRot = new THREE.Matrix4().extractRotation(that.camera.matrixWorld);

      var ros2Gl = new THREE.Matrix4();
      var r90 = Math.PI * 0.5;
      var rv = new THREE.Euler(-r90, 0, r90);
      ros2Gl.makeRotationFromEuler(rv);

      var worldToLocal = new THREE.Matrix4();
      worldToLocal.getInverse(that.parent.matrixWorld);

      cameraRot.multiplyMatrices(cameraRot, ros2Gl);
      cameraRot.multiplyMatrices(worldToLocal, cameraRot);

      that.currentControlOri.setFromRotationMatrix(cameraRot);

      // check the orientation
      if (!message.independent_marker_orientation) {
        that.quaternion.copy(that.currentControlOri);
        that.updateMatrix();
        that.matrixWorldNeedsUpdate = true;
      }
      ROS3D.InteractiveMarkerControl.prototype.updateMatrixWorld.call(that, force);
      break;
    default:
      console.error('Unkown orientation mode: ' + message.orientation_mode);
      break;
  }
};

/**
 * @fileOverview
 * @author David Gossow - dgossow@willowgarage.com
 */

/**
 * A client for an interactive marker topic.
 *
 * @constructor
 * @param options - object with following keys:
 *
 *  * ros - a handle to the ROS connection
 *  * tfClient - a handle to the TF client
 *  * topic (optional) - the topic to subscribe to, like '/basic_controls', if not provided use subscribe() to start message receiving
 *  * path (optional) - the base path to any meshes that will be loaded
 *  * camera - the main camera associated with the viewer for this marker client
 *  * rootObject (optional) - the root THREE 3D object to render to
 *  * loader (optional) - the Collada loader to use (e.g., an instance of ROS3D.COLLADA_LOADER)
 *  * menuFontSize (optional) - the menu font size
 */
ROS3D.InteractiveMarkerClient = function(options) {
  options = options || {};
  this.ros = options.ros;
  this.tfClient = options.tfClient;
  this.topicName = options.topic;
  this.path = options.path || '/';
  this.camera = options.camera;
  this.rootObject = options.rootObject || new THREE.Object3D();
  this.loader = options.loader;
  this.menuFontSize = options.menuFontSize || '0.8em';

  this.interactiveMarkers = {};
  this.updateTopic = null;
  this.feedbackTopic = null;
  this.processUpdateBound = this.processUpdate.bind(this);

  // check for an initial topic
  if (this.topicName) {
    this.subscribe(this.topicName);
  }
};

/**
 * Subscribe to the given interactive marker topic. This will unsubscribe from any current topics.
 *
 * @param topic - the topic to subscribe to, like '/basic_controls'
 */
ROS3D.InteractiveMarkerClient.prototype.subscribe = function(topic) {
  // unsubscribe to the other topics
  this.unsubscribe();

  this.updateTopic = new ROSLIB.Topic({
    ros : this.ros,
    name : topic + '/tunneled/update',
    messageType : 'visualization_msgs/InteractiveMarkerUpdate',
    compression : 'png'
  });
  this.updateTopic.subscribe(this.processUpdateBound);

  this.feedbackTopic = new ROSLIB.Topic({
    ros : this.ros,
    name : topic + '/feedback',
    messageType : 'visualization_msgs/InteractiveMarkerFeedback',
    compression : 'png'
  });
  this.feedbackTopic.advertise();

  this.initService = new ROSLIB.Service({
    ros : this.ros,
    name : topic + '/tunneled/get_init',
    serviceType : 'demo_interactive_markers/GetInit'
  });
  var request = new ROSLIB.ServiceRequest({});
  this.initService.callService(request, this.processInit.bind(this));
};

/**
 * Unsubscribe from the current interactive marker topic.
 */
ROS3D.InteractiveMarkerClient.prototype.unsubscribe = function() {
  if (this.updateTopic) {
    this.updateTopic.unsubscribe(this.processUpdateBound);
  }
  if (this.feedbackTopic) {
    this.feedbackTopic.unadvertise();
  }
  // erase all markers
  for (var intMarkerName in this.interactiveMarkers) {
    this.eraseIntMarker(intMarkerName);
  }
  this.interactiveMarkers = {};
};

/**
 * Process the given interactive marker initialization message.
 *
 * @param initMessage - the interactive marker initialization message to process
 */
ROS3D.InteractiveMarkerClient.prototype.processInit = function(initMessage) {
  var message = initMessage.msg;

  // erase any old markers
  message.erases = [];
  for (var intMarkerName in this.interactiveMarkers) {
    message.erases.push(intMarkerName);
  }
  message.poses = [];

  // treat it as an update
  this.processUpdate(message);
};

/**
 * Process the given interactive marker update message.
 *
 * @param initMessage - the interactive marker update message to process
 */
ROS3D.InteractiveMarkerClient.prototype.processUpdate = function(message) {
  // erase any markers
  message.erases.forEach(function(name) {
    this.eraseIntMarker(name);
  });

  // updates marker poses
  message.poses.forEach(function(poseMessage) {
    var marker = this.interactiveMarkers[poseMessage.name];
    if (marker) {
      marker.setPoseFromServer(poseMessage.pose);
    }
  });

  // add new markers
  message.markers.forEach(function(msg) {
    // get rid of anything with the same name
    var oldhandle = this.interactiveMarkers[msg.name];
    if (oldhandle) {
      this.eraseIntMarker(oldhandle.name);
    }

    // create the handle
    var handle = new ROS3D.InteractiveMarkerHandle({
      message : msg,
      feedbackTopic : this.feedbackTopic,
      tfClient : this.tfClient,
      menuFontSize : this.menuFontSize
    });
    this.interactiveMarkers[msg.name] = handle;

    // create the actual marker
    var intMarker = new ROS3D.InteractiveMarker({
      handle : handle,
      camera : this.camera,
      path : this.path,
      loader : this.loader
    });
    // add it to the scene
    intMarker.name = msg.name;
    this.rootObject.add(intMarker);

    // listen for any pose updates from the server
    handle.on('pose', function(pose) {
      intMarker.onServerSetPose({
        pose : pose
      });
    });

    // add bound versions of UI handlers
    intMarker.addEventListener('user-pose-change', handle.setPoseFromClientBound);
    intMarker.addEventListener('user-mousedown', handle.onMouseDownBound);
    intMarker.addEventListener('user-mouseup', handle.onMouseUpBound);
    intMarker.addEventListener('user-button-click', handle.onButtonClickBound);
    intMarker.addEventListener('menu-select', handle.onMenuSelectBound);

    // now listen for any TF changes
    handle.subscribeTf();
  });
};

/**
 * Erase the interactive marker with the given name.
 *
 * @param intMarkerName - the interactive marker name to delete
 */
ROS3D.InteractiveMarkerClient.prototype.eraseIntMarker = function(intMarkerName) {
  if (this.interactiveMarkers[intMarkerName]) {
    // remove the object
    var targetIntMarker = this.rootObject.getObjectByName(intMarkerName);
    this.rootObject.remove(targetIntMarker);
    // unsubscribe from TF topic!
    var handle = this.interactiveMarkers[intMarkerName];
    handle.unsubscribeTf();

    // remove all other listeners

    targetIntMarker.removeEventListener('user-pose-change', handle.setPoseFromClientBound);
    targetIntMarker.removeEventListener('user-mousedown', handle.onMouseDownBound);
    targetIntMarker.removeEventListener('user-mouseup', handle.onMouseUpBound);
    targetIntMarker.removeEventListener('user-button-click', handle.onButtonClickBound);
    targetIntMarker.removeEventListener('menu-select', handle.onMenuSelectBound);

    // remove the handle from the map - after leaving this function's scope, there should be no references to the handle
    delete this.interactiveMarkers[intMarkerName];
    targetIntMarker.dispose();
  }
};

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
      var lineStripGeom = new THREE.Geometry();
      var lineStripMaterial = new THREE.LineBasicMaterial({
        linewidth : message.scale.x
      });

      // add the points
      var j;
      for ( j = 0; j < message.points.length; j++) {
        var pt = new THREE.Vector3();
        pt.x = message.points[j].x;
        pt.y = message.points[j].y;
        pt.z = message.points[j].z;
        lineStripGeom.vertices.push(pt);
      }

      // determine the colors for each
      if (message.colors.length === message.points.length) {
        lineStripMaterial.vertexColors = true;
        for ( j = 0; j < message.points.length; j++) {
          var clr = new THREE.Color();
          clr.setRGB(message.colors[j].r, message.colors[j].g, message.colors[j].b);
          lineStripGeom.colors.push(clr);
        }
      } else {
        lineStripMaterial.color.setRGB(message.color.r, message.color.g, message.color.b);
      }

      // add the line
      this.add(new THREE.Line(lineStripGeom, lineStripMaterial));
      break;
    case ROS3D.MARKER_LINE_LIST:
      var lineListGeom = new THREE.Geometry();
      var lineListMaterial = new THREE.LineBasicMaterial({
        linewidth : message.scale.x
      });

      // add the points
      var k;
      for ( k = 0; k < message.points.length; k++) {
        var v = new THREE.Vector3();
        v.x = message.points[k].x;
        v.y = message.points[k].y;
        v.z = message.points[k].z;
        lineListGeom.vertices.push(v);
      }

      // determine the colors for each
      if (message.colors.length === message.points.length) {
        lineListMaterial.vertexColors = true;
        for ( k = 0; k < message.points.length; k++) {
          var c = new THREE.Color();
          c.setRGB(message.colors[k].r, message.colors[k].g, message.colors[k].b);
          lineListGeom.colors.push(c);
        }
      } else {
        lineListMaterial.color.setRGB(message.color.r, message.color.g, message.color.b);
      }

      // add the line
      this.add(new THREE.LineSegments(lineListGeom, lineListMaterial));
      break;
    case ROS3D.MARKER_CUBE_LIST:
      // holds the main object
      var object = new THREE.Object3D();

      // check if custom colors should be used
      var numPoints = message.points.length;
      var createColors = (numPoints === message.colors.length);
      // do not render giant lists
      var stepSize = Math.ceil(numPoints / 1250);

      // add the points
      var p, cube, curColor, newMesh;
      for (p = 0; p < numPoints; p+=stepSize) {
        cube = new THREE.BoxGeometry(message.scale.x, message.scale.y, message.scale.z);

        // check the color
        if(createColors) {
          curColor = ROS3D.makeColorMaterial(message.colors[p].r, message.colors[p].g, message.colors[p].b, message.colors[p].a);
        } else {
          curColor = colorMaterial;
        }

        newMesh = new THREE.Mesh(cube, curColor);
        newMesh.position.x = message.points[p].x;
        newMesh.position.y = message.points[p].y;
        newMesh.position.z = message.points[p].z;
        object.add(newMesh);
      }

      this.add(object);
      break;
    case ROS3D.MARKER_SPHERE_LIST:
      // holds the main object
      var sphereObject = new THREE.Object3D();

      // check if custom colors should be used
      var numSpherePoints = message.points.length;
      var createSphereColors = (numSpherePoints === message.colors.length);
      // do not render giant lists
      var sphereStepSize = Math.ceil(numSpherePoints / 1250);

      // add the points
      var q, sphere, curSphereColor, newSphereMesh;
      for (q = 0; q < numSpherePoints; q+=sphereStepSize) {
        sphere = new THREE.SphereGeometry(0.5, 8, 8);

        // check the color
        if(createSphereColors) {
          curSphereColor = ROS3D.makeColorMaterial(message.colors[q].r, message.colors[q].g, message.colors[q].b, message.colors[q].a);
        } else {
          curSphereColor = colorMaterial;
        }

        newSphereMesh = new THREE.Mesh(sphere, curSphereColor);
        newSphereMesh.scale.x = message.scale.x;
        newSphereMesh.scale.y = message.scale.y;
        newSphereMesh.scale.z = message.scale.z;
        newSphereMesh.position.x = message.points[q].x;
        newSphereMesh.position.y = message.points[q].y;
        newSphereMesh.position.z = message.points[q].z;
        sphereObject.add(newSphereMesh);
      }
      this.add(sphereObject);
      break;
    case ROS3D.MARKER_POINTS:
      // for now, use a particle system for the lists
      var geometry = new THREE.Geometry();
      var material = new THREE.PointsMaterial({
        size : message.scale.x
      });

      // add the points
      var i;
      for ( i = 0; i < message.points.length; i++) {
        var vertex = new THREE.Vector3();
        vertex.x = message.points[i].x;
        vertex.y = message.points[i].y;
        vertex.z = message.points[i].z;
        geometry.vertices.push(vertex);
      }

      // determine the colors for each
      if (message.colors.length === message.points.length) {
        material.vertexColors = true;
        for ( i = 0; i < message.points.length; i++) {
          var color = new THREE.Color();
          color.setRGB(message.colors[i].r, message.colors[i].g, message.colors[i].b);
          geometry.colors.push(color);
        }
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

/**
 * @fileOverview
 * @author Russell Toris - rctoris@wpi.edu
 * @author Nils Berg - berg.nils@gmail.com
 */

/**
 * A MarkerArray client that listens to a given topic.
 *
 * Emits the following events:
 *
 *  * 'change' - there was an update or change in the MarkerArray
 *
 * @constructor
 * @param options - object with following keys:
 *
 *   * ros - the ROSLIB.Ros connection handle
 *   * topic - the marker topic to listen to
 *   * tfClient - the TF client handle to use
 *   * rootObject (optional) - the root object to add the markers to
 *   * path (optional) - the base path to any meshes that will be loaded
 */
ROS3D.MarkerArrayClient = function(options) {
  options = options || {};
  this.ros = options.ros;
  this.topicName = options.topic;
  this.tfClient = options.tfClient;
  this.rootObject = options.rootObject || new THREE.Object3D();
  this.path = options.path || '/';

  // Markers that are displayed (Map ns+id--Marker)
  this.markers = {};
  this.rosTopic = undefined;

  this.processMessageBound = this.processMessage.bind(this);
  this.subscribe();
};
ROS3D.MarkerArrayClient.prototype.__proto__ = EventEmitter3.prototype;

ROS3D.MarkerArrayClient.prototype.subscribe = function(){
  this.unsubscribe();

  // subscribe to MarkerArray topic
  this.rosTopic = new ROSLIB.Topic({
    ros : this.ros,
    name : this.topicName,
    messageType : 'visualization_msgs/MarkerArray',
    compression : 'png'
  });
  this.rosTopic.subscribe(this.processMessageBound);
};

ROS3D.MarkerArrayClient.prototype.processMessage = function(arrayMessage){
  arrayMessage.markers.forEach(function(message) {
    var key = message.ns + message.id;
    if(message.action === 0) {
      var updated = false;
      if(key in this.markers) { // "MODIFY"
        updated = this.markers[key].children[0].update(message);
        if(!updated) { // "REMOVE"
          this.removeMarker(key);
        }
      }
      if(!updated) { // "ADD"
        var newMarker = new ROS3D.Marker({
          message : message,
          path : this.path,
        });
        this.markers[key] = new ROS3D.SceneNode({
          frameID : message.header.frame_id,
          tfClient : this.tfClient,
          object : newMarker
        });
        this.rootObject.add(this.markers[key]);
      }
    }
    else if(message.action === 1) { // "DEPRECATED"
      console.warn('Received marker message with deprecated action identifier "1"');
    }
    else if(message.action === 2) { // "DELETE"
      this.removeMarker(key);
    }
    else if(message.action === 3) { // "DELETE ALL"
      for (var m in this.markers){
        this.removeMarker(m);
      }
      this.markers = {};
    }
    else {
      console.warn('Received marker message with unknown action identifier "'+message.action+'"');
    }
  }.bind(this));

  this.emit('change');
};

ROS3D.MarkerArrayClient.prototype.unsubscribe = function(){
  if(this.rosTopic){
    this.rosTopic.unsubscribe(this.processMessageBound);
  }
};

ROS3D.MarkerArrayClient.prototype.removeMarker = function(key) {
  var oldNode = this.markers[key];
  if(!oldNode) {
    return;
  }
  oldNode.unsubscribeTf();
  this.rootObject.remove(oldNode);
  oldNode.children.forEach(child => {
    child.dispose();
  });
  delete(this.markers[key]);
};

/**
 * @fileOverview
 * @author Russell Toris - rctoris@wpi.edu
 */

/**
 * A marker client that listens to a given marker topic.
 *
 * Emits the following events:
 *
 *  * 'change' - there was an update or change in the marker
 *
 * @constructor
 * @param options - object with following keys:
 *
 *   * ros - the ROSLIB.Ros connection handle
 *   * topic - the marker topic to listen to
 *   * tfClient - the TF client handle to use
 *   * rootObject (optional) - the root object to add this marker to
 *   * path (optional) - the base path to any meshes that will be loaded
 *   * lifetime - the lifetime of marker
 */
ROS3D.MarkerClient = function(options) {
  options = options || {};
  this.ros = options.ros;
  this.topicName = options.topic;
  this.tfClient = options.tfClient;
  this.rootObject = options.rootObject || new THREE.Object3D();
  this.path = options.path || '/';
  this.lifetime = options.lifetime || 0;

  // Markers that are displayed (Map ns+id--Marker)
  this.markers = {};
  this.rosTopic = undefined;
  this.updatedTime = {};

  this.processMessageBound = this.processMessage.bind(this);
  this.subscribe();
};
ROS3D.MarkerClient.prototype.__proto__ = EventEmitter3.prototype;

ROS3D.MarkerClient.prototype.unsubscribe = function(){
  if(this.rosTopic){
    this.rosTopic.unsubscribe(this.processMessageBound);
  }
};

ROS3D.MarkerClient.prototype.checkTime = function(name){
    var curTime = new Date().getTime();
    if (curTime - this.updatedTime[name] > this.lifetime) {
        this.removeMarker(name);
        this.emit('change');
    } else {
        var that = this;
        setTimeout(function() {that.checkTime(name);},
                   100);
    }
};

ROS3D.MarkerClient.prototype.subscribe = function(){
  this.unsubscribe();

  // subscribe to the topic
  this.rosTopic = new ROSLIB.Topic({
    ros : this.ros,
    name : this.topicName,
    messageType : 'visualization_msgs/Marker',
    compression : 'png'
  });
  this.rosTopic.subscribe(this.processMessageBound);
};

ROS3D.MarkerClient.prototype.processMessage = function(message){
  // remove old marker from Three.Object3D children buffer
  var key = message.ns + message.id;
  var oldNode = this.markers[key];
  this.updatedTime[key] = new Date().getTime();
  if (oldNode) {
    this.removeMarker(key);

  } else if (this.lifetime) {
    this.checkTime(message.ns + message.id);
  }

  if (message.action === 0) {  // "ADD" or "MODIFY"
    var newMarker = new ROS3D.Marker({
      message : message,
      path : this.path,
    });

    this.markers[key] = new ROS3D.SceneNode({
      frameID : message.header.frame_id,
      tfClient : this.tfClient,
      object : newMarker
    });
    this.rootObject.add(this.markers[key]);
  }

  this.emit('change');
};

ROS3D.MarkerClient.prototype.removeMarker = function(key) {
  var oldNode = this.markers[key];
  if(!oldNode) {
    return;
  }
  oldNode.unsubscribeTf();
  this.rootObject.remove(oldNode);
  oldNode.children.forEach(child => {
    child.dispose();
  });
  delete(this.markers[key]);
};

/**
 * @fileOverview
 * @author David Gossow - dgossow@willowgarage.com
 */

/**
 * A Arrow is a THREE object that can be used to display an arrow model.
 *
 * @constructor
 * @param options - object with following keys:
 *
 *   * origin (optional) - the origin of the arrow
 *   * direction (optional) - the direction vector of the arrow
 *   * length (optional) - the length of the arrow
 *   * headLength (optional) - the head length of the arrow
 *   * shaftDiameter (optional) - the shaft diameter of the arrow
 *   * headDiameter (optional) - the head diameter of the arrow
 *   * material (optional) - the material to use for this arrow
 */
ROS3D.Arrow = function(options) {
  options = options || {};
  var origin = options.origin || new THREE.Vector3(0, 0, 0);
  var direction = options.direction || new THREE.Vector3(1, 0, 0);
  var length = options.length || 1;
  var headLength = options.headLength || 0.2;
  var shaftDiameter = options.shaftDiameter || 0.05;
  var headDiameter = options.headDiameter || 0.1;
  var material = options.material || new THREE.MeshBasicMaterial();

  var shaftLength = length - headLength;

  // create and merge geometry
  var geometry = new THREE.CylinderGeometry(shaftDiameter * 0.5, shaftDiameter * 0.5, shaftLength,
      12, 1);
  var m = new THREE.Matrix4();
  m.setPosition(new THREE.Vector3(0, shaftLength * 0.5, 0));
  geometry.applyMatrix(m);

  // create the head
  var coneGeometry = new THREE.CylinderGeometry(0, headDiameter * 0.5, headLength, 12, 1);
  m.setPosition(new THREE.Vector3(0, shaftLength + (headLength * 0.5), 0));
  coneGeometry.applyMatrix(m);

  // put the arrow together
  geometry.merge(coneGeometry);

  THREE.Mesh.call(this, geometry, material);

  this.position.copy(origin);
  this.setDirection(direction);
};
ROS3D.Arrow.prototype.__proto__ = THREE.Mesh.prototype;

/**
 * Set the direction of this arrow to that of the given vector.
 *
 * @param direction - the direction to set this arrow
 */
ROS3D.Arrow.prototype.setDirection = function(direction) {
  var axis = new THREE.Vector3();
  if(direction.x === 0 && direction.z === 0){
    axis.set(1, 0, 0);
  } else {
    axis.set(0, 1, 0).cross(direction);
  }
  var radians = Math.acos(new THREE.Vector3(0, 1, 0).dot(direction.clone().normalize()));
  this.matrix = new THREE.Matrix4().makeRotationAxis(axis.normalize(), radians);
  this.rotation.setFromRotationMatrix(this.matrix, this.rotation.order);
};

/**
 * Set this arrow to be the given length.
 *
 * @param length - the new length of the arrow
 */
ROS3D.Arrow.prototype.setLength = function(length) {
  this.scale.set(length, length, length);
};

/**
 * Set the color of this arrow to the given hex value.
 *
 * @param hex - the hex value of the color to use
 */
ROS3D.Arrow.prototype.setColor = function(hex) {
  this.material.color.setHex(hex);
};

/*
 * Free memory of elements in this marker.
 */
ROS3D.Arrow.prototype.dispose = function() {
  if (this.geometry !== undefined) {
      this.geometry.dispose();
  }
  if (this.material !== undefined) {
      this.material.dispose();
  }
};

/**
 * @fileOverview
 * @author Jihoon Lee - lee@magazino.eu
 */

/**
 * A Arrow is a THREE object that can be used to display an arrow model using ArrowHelper
 *
 * @constructor
 * @param options - object with following keys:
 *
 *   * origin (optional) - the origin of the arrow
 *   * direction (optional) - the direction vector of the arrow
 *   * length (optional) - the length of the arrow
 *   * headLength (optional) - the head length of the arrow
 *   * shaftDiameter (optional) - the shaft diameter of the arrow
 *   * headDiameter (optional) - the head diameter of the arrow
 *   * material (optional) - the material to use for this arrow
 */
ROS3D.Arrow2 = function(options) {
  options = options || {};
  var origin = options.origin || new THREE.Vector3(0, 0, 0);
  var direction = options.direction || new THREE.Vector3(1, 0, 0);
  var length = options.length || 1;
  var headLength = options.headLength || 0.2;
  var shaftDiameter = options.shaftDiameter || 0.05;
  var headDiameter = options.headDiameter || 0.1;
  var material = options.material || new THREE.MeshBasicMaterial();

  THREE.ArrowHelper.call(this, direction, origin, length, 0xff0000);

};

ROS3D.Arrow2.prototype.__proto__ = THREE.ArrowHelper.prototype;

/*
 * Free memory of elements in this object.
 */
ROS3D.Arrow2.prototype.dispose = function() {
  if (this.line !== undefined) {
      this.line.material.dispose();
      this.line.geometry.dispose();
  }
  if (this.cone!== undefined) {
      this.cone.material.dispose();
      this.cone.geometry.dispose();
  }
};

/*
ROS3D.Arrow2.prototype.setLength = function ( length, headLength, headWidth ) {
	if ( headLength === undefined ) {
    headLength = 0.2 * length;
  }
	if ( headWidth === undefined ) {
    headWidth = 0.2 * headLength;
  }

	this.line.scale.set( 1, Math.max( 0, length), 1 );
	this.line.updateMatrix();

	this.cone.scale.set( headWidth, headLength, headWidth );
	this.cone.position.y = length;
	this.cone.updateMatrix();

};
*/

/**
 * @fileOverview
 * @author David Gossow - dgossow@willowgarage.com
 */

/**
 * An Axes object can be used to display the axis of a particular coordinate frame.
 *
 * @constructor
 * @param options - object with following keys:
 *
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
ROS3D.Axes = function(options) {
  THREE.Object3D.call(this);
  var that = this;
  options = options || {};
  var shaftRadius = options.shaftRadius || 0.008;
  var headRadius = options.headRadius || 0.023;
  var headLength = options.headLength || 0.1;
  var scaleArg = options.scale || 1.0;
  var lineType = options.lineType || 'full';
  var lineDashLength = options.lineDashLength || 0.1;


  this.scale.set(scaleArg, scaleArg, scaleArg);

  // create the cylinders for the objects
  this.lineGeom = new THREE.CylinderGeometry(shaftRadius, shaftRadius, 1.0 - headLength);
  this.headGeom = new THREE.CylinderGeometry(0, headRadius, headLength);

  /**
   * Adds an axis marker to this axes object.
   *
   * @param axis - the 3D vector representing the axis to add
   */
  function addAxis(axis) {
    // set the color of the axis
    var color = new THREE.Color();
    color.setRGB(axis.x, axis.y, axis.z);
    var material = new THREE.MeshBasicMaterial({
      color : color.getHex()
    });

    // setup the rotation information
    var rotAxis = new THREE.Vector3();
    rotAxis.crossVectors(axis, new THREE.Vector3(0, -1, 0));
    var rot = new THREE.Quaternion();
    rot.setFromAxisAngle(rotAxis, 0.5 * Math.PI);

    // create the arrow
    var arrow = new THREE.Mesh(that.headGeom, material);
    arrow.position.copy(axis);
    arrow.position.multiplyScalar(0.95);
    arrow.quaternion.copy(rot);
    arrow.updateMatrix();
    that.add(arrow);

    // create the line
    var line;
    if (lineType === 'dashed') {
      var l = lineDashLength;
      for (var i = 0; (l / 2 + 3 * l * i + l / 2) <= 1; ++i) {
        var geom = new THREE.CylinderGeometry(shaftRadius, shaftRadius, l);
        line = new THREE.Mesh(geom, material);
        line.position.copy(axis);
        // Make spacing between dashes equal to 1.5 times the dash length.
        line.position.multiplyScalar(l / 2 + 3 * l * i);
        line.quaternion.copy(rot);
        line.updateMatrix();
        that.add(line);
      }
    } else if (lineType === 'full') {
      line = new THREE.Mesh(that.lineGeom, material);
      line.position.copy(axis);
      line.position.multiplyScalar(0.45);
      line.quaternion.copy(rot);
      line.updateMatrix();
      that.add(line);
    } else {
      console.warn('[ROS3D.Axes]: Unsupported line type. Not drawing any axes.');
    }
  }

  // add the three markers to the axes
  addAxis(new THREE.Vector3(1, 0, 0));
  addAxis(new THREE.Vector3(0, 1, 0));
  addAxis(new THREE.Vector3(0, 0, 1));
};
ROS3D.Axes.prototype.__proto__ = THREE.Object3D.prototype;

/**
 * @fileOverview
 * @author Russell Toris - rctoris@wpi.edu
 */

/**
 * Create a grid object.
 *
 * @constructor
 * @param options - object with following keys:
 *
 *  * num_cells (optional) - The number of cells of the grid
 *  * color (optional) - the line color of the grid, like '#cccccc'
 *  * lineWidth (optional) - the width of the lines in the grid
 *  * cellSize (optional) - The length, in meters, of the side of each cell
 */
ROS3D.Grid = function(options) {
  options = options || {};
  var num_cells = options.num_cells || 10;
  var color = options.color || '#cccccc';
  var lineWidth = options.lineWidth || 1;
  var cellSize = options.cellSize || 1;

  THREE.Object3D.call(this);

  var material = new THREE.LineBasicMaterial({
    color: color,
    linewidth: lineWidth
  });

  for (var i = 0; i <= num_cells; ++i) {
    var edge = cellSize * num_cells / 2;
    var position = edge - (i * cellSize);
    var geometryH = new THREE.Geometry();
    geometryH.vertices.push(
      new THREE.Vector3( -edge, position, 0 ),
      new THREE.Vector3( edge, position, 0 )
    );
    var geometryV = new THREE.Geometry();
    geometryV.vertices.push(
      new THREE.Vector3( position, -edge, 0 ),
      new THREE.Vector3( position, edge, 0 )
    );
    this.add(new THREE.Line(geometryH, material));
    this.add(new THREE.Line(geometryV, material));
  }
};

ROS3D.Grid.prototype.__proto__ = THREE.Object3D.prototype;

/**
 * @fileOverview
 * @author Jose Rojas - jrojas@redlinesolutions.co
 */

 /**
  * MeshLoader is a singleton factory class for using various helper classes to
  * load mesh files of different types.
  *
  * It consists of one dictionary property 'loaders'. The dictionary keys consist
  * of the file extension for each supported loader type. The dictionary values
  * are functions used to construct the loader objects. The functions have the
  * following parameters:
  *
  *  * meshRes - the MeshResource that will contain the loaded mesh
  *  * uri - the uri path to the mesh file
  *  @returns loader object
  */
ROS3D.MeshLoader = {
   onError: function(error) {
     console.error(error);
   },
   loaders: {
     'dae': function(meshRes, uri, options) {
       const material = options.material;
       const loader = new THREE.ColladaLoader(options.loader);
       loader.log = function(message) {
         if (meshRes.warnings) {
           console.warn(message);
         }
       };
       loader.load(
         uri,
         function colladaReady(collada) {
           // check for a scale factor in ColladaLoader2
           // add a texture to anything that is missing one
           if(material !== null) {
             collada.scene.traverse(function(child) {
               if(child instanceof THREE.Mesh) {
                 if(child.material === undefined) {
                   child.material = material;
                 }
               }
             });
           }

           meshRes.add(collada.scene);
         },
         /*onProgress=*/null,
         ROS3D.MeshLoader.onError);
         return loader;
     },

     'obj': function(meshRes, uri, options) {
       const material = options.material;
       const loader = new THREE.OBJLoader(options.loader);
       loader.log = function(message) {
         if (meshRes.warnings) {
           console.warn(message);
         }
       };

       //Reload the mesh again after materials have been loaded
       // @todo: this should be improved so that the file doesn't need to be
       // reloaded however that would involve more changes within the OBJLoader.
       function onMaterialsLoaded(loader, materials) {
         loader.
         setMaterials(materials).
         load(
           uri,
           function OBJMaterialsReady(obj) {
             // add the container group
             meshRes.add(obj);
           },
           null,
           ROS3D.MeshLoader.onError);
       }

       loader.load(
         uri,
         function OBJFileReady(obj) {

           const baseUri = THREE.LoaderUtils.extractUrlBase( uri );

           if (obj.materialLibraries.length) {
             // load the material libraries
             const materialUri = obj.materialLibraries[0];
             new THREE.MTLLoader(options.loader).setPath(baseUri).load(
               materialUri,
               function(materials) {
                  materials.preload();
                  onMaterialsLoaded(loader, materials);
               },
               null,
               ROS3D.MeshLoader.onError
             );
           } else {
             // add the container group
             meshRes.add(obj);
           }

         },
         /*onProgress=*/null,
         ROS3D.MeshLoader.onError
         );
         return loader;
     },

     'stl': function(meshRes, uri, options) {
       const material = options.material;
       const loader = new THREE.STLLoader(options.loader);
       {
         loader.load(uri,
                     function ( geometry ) {
                       geometry.computeFaceNormals();
                       var mesh;
                       if(material !== null) {
                         mesh = new THREE.Mesh( geometry, material );
                       } else {
                         mesh = new THREE.Mesh( geometry,
                                                new THREE.MeshBasicMaterial( { color: 0x999999 } ) );
                       }
                       meshRes.add(mesh);
                     },
                     /*onProgress=*/null,
                     ROS3D.MeshLoader.onError);
       }
       return loader;
     }

   }
 };

/**
 * @fileOverview
 * @author Jihoon Lee - jihoonlee.in@gmail.com
 * @author Russell Toris - rctoris@wpi.edu
 */

/**
 * A MeshResource is an THREE object that will load from a external mesh file. Currently loads
 * Collada files.
 *
 * @constructor
 * @param options - object with following keys:
 *
 *  * path (optional) - the base path to the associated models that will be loaded
 *  * resource - the resource file name to load
 *  * material (optional) - the material to use for the object
 *  * warnings (optional) - if warnings should be printed
 */
ROS3D.MeshResource = function(options) {
  THREE.Object3D.call(this);
  options = options || {};
  var path = options.path || '/';
  var resource = options.resource;
  var material = options.material || null;
  this.warnings = options.warnings;


  // check for a trailing '/'
  if (path.substr(path.length - 1) !== '/') {
    path += '/';
  }

  var uri = path + resource;
  var fileType = uri.substr(-3).toLowerCase();

  // check the type
  var loaderFunc = ROS3D.MeshLoader.loaders[fileType];
  if (loaderFunc) {
    loaderFunc(this, uri, options);
  } else {
    console.warn('Unsupported loader for file type: \'' + fileType + '\'');
  }
};
ROS3D.MeshResource.prototype.__proto__ = THREE.Object3D.prototype;

/**
 * @fileOverview
 * @author David Gossow - dgossow@willowgarage.com
 */

/**
 * A TriangleList is a THREE object that can be used to display a list of triangles as a geometry.
 *
 * @constructor
 * @param options - object with following keys:
 *
 *   * material (optional) - the material to use for the object
 *   * vertices - the array of vertices to use
 *   * colors - the associated array of colors to use
 */
ROS3D.TriangleList = function(options) {
  options = options || {};
  var material = options.material || new THREE.MeshBasicMaterial();
  var vertices = options.vertices;
  var colors = options.colors;

  THREE.Object3D.call(this);

  // set the material to be double sided
  material.side = THREE.DoubleSide;

  // construct the geometry
  var geometry = new THREE.Geometry();
  for (i = 0; i < vertices.length; i++) {
    geometry.vertices.push(new THREE.Vector3(vertices[i].x, vertices[i].y, vertices[i].z));
  }

  // set the colors
  var i, j;
  if (colors.length === vertices.length) {
    // use per-vertex color
    for (i = 0; i < vertices.length; i += 3) {
      var faceVert = new THREE.Face3(i, i + 1, i + 2);
      for (j = i * 3; j < i * 3 + 3; i++) {
        var color = new THREE.Color();
        color.setRGB(colors[i].r, colors[i].g, colors[i].b);
        faceVert.vertexColors.push(color);
      }
      geometry.faces.push(faceVert);
    }
    material.vertexColors = THREE.VertexColors;
  } else if (colors.length === vertices.length / 3) {
    // use per-triangle color
    for (i = 0; i < vertices.length; i += 3) {
      var faceTri = new THREE.Face3(i, i + 1, i + 2);
      faceTri.color.setRGB(colors[i / 3].r, colors[i / 3].g, colors[i / 3].b);
      geometry.faces.push(faceTri);
    }
    material.vertexColors = THREE.FaceColors;
  } else {
    // use marker color
    for (i = 0; i < vertices.length; i += 3) {
      var face = new THREE.Face3(i, i + 1, i + 2);
      geometry.faces.push(face);
    }
  }

  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  geometry.computeFaceNormals();

  this.add(new THREE.Mesh(geometry, material));
};
ROS3D.TriangleList.prototype.__proto__ = THREE.Object3D.prototype;

/**
 * Set the color of this object to the given hex value.
 *
 * @param hex - the hex value of the color to set
 */
ROS3D.TriangleList.prototype.setColor = function(hex) {
  this.mesh.material.color.setHex(hex);
};

/**
 * @fileOverview
 * @author Russell Toris - rctoris@wpi.edu
 */

/**
 * An OccupancyGrid can convert a ROS occupancy grid message into a THREE object.
 *
 * @constructor
 * @param options - object with following keys:
 *
 *   * message - the occupancy grid message
 *   * color (optional) - color of the visualized grid
 *   * opacity (optional) - opacity of the visualized grid (0.0 == fully transparent, 1.0 == opaque)
 */
ROS3D.OccupancyGrid = function(options) {
  options = options || {};
  var message = options.message;
  var opacity = options.opacity || 1.0;
  var color = options.color || {r:255,g:255,b:255,a:255};

  // create the geometry
  var info = message.info;
  var origin = info.origin;
  var width = info.width;
  var height = info.height;
  var geom = new THREE.PlaneBufferGeometry(width, height);

  // create the color material
  var imageData = new Uint8Array(width * height * 4);
  var texture = new THREE.DataTexture(imageData, width, height, THREE.RGBAFormat);
  texture.flipY = true;
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;
  texture.needsUpdate = true;

  var material = new THREE.MeshBasicMaterial({
    map : texture,
    transparent : opacity < 1.0,
    opacity : opacity
  });
  material.side = THREE.DoubleSide;

  // create the mesh
  THREE.Mesh.call(this, geom, material);
  // move the map so the corner is at X, Y and correct orientation (informations from message.info)

  // assign options to this for subclasses
  Object.assign(this, options);

  this.quaternion.copy(new THREE.Quaternion(
      origin.orientation.x,
      origin.orientation.y,
      origin.orientation.z,
      origin.orientation.w
  ));
  this.position.x = (width * info.resolution) / 2 + origin.position.x;
  this.position.y = (height * info.resolution) / 2 + origin.position.y;
  this.position.z = origin.position.z;
  this.scale.x = info.resolution;
  this.scale.y = info.resolution;

  var data = message.data;
  // update the texture (after the the super call and this are accessible)
  this.color = color;
  this.material = material;
  this.texture = texture;

  for ( var row = 0; row < height; row++) {
    for ( var col = 0; col < width; col++) {

      // determine the index into the map data
      var invRow = (height - row - 1);
      var mapI = col + (invRow * width);
      // determine the value
      var val = this.getValue(mapI, invRow, col, data);

      // determine the color
      var color = this.getColor(mapI, invRow, col, val);

      // determine the index into the image data array
      var i = (col + (row * width)) * 4;

      // copy the color
      imageData.set(color, i);
    }
  }

  texture.needsUpdate = true;

};

ROS3D.OccupancyGrid.prototype.dispose = function() {
  this.material.dispose();
  this.texture.dispose();
};

/**
 * Returns the value for a given grid cell
 * @param {int} index the current index of the cell
 * @param {int} row the row of the cell
 * @param {int} col the column of the cell
 * @param {object} data the data buffer
 */
ROS3D.OccupancyGrid.prototype.getValue = function(index, row, col, data) {
  return data[index];
};

/**
 * Returns a color value given parameters of the position in the grid; the default implementation
 * scales the default color value by the grid value. Subclasses can extend this functionality
 * (e.g. lookup a color in a color map).
 * @param {int} index the current index of the cell
 * @param {int} row the row of the cell
 * @param {int} col the column of the cell
 * @param {float} value the value of the cell
 * @returns r,g,b,a array of values from 0 to 255 representing the color values for each channel
 */
ROS3D.OccupancyGrid.prototype.getColor = function(index, row, col, value) {
  return [
    (value * this.color.r) / 255,
    (value * this.color.g) / 255,
    (value * this.color.b) / 255,
    255
  ];
};

ROS3D.OccupancyGrid.prototype.__proto__ = THREE.Mesh.prototype;

/**
 * @fileOverview
 * @author Russell Toris - rctoris@wpi.edu
 */

/**
 * An occupancy grid client that listens to a given map topic.
 *
 * Emits the following events:
 *
 *  * 'change' - there was an update or change in the marker
 *
 * @constructor
 * @param options - object with following keys:
 *
 *   * ros - the ROSLIB.Ros connection handle
 *   * topic (optional) - the map topic to listen to
 *   * continuous (optional) - if the map should be continuously loaded (e.g., for SLAM)
 *   * tfClient (optional) - the TF client handle to use for a scene node
 *   * compression (optional) - message compression (default: 'cbor')
 *   * rootObject (optional) - the root object to add this marker to
 *   * offsetPose (optional) - offset pose of the grid visualization, e.g. for z-offset (ROSLIB.Pose type)
 *   * color (optional) - color of the visualized grid
 *   * opacity (optional) - opacity of the visualized grid (0.0 == fully transparent, 1.0 == opaque)
 */
ROS3D.OccupancyGridClient = function(options) {
  EventEmitter3.call(this);
  options = options || {};
  this.ros = options.ros;
  this.topicName = options.topic || '/map';
  this.compression = options.compression || 'cbor';
  this.continuous = options.continuous;
  this.tfClient = options.tfClient;
  this.rootObject = options.rootObject || new THREE.Object3D();
  this.offsetPose = options.offsetPose || new ROSLIB.Pose();
  this.color = options.color || {r:255,g:255,b:255};
  this.opacity = options.opacity || 1.0;

  // current grid that is displayed
  this.currentGrid = null;

  // subscribe to the topic
  this.rosTopic = undefined;
  this.processMessageBound = this.processMessage.bind(this);
  this.subscribe();
};
ROS3D.OccupancyGridClient.prototype.__proto__ = EventEmitter3.prototype;

ROS3D.OccupancyGridClient.prototype.unsubscribe = function(){
  if(this.rosTopic){
    this.rosTopic.unsubscribe(this.processMessageBound);
  }
};

ROS3D.OccupancyGridClient.prototype.subscribe = function(){
  this.unsubscribe();

  // subscribe to the topic
  this.rosTopic = new ROSLIB.Topic({
    ros : this.ros,
    name : this.topicName,
    messageType : 'nav_msgs/OccupancyGrid',
    queue_length : 1,
    compression : this.compression
  });
  this.sceneNode = null;
  this.rosTopic.subscribe(this.processMessageBound);
};

ROS3D.OccupancyGridClient.prototype.processMessage = function(message){
  // check for an old map
  if (this.currentGrid) {
    // check if it there is a tf client
    if (this.tfClient) {
      // grid is of type ROS3D.SceneNode
      this.sceneNode.unsubscribeTf();
      this.sceneNode.remove(this.currentGrid);
    } else {
      this.rootObject.remove(this.currentGrid);
    }
    this.currentGrid.dispose();
  }

  var newGrid = new ROS3D.OccupancyGrid({
    message : message,
    color : this.color,
    opacity : this.opacity
  });

  // check if we care about the scene
  if (this.tfClient) {
    this.currentGrid = newGrid;
    if (this.sceneNode === null) {
      this.sceneNode = new ROS3D.SceneNode({
        frameID : message.header.frame_id,
        tfClient : this.tfClient,
        object : newGrid,
        pose : this.offsetPose
      });
      this.rootObject.add(this.sceneNode);
    } else {
      this.sceneNode.add(this.currentGrid);
    }
  } else {
    this.sceneNode = this.currentGrid = newGrid;
    this.rootObject.add(this.currentGrid);
  }

  this.emit('change');

  // check if we should unsubscribe
  if (!this.continuous) {
    this.rosTopic.unsubscribe(this.processMessageBound);
  }
};

/**
 * @fileOverview
 * @author Peter Sari - sari@photoneo.com
 */

/**
 * An OcTree client that listens to a given OcTree topic.
 *
 * Emits the following events:
 *
 * 'change' - there was an update or change in the marker
 *
 * @constructor
 * @param options - object with following keys:
 *
 *    * ros - the ROSLIB.Ros connection handle
 *    * topic (optional) - the map topic to listen to
 *    * continuous (optional) - if the map should be continuously loaded (e.g., for SLAM)
 *    * tfClient (optional) - the TF client handle to use for a scene node
 *    * compression (optional) - message compression (default: 'cbor')
 *    * rootObject (optional) - the root object to add this marker to
 *    * offsetPose (optional) - offset pose of the mao visualization, e.g. for z-offset (ROSLIB.Pose type)
 *    * colorMode (optional)) - colorization mode for each voxels @see RORS3D.OcTreeColorMode (default 'color')
 *    * color (optional) - color of the visualized map (if solid coloring option was set). Can be any value accepted by THREE.Color
 *    * opacity (optional) - opacity of the visualized grid (0.0 == fully transparent, 1.0 == opaque)
 *    * palette (optional) - list of RGB colors to be used as palette (THREE.Color)
 *    * paletteScale (optional) - scale favtor of palette to cover wider range of values. (default: 1)
 *    * voxelRenderMode (optional)- toggle between rendering modes @see ROS3D.OcTreeVoxelRenderMode. (default `occupid`)
 *
 */

ROS3D.OcTreeClient = function(options) {
  EventEmitter3.call(this);
  options = options || {};
  this.ros = options.ros;
  this.topicName = options.topic || '/octomap';
  this.compression = options.compression || 'cbor';
  this.continuous = options.continuous;
  this.tfClient = options.tfClient;
  this.rootObject = options.rootObject || new THREE.Object3D();
  this.offsetPose = options.offsetPose || new ROSLIB.Pose();

  // Options passed to converter
  this.options = {};

  // Append only when it was set, otherwise defaults are provided by the underlying layer
  if (typeof options.color !== 'undefined') { this.options['color'] = options.color; }
  if (typeof options.opacity !== 'undefined') { this.options['opacity'] = options.opacity; }
  if (typeof options.colorMode !== 'undefined') { this.options['colorMode'] = options.colorMode; }
  if (typeof options.palette !== 'undefined') { this.options['palette'] = options.palette; }
  if (typeof options.paletteScale !== 'undefined') { this.options['paletteScale'] = options.palette; }
  if (typeof options.voxelRenderMode !== 'undefined') { this.options['voxelRenderMode'] = options.voxelRenderMode; }

  // current grid that is displayed
  this.currentMap = null;

  // subscribe to the topic
  this.rosTopic = undefined;
  this.processMessageBound = this.processMessage.bind(this);
  this.subscribe();
};

ROS3D.OcTreeClient.prototype.__proto__ = EventEmitter3.prototype;

ROS3D.OcTreeClient.prototype.unsubscribe = function () {
  if (this.rosTopic) {
    this.rosTopic.unsubscribe(this.processMessageBound);
  }
};

ROS3D.OcTreeClient.prototype.subscribe = function () {
  this.unsubscribe();
  // subscribe to the topic
  this.rosTopic = new ROSLIB.Topic({
    ros: this.ros,
    name: this.topicName,
    messageType: 'octomap_msgs/Octomap',
    queue_length: 1,
    compression: this.compression
  });
  this.rosTopic.subscribe(this.processMessageBound);
};

ROS3D.OcTreeClient.prototype.processMessage = function (message) {
  // check for an old map
  if (this.currentMap) {
    if (this.currentMap.tfClient) {
      this.currentMap.unsubscribeTf();
    }
  }

  this._processMessagePrivate(message);

  if (!this.continuous) {
    this.rosTopic.unsubscribe(this.processMessageBound);
  }
};


ROS3D.OcTreeClient.prototype._loadOcTree = function (message) {

  return new Promise(
    function (resolve, reject) {

      // 1. Create the corresponding octree object from message
      const options = Object.assign({
        resolution: message.resolution,
      }, this.options);

      let newOcTree = null;
      {
        if (message.binary) {
          newOcTree = new ROS3D.OcTreeBase(
            options
          );
          newOcTree.readBinary(message.data);
        } else {

          const ctorTable = {
            'OcTree': ROS3D.OcTree,
            'ColorOcTree': ROS3D.ColorOcTree,
          };

          if (message.id in ctorTable) {
            console.log(message.id, ctorTable);

            newOcTree = new ctorTable[message.id](
              options
            );

            newOcTree.read(message.data);
          }

        }
      }

      {
        newOcTree.buildGeometry();
      }

      resolve(newOcTree);
    }.bind(this));

};

ROS3D.OcTreeClient.prototype._processMessagePrivate = function (message) {
  let promise = this._loadOcTree(message);

  promise.then(
    // 3. Replace geometry
    function (newOcTree) {
      // check if we care about the scene
      const oldNode = this.sceneNode;
      if (this.tfClient) {
        this.currentMap = newOcTree;
        this.sceneNode = new ROS3D.SceneNode({
          frameID: message.header.frame_id,
          tfClient: this.tfClient,
          object: newOcTree.object,
          pose: this.offsetPose
        });
      } else {
        this.sceneNode = newOcTree.object;
        this.currentMap = newOcTree;
      }

      this.rootObject.remove(oldNode);
      this.rootObject.add(this.sceneNode);

      this.emit('change');
    }.bind(this)
  );
};

/**
 * @fileOverview
 * @author David V. Lu!! - davidvlu@gmail.com
 */

/**
 * An Odometry client
 *
 * @constructor
 * @param options - object with following keys:
 *
 *  * ros - the ROSLIB.Ros connection handle
 *  * topic - the marker topic to listen to
 *  * tfClient - the TF client handle to use
 *  * rootObject (optional) - the root object to add this marker to
 *  * keep (optional) - number of markers to keep around (default: 1)
 *  * color (optional) - color for line (default: 0xcc00ff)
 *  * length (optional) - the length of the arrow (default: 1.0)
 *  * headLength (optional) - the head length of the arrow (default: 0.2)
 *  * shaftDiameter (optional) - the shaft diameter of the arrow (default: 0.05)
 *  * headDiameter (optional) - the head diameter of the arrow (default: 0.1)
 */
ROS3D.Odometry = function(options) {
  THREE.Object3D.call(this);
  this.options = options || {};
  this.ros = options.ros;
  this.topicName = options.topic || '/particlecloud';
  this.tfClient = options.tfClient;
  this.color = options.color || 0xcc00ff;
  this.length = options.length || 1.0;
  this.rootObject = options.rootObject || new THREE.Object3D();
  this.keep = options.keep || 1;

  this.sns = [];

  this.rosTopic = undefined;
  this.processMessageBound = this.processMessage.bind(this);
  this.subscribe();
};
ROS3D.Odometry.prototype.__proto__ = THREE.Object3D.prototype;


ROS3D.Odometry.prototype.unsubscribe = function(){
  if(this.rosTopic){
    this.rosTopic.unsubscribe(this.processMessageBound);
  }
};

ROS3D.Odometry.prototype.subscribe = function(){
  this.unsubscribe();

  // subscribe to the topic
  this.rosTopic = new ROSLIB.Topic({
    ros : this.ros,
    name : this.topicName,
    queue_length : 1,
    messageType : 'nav_msgs/Odometry'
  });
  this.rosTopic.subscribe(this.processMessageBound);
};

ROS3D.Odometry.prototype.processMessage = function(message){
  if(this.sns.length >= this.keep) {
      this.sns[0].unsubscribeTf();
      this.rootObject.remove(this.sns[0]);
      this.sns.shift();
  }

  this.options.origin = new THREE.Vector3( message.pose.pose.position.x, message.pose.pose.position.y,
                                           message.pose.pose.position.z);

  var rot = new THREE.Quaternion(message.pose.pose.orientation.x, message.pose.pose.orientation.y,
                                 message.pose.pose.orientation.z, message.pose.pose.orientation.w);
  this.options.direction = new THREE.Vector3(1,0,0);
  this.options.direction.applyQuaternion(rot);
  this.options.material = new THREE.MeshBasicMaterial({color: this.color});
  var arrow = new ROS3D.Arrow(this.options);

  this.sns.push(new ROS3D.SceneNode({
    frameID : message.header.frame_id,
    tfClient : this.tfClient,
    object : arrow
  }));

  this.rootObject.add(this.sns[ this.sns.length - 1]);
};

/**
 * @fileOverview
 * @author David V. Lu!! - davidvlu@gmail.com
 */

/**
 * A Path client that listens to a given topic and displays a line connecting the poses.
 *
 * @constructor
 * @param options - object with following keys:
 *
 *  * ros - the ROSLIB.Ros connection handle
 *  * topic - the marker topic to listen to
 *  * tfClient - the TF client handle to use
 *  * rootObject (optional) - the root object to add this marker to
 *  * color (optional) - color for line (default: 0xcc00ff)
 */
ROS3D.Path = function(options) {
  THREE.Object3D.call(this);
  options = options || {};
  this.ros = options.ros;
  this.topicName = options.topic || '/path';
  this.tfClient = options.tfClient;
  this.color = options.color || 0xcc00ff;
  this.rootObject = options.rootObject || new THREE.Object3D();

  this.sn = null;
  this.line = null;

  this.rosTopic = undefined;
  this.processMessageBound = this.processMessage.bind(this);
  this.subscribe();
};
ROS3D.Path.prototype.__proto__ = THREE.Object3D.prototype;


ROS3D.Path.prototype.unsubscribe = function(){
  if(this.rosTopic){
    this.rosTopic.unsubscribe(this.processMessageBound);
  }
};

ROS3D.Path.prototype.subscribe = function(){
  this.unsubscribe();

  // subscribe to the topic
  this.rosTopic = new ROSLIB.Topic({
      ros : this.ros,
      name : this.topicName,
      queue_length : 1,
      messageType : 'nav_msgs/Path'
  });
  this.rosTopic.subscribe(this.processMessageBound);
};

ROS3D.Path.prototype.processMessage = function(message){
  if(this.sn!==null){
      this.sn.unsubscribeTf();
      this.rootObject.remove(this.sn);
  }

  var lineGeometry = new THREE.Geometry();
  for(var i=0; i<message.poses.length;i++){
      var v3 = new THREE.Vector3( message.poses[i].pose.position.x, message.poses[i].pose.position.y,
                                  message.poses[i].pose.position.z);
      lineGeometry.vertices.push(v3);
  }

  lineGeometry.computeLineDistances();
  var lineMaterial = new THREE.LineBasicMaterial( { color: this.color } );
  var line = new THREE.Line( lineGeometry, lineMaterial );

  this.sn = new ROS3D.SceneNode({
      frameID : message.header.frame_id,
      tfClient : this.tfClient,
      object : line
  });

  this.rootObject.add(this.sn);
};

/**
 * @fileOverview
 * @author David V. Lu!! - davidvlu@gmail.com
 */

/**
 * A PointStamped client
 *
 * @constructor
 * @param options - object with following keys:
 *
 *  * ros - the ROSLIB.Ros connection handle
 *  * topic - the marker topic to listen to
 *  * tfClient - the TF client handle to use
 *  * rootObject (optional) - the root object to add this marker to
 *  * color (optional) - color for line (default: 0xcc00ff)
 *  * radius (optional) - radius of the point (default: 0.2)
 */
ROS3D.Point = function(options) {
  THREE.Object3D.call(this);
  this.options = options || {};
  this.ros = options.ros;
  this.topicName = options.topic || '/point';
  this.tfClient = options.tfClient;
  this.color = options.color || 0xcc00ff;
  this.rootObject = options.rootObject || new THREE.Object3D();
  this.radius = options.radius || 0.2;

  this.sn = null;

  this.rosTopic = undefined;
  this.processMessageBound = this.processMessage.bind(this);
  this.subscribe();
};
ROS3D.Point.prototype.__proto__ = THREE.Object3D.prototype;


ROS3D.Point.prototype.unsubscribe = function(){
  if(this.rosTopic){
    this.rosTopic.unsubscribe(this.processMessageBound);
  }
};

ROS3D.Point.prototype.subscribe = function(){
  this.unsubscribe();

  // subscribe to the topic
  this.rosTopic = new ROSLIB.Topic({
      ros : this.ros,
      name : this.topicName,
      queue_length : 1,
      messageType : 'geometry_msgs/PointStamped'
  });
  this.rosTopic.subscribe(this.processMessageBound);
};

ROS3D.Point.prototype.processMessage = function(message){
  if(this.sn!==null){
      this.sn.unsubscribeTf();
      this.rootObject.remove(this.sn);
  }

  var sphereGeometry = new THREE.SphereGeometry( this.radius );
  var sphereMaterial = new THREE.MeshBasicMaterial( {color: this.color} );
  var sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
  sphere.position.set(message.point.x, message.point.y, message.point.z);

  this.sn = new ROS3D.SceneNode({
      frameID : message.header.frame_id,
      tfClient : this.tfClient,
      object : sphere
  });

  this.rootObject.add(this.sn);
};

/**
 * @fileOverview
 * @author David V. Lu!! - davidvlu@gmail.com
 */

/**
 * A PolygonStamped client that listens to a given topic and displays the polygon
 *
 * @constructor
 * @param options - object with following keys:
 *
 *  * ros - the ROSLIB.Ros connection handle
 *  * topic - the marker topic to listen to
 *  * tfClient - the TF client handle to use
 *  * rootObject (optional) - the root object to add this marker to
 *  * color (optional) - color for line (default: 0xcc00ff)
 */
ROS3D.Polygon = function(options) {
  THREE.Object3D.call(this);
  options = options || {};
  this.ros = options.ros;
  this.topicName = options.topic || '/path';
  this.tfClient = options.tfClient;
  this.color = options.color || 0xcc00ff;
  this.rootObject = options.rootObject || new THREE.Object3D();

  this.sn = null;
  this.line = null;

  this.rosTopic = undefined;
  this.processMessageBound = this.processMessage.bind(this);
  this.subscribe();
};
ROS3D.Polygon.prototype.__proto__ = THREE.Object3D.prototype;


ROS3D.Polygon.prototype.unsubscribe = function(){
  if(this.rosTopic){
    this.rosTopic.unsubscribe(this.processMessageBound);
  }
};

ROS3D.Polygon.prototype.subscribe = function(){
  this.unsubscribe();

  // subscribe to the topic
  this.rosTopic = new ROSLIB.Topic({
      ros : this.ros,
      name : this.topicName,
      queue_length : 1,
      messageType : 'geometry_msgs/PolygonStamped'
  });
  this.rosTopic.subscribe(this.processMessageBound);
};

ROS3D.Polygon.prototype.processMessage = function(message){
  if(this.sn!==null){
      this.sn.unsubscribeTf();
      this.rootObject.remove(this.sn);
  }

  var lineGeometry = new THREE.Geometry();
  var v3;
  for(var i=0; i<message.polygon.points.length;i++){
      v3 = new THREE.Vector3( message.polygon.points[i].x, message.polygon.points[i].y,
                              message.polygon.points[i].z);
      lineGeometry.vertices.push(v3);
  }
  v3 = new THREE.Vector3( message.polygon.points[0].x, message.polygon.points[0].y,
                          message.polygon.points[0].z);
  lineGeometry.vertices.push(v3);
  lineGeometry.computeLineDistances();
  var lineMaterial = new THREE.LineBasicMaterial( { color: this.color } );
  var line = new THREE.Line( lineGeometry, lineMaterial );

  this.sn = new ROS3D.SceneNode({
      frameID : message.header.frame_id,
      tfClient : this.tfClient,
      object : line
  });

  this.rootObject.add(this.sn);
};

/**
 * @fileOverview
 * @author David V. Lu!! - davidvlu@gmail.com
 */

/**
 * A PoseStamped client
 *
 * @constructor
 * @param options - object with following keys:
 *
 *  * ros - the ROSLIB.Ros connection handle
 *  * topic - the marker topic to listen to
 *  * tfClient - the TF client handle to use
 *  * rootObject (optional) - the root object to add this marker to
 *  * color (optional) - color for line (default: 0xcc00ff)
 *  * length (optional) - the length of the arrow (default: 1.0)
 *  * headLength (optional) - the head length of the arrow (default: 0.2)
 *  * shaftDiameter (optional) - the shaft diameter of the arrow (default: 0.05)
 *  * headDiameter (optional) - the head diameter of the arrow (default: 0.1)
 */
ROS3D.Pose = function(options) {
  THREE.Object3D.call(this);
  this.options = options || {};
  this.ros = options.ros;
  this.topicName = options.topic || '/pose';
  this.tfClient = options.tfClient;
  this.color = options.color || 0xcc00ff;
  this.rootObject = options.rootObject || new THREE.Object3D();

  this.sn = null;

  this.rosTopic = undefined;
  this.processMessageBound = this.processMessage.bind(this);
  this.subscribe();
};
ROS3D.Pose.prototype.__proto__ = THREE.Object3D.prototype;


ROS3D.Pose.prototype.unsubscribe = function(){
  if(this.rosTopic){
    this.rosTopic.unsubscribe(this.processMessageBound);
  }
};

ROS3D.Pose.prototype.subscribe = function(){
  this.unsubscribe();

  // subscribe to the topic
  this.rosTopic = new ROSLIB.Topic({
      ros : this.ros,
      name : this.topicName,
      queue_length : 1,
      messageType : 'geometry_msgs/PoseStamped'
  });
  this.rosTopic.subscribe(this.processMessageBound);
};

ROS3D.Pose.prototype.processMessage = function(message){
  if(this.sn!==null){
      this.sn.unsubscribeTf();
      this.rootObject.remove(this.sn);
  }

  this.options.origin = new THREE.Vector3( message.pose.position.x, message.pose.position.y,
                                           message.pose.position.z);

  var rot = new THREE.Quaternion(message.pose.orientation.x, message.pose.orientation.y,
                                 message.pose.orientation.z, message.pose.orientation.w);
  this.options.direction = new THREE.Vector3(1,0,0);
  this.options.direction.applyQuaternion(rot);
  this.options.material = new THREE.MeshBasicMaterial({color: this.color});
  var arrow = new ROS3D.Arrow(this.options);

  this.sn = new ROS3D.SceneNode({
      frameID : message.header.frame_id,
      tfClient : this.tfClient,
      object : arrow
  });

  this.rootObject.add(this.sn);
};

/**
 * @fileOverview
 * @author David V. Lu!! - davidvlu@gmail.com
 */

/**
 * A PoseArray client
 *
 * @constructor
 * @param options - object with following keys:
 *
 *  * ros - the ROSLIB.Ros connection handle
 *  * topic - the marker topic to listen to
 *  * tfClient - the TF client handle to use
 *  * rootObject (optional) - the root object to add this marker to
 *  * color (optional) - color for line (default: 0xcc00ff)
 *  * length (optional) - the length of the arrow (default: 1.0)
 */
ROS3D.PoseArray = function(options) {
  THREE.Object3D.call(this);
  this.options = options || {};
  this.ros = options.ros;
  this.topicName = options.topic || '/particlecloud';
  this.tfClient = options.tfClient;
  this.color = options.color || 0xcc00ff;
  this.length = options.length || 1.0;
  this.rootObject = options.rootObject || new THREE.Object3D();

  this.sn = null;

  this.rosTopic = undefined;
  this.processMessageBound = this.processMessage.bind(this);
  this.subscribe();
};
ROS3D.PoseArray.prototype.__proto__ = THREE.Object3D.prototype;


ROS3D.PoseArray.prototype.unsubscribe = function(){
  if(this.rosTopic){
    this.rosTopic.unsubscribe(this.processMessageBound);
  }
};

ROS3D.PoseArray.prototype.subscribe = function(){
  this.unsubscribe();

  // subscribe to the topic
  this.rosTopic = new ROSLIB.Topic({
     ros : this.ros,
     name : this.topicName,
     queue_length : 1,
     messageType : 'geometry_msgs/PoseArray'
 });
  this.rosTopic.subscribe(this.processMessageBound);
};

ROS3D.PoseArray.prototype.processMessage = function(message){
  if(this.sn!==null){
      this.sn.unsubscribeTf();
      this.rootObject.remove(this.sn);
  }

  var group = new THREE.Object3D();
  var line;

  for(var i=0;i<message.poses.length;i++){
      var lineGeometry = new THREE.Geometry();

      var v3 = new THREE.Vector3( message.poses[i].position.x, message.poses[i].position.y,
                                  message.poses[i].position.z);
      lineGeometry.vertices.push(v3);

      var rot = new THREE.Quaternion(message.poses[i].orientation.x, message.poses[i].orientation.y,
                                     message.poses[i].orientation.z, message.poses[i].orientation.w);

      var tip = new THREE.Vector3(this.length,0,0);
      var side1 = new THREE.Vector3(this.length*0.8, this.length*0.2, 0);
      var side2 = new THREE.Vector3(this.length*0.8, -this.length*0.2, 0);
      tip.applyQuaternion(rot);
      side1.applyQuaternion(rot);
      side2.applyQuaternion(rot);

      lineGeometry.vertices.push(tip.add(v3));
      lineGeometry.vertices.push(side1.add(v3));
      lineGeometry.vertices.push(side2.add(v3));
      lineGeometry.vertices.push(tip);

      lineGeometry.computeLineDistances();
      var lineMaterial = new THREE.LineBasicMaterial( { color: this.color } );
      line = new THREE.Line( lineGeometry, lineMaterial );

      group.add(line);
  }

  this.sn = new ROS3D.SceneNode({
      frameID : message.header.frame_id,
      tfClient : this.tfClient,
      object : group
  });

  this.rootObject.add(this.sn);
};

/**
 * @fileOverview
 * @author David V. Lu!! - davidvlu@gmail.com
 */

/**
 * A PoseWithCovarianceStamped client
 *
 * @constructor
 * @param options - object with following keys:
 *
 *  * ros - the ROSLIB.Ros connection handle
 *  * topic - the marker topic to listen to
 *  * tfClient - the TF client handle to use
 *  * rootObject (optional) - the root object to add this marker to
 *  * color (optional) - color for line (default: 0xcc00ff)
 */
ROS3D.PoseWithCovariance = function(options) {
  THREE.Object3D.call(this);
  this.options = options || {};
  this.ros = options.ros;
  this.topicName = options.topic || '/PoseWithCovariance';
  this.tfClient = options.tfClient;
  this.color = options.color || 0xcc00ff;
  this.rootObject = options.rootObject || new THREE.Object3D();

  this.sn = null;

  this.rosTopic = undefined;
  this.processMessageBound = this.processMessage.bind(this);
  this.subscribe();
};
ROS3D.PoseWithCovariance.prototype.__proto__ = THREE.Object3D.prototype;


ROS3D.PoseWithCovariance.prototype.unsubscribe = function(){
  if(this.rosTopic){
    this.rosTopic.unsubscribe(this.processMessageBound);
  }
};

ROS3D.PoseWithCovariance.prototype.subscribe = function(){
  this.unsubscribe();

  // subscribe to the topic
  this.rosTopic = new ROSLIB.Topic({
      ros : this.ros,
      name : this.topicName,
      queue_length : 1,
      messageType : 'geometry_msgs/PoseWithCovarianceStamped'
  });
  this.rosTopic.subscribe(this.processMessageBound);
};

ROS3D.PoseWithCovariance.prototype.processMessage = function(message){
  if(this.sn!==null){
      this.sn.unsubscribeTf();
      this.rootObject.remove(this.sn);
  }

  this.options.origin = new THREE.Vector3( message.pose.pose.position.x, message.pose.pose.position.y,
                                           message.pose.pose.position.z);

  var rot = new THREE.Quaternion(message.pose.pose.orientation.x, message.pose.pose.orientation.y,
                                 message.pose.pose.orientation.z, message.pose.pose.orientation.w);
  this.options.direction = new THREE.Vector3(1,0,0);
  this.options.direction.applyQuaternion(rot);
  this.options.material = new THREE.MeshBasicMaterial({color: this.color});
  var arrow = new ROS3D.Arrow(this.options);

  this.sn = new ROS3D.SceneNode({
      frameID : message.header.frame_id,
      tfClient : this.tfClient,
      object : arrow
  });

  this.rootObject.add(this.sn);
};

/**
 * @fileOverview
 * @author David V. Lu!! - davidvlu@gmail.com
 */

/**
 * A LaserScan client that listens to a given topic and displays the points.
 *
 * @constructor
 * @param options - object with following keys:
 *
 *  * ros - the ROSLIB.Ros connection handle
 *  * topic - the marker topic to listen to (default '/scan')
 *  * tfClient - the TF client handle to use
 *  * compression (optional) - message compression (default: 'cbor')
 *  * rootObject (optional) - the root object to add this marker to use for the points.
 *  * max_pts (optional) - number of points to draw (default: 10000)
 *  * pointRatio (optional) - point subsampling ratio (default: 1, no subsampling)
 *  * messageRatio (optional) - message subsampling ratio (default: 1, no subsampling)
 *  * material (optional) - a material object or an option to construct a PointsMaterial.
 */
ROS3D.LaserScan = function(options) {
  options = options || {};
  this.ros = options.ros;
  this.topicName = options.topic || '/scan';
  this.compression = options.compression || 'cbor';
  this.points = new ROS3D.Points(options);
  this.rosTopic = undefined;
  this.processMessageBound = this.processMessage.bind(this);
  this.subscribe();
};
ROS3D.LaserScan.prototype.__proto__ = THREE.Object3D.prototype;


ROS3D.LaserScan.prototype.unsubscribe = function(){
  if(this.rosTopic){
    this.rosTopic.unsubscribe(this.processMessageBound);
  }
};

ROS3D.LaserScan.prototype.subscribe = function(){
  this.unsubscribe();

  // subscribe to the topic
  this.rosTopic = new ROSLIB.Topic({
    ros : this.ros,
    name : this.topicName,
    compression : this.compression,
    queue_length : 1,
    messageType : 'sensor_msgs/LaserScan'
  });
  this.rosTopic.subscribe(this.processMessageBound);
};

ROS3D.LaserScan.prototype.processMessage = function(message){
  if(!this.points.setup(message.header.frame_id)) {
      return;
  }
  var n = message.ranges.length;
  var j = 0;
  for(var i=0;i<n;i+=this.points.pointRatio){
    var range = message.ranges[i];
    if(range >= message.range_min && range <= message.range_max){
        var angle = message.angle_min + i * message.angle_increment;
        this.points.positions.array[j++] = range * Math.cos(angle);
        this.points.positions.array[j++] = range * Math.sin(angle);
        this.points.positions.array[j++] = 0.0;
    }
  }
  this.points.update(j/3);
};

/**
 * @fileOverview
 * @author Mathieu Bredif - mathieu.bredif@ign.fr
 */

/**
 * A NavSatFix client that listens to a given topic and displays a line connecting the gps fixes.
 *
 * @constructor
 * @param options - object with following keys:
 *
 *  * ros - the ROSLIB.Ros connection handle
 *  * topic - the NavSatFix topic to listen to
 *  * rootObject (optional) - the root object to add the trajectory line and the gps marker to
 *  * object3d (optional) - the object3d to be translated by the gps position
 *  * material (optional) - THREE.js material or options passed to a THREE.LineBasicMaterial, such as :
 *    * material.color (optional) - color for line
 *    * material.linewidth (optional) - line width
 *  * altitudeNaN (optional) - default altitude when the message altitude is NaN (default: 0)
 *  * keep (optional) - number of gps fix points to keep (default: 100)
 *  * convert (optional) - conversion function from lon/lat/alt to THREE.Vector3 (default: passthrough)
 */

ROS3D.NavSatFix = function(options) {
  options = options || {};
  this.ros = options.ros;
  this.topicName = options.topic || '/gps/fix';
  this.rootObject = options.rootObject || new THREE.Object3D();
  this.object3d = options.object3d || new THREE.Object3D();
  var material = options.material || {};
  this.altitudeNaN = options.altitudeNaN || 0;
  this.keep = options.keep || 100;
  this.convert = options.convert || function(lon,lat,alt) { return new THREE.Vector3(lon,lat,alt); };
  this.count = 0;
  this.next1 = 0;
  this.next2 = this.keep;

  this.geom = new THREE.BufferGeometry();
  this.vertices = new THREE.BufferAttribute(new Float32Array( 6 * this.keep ), 3 );
  this.geom.addAttribute( 'position',  this.vertices);
  this.material = material.isMaterial ? material : new THREE.LineBasicMaterial( material );
  this.line = new THREE.Line( this.geom, this.material );
  this.rootObject.add(this.object3d);
  this.rootObject.add(this.line);

  this.rosTopic = undefined;

  this.processMessageBound = this.processMessage.bind(this);
  this.subscribe();
};
ROS3D.NavSatFix.prototype.__proto__ = THREE.Object3D.prototype;


ROS3D.NavSatFix.prototype.unsubscribe = function(){
  if(this.rosTopic){
    this.rosTopic.unsubscribe(this.processMessageBound);
  }
};

ROS3D.NavSatFix.prototype.subscribe = function(){
  this.unsubscribe();

  // subscribe to the topic
  this.rosTopic = new ROSLIB.Topic({
      ros : this.ros,
      name : this.topicName,
      queue_length : 1,
      messageType : 'sensor_msgs/NavSatFix'
  });

  this.rosTopic.subscribe(this.processMessageBound);
};

ROS3D.NavSatFix.prototype.processMessage = function(message){
  var altitude = isNaN(message.altitude) ? this.altitudeNaN : message.altitude;
  var p = this.convert(message.longitude, message.latitude, altitude);

  // move the object3d to the gps position
  this.object3d.position.copy(p);
  this.object3d.updateMatrixWorld(true);

  // copy the position twice in the circular buffer
  // the second half replicates the first to allow a single drawRange
  this.vertices.array[3*this.next1  ] = p.x;
  this.vertices.array[3*this.next1+1] = p.y;
  this.vertices.array[3*this.next1+2] = p.z;
  this.vertices.array[3*this.next2  ] = p.x;
  this.vertices.array[3*this.next2+1] = p.y;
  this.vertices.array[3*this.next2+2] = p.z;
  this.vertices.needsUpdate = true;

  this.next1 = (this.next1+1) % this.keep;
  this.next2 = this.next1 + this.keep;
  this.count = Math.min(this.count+1, this.keep);
  this.geom.setDrawRange(this.next2-this.count, this.count );
};

/**
 * @fileOverview
 * @author David V. Lu!! - davidvlu@gmail.com
 * @author Mathieu Bredif - mathieu.bredif@ign.fr
 */

/**
 * Decodes the base64-encoded array 'inbytes' into the array 'outbytes'
 * until 'inbytes' is exhausted or 'outbytes' is filled.
 * if 'record_size' is specified, records of length 'record_size' bytes
 * are copied every other 'pointRatio' records.
 * returns the number of decoded records
 */
function decode64(inbytes, outbytes, record_size, pointRatio) {
    var x,b=0,l=0,j=0,L=inbytes.length,A=outbytes.length;
    record_size = record_size || A; // default copies everything (no skipping)
    pointRatio = pointRatio || 1; // default copies everything (no skipping)
    var bitskip = (pointRatio-1) * record_size * 8;
    for(x=0;x<L&&j<A;x++){
        b=(b<<6)+decode64.e[inbytes.charAt(x)];
        l+=6;
        if(l>=8){
            l-=8;
            outbytes[j++]=(b>>>l)&0xff;
            if((j % record_size) === 0) { // skip records
                // no    optimization: for(var i=0;i<bitskip;x++){l+=6;if(l>=8) {l-=8;i+=8;}}
                // first optimization: for(;l<bitskip;l+=6){x++;} l=l%8;
                x += Math.ceil((bitskip - l) / 6);
                l = l % 8;

                if(l>0){b=decode64.e[inbytes.charAt(x)];}
            }
        }
    }
    return Math.floor(j/record_size);
}
// initialize decoder with static lookup table 'e'
decode64.S='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
decode64.e={};
for(var i=0;i<64;i++){decode64.e[decode64.S.charAt(i)]=i;}


/**
 * A PointCloud2 client that listens to a given topic and displays the points.
 *
 * @constructor
 * @param options - object with following keys:
 *
 *  * ros - the ROSLIB.Ros connection handle
 *  * topic - the marker topic to listen to (default: '/points')
 *  * tfClient - the TF client handle to use
 *  * compression (optional) - message compression (default: 'cbor')
 *  * rootObject (optional) - the root object to add this marker to use for the points.
 *  * max_pts (optional) - number of points to draw (default: 10000)
 *  * pointRatio (optional) - point subsampling ratio (default: 1, no subsampling)
 *  * messageRatio (optional) - message subsampling ratio (default: 1, no subsampling)
 *  * material (optional) - a material object or an option to construct a PointsMaterial.
 *  * colorsrc (optional) - the field to be used for coloring (default: 'rgb')
 *  * colormap (optional) - function that turns the colorsrc field value to a color
 */
ROS3D.PointCloud2 = function(options) {
  options = options || {};
  this.ros = options.ros;
  this.topicName = options.topic || '/points';
  this.throttle_rate = options.throttle_rate || null;
  this.compression = options.compression || 'cbor';
  this.max_pts = options.max_pts || 10000;
  this.points = new ROS3D.Points(options);
  this.rosTopic = undefined;
  this.buffer = null;

  this.processMessageBound = this.processMessage.bind(this);
  this.subscribe();
};
ROS3D.PointCloud2.prototype.__proto__ = THREE.Object3D.prototype;


ROS3D.PointCloud2.prototype.unsubscribe = function(){
  if(this.rosTopic){
    this.rosTopic.unsubscribe(this.processMessageBound);
  }
};

ROS3D.PointCloud2.prototype.subscribe = function(){
  this.unsubscribe();

  // subscribe to the topic
  this.rosTopic = new ROSLIB.Topic({
    ros : this.ros,
    name : this.topicName,
    messageType : 'sensor_msgs/PointCloud2',
    throttle_rate : this.throttle_rate,
    queue_length : 1,
    compression: this.compression
  });
  this.rosTopic.subscribe(this.processMessageBound);
};

ROS3D.PointCloud2.prototype.processMessage = function(msg){
  if(!this.points.setup(msg.header.frame_id, msg.point_step, msg.fields)) {
      return;
  }

  var n, pointRatio = this.points.pointRatio;
  var bufSz = this.max_pts * msg.point_step;

  if (msg.data.buffer) {
    this.buffer = msg.data.slice(0, Math.min(msg.data.byteLength, bufSz));
     n = Math.min(msg.height*msg.width / pointRatio, this.points.positions.array.length / 3);
  } else {
    if (!this.buffer || this.buffer.byteLength < bufSz) {
      this.buffer = new Uint8Array(bufSz);
    }
    n = decode64(msg.data, this.buffer, msg.point_step, pointRatio);
    pointRatio = 1;
  }

  var dv = new DataView(this.buffer.buffer);
  var littleEndian = !msg.is_bigendian;
  var x = this.points.fields.x.offset;
  var y = this.points.fields.y.offset;
  var z = this.points.fields.z.offset;
  var base, color;
  for(var i = 0; i < n; i++){
    base = i * pointRatio * msg.point_step;
    this.points.positions.array[3*i    ] = dv.getFloat32(base+x, littleEndian);
    this.points.positions.array[3*i + 1] = dv.getFloat32(base+y, littleEndian);
    this.points.positions.array[3*i + 2] = dv.getFloat32(base+z, littleEndian);

    if(this.points.colors){
        color = this.points.colormap(this.points.getColor(dv,base,littleEndian));
        this.points.colors.array[3*i    ] = color.r;
        this.points.colors.array[3*i + 1] = color.g;
        this.points.colors.array[3*i + 2] = color.b;
    }
  }
  this.points.update(n);
};

/**
 * @fileOverview
 * @author David V. Lu!! - davidvlu@gmail.com
 * @author Mathieu Bredif - mathieu.bredif@ign.fr
 */

/**
 * A set of points. Used by PointCloud2 and LaserScan.
 *
 * @constructor
 * @param options - object with following keys:
 *
 *  * tfClient - the TF client handle to use
 *  * rootObject (optional) - the root object to add this marker to use for the points.
 *  * max_pts (optional) - number of points to draw (default: 10000)
 *  * pointRatio (optional) - point subsampling ratio (default: 1, no subsampling)
 *  * messageRatio (optional) - message subsampling ratio (default: 1, no subsampling)
 *  * material (optional) - a material object or an option to construct a PointsMaterial.
 *  * colorsrc (optional) - the field to be used for coloring (default: 'rgb')
 *  * colormap (optional) - function that turns the colorsrc field value to a color
 */
ROS3D.Points = function(options) {
  THREE.Object3D.call(this);
  options = options || {};
  this.tfClient = options.tfClient;
  this.rootObject = options.rootObject || new THREE.Object3D();
  this.max_pts = options.max_pts || 10000;
  this.pointRatio = options.pointRatio || 1;
  this.messageRatio = options.messageRatio || 1;
  this.messageCount = 0;
  this.material = options.material || {};
  this.colorsrc = options.colorsrc;
  this.colormap = options.colormap;

  if(('color' in options) || ('size' in options) || ('texture' in options)) {
      console.warn(
        'toplevel "color", "size" and "texture" options are deprecated.' +
        'They should beprovided within a "material" option, e.g. : '+
        ' { tfClient, material : { color: mycolor, size: mysize, map: mytexture }, ... }'
      );
  }

  this.sn = null;
};

ROS3D.Points.prototype.__proto__ = THREE.Object3D.prototype;

ROS3D.Points.prototype.setup = function(frame, point_step, fields)
{
    if(this.sn===null){
        // turn fields to a map
        fields = fields || [];
        this.fields = {};
        for(var i=0; i<fields.length; i++) {
            this.fields[fields[i].name] = fields[i];
        }
        this.geom = new THREE.BufferGeometry();

        this.positions = new THREE.BufferAttribute( new Float32Array( this.max_pts * 3), 3, false );
        this.geom.addAttribute( 'position', this.positions.setDynamic(true) );

        if(!this.colorsrc && this.fields.rgb) {
            this.colorsrc = 'rgb';
        }
        if(this.colorsrc) {
            var field = this.fields[this.colorsrc];
            if (field) {
                this.colors = new THREE.BufferAttribute( new Float32Array( this.max_pts * 3), 3, false );
                this.geom.addAttribute( 'color', this.colors.setDynamic(true) );
                var offset = field.offset;
                this.getColor = [
                    function(dv,base,le){return dv.getInt8(base+offset,le);},
                    function(dv,base,le){return dv.getUint8(base+offset,le);},
                    function(dv,base,le){return dv.getInt16(base+offset,le);},
                    function(dv,base,le){return dv.getUint16(base+offset,le);},
                    function(dv,base,le){return dv.getInt32(base+offset,le);},
                    function(dv,base,le){return dv.getUint32(base+offset,le);},
                    function(dv,base,le){return dv.getFloat32(base+offset,le);},
                    function(dv,base,le){return dv.getFloat64(base+offset,le);}
                ][field.datatype-1];
                this.colormap = this.colormap || function(x){return new THREE.Color(x);};
            } else {
                console.warn('unavailable field "' + this.colorsrc + '" for coloring.');
            }
        }

        if(!this.material.isMaterial) { // if it is an option, apply defaults and pass it to a PointsMaterial
            if(this.colors && this.material.vertexColors === undefined) {
                this.material.vertexColors = THREE.VertexColors;
            }
            this.material = new THREE.PointsMaterial(this.material);
        }

        this.object = new THREE.Points( this.geom, this.material );

        this.sn = new ROS3D.SceneNode({
            frameID : frame,
            tfClient : this.tfClient,
            object : this.object
        });

        this.rootObject.add(this.sn);
    }
    return (this.messageCount++ % this.messageRatio) === 0;
};

ROS3D.Points.prototype.update = function(n)
{
  this.geom.setDrawRange(0,n);

  this.positions.needsUpdate = true;
  this.positions.updateRange.count = n * this.positions.itemSize;

  if (this.colors) {
    this.colors.needsUpdate = true;
    this.colors.updateRange.count = n * this.colors.itemSize;
  }
};

/**
 * @fileOverview
 * @author Jihoon Lee - jihoon.lee@kakaobrain.com
 */
/**
 * An Axes node can be used to display the axis of a particular coordinate frame.
 *
 * @constructor
 * @param options - object with following keys:
 *
 *   * frame_id - the frame id to visualize axes
 *   * tfClient - the TF client handle to use
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
ROS3D.TFAxes = function(options) {
  THREE.Object3D.call(this);
  options = options || {};

  this.frame_id = options.frame_id;
  this.tfClient = options.tfClient;
  this.rootObject = options.rootObject || new THREE.Object3D();
  this.axes = new ROS3D.Axes(
    {
      shaftRadius: options.shaftRadius || 0.025,
      headRadius: options.headRaidus || 0.07,
      headLength: options.headLength || 0.2,
      scale: options.scale || 1.0,
      lineType: options.lineType || 'full',
      lineDashLength: options.lineDashLength || 0.1
    });

  this.sn = new ROS3D.SceneNode({
    frameID: this.frame_id,
    tfClient : this.tfClient,
    object : this.axes
  });

  this.rootObject.add(this.sn);

};


ROS3D.TFAxes.prototype.__proto__ = THREE.Object3D.prototype;

/**
 * @fileOverview
 * @author Jihoon Lee - jihoonlee.in@gmail.com
 * @author Russell Toris - rctoris@wpi.edu
 */

/**
 * A URDF can be used to load a ROSLIB.UrdfModel and its associated models into a 3D object.
 *
 * @constructor
 * @param options - object with following keys:
 *
 *   * urdfModel - the ROSLIB.UrdfModel to load
 *   * tfClient - the TF client handle to use
 *   * path (optional) - the base path to the associated Collada models that will be loaded
 *   * tfPrefix (optional) - the TF prefix to used for multi-robots
 *   * loader (optional) - the Collada loader to use (e.g., an instance of ROS3D.COLLADA_LOADER)
 */
ROS3D.Urdf = function(options) {
  options = options || {};
  var urdfModel = options.urdfModel;
  var path = options.path || '/';
  var tfClient = options.tfClient;
  var tfPrefix = options.tfPrefix || '';
  var loader = options.loader;

  THREE.Object3D.call(this);

  // load all models
  var links = urdfModel.links;
  for ( var l in links) {
    var link = links[l];
    for( var i=0; i<link.visuals.length; i++ ) {
      var visual = link.visuals[i];
      if (visual && visual.geometry) {
        // Save frameID
        var frameID = tfPrefix + '/' + link.name;
        // Save color material
        var colorMaterial = null;
        if (visual.material && visual.material.color) {
          var color = visual.material && visual.material.color;
          colorMaterial = ROS3D.makeColorMaterial(color.r, color.g, color.b, color.a);
        }
        if (visual.geometry.type === ROSLIB.URDF_MESH) {
          var uri = visual.geometry.filename;
          // strips package://
          var tmpIndex = uri.indexOf('package://');
          if (tmpIndex !== -1) {
            uri = uri.substr(tmpIndex + ('package://').length);
          }
          var fileType = uri.substr(-3).toLowerCase();

          if (ROS3D.MeshLoader.loaders[fileType]) {
            // create the model
            var mesh = new ROS3D.MeshResource({
              path : path,
              resource : uri,
              loader : loader,
              material : colorMaterial
            });

            // check for a scale
            if(link.visuals[i].geometry.scale) {
              mesh.scale.copy(visual.geometry.scale);
            }

            // create a scene node with the model
            var sceneNode = new ROS3D.SceneNode({
              frameID : frameID,
                pose : visual.origin,
                tfClient : tfClient,
                object : mesh
            });
            sceneNode.name = visual.name;
            this.add(sceneNode);
          } else {
            console.warn('Could not load geometry mesh: '+uri);
          }
        } else {
          var shapeMesh = this.createShapeMesh(visual, options);
          // Create a scene node with the shape
          var scene = new ROS3D.SceneNode({
            frameID: frameID,
              pose: visual.origin,
              tfClient: tfClient,
              object: shapeMesh
          });
          scene.name = visual.name;
          this.add(scene);
        }
      }
    }
  }
};

ROS3D.Urdf.prototype.createShapeMesh = function(visual, options) {
  var colorMaterial = null;
  if (!colorMaterial) {
    colorMaterial = ROS3D.makeColorMaterial(0, 0, 0, 1);
  }
  var shapeMesh;
  // Create a shape
  switch (visual.geometry.type) {
    case ROSLIB.URDF_BOX:
      var dimension = visual.geometry.dimension;
      var cube = new THREE.BoxGeometry(dimension.x, dimension.y, dimension.z);
      shapeMesh = new THREE.Mesh(cube, colorMaterial);
      break;
    case ROSLIB.URDF_CYLINDER:
      var radius = visual.geometry.radius;
      var length = visual.geometry.length;
      var cylinder = new THREE.CylinderGeometry(radius, radius, length, 16, 1, false);
      shapeMesh = new THREE.Mesh(cylinder, colorMaterial);
      shapeMesh.quaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI * 0.5);
      break;
    case ROSLIB.URDF_SPHERE:
      var sphere = new THREE.SphereGeometry(visual.geometry.radius, 16);
      shapeMesh = new THREE.Mesh(sphere, colorMaterial);
      break;
  }

  return shapeMesh;
};

ROS3D.Urdf.prototype.__proto__ = THREE.Object3D.prototype;

ROS3D.Urdf.prototype.unsubscribeTf = function () {
  this.children.forEach(function(n) {
    if (typeof n.unsubscribeTf === 'function') { n.unsubscribeTf(); }
  });
};

/**
 * @fileOverview
 * @author Jihoon Lee - jihoonlee.in@gmail.com
 * @author Russell Toris - rctoris@wpi.edu
 */

/**
 * A URDF client can be used to load a URDF and its associated models into a 3D object from the ROS
 * parameter server.
 *
 * Emits the following events:
 *
 * * 'change' - emited after the URDF and its meshes have been loaded into the root object
 *
 * @constructor
 * @param options - object with following keys:
 *
 *   * ros - the ROSLIB.Ros connection handle
 *   * param (optional) - the paramter to load the URDF from, like 'robot_description'
 *   * tfClient - the TF client handle to use
 *   * path (optional) - the base path to the associated Collada models that will be loaded
 *   * rootObject (optional) - the root object to add this marker to
 *   * tfPrefix (optional) - the TF prefix to used for multi-robots
 *   * loader (optional) - the Collada loader to use (e.g., an instance of ROS3D.COLLADA_LOADER)
 */
ROS3D.UrdfClient = function(options) {
  options = options || {};
  var ros = options.ros;
  this.param = options.param || 'robot_description';
  this.path = options.path || '/';
  this.tfClient = options.tfClient;
  this.rootObject = options.rootObject || new THREE.Object3D();
  this.tfPrefix = options.tfPrefix || '';
  this.loader = options.loader;

  // get the URDF value from ROS
  var getParam = new ROSLIB.Param({
    ros : ros,
    name : this.param
  });
  getParam.get(function(string) {
    // hand off the XML string to the URDF model
    var urdfModel = new ROSLIB.UrdfModel({
      string : string
    });

    // load all models
    this.urdf = new ROS3D.Urdf({
      urdfModel : urdfModel,
      path : this.path,
      tfClient : this.tfClient,
      tfPrefix : this.tfPrefix,
      loader : this.loader
    });
    this.rootObject.add(this.urdf);
  }.bind(this));
};

/**
 * @fileOverview
 * @author Jihoon Lee - jihoonlee.in@gmail.com
 * @author Russell Toris - rctoris@wpi.edu
 */

/**
 * A SceneNode can be used to keep track of a 3D object with respect to a ROS frame within a scene.
 *
 * @constructor
 * @param options - object with following keys:
 *
 *  * tfClient - a handle to the TF client
 *  * frameID - the frame ID this object belongs to
 *  * pose (optional) - the pose associated with this object
 *  * object - the THREE 3D object to be rendered
 */
ROS3D.SceneNode = function(options) {
  THREE.Object3D.call(this);
  options = options || {};
  this.tfClient = options.tfClient;
  this.frameID = options.frameID;
  var object = options.object;
  this.pose = options.pose || new ROSLIB.Pose();

  // Do not render this object until we receive a TF update
  this.visible = false;

  // add the model
  this.add(object);

  // set the inital pose
  this.updatePose(this.pose);

  // save the TF handler so we can remove it later
  this.tfUpdate = function(msg) {

    // apply the transform
    var tf = new ROSLIB.Transform(msg);
    var poseTransformed = new ROSLIB.Pose(this.pose);
    poseTransformed.applyTransform(tf);

    // update the world
    this.updatePose(poseTransformed);
    this.visible = true;
  };

  // listen for TF updates
  this.tfUpdateBound = this.tfUpdate.bind(this);
  this.tfClient.subscribe(this.frameID, this.tfUpdateBound);
};
ROS3D.SceneNode.prototype.__proto__ = THREE.Object3D.prototype;

/**
 * Set the pose of the associated model.
 *
 * @param pose - the pose to update with
 */
ROS3D.SceneNode.prototype.updatePose = function(pose) {
  this.position.set( pose.position.x, pose.position.y, pose.position.z );
  this.quaternion.set(pose.orientation.x, pose.orientation.y,
      pose.orientation.z, pose.orientation.w);
  this.updateMatrixWorld(true);
};

ROS3D.SceneNode.prototype.unsubscribeTf = function() {
  this.tfClient.unsubscribe(this.frameID, this.tfUpdateBound);
};

/**
 * @fileOverview
 * @author David Gossow - dgossow@willowgarage.com
 * @author Xueqiao Xu - xueqiaoxu@gmail.com
 * @author Mr.doob - http://mrdoob.com
 * @author AlteredQualia - http://alteredqualia.com
 */

/**
 * Behaves like THREE.OrbitControls, but uses right-handed coordinates and z as up vector.
 *
 * @constructor
 * @param scene - the global scene to use
 * @param camera - the camera to use
 * @param userZoomSpeed (optional) - the speed for zooming
 * @param userRotateSpeed (optional) - the speed for rotating
 * @param autoRotate (optional) - if the orbit should auto rotate
 * @param autoRotateSpeed (optional) - the speed for auto rotating
 * @param displayPanAndZoomFrame - whether to display a frame when panning/zooming
 *                                 (defaults to true)
 * @param lineTypePanAndZoomFrame - line type for the frame that is displayed when
 *                                  panning/zooming. Only has effect when
 *                                  displayPanAndZoomFrame is set to true.
 */
ROS3D.OrbitControls = function(options) {
  THREE.EventDispatcher.call(this);
  var that = this;
  options = options || {};
  var scene = options.scene;
  this.camera = options.camera;
  this.center = new THREE.Vector3();
  this.userZoom = true;
  this.userZoomSpeed = options.userZoomSpeed || 1.0;
  this.userRotate = true;
  this.userRotateSpeed = options.userRotateSpeed || 1.0;
  this.autoRotate = options.autoRotate;
  this.autoRotateSpeed = options.autoRotateSpeed || 2.0;
  this.displayPanAndZoomFrame = (options.displayPanAndZoomFrame === undefined) ?
      true :
      !!options.displayPanAndZoomFrame;
  this.lineTypePanAndZoomFrame = options.dashedPanAndZoomFrame || 'full';
  // In ROS, z is pointing upwards
  this.camera.up = new THREE.Vector3(0, 0, 1);

  // internals
  var pixelsPerRound = 1800;
  var touchMoveThreshold = 10;
  var rotateStart = new THREE.Vector2();
  var rotateEnd = new THREE.Vector2();
  var rotateDelta = new THREE.Vector2();
  var zoomStart = new THREE.Vector2();
  var zoomEnd = new THREE.Vector2();
  var zoomDelta = new THREE.Vector2();
  var moveStartCenter = new THREE.Vector3();
  var moveStartNormal = new THREE.Vector3();
  var moveStartPosition = new THREE.Vector3();
  var moveStartIntersection = new THREE.Vector3();
  var touchStartPosition = new Array(2);
  var touchMoveVector = new Array(2);
  this.phiDelta = 0;
  this.thetaDelta = 0;
  this.scale = 1;
  this.lastPosition = new THREE.Vector3();
  // internal states
  var STATE = {
    NONE : -1,
    ROTATE : 0,
    ZOOM : 1,
    MOVE : 2
  };
  var state = STATE.NONE;

  this.axes = new ROS3D.Axes({
    shaftRadius : 0.025,
    headRadius : 0.07,
    headLength : 0.2,
    lineType: this.lineTypePanAndZoomFrame
  });
  if (this.displayPanAndZoomFrame) {
    // initially not visible
    scene.add(this.axes);
    this.axes.traverse(function(obj) {
      obj.visible = false;
    });
  }

  /**
   * Handle the mousedown 3D event.
   *
   * @param event3D - the 3D event to handle
   */
  function onMouseDown(event3D) {
    var event = event3D.domEvent;
    event.preventDefault();

    switch (event.button) {
      case 0:
        state = STATE.ROTATE;
        rotateStart.set(event.clientX, event.clientY);
        break;
      case 1:
        state = STATE.MOVE;

        moveStartNormal = new THREE.Vector3(0, 0, 1);
        var rMat = new THREE.Matrix4().extractRotation(this.camera.matrix);
        moveStartNormal.applyMatrix4(rMat);

        moveStartCenter = that.center.clone();
        moveStartPosition = that.camera.position.clone();
        moveStartIntersection = intersectViewPlane(event3D.mouseRay,
                                                   moveStartCenter,
                                                   moveStartNormal);
        break;
      case 2:
        state = STATE.ZOOM;
        zoomStart.set(event.clientX, event.clientY);
        break;
    }

    this.showAxes();
  }

  /**
   * Handle the mousemove 3D event.
   *
   * @param event3D - the 3D event to handle
   */
  function onMouseMove(event3D) {
    var event = event3D.domEvent;
    if (state === STATE.ROTATE) {

      rotateEnd.set(event.clientX, event.clientY);
      rotateDelta.subVectors(rotateEnd, rotateStart);

      that.rotateLeft(2 * Math.PI * rotateDelta.x / pixelsPerRound * that.userRotateSpeed);
      that.rotateUp(2 * Math.PI * rotateDelta.y / pixelsPerRound * that.userRotateSpeed);

      rotateStart.copy(rotateEnd);
      this.showAxes();
    } else if (state === STATE.ZOOM) {
      zoomEnd.set(event.clientX, event.clientY);
      zoomDelta.subVectors(zoomEnd, zoomStart);

      if (zoomDelta.y > 0) {
        that.zoomIn();
      } else {
        that.zoomOut();
      }

      zoomStart.copy(zoomEnd);
      this.showAxes();

    } else if (state === STATE.MOVE) {
      var intersection = intersectViewPlane(event3D.mouseRay, that.center, moveStartNormal);

      if (!intersection) {
        return;
      }

      var delta = new THREE.Vector3().subVectors(moveStartIntersection.clone(), intersection
          .clone());

      that.center.addVectors(moveStartCenter.clone(), delta.clone());
      that.camera.position.addVectors(moveStartPosition.clone(), delta.clone());
      that.update();
      that.camera.updateMatrixWorld();
      this.showAxes();
    }
  }

  /**
   * Used to track the movement during camera movement.
   *
   * @param mouseRay - the mouse ray to intersect with
   * @param planeOrigin - the origin of the plane
   * @param planeNormal - the normal of the plane
   * @returns the intersection
   */
  function intersectViewPlane(mouseRay, planeOrigin, planeNormal) {

    var vector = new THREE.Vector3();
    var intersection = new THREE.Vector3();

    vector.subVectors(planeOrigin, mouseRay.origin);
    var dot = mouseRay.direction.dot(planeNormal);

    // bail if ray and plane are parallel
    if (Math.abs(dot) < mouseRay.precision) {
      return null;
    }

    // calc distance to plane
    var scalar = planeNormal.dot(vector) / dot;

    intersection = mouseRay.direction.clone().multiplyScalar(scalar);
    return intersection;
  }

  /**
   * Handle the mouseup 3D event.
   *
   * @param event3D - the 3D event to handle
   */
  function onMouseUp(event3D) {
    if (!that.userRotate) {
      return;
    }

    state = STATE.NONE;
  }

  /**
   * Handle the mousewheel 3D event.
   *
   * @param event3D - the 3D event to handle
   */
  function onMouseWheel(event3D) {
    if (!that.userZoom) {
      return;
    }

    var event = event3D.domEvent;
    // wheelDelta --> Chrome, detail --> Firefox
    var delta;
    if (typeof (event.wheelDelta) !== 'undefined') {
      delta = event.wheelDelta;
    } else {
      delta = -event.detail;
    }
    if (delta > 0) {
      that.zoomIn();
    } else {
      that.zoomOut();
    }

    this.showAxes();
  }

  /**
   * Handle the touchdown 3D event.
   *
   * @param event3D - the 3D event to handle
   */
  function onTouchDown(event3D) {
    var event = event3D.domEvent;
    switch (event.touches.length) {
      case 1:
        state = STATE.ROTATE;
        rotateStart.set(event.touches[0].pageX - window.scrollX,
                        event.touches[0].pageY - window.scrollY);
        break;
      case 2:
        state = STATE.NONE;
        /* ready for move */
        moveStartNormal = new THREE.Vector3(0, 0, 1);
        var rMat = new THREE.Matrix4().extractRotation(this.camera.matrix);
        moveStartNormal.applyMatrix4(rMat);
        moveStartCenter = that.center.clone();
        moveStartPosition = that.camera.position.clone();
        moveStartIntersection = intersectViewPlane(event3D.mouseRay,
                                                   moveStartCenter,
                                                   moveStartNormal);
        touchStartPosition[0] = new THREE.Vector2(event.touches[0].pageX,
                                                  event.touches[0].pageY);
        touchStartPosition[1] = new THREE.Vector2(event.touches[1].pageX,
                                                  event.touches[1].pageY);
        touchMoveVector[0] = new THREE.Vector2(0, 0);
        touchMoveVector[1] = new THREE.Vector2(0, 0);
        break;
    }

    this.showAxes();

    event.preventDefault();
  }

  /**
   * Handle the touchmove 3D event.
   *
   * @param event3D - the 3D event to handle
   */
  function onTouchMove(event3D) {
    var event = event3D.domEvent;
    if (state === STATE.ROTATE) {

      rotateEnd.set(event.touches[0].pageX - window.scrollX, event.touches[0].pageY - window.scrollY);
      rotateDelta.subVectors(rotateEnd, rotateStart);

      that.rotateLeft(2 * Math.PI * rotateDelta.x / pixelsPerRound * that.userRotateSpeed);
      that.rotateUp(2 * Math.PI * rotateDelta.y / pixelsPerRound * that.userRotateSpeed);

      rotateStart.copy(rotateEnd);
      this.showAxes();
    } else {
      touchMoveVector[0].set(touchStartPosition[0].x - event.touches[0].pageX,
                             touchStartPosition[0].y - event.touches[0].pageY);
      touchMoveVector[1].set(touchStartPosition[1].x - event.touches[1].pageX,
                             touchStartPosition[1].y - event.touches[1].pageY);
      if (touchMoveVector[0].lengthSq() > touchMoveThreshold &&
          touchMoveVector[1].lengthSq() > touchMoveThreshold) {
        touchStartPosition[0].set(event.touches[0].pageX,
                                  event.touches[0].pageY);
        touchStartPosition[1].set(event.touches[1].pageX,
                                  event.touches[1].pageY);
        if (touchMoveVector[0].dot(touchMoveVector[1]) > 0 &&
            state !== STATE.ZOOM) {
          state = STATE.MOVE;
        } else if (touchMoveVector[0].dot(touchMoveVector[1]) < 0 &&
                   state !== STATE.MOVE) {
          state = STATE.ZOOM;
        }
        if (state === STATE.ZOOM) {
          var tmpVector = new THREE.Vector2();
          tmpVector.subVectors(touchStartPosition[0],
                               touchStartPosition[1]);
          if (touchMoveVector[0].dot(tmpVector) < 0 &&
              touchMoveVector[1].dot(tmpVector) > 0) {
            that.zoomOut();
          } else if (touchMoveVector[0].dot(tmpVector) > 0 &&
                     touchMoveVector[1].dot(tmpVector) < 0) {
            that.zoomIn();
          }
        }
      }
      if (state === STATE.MOVE) {
        var intersection = intersectViewPlane(event3D.mouseRay,
                                              that.center,
                                              moveStartNormal);
        if (!intersection) {
          return;
        }
        var delta = new THREE.Vector3().subVectors(moveStartIntersection.clone(),
                                                   intersection.clone());
        that.center.addVectors(moveStartCenter.clone(), delta.clone());
        that.camera.position.addVectors(moveStartPosition.clone(), delta.clone());
        that.update();
        that.camera.updateMatrixWorld();
      }

      this.showAxes();

      event.preventDefault();
    }
  }

  function onTouchEnd(event3D) {
    var event = event3D.domEvent;
    if (event.touches.length === 1 &&
        state !== STATE.ROTATE) {
      state = STATE.ROTATE;
      rotateStart.set(event.touches[0].pageX - window.scrollX,
                      event.touches[0].pageY - window.scrollY);
    }
    else {
        state = STATE.NONE;
    }
  }

  // add event listeners
  this.addEventListener('mousedown', onMouseDown);
  this.addEventListener('mouseup', onMouseUp);
  this.addEventListener('mousemove', onMouseMove);
  this.addEventListener('touchstart', onTouchDown);
  this.addEventListener('touchmove', onTouchMove);
  this.addEventListener('touchend', onTouchEnd);
  // Chrome/Firefox have different events here
  this.addEventListener('mousewheel', onMouseWheel);
  this.addEventListener('DOMMouseScroll', onMouseWheel);
};

/**
 * Display the main axes for 1 second.
 */
ROS3D.OrbitControls.prototype.showAxes = function() {
  var that = this;

  this.axes.traverse(function(obj) {
    obj.visible = true;
  });
  if (this.hideTimeout) {
    clearTimeout(this.hideTimeout);
  }
  this.hideTimeout = setTimeout(function() {
    that.axes.traverse(function(obj) {
      obj.visible = false;
    });
    that.hideTimeout = false;
  }, 1000);
};

/**
 * Rotate the camera to the left by the given angle.
 *
 * @param angle (optional) - the angle to rotate by
 */
ROS3D.OrbitControls.prototype.rotateLeft = function(angle) {
  if (angle === undefined) {
    angle = 2 * Math.PI / 60 / 60 * this.autoRotateSpeed;
  }
  this.thetaDelta -= angle;
};

/**
 * Rotate the camera to the right by the given angle.
 *
 * @param angle (optional) - the angle to rotate by
 */
ROS3D.OrbitControls.prototype.rotateRight = function(angle) {
  if (angle === undefined) {
    angle = 2 * Math.PI / 60 / 60 * this.autoRotateSpeed;
  }
  this.thetaDelta += angle;
};

/**
 * Rotate the camera up by the given angle.
 *
 * @param angle (optional) - the angle to rotate by
 */
ROS3D.OrbitControls.prototype.rotateUp = function(angle) {
  if (angle === undefined) {
    angle = 2 * Math.PI / 60 / 60 * this.autoRotateSpeed;
  }
  this.phiDelta -= angle;
};

/**
 * Rotate the camera down by the given angle.
 *
 * @param angle (optional) - the angle to rotate by
 */
ROS3D.OrbitControls.prototype.rotateDown = function(angle) {
  if (angle === undefined) {
    angle = 2 * Math.PI / 60 / 60 * this.autoRotateSpeed;
  }
  this.phiDelta += angle;
};

/**
 * Zoom in by the given scale.
 *
 * @param zoomScale (optional) - the scale to zoom in by
 */
ROS3D.OrbitControls.prototype.zoomIn = function(zoomScale) {
  if (zoomScale === undefined) {
    zoomScale = Math.pow(0.95, this.userZoomSpeed);
  }
  this.scale /= zoomScale;
};

/**
 * Zoom out by the given scale.
 *
 * @param zoomScale (optional) - the scale to zoom in by
 */
ROS3D.OrbitControls.prototype.zoomOut = function(zoomScale) {
  if (zoomScale === undefined) {
    zoomScale = Math.pow(0.95, this.userZoomSpeed);
  }
  this.scale *= zoomScale;
};

/**
 * Update the camera to the current settings.
 */
ROS3D.OrbitControls.prototype.update = function() {
  // x->y, y->z, z->x
  var position = this.camera.position;
  var offset = position.clone().sub(this.center);

  // angle from z-axis around y-axis
  var theta = Math.atan2(offset.y, offset.x);

  // angle from y-axis
  var phi = Math.atan2(Math.sqrt(offset.y * offset.y + offset.x * offset.x), offset.z);

  if (this.autoRotate) {
    this.rotateLeft(2 * Math.PI / 60 / 60 * this.autoRotateSpeed);
  }

  theta += this.thetaDelta;
  phi += this.phiDelta;

  // restrict phi to be between EPS and PI-EPS
  var eps = 0.000001;
  phi = Math.max(eps, Math.min(Math.PI - eps, phi));

  var radius = offset.length();
  offset.set(
    radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.sin(phi) * Math.sin(theta),
    radius * Math.cos(phi)
  );
  offset.multiplyScalar(this.scale);

  position.copy(this.center).add(offset);

  this.camera.lookAt(this.center);

  radius = offset.length();
  this.axes.position.copy(this.center);
  this.axes.scale.set(radius * 0.05, radius * 0.05, radius * 0.05);
  this.axes.updateMatrixWorld(true);

  this.thetaDelta = 0;
  this.phiDelta = 0;
  this.scale = 1;

  if (this.lastPosition.distanceTo(this.camera.position) > 0) {
    this.dispatchEvent({
      type : 'change'
    });
    this.lastPosition.copy(this.camera.position);
  }
};

Object.assign(ROS3D.OrbitControls.prototype, THREE.EventDispatcher.prototype);

/**
 * @fileOverview
 * @author David Gossow - dgossow@willowgarage.com
 * @author Russell Toris - rctoris@wpi.edu
 * @author Jihoon Lee - jihoonlee.in@gmail.com
 */

/**
 * A Viewer can be used to render an interactive 3D scene to a HTML5 canvas.
 *
 * @constructor
 * @param options - object with following keys:
 *
 *  * divID - the ID of the div to place the viewer in
 *  * elem - the elem to place the viewer in (overrides divID if provided)
 *  * width - the initial width, in pixels, of the canvas
 *  * height - the initial height, in pixels, of the canvas
 *  * background (optional) - the color to render the background, like '#efefef'
 *  * alpha (optional) - the alpha of the background
 *  * antialias (optional) - if antialiasing should be used
 *  * intensity (optional) - the lighting intensity setting to use
 *  * cameraPosition (optional) - the starting position of the camera
 *  * displayPanAndZoomFrame (optional) - whether to display a frame when
 *  *                                     panning/zooming. Defaults to true.
 *  * lineTypePanAndZoomFrame - line type for the frame that is displayed when
 *  *                           panning/zooming. Only has effect when
 *  *                           displayPanAndZoomFrame is set to true.
 */
ROS3D.Viewer = function(options) {
  options = options || {};
  var divID = options.divID;
  var elem = options.elem;
  var width = options.width;
  var height = options.height;
  var background = options.background || '#111111';
  var antialias = options.antialias;
  var intensity = options.intensity || 0.66;
  var near = options.near || 0.01;
  var far = options.far || 1000;
  var alpha = options.alpha || 1.0;
  var cameraPosition = options.cameraPose || {
    x : 3,
    y : 3,
    z : 3
  };
  var cameraZoomSpeed = options.cameraZoomSpeed || 0.5;
  var displayPanAndZoomFrame = (options.displayPanAndZoomFrame === undefined) ? true : !!options.displayPanAndZoomFrame;
  var lineTypePanAndZoomFrame = options.lineTypePanAndZoomFrame || 'full';

  // create the canvas to render to
  this.renderer = new THREE.WebGLRenderer({
    antialias : antialias,
    alpha: true
  });
  this.renderer.setClearColor(parseInt(background.replace('#', '0x'), 16), alpha);
  this.renderer.sortObjects = false;
  this.renderer.setSize(width, height);
  this.renderer.shadowMap.enabled = false;
  this.renderer.autoClear = false;

  // create the global scene
  this.scene = new THREE.Scene();

  // create the global camera
  this.camera = new THREE.PerspectiveCamera(40, width / height, near, far);
  this.camera.position.x = cameraPosition.x;
  this.camera.position.y = cameraPosition.y;
  this.camera.position.z = cameraPosition.z;
  // add controls to the camera
  this.cameraControls = new ROS3D.OrbitControls({
    scene : this.scene,
    camera : this.camera,
    displayPanAndZoomFrame : displayPanAndZoomFrame,
    lineTypePanAndZoomFrame: lineTypePanAndZoomFrame
  });
  this.cameraControls.userZoomSpeed = cameraZoomSpeed;

  // lights
  this.scene.add(new THREE.AmbientLight(0x555555));
  this.directionalLight = new THREE.DirectionalLight(0xffffff, intensity);
  this.scene.add(this.directionalLight);

  // propagates mouse events to three.js objects
  this.selectableObjects = new THREE.Group();
  this.scene.add(this.selectableObjects);
  var mouseHandler = new ROS3D.MouseHandler({
    renderer : this.renderer,
    camera : this.camera,
    rootObject : this.selectableObjects,
    fallbackTarget : this.cameraControls
  });

  // highlights the receiver of mouse events
  this.highlighter = new ROS3D.Highlighter({
    mouseHandler : mouseHandler
  });

  this.stopped = true;
  this.animationRequestId = undefined;

  // add the renderer to the page
  var node = elem || document.getElementById(divID);
  node.appendChild(this.renderer.domElement);

  // begin the render loop
  this.start();
};

/**
 *  Start the render loop
 */
ROS3D.Viewer.prototype.start = function(){
  this.stopped = false;
  this.draw();
};

/**
 * Renders the associated scene to the viewer.
 */
ROS3D.Viewer.prototype.draw = function(){
  if(this.stopped){
    // Do nothing if stopped
    return;
  }

  // update the controls
  this.cameraControls.update();

  // put light to the top-left of the camera
  // BUG: position is a read-only property of DirectionalLight,
  // attempting to assign to it either does nothing or throws an error.
  //this.directionalLight.position = this.camera.localToWorld(new THREE.Vector3(-1, 1, 0));
  this.directionalLight.position.normalize();

  // set the scene
  this.renderer.clear(true, true, true);
  this.renderer.render(this.scene, this.camera);
  this.highlighter.renderHighlights(this.scene, this.renderer, this.camera);

  // draw the frame
  this.animationRequestId = requestAnimationFrame(this.draw.bind(this));
};

/**
 *  Stop the render loop
 */
ROS3D.Viewer.prototype.stop = function(){
  if(!this.stopped){
    // Stop animation render loop
    cancelAnimationFrame(this.animationRequestId);
  }
  this.stopped = true;
};

/**
 * Add the given THREE Object3D to the global scene in the viewer.
 *
 * @param object - the THREE Object3D to add
 * @param selectable (optional) - if the object should be added to the selectable list
 */
ROS3D.Viewer.prototype.addObject = function(object, selectable) {
  if (selectable) {
    this.selectableObjects.add(object);
  } else {
    this.scene.add(object);
  }
};

/**
 * Resize 3D viewer
 *
 * @param width - new width value
 * @param height - new height value
 */
ROS3D.Viewer.prototype.resize = function(width, height) {
  this.camera.aspect = width / height;
  this.camera.updateProjectionMatrix();
  this.renderer.setSize(width, height);
};

/**
 * @fileOverview
 * @author David Gossow - dgossow@willowgarage.com
 */

/**
 * A mouseover highlighter for 3D objects in the scene.
 *
 * @constructor
 * @param options - object with following keys:
 *
 *   * mouseHandler - the handler for the mouseover and mouseout events
 */
ROS3D.Highlighter = function(options) {
  options = options || {};
  this.mouseHandler = options.mouseHandler;
  this.hoverObjs = {};

  // bind the mouse events
  this.mouseHandler.addEventListener('mouseover', this.onMouseOver.bind(this));
  this.mouseHandler.addEventListener('mouseout', this.onMouseOut.bind(this));
};

/**
 * Add the current target of the mouseover to the hover list.
 *
 * @param event - the event that contains the target of the mouseover
 */
ROS3D.Highlighter.prototype.onMouseOver = function(event) {
  this.hoverObjs[event.currentTarget.uuid] = event.currentTarget;
};

/**
 * Remove the current target of the mouseover from the hover list.
 *
 * @param event - the event that contains the target of the mouseout
 */
ROS3D.Highlighter.prototype.onMouseOut = function(event) {
  var uuid = event.currentTarget.uuid;
  if (uuid in this.hoverObjs)
  {
    delete this.hoverObjs[uuid];
  }
};


/**
 * Render the highlights for all objects that are currently highlighted.
 *
 * This method should be executed after clearing the renderer and
 * rendering the regular scene.
 *
 * @param scene - the current scene, which should contain the highlighted objects (among others)
 * @param renderer - the renderer used to render the scene.
 * @param camera - the scene's camera
 */
ROS3D.Highlighter.prototype.renderHighlights = function(scene, renderer, camera) {

  // Render highlights by making everything but the highlighted
  // objects invisible...
  this.makeEverythingInvisible(scene);
  this.makeHighlightedVisible(scene);

  // Providing a transparent overrideMaterial...
  var originalOverrideMaterial = scene.overrideMaterial;
  scene.overrideMaterial = new THREE.MeshBasicMaterial({
      fog : false,
      opacity : 0.5,
      transparent : true,
      depthTest : true,
      depthWrite : false,
      polygonOffset : true,
      polygonOffsetUnits : -1,
      side : THREE.DoubleSide
  });

  // And then rendering over the regular scene
  renderer.render(scene, camera);

  // Finally, restore the original overrideMaterial (if any) and
  // object visibility.
  scene.overrideMaterial = originalOverrideMaterial;
  this.restoreVisibility(scene);
};


/**
 * Traverses the given object and makes every object that's a Mesh,
 * Line or Sprite invisible. Also saves the previous visibility state
 * so we can restore it later.
 *
 * @param scene - the object to traverse
 */
ROS3D.Highlighter.prototype.makeEverythingInvisible = function (scene) {
  scene.traverse(function(currentObject) {
    if ( currentObject instanceof THREE.Mesh || currentObject instanceof THREE.Line
         || currentObject instanceof THREE.Sprite ) {
      currentObject.previousVisibility = currentObject.visible;
      currentObject.visible = false;
    }
  });
};


/**
 * Make the objects in the scene that are currently highlighted (and
 * all of their children!) visible.
 *
 * @param scene - the object to traverse
 */
ROS3D.Highlighter.prototype.makeHighlightedVisible = function (scene) {
  var makeVisible = function(currentObject) {
      if ( currentObject instanceof THREE.Mesh || currentObject instanceof THREE.Line
           || currentObject instanceof THREE.Sprite ) {
        currentObject.visible = true;
      }
  };

  for (var uuid in this.hoverObjs) {
    var selectedObject = this.hoverObjs[uuid];
    // Make each selected object and all of its children visible
    selectedObject.visible = true;
    selectedObject.traverse(makeVisible);
  }
};

/**
 * Restore the old visibility state that was saved by
 * makeEverythinginvisible.
 *
 * @param scene - the object to traverse
 */
ROS3D.Highlighter.prototype.restoreVisibility = function (scene) {
  scene.traverse(function(currentObject) {
    if (currentObject.hasOwnProperty('previousVisibility')) {
      currentObject.visible = currentObject.previousVisibility;
    }
  }.bind(this));
};

/**
 * @fileOverview
 * @author David Gossow - dgossow@willowgarage.com
 */

/**
 * A handler for mouse events within a 3D viewer.
 *
 * @constructor
 * @param options - object with following keys:
 *
 *   * renderer - the main renderer
 *   * camera - the main camera in the scene
 *   * rootObject - the root object to check for mouse events
 *   * fallbackTarget - the fallback target, e.g., the camera controls
 */
ROS3D.MouseHandler = function(options) {
  THREE.EventDispatcher.call(this);
  this.renderer = options.renderer;
  this.camera = options.camera;
  this.rootObject = options.rootObject;
  this.fallbackTarget = options.fallbackTarget;
  this.lastTarget = this.fallbackTarget;
  this.dragging = false;

  // listen to DOM events
  var eventNames = [ 'contextmenu', 'click', 'dblclick', 'mouseout', 'mousedown', 'mouseup',
      'mousemove', 'mousewheel', 'DOMMouseScroll', 'touchstart', 'touchend', 'touchcancel',
      'touchleave', 'touchmove' ];
  this.listeners = {};

  // add event listeners for the associated mouse events
  eventNames.forEach(function(eventName) {
    this.listeners[eventName] = this.processDomEvent.bind(this);
    this.renderer.domElement.addEventListener(eventName, this.listeners[eventName], false);
  }, this);
};

/**
 * Process the particular DOM even that has occurred based on the mouse's position in the scene.
 *
 * @param domEvent - the DOM event to process
 */
ROS3D.MouseHandler.prototype.processDomEvent = function(domEvent) {
  // don't deal with the default handler
  domEvent.preventDefault();

  // compute normalized device coords and 3D mouse ray
  var target = domEvent.target;
  var rect = target.getBoundingClientRect();
  var pos_x, pos_y;

  if(domEvent.type.indexOf('touch') !== -1) {
    pos_x = 0;
    pos_y = 0;
    for(var i=0; i<domEvent.touches.length; ++i) {
        pos_x += domEvent.touches[i].clientX;
        pos_y += domEvent.touches[i].clientY;
    }
    pos_x /= domEvent.touches.length;
    pos_y /= domEvent.touches.length;
  }
  else {
	pos_x = domEvent.clientX;
	pos_y = domEvent.clientY;
  }
  var left = pos_x - rect.left - target.clientLeft + target.scrollLeft;
  var top = pos_y - rect.top - target.clientTop + target.scrollTop;
  var deviceX = left / target.clientWidth * 2 - 1;
  var deviceY = -top / target.clientHeight * 2 + 1;
  var mousePos = new THREE.Vector2(deviceX, deviceY);

  var mouseRaycaster = new THREE.Raycaster();
  mouseRaycaster.linePrecision = 0.001;
  mouseRaycaster.setFromCamera(mousePos, this.camera);
  var mouseRay = mouseRaycaster.ray;

  // make our 3d mouse event
  var event3D = {
    mousePos : mousePos,
    mouseRay : mouseRay,
    domEvent : domEvent,
    camera : this.camera,
    intersection : this.lastIntersection
  };

  // if the mouse leaves the dom element, stop everything
  if (domEvent.type === 'mouseout') {
    if (this.dragging) {
      this.notify(this.lastTarget, 'mouseup', event3D);
      this.dragging = false;
    }
    this.notify(this.lastTarget, 'mouseout', event3D);
    this.lastTarget = null;
    return;
  }

  // if the touch leaves the dom element, stop everything
  if (domEvent.type === 'touchleave' || domEvent.type === 'touchend') {
    if (this.dragging) {
      this.notify(this.lastTarget, 'mouseup', event3D);
      this.dragging = false;
    }
    this.notify(this.lastTarget, 'touchend', event3D);
    this.lastTarget = null;
    return;
  }

  // while the user is holding the mouse down, stay on the same target
  if (this.dragging) {
    this.notify(this.lastTarget, domEvent.type, event3D);
    // for check for right or left mouse button
    if ((domEvent.type === 'mouseup' && domEvent.button === 2) || domEvent.type === 'click' || domEvent.type === 'touchend') {
      this.dragging = false;
    }
    return;
  }

  // in the normal case, we need to check what is under the mouse
  target = this.lastTarget;
  var intersections = [];
  intersections = mouseRaycaster.intersectObject(this.rootObject, true);

  if (intersections.length > 0) {
    target = intersections[0].object;
    event3D.intersection = this.lastIntersection = intersections[0];
  } else {
    target = this.fallbackTarget;
  }

  // if the mouse moves from one object to another (or from/to the 'null' object), notify both
  if (target !== this.lastTarget && domEvent.type.match(/mouse/)) {

    // Event Status. TODO: Make it as enum
    // 0: Accepted
    // 1: Failed
    // 2: Continued
    var eventStatus = this.notify(target, 'mouseover', event3D);
    if (eventStatus === 0) {
      this.notify(this.lastTarget, 'mouseout', event3D);
    } else if(eventStatus === 1) {
      // if target was null or no target has caught our event, fall back
      target = this.fallbackTarget;
      if (target !== this.lastTarget) {
        this.notify(target, 'mouseover', event3D);
        this.notify(this.lastTarget, 'mouseout', event3D);
      }
    }
  }

  // if the finger moves from one object to another (or from/to the 'null' object), notify both
  if (target !== this.lastTarget && domEvent.type.match(/touch/)) {
    var toucheventAccepted = this.notify(target, domEvent.type, event3D);
    if (toucheventAccepted) {
      this.notify(this.lastTarget, 'touchleave', event3D);
      this.notify(this.lastTarget, 'touchend', event3D);
    } else {
      // if target was null or no target has caught our event, fall back
      target = this.fallbackTarget;
      if (target !== this.lastTarget) {
        this.notify(this.lastTarget, 'touchmove', event3D);
        this.notify(this.lastTarget, 'touchend', event3D);
      }
    }
  }

  // pass through event
  this.notify(target, domEvent.type, event3D);
  if (domEvent.type === 'mousedown' || domEvent.type === 'touchstart' || domEvent.type === 'touchmove') {
    this.dragging = true;
  }
  this.lastTarget = target;
};

/**
 * Notify the listener of the type of event that occurred.
 *
 * @param target - the target of the event
 * @param type - the type of event that occurred
 * @param event3D - the 3D mouse even information
 * @returns if an event was canceled
 */
ROS3D.MouseHandler.prototype.notify = function(target, type, event3D) {
  // ensure the type is set
  //
  event3D.type = type;

  // make the event cancelable
  event3D.cancelBubble = false;
  event3D.continueBubble = false;
  event3D.stopPropagation = function() {
    event3D.cancelBubble = true;
  };

  // it hit the selectable object but don't highlight
  event3D.continuePropagation = function () {
    event3D.continueBubble = true;
  };

  // walk up graph until event is canceled or root node has been reached
  event3D.currentTarget = target;

  while (event3D.currentTarget) {
    // try to fire event on object
    if (event3D.currentTarget.dispatchEvent
        && event3D.currentTarget.dispatchEvent instanceof Function) {
      event3D.currentTarget.dispatchEvent(event3D);
      if (event3D.cancelBubble) {
        this.dispatchEvent(event3D);
        return 0; // Event Accepted
      }
      else if(event3D.continueBubble) {
        return 2; // Event Continued
      }
    }
    // walk up
    event3D.currentTarget = event3D.currentTarget.parent;
  }

  return 1; // Event Failed
};

Object.assign(ROS3D.MouseHandler.prototype, THREE.EventDispatcher.prototype);
