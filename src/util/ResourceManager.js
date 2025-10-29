/**
 * @fileOverview
 * @author ROS3D development team
 * @description Manager for unified resource management and object pooling to improve performance
 */

/**
 * A manager for unified resource management and object pooling.
 *
 * @constructor
 */
ROS3D.ResourceManager = function() {
  this.geometryCache = new Map();      // 几何体缓存
  this.materialCache = new Map();      // 材质缓存
  this.textureCache = new Map();       // 纹理缓存
  this.objectPool = new Map();         // 对象池
  this.recentlyUsed = new Map();       // 最近使用记录
  this.maxCacheSize = 100;             // 最大缓存大小
  
  // 定期清理未使用的资源
  setInterval(() => {
    this.cleanupUnusedResources();
  }, 30000); // 每30秒清理一次
};

ROS3D.ResourceManager.prototype.getGeometry = function(type, params) {
  const key = `${type}_${JSON.stringify(params)}`;
  
  if (!this.geometryCache.has(key)) {
    if (this.geometryCache.size >= this.maxCacheSize) {
      this.evictLRU('geometry');
    }
    
    let geometry;
    switch (type) {
      case 'box':
        geometry = new THREE.BoxGeometry(params.width, params.height, params.depth);
        break;
      case 'sphere':
        geometry = new THREE.SphereGeometry(params.radius, params.widthSegments, params.heightSegments);
        break;
      case 'cylinder':
        geometry = new THREE.CylinderGeometry(params.radiusTop, params.radiusBottom, params.height, params.radialSegments);
        break;
      default:
        throw new Error(`Unknown geometry type: ${type}`);
    }
    
    this.geometryCache.set(key, geometry);
  }
  
  // 更新最近使用时间
  this.recentlyUsed.set(key, Date.now());
  return this.geometryCache.get(key);
};

ROS3D.ResourceManager.prototype.getObjectFromPool = function(type) {
  if (!this.objectPool.has(type)) {
    this.objectPool.set(type, []);
  }
  
  const pool = this.objectPool.get(type);
  if (pool.length > 0) {
    return pool.pop();
  }
  
  // 创建新对象
  switch (type) {
    case 'marker':
      return new ROS3D.Marker();
    case 'pointcloud':
      return new ROS3D.PointCloud2();
    case 'laserscan':
      return new ROS3D.LaserScan();
    default:
      console.warn(`No pool defined for type: ${type}`);
      return null;
  }
};

ROS3D.ResourceManager.prototype.returnToPool = function(type, object) {
  if (!this.objectPool.has(type)) {
    this.objectPool.set(type, []);
  }
  
  // 重置对象状态
  this.resetObject(object);
  this.objectPool.get(type).push(object);
};

ROS3D.ResourceManager.prototype.resetObject = function(object) {
  // 清理对象属性，准备重用
  if (object.children) {
    object.children = [];
  }
  if (object.position) {
    object.position.set(0, 0, 0);
  }
  if (object.quaternion) {
    object.quaternion.set(0, 0, 0, 1);
  }
  if (object.scale) {
    object.scale.set(1, 1, 1);
  }
};

ROS3D.ResourceManager.prototype.cleanupUnusedResources = function() {
  const now = Date.now();
  const threshold = 60000; // 1分钟未使用则清理
  
  // 清理几何体缓存
  for (let [key, geometry] of this.geometryCache) {
    if (this.recentlyUsed.has(key)) {
      const lastUsed = this.recentlyUsed.get(key);
      if (now - lastUsed > threshold) {
        geometry.dispose();
        this.geometryCache.delete(key);
        this.recentlyUsed.delete(key);
      }
    }
  }
};

ROS3D.ResourceManager.prototype.evictLRU = function(type) {
  // 实现最近最少使用淘汰算法
  let cache;
  switch (type) {
    case 'geometry':
      cache = this.recentlyUsed;
      break;
    default:
      return;
  }
  
  // 找到最久未使用的项
  let oldestKey = null;
  let oldestTime = Infinity;
  for (let [key, time] of cache) {
    if (time < oldestTime) {
      oldestTime = time;
      oldestKey = key;
    }
  }
  
  if (oldestKey) {
    // 从缓存中移除
    const geometry = this.geometryCache.get(oldestKey);
    if (geometry) {
        geometry.dispose();
    }
    this.geometryCache.delete(oldestKey);
    cache.delete(oldestKey);
  }
};

// 全局资源管理器实例
ROS3D.resourceManager = new ROS3D.ResourceManager();