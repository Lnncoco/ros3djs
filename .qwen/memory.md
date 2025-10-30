# ROS3D.js 重构项目记忆要点

## 项目基本信息
- 项目名称: ROS3D.js
- 项目版本: 1.1.0
- 项目用途: ROS 3D 可视化库，基于 Three.js
- 当前技术栈: 
  - Three.js (v0.118.3 - 与文档中的0.89.0不同，实际是r118)
  - EventEmitter3 (v5.0.1)
  - roslib (v1.0.0+)
  - Node.js/npm, Grunt, Rollup

## 源代码结构
- 核心入口: src/Ros3D.js
- 渲染器: src/visualization/Viewer.js
- TF坐标系统: src/visualization/SceneNode.js
- 3D模型: src/models/
- 标记可视化: src/markers/Marker.js
- 机器人模型: src/urdf/
- 交互控制: src/visualization/interaction/

## 关键发现
1. 项目使用原型继承模式 (ROS3D.Type.prototype.__proto__ = THREE.Object3D.prototype)
2. 使用全局 ROS3D 命名空间
3. 目前的代码中没有找到 `import` 或 `export`，但存在 ES6+ 特性
4. Three.js 版本实际为 0.118.3 (package.json)，而非文档中提及的较旧版本 0.89.0
5. 使用了 ES6 模块系统 (src-esm/index.js)

## 重构重点
1. 保持 API 兼容性
2. 从原型继承转换为 ES6 类继承
3. 优化渲染性能和内存管理
4. 改善代码结构和模块化
5. 使用现代构建工具

## 需要注意的问题
1. TF 坐标系统不能受影响
2. 资源清理和内存泄漏问题
3. 事件系统保持兼容
4. 3D 模型加载兼容性
5. 与 roslib.js 的交互保持不变