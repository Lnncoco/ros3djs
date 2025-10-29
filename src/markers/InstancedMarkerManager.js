/**
 * @fileOverview
 * @author ROS3D development team
 * @description Manager for instanced rendering of marker lists to improve performance
 */

/**
 * A manager for instanced rendering of marker lists.
 *
 * @constructor
 * @param options - object with following keys:
 */
ROS3D.InstancedMarkerManager = function() {
  this.instancedMeshes = new Map(); // 按类型缓存实例化网格
  this.freeIndices = new Map(); // 跟踪可用索引
};

/**
 * Get or create an instanced mesh for the given type.
 */
ROS3D.InstancedMarkerManager.prototype.getOrCreateInstancedMesh = function(type, maxCount, material, geometry) {
  const key = `${type}_${maxCount}`;
  
  if (!this.instancedMeshes.has(key)) {
    const instancedMesh = new THREE.InstancedMesh(geometry, material, maxCount);
    this.instancedMeshes.set(key, instancedMesh);
    
    // Initialize with all indices as free
    const freeSet = new Set();
    for (let i = 0; i < maxCount; i++) {
      freeSet.add(i);
    }
    this.freeIndices.set(key, freeSet);
  }
  
  return this.instancedMeshes.get(key);
};

/**
 * Update an instance at the given index with new transform.
 */
ROS3D.InstancedMarkerManager.prototype.updateInstance = function(instancedMesh, index, position, scale, quaternion) {
  const matrix = new THREE.Matrix4();
  matrix.compose(position, quaternion, scale);
  instancedMesh.setMatrixAt(index, matrix);
  instancedMesh.instanceMatrix.needsUpdate = true;
};

/**
 * Free an instance index for reuse.
 */
ROS3D.InstancedMarkerManager.prototype.freeInstance = function(type, maxCount, index) {
  const key = `${type}_${maxCount}`;
  if (this.freeIndices.has(key)) {
    this.freeIndices.get(key).add(index);
  }
};

/**
 * Get a free instance index.
 */
ROS3D.InstancedMarkerManager.prototype.getFreeIndex = function(type, maxCount) {
  const key = `${type}_${maxCount}`;
  if (this.freeIndices.has(key)) {
    const freeSet = this.freeIndices.get(key);
    if (freeSet.size > 0) {
      // Get and remove the first available index
      const index = freeSet.values().next().value;
      freeSet.delete(index);
      return index;
    }
  }
  return -1; // No free index available
};

/**
 * Remove and dispose an instanced mesh.
 */
ROS3D.InstancedMarkerManager.prototype.removeInstancedMesh = function(type, maxCount) {
  const key = `${type}_${maxCount}`;
  if (this.instancedMeshes.has(key)) {
    const instancedMesh = this.instancedMeshes.get(key);
    instancedMesh.dispose();
    this.instancedMeshes.delete(key);
    this.freeIndices.delete(key);
  }
};

// Global instance
ROS3D.instancedMarkerManager = new ROS3D.InstancedMarkerManager();