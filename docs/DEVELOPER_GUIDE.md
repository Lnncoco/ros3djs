# ROS3D.js 开发者指南

## 1. 项目概述

ROS3D.js 是一个用于在 Web 浏览器中可视化 ROS (Robot Operating System) 数据的 JavaScript 库。该项目是 Robot Web Tools 项目的一部分，旨在为 ROS (Robot Operating System) 提供 3D 可视化能力。

### 1.1 项目目标
- 提供完整的 3D 可视化解决方案用于 ROS 数据
- 实现与 ROS JavaScript 库的无缝集成
- 支持多种 ROS 消息类型的可视化（传感器数据、导航信息、机器人模型等）
- 提供交互式标记和控制功能

### 1.2 核心特性
- 3D 可视化 ROS 数据
- 传感器数据可视化（LaserScan、PointCloud2 等）
- URDF 模型渲染
- 交互式标记系统
- 导航功能可视化
- 高效的 TF 坐标变换处理

## 2. 架构设计

### 2.1 整体架构
ROS3D.js 遵循分层架构，将 3D 渲染、ROS 通信和数据处理分离。

```
Web Browser Environment
├── ros3djs Core
│   ├── ROS3D Namespace (Constants & Utilities)
│   ├── Viewer (3D Scene Management)
│   ├── Mathematical Primitives (Vector, Matrix, Quaternion)
│   └── EventDispatcher (Event System)
├── Data Visualization Clients
│   ├── MarkerClient (visualization_msgs)
│   ├── Sensors (PointCloud2, LaserScan, etc.)
│   ├── Navigation (OccupancyGridClient, etc.)
│   ├── URDF (robot_description)
│   └── Interactive Markers
└── 3D Interaction System
    ├── OrbitControls (Camera Control)
    ├── MouseHandler (Event Processing)
    └── Highlighter (Visual Feedback)

External Dependencies
├── THREE.js r89 (3D Graphics Engine)
├── roslibjs (ROS Communication)
└── eventemitter3 (Event Management)

ROS Backend
├── rosbridge_server (WebSocket Bridge)
├── tf2_web_republisher (Transform Data)
└── ROS System (Robots & Sensors)
```

### 2.2 核心组件
- **ROS3D.Viewer**: 主 3D 场景容器，管理 3D 场景的渲染和交互
- **ROS3D.SceneNode**: 用于管理 TF 坐标系转换的 3D 对象
- **ROS3D.OrbitControls**: 用于相机控制，支持旋转、平移和缩放
- **ROS3D.MouseHandler**: 处理鼠标事件并将其传播到 THREE.js 对象
- **ROS3D.Highlighter**: 突出显示鼠标事件的接收者

## 3. 核心模块说明

### 3.1 Ros3D.js 模块
这是库的主入口文件，定义了 ROS3D 全局命名空间，包括：

- **标记类型常量**:
  - `ROS3D.MARKER_ARROW` (0)
  - `ROS3D.MARKER_CUBE` (1)
  - `ROS3D.MARKER_SPHERE` (2)
  - `ROS3D.MARKER_CYLINDER` (3)
  - `ROS3D.MARKER_LINE_STRIP` (4)
  - `ROS3D.MARKER_LINE_LIST` (5)
  - `ROS3D.MARKER_CUBE_LIST` (6)
  - `ROS3D.MARKER_SPHERE_LIST` (7)
  - `ROS3D.MARKER_POINTS` (8)
  - `ROS3D.MARKER_TEXT_VIEW_FACING` (9)
  - `ROS3D.MARKER_MESH_RESOURCE` (10)
  - `ROS3D.MARKER_TRIANGLE_LIST` (11)

- **交互式标记反馈类型常量**:
  - `ROS3D.INTERACTIVE_MARKER_KEEP_ALIVE`
  - `ROS3D.INTERACTIVE_MARKER_POSE_UPDATE`
  - `ROS3D.INTERACTIVE_MARKER_MENU_SELECT`
  - `ROS3D.INTERACTIVE_MARKER_BUTTON_CLICK`
  - `ROS3D.INTERACTIVE_MARKER_MOUSE_DOWN`
  - `ROS3D.INTERACTIVE_MARKER_MOUSE_UP`

- **交互式标记控制类型常量**:
  - `ROS3D.INTERACTIVE_MARKER_NONE`
  - `ROS3D.INTERACTIVE_MARKER_MENU`
  - `ROS3D.INTERACTIVE_MARKER_BUTTON`
  - `ROS3D.INTERACTIVE_MARKER_MOVE_AXIS`
  - `ROS3D.INTERACTIVE_MARKER_MOVE_PLANE`
  - `ROS3D.INTERACTIVE_MARKER_ROTATE_AXIS`
  - `ROS3D.INTERACTIVE_MARKER_MOVE_ROTATE`
  - `ROS3D.INTERACTIVE_MARKER_MOVE_3D`
  - `ROS3D.INTERACTIVE_MARKER_ROTATE_3D`
  - `ROS3D.INTERACTIVE_MARKER_MOVE_ROTATE_3D`

- **工具函数**:
  - `makeColorMaterial(r, g, b, a)`: 根据 RGBA 值创建 THREE.js 材质
  - `intersectPlane(mouseRay, planeOrigin, planeNormal)`: 返回鼠标射线与平面的交点
  - `findClosestPoint(targetRay, mouseRay)`: 找到两条射线之间的最近点
  - `closestAxisPoint(axisRay, camera, mousePos)`: 找到轴线与鼠标的最近点

### 3.2 visualization/ 模块
#### 3.2.1 Viewer.js
- **职责**: 核心 3D 查看器，负责渲染整个 3D 场景
- **功能**:
  - 创建 THREE.WebGLRenderer 渲染器
  - 管理 3D 场景和相机
  - 实现渲染循环（requestAnimationFrame）
  - 管理相机控制（轨道控制）
  - 处理光照设置
- **重要方法**:
  - `start()`: 启动渲染循环
  - `draw()`: 渲染帧
  - `stop()`: 停止渲染循环
  - `addObject()`: 向场景添加对象
  - `resize()`: 调整查看器尺寸

#### 3.2.2 SceneNode.js
- **职责**: 管理与 ROS 坐标系关联的 3D 对象
- **功能**:
  - 连接到 TF 客户端以接收坐标变换
  - 自动更新对象的位置和方向
  - 处理坐标系变换
- **重要方法**:
  - `updatePose()`: 更新对象的位姿
  - `unsubscribeTf()`: 取消订阅 TF 数据

### 3.3 models/ 模块
包含基础 3D 模型的实现：

- **Arrow.js**: 箭头几何模型
- **Axes.js**: 坐标轴模型
- **Grid.js**: 网格地面
- **MeshResource.js**: 外部网格资源加载器
- **TriangleList.js**: 三角面列表

### 3.4 markers/ 模块
处理 ROS 可视化标记消息：

- **Marker.js**: 处理 ROS 可视化标记消息
- **MarkerArrayClient.js**: 处理标记数组
- **MarkerClient.js**: 订阅和管理标记话题

### 3.5 urdf/ 模块
处理 URDF 机器人模型：

- **Urdf.js**: 加载和渲染 URDF 机器人模型
- **UrdfClient.js**: 订阅 URDF 信息并创建可视化

### 3.6 sensors/ 模块
处理传感器数据：

- **LaserScan.js**: 激光扫描数据可视化
- **PointCloud2.js**: 点云数据可视化
- **NavSatFix.js**: GPS 数据可视化

### 3.7 interactivemarkers/ 模块
处理交互式标记：

- **InteractiveMarker.js**: 交互式标记主实现
- **InteractiveMarkerClient.js**: 交互式标记客户端
- **InteractiveMarkerControl.js**: 交互控制逻辑
- **InteractiveMarkerHandle.js**: 交互式标记句柄
- **InteractiveMarkerMenu.js**: 交互式标记菜单

### 3.8 navigation/ 模块
处理导航数据：

- **OccupancyGrid.js**: 占据网格地图可视化
- **Odometry.js**: 里程计数据可视化
- **Path.js**: 路径轨迹可视化
- **Pose.js**: 位姿可视化

## 4. API 参考

### 4.1 核心 API 类别和详细说明

#### 4.1.1 标记和可视化消息 API

##### ROS3D.MarkerArrayClient
`ROS3D.MarkerArrayClient` 订阅 `visualization_msgs/MarkerArray` 消息，并管理一组 3D 标记。

- **构造函数参数**:
  - `ros` (`ROSLIB.Ros`): ROS 连接句柄
  - `topic` (`string`): 要监听的标记主题
  - `tfClient` (`TFClient`): TF 客户端句柄
  - `rootObject` (`THREE.Object3D`, 可选): 添加标记的根对象，默认为新的 `THREE.Object3D()`
  - `path` (`string`, 可选): 加载网格的基本路径，默认为 `'/'`
  
- **事件**:
  - `'change'`: 当 `MarkerArray` 更新或更改时发出
  
- **方法**:
  - `subscribe()`: 订阅 `MarkerArray` 主题
  - `unsubscribe()`: 取消订阅主题
  - `processMessage(arrayMessage)`: 处理传入的 `visualization_msgs/MarkerArray` 消息，根据消息中的 `action` 字段添加、修改或删除标记

##### ROS3D.MarkerClient
`ROS3D.MarkerClient` 订阅单个 `visualization_msgs/Marker` 消息。

- **构造函数参数**:
  - `ros` (`ROSLIB.Ros`): ROS 连接句柄
  - `topic` (`string`): 要监听的标记主题
  - `tfClient` (`TFClient`): TF 客户端句柄
  - `rootObject` (`THREE.Object3D`, 可选): 添加标记的根对象，默认为新的 `THREE.Object3D()`
  - `path` (`string`, 可选): 加载网格的基本路径，默认为 `'/'`
  - `lifetime` (`number`, 可选): 标记的生命周期，默认为 `0` (无限)

- **事件**:
  - `'change'`: 当标记更新或更改时发出

- **方法**:
  - `subscribe()`: 订阅 `visualization_msgs/Marker` 主题
  - `unsubscribe()`: 取消订阅主题
  - `checkTime(name)`: 检查标记的生命周期并根据需要删除标记

##### ROS3D.Marker
`ROS3D.Marker` 将 ROS 标记消息转换为 THREE.js 对象。它支持多种标记类型，如箭头、立方体、球体等。

- **构造函数参数**:
  - `path` (`string`): 加载网格文件的基本路径或 URL
  - `message` (`object`): ROS 标记消息

- **方法**:
  - `setPose(pose)`: 根据给定的姿态设置标记的姿态
  - `update(message)`: 更新此标记

#### 4.1.2 导航和地图可视化 API

##### ROS3D.OccupancyGridClient
`OccupancyGridClient` 订阅 `nav_msgs/OccupancyGrid` 消息，并创建 2D 地图的可视化表示。

- **构造函数参数**:
  - `ros` (`ROSLIB.Ros`): ROS 连接句柄
  - `topic` (`string`): 要订阅的地图主题，默认为 `/map`
  - `continuous` (`boolean`): 是否连续更新以用于 SLAM，默认为 `false`
  - `tfClient` (`TFClient`): TF 客户端句柄
  - `compression` (`string`): 消息压缩格式，默认为 `cbor`
  - `color` (`object`): 网格颜色值，默认为 `{r:255,g:255,b:255}`
  - `opacity` (`number`): 网格透明度 (0.0-1.0)，默认为 `1.0`
  - `offsetPose` (`ROSLIB.Pose`): 可视化偏移姿态，默认为 `identity`

##### ROS3D.Path
`ROS3D.Path` 订阅 `nav_msgs/Path` 消息，并将机器人轨迹可视化为连接的线段。

- **构造函数参数**:
  - `ros` (`ROSLIB.Ros`): ROS 连接句柄
  - `topic` (`string`): 要监听的路径主题，默认为 `/path`
  - `tfClient` (`TFClient`): TF 客户端句柄
  - `rootObject` (`THREE.Object3D`, 可选): 添加路径的根对象，默认为新的 `THREE.Object3D()`
  - `color` (`number`, 可选): 线的颜色，默认为 `0xcc00ff`

- **方法**:
  - `subscribe()`: 订阅 `nav_msgs/Path` 主题
  - `unsubscribe()`: 取消订阅主题
  - `processMessage(message)`: 处理传入的 `nav_msgs/Path` 消息，创建 `THREE.Line` 对象并添加到场景中

##### ROS3D.Pose
`ROS3D.Pose` 订阅 `geometry_msgs/PoseStamped` 消息，并将机器人位置和方向可视化为 3D 箭头。

- **构造函数参数**:
  - `ros` (`ROSLIB.Ros`): ROS 连接句柄
  - `topic` (`string`): 要监听的姿态主题，默认为 `/pose`
  - `tfClient` (`TFClient`): TF 客户端句柄
  - `rootObject` (`THREE.Object3D`, 可选): 添加姿态的根对象，默认为新的 `THREE.Object3D()`
  - `color` (`number`, 可选): 箭头的颜色，默认为 `0xcc00ff`
  - `length` (`number`, 可选): 箭头的长度，默认为 `1.0`
  - `headLength` (`number`, 可选): 箭头头部的长度，默认为 `0.2`
  - `shaftDiameter` (`number`, 可选): 箭头杆的直径，默认为 `0.05`
  - `headDiameter` (`number`, 可选): 箭头头部的直径，默认为 `0.1`

- **方法**:
  - `subscribe()`: 订阅 `geometry_msgs/PoseStamped` 主题
  - `unsubscribe()`: 取消订阅主题
  - `processMessage(message)`: 处理传入的 `geometry_msgs/PoseStamped` 消息，创建 `ROS3D.Arrow` 对象并添加到场景中

##### ROS3D.PoseArray
`ROS3D.PoseArray` 订阅 `geometry_msgs/PoseArray` 消息，通常用于粒子滤波器可视化。

- **构造函数参数**:
  - `ros` (`ROSLIB.Ros`): ROS 连接句柄
  - `topic` (`string`): 要监听的姿态数组主题，默认为 `/particlecloud`
  - `tfClient` (`TFClient`): TF 客户端句柄
  - `rootObject` (`THREE.Object3D`, 可选): 添加姿态数组的根对象，默认为新的 `THREE.Object3D()`
  - `color` (`number`, 可选): 线的颜色，默认为 `0xcc00ff`

#### 4.1.3 传感器数据可视化 API

##### ROS3D.LaserScan
`ROS3D.LaserScan` 监听 `sensor_msgs/LaserScan` 主题并显示点。

- **构造函数参数**:
  - `ros` (`ROSLIB.Ros`): ROS 连接句柄
  - `topic` (`string`): 要订阅的激光扫描主题
  - `tfClient` (`TFClient`): TF 客户端句柄
  - `rootObject` (`THREE.Object3D`, 可选): 添加扫描点的根对象
  - `color` (`number`, 可选): 点的颜色
  - `size` (`number`, 可选): 点的大小

##### ROS3D.PointCloud2
`ROS3D.PointCloud2` 订阅 `sensor_msgs/PointCloud2` 消息并可视化点云数据。

- **构造函数参数**:
  - `ros` (`ROSLIB.Ros`): ROS 连接句柄
  - `topic` (`string`): 要订阅的点云主题
  - `tfClient` (`TFClient`): TF 客户端句柄
  - `rootObject` (`THREE.Object3D`, 可选): 添加点云的根对象
  - `color` (`number`, 可选): 点的颜色
  - `size` (`number`, 可选): 点的大小

#### 4.1.4 URDF 可视化 API

##### ROS3D.UrdfClient
`ROS3D.UrdfClient` 订阅 `robot_description` 参数并可视化机器人模型。

- **构造函数参数**:
  - `ros` (`ROSLIB.Ros`): ROS 连接句柄
  - `param` (`string`): 机器人描述参数名称，默认为 `/robot_description`
  - `tfClient` (`TFClient`): TF 客户端句柄
  - `rootObject` (`THREE.Object3D`, 可选): 添加机器人模型的根对象
  - `path` (`string`, 可选): 机器人资源文件的基础路径

## 5. 使用示例

### 5.1 基础 Viewer 设置

以下是一个基本的 ROS3D.Viewer 初始化示例：

```javascript
// 连接到 ROS
var ros = new ROSLIB.Ros({
  url : 'ws://localhost:9090'
});

// 创建 3D 视图
var viewer = new ROS3D.Viewer({
  divID : 'your-3d-viewer-div', // 渲染 3D 场景的 HTML 元素 ID
  width : 800, // 视图宽度
  height : 600, // 视图高度
  antialias : true, // 启用抗锯齿
  cameraPose : {x: 3, y: 3, z: 3}, // 初始相机位置
  background : '#cccccc' // 背景颜色
});
```

### 5.2 导航和地图可视化

#### 占用栅格地图 (OccupancyGridClient)

`ROS3D.OccupancyGridClient` 用于订阅 `nav_msgs/OccupancyGrid` 消息，并将其渲染为 2D 地图。

```javascript
// 创建 TF 客户端
var tfClient = new ROSLIB.TFClient({
  ros : ros,
  fixedFrame : '/map',
  angularThres : 0.01,
  transThres : 0.01,
  rate : 10.0
});

// 创建占用栅格客户端
var occupancyGridClient = new ROS3D.OccupancyGridClient({
  ros : ros,
  topic : '/map', // 订阅的地图主题
  tfClient : tfClient,
  rootObject : viewer.scene, // 将地图添加到视图场景
  continuous : true // 持续更新地图
});
```

#### 路径可视化 (Path)

`ROS3D.Path` 类用于可视化 `nav_msgs/Path` 消息，将其显示为连接的线段。

```javascript
// 创建路径客户端
var pathClient = new ROS3D.Path({
  ros : ros,
  topic : '/move_base/GlobalPlanner/plan', // 订阅的路径主题
  tfClient : tfClient,
  rootObject : viewer.scene,
  color : 0x00ff00 // 路径颜色
});
```

#### 姿态可视化 (Pose)

`ROS3D.Pose` 可视化 `geometry_msgs/PoseStamped` 消息为 3D 箭头，表示机器人位置和方向。

```javascript
// 创建姿态客户端
var poseClient = new ROS3D.Pose({
  ros : ros,
  topic : '/robot_pose', // 订阅的姿态主题
  tfClient : tfClient,
  rootObject : viewer.scene,
  color : 0xff0000, // 姿态箭头颜色
  length : 0.5 // 箭头长度
});
```

### 5.3 标记可视化

#### 单个标记 (MarkerClient)

处理单个 `visualization_msgs/Marker` 消息。

```javascript
// 创建标记客户端
var markerClient = new ROS3D.MarkerClient({
  ros : ros,
  topic : '/visualization_marker', // 订阅的标记主题
  tfClient : tfClient,
  rootObject : viewer.scene
});
```

#### 标记数组 (MarkerArrayClient)

管理 `visualization_msgs/MarkerArray` 消息集合。

```javascript
// 创建标记数组客户端
var markerArrayClient = new ROS3D.MarkerArrayClient({
  ros : ros,
  topic : '/visualization_marker_array', // 订阅的标记数组主题
  tfClient : tfClient,
  rootObject : viewer.scene
});
```

### 5.4 传感器数据可视化

#### 激光扫描 (LaserScan)

监听 `sensor_msgs/LaserScan` 主题并显示点。

```javascript
// 创建激光扫描客户端
var laserScanClient = new ROS3D.LaserScan({
  ros : ros,
  topic : '/scan', // 订阅的激光扫描主题
  tfClient : tfClient,
  rootObject : viewer.scene,
  color : 0x00ff00, // 扫描点颜色
  size : 0.05 // 扫描点大小
});
```

#### 点云 (PointCloud2)

订阅 `sensor_msgs/PointCloud2` 消息并可视化点云数据。

```javascript
// 创建点云客户端
var pointCloudClient = new ROS3D.PointCloud2({
  ros : ros,
  topic : '/points', // 订阅的点云主题
  tfClient : tfClient,
  rootObject : viewer.scene,
  color : 0xff0000, // 点云颜色
  size : 0.02 // 点云大小
});
```

## 6. 技术栈和依赖

### 6.1 核心依赖
1. **EventEmitter3** (版本 5.0) - 用于事件处理
2. **Three.js** (版本 r89) - 3D 渲染引擎
3. **THREE.ColladaLoader** (版本 r89) - 用于加载 COLLADA 模型格式
4. **THREE.STLLoader** (版本 r89) - 用于加载 STL 模型格式
5. **(ROS)ColladaLoader** - 修补版本的 ColladaLoader，用于解决特定问题
6. **ROSlibjs** (版本 1.3.0) - ROS JavaScript 库，用于与 ROS 系统通信

### 6.2 构建工具
- **Grunt** - 用于构建、连接、最小化、文档化、lint 和测试
- **NPM** - 用于包管理

## 7. 构建和开发指南

### 7.1 构建依赖安装 (Ubuntu 18.04/20.04)
1. 安装 Node.js 和 NPM
   ```
   sudo apt-get install nodejs nodejs-legacy npm
   ```
2. 安装 Grunt
   ```
   sudo npm install -g grunt-cli
   ```
3. 安装项目特定的 Grunt 任务
   ```
   cd /path/to/ros3djs/
   npm install .
   ```

### 7.2 构建任务
- `grunt build` - 连接和最小化 src 下的文件，并替换 build 目录中的 ros3d.js 和 ros3d.min.js，同时运行 linter 和测试用例
- `grunt dev` - 监视 src/ 文件的任何更改并自动连接和最小化文件，适合开发时使用
- `grunt doc` - 重建项目的所有 JSDoc

### 7.3 测试
- 使用 Mocha 和 Chai 进行浏览器内测试
- 要运行测试，只需在 Web 浏览器中打开 tests/index.html

## 8. 性能优化指南

### 8.1 Three.js 相关优化
- **几何体优化**: 使用 BufferGeometry 替代 Geometry
- **材质复用**: 相同外观的对象共享材质
- **对象池**: 预创建对象并复用以避免频繁创建/销毁
- **LOD 系统**: 根据距离使用不同细节级别的模型
- **实例化渲染**: 使用 InstancedMesh 渲染大量相似对象

### 8.2 ROS 数据处理优化
- **消息节流**: 限制可视化更新频率（如 30 FPS）
- **数据过滤**: 在可视化前预过滤数据
- **TF 更新优化**: 仅更新实际改变的坐标变换
- **传感器数据优化**:
  - 激光扫描使用 Line 或 LineSegments 高效渲染
  - 点云使用 Points 对象和 BufferGeometry
  - 占据网格使用纹理渲染

### 8.3 内存管理
- **资源清理**: 正确处理几何体、材质、纹理的销毁
- **消息队列**: 实施高效的消息队列管理
- **垃圾回收**: 避免创建临时对象，重用对象

## 9. 常见问题与解决方案

### 9.1 渲染性能问题
- **问题**: 大量标记同时渲染导致 FPS 下降
- **解决方案**: 实现 LOD，限制同时渲染的标记数量，使用实例化渲染

### 9.2 内存泄漏
- **问题**: 长时间运行后内存使用不断增加
- **解决方案**: 确保正确释放几何体、材质、纹理资源

### 9.3 TF 更新延迟
- **问题**: 机器人模型更新不及时
- **解决方案**: 优化 TF 订阅和更新逻辑，减少不必要的更新

### 9.4 传感器数据处理
- **问题**: 高频传感器数据导致 UI 卡顿
- **解决方案**: 实现数据采样和插值，限制更新频率

## 10. 升级建议

### 10.1 Three.js 版本升级
当前使用 Three.js r89（2017 年），建议升级到现代版本（r120+）以获得：
- 更好的性能优化
- 新的渲染功能
- 修复的安全问题
- 更好的浏览器兼容性

### 10.2 性能监控
- 实施 FPS 监控
- 添加内存使用监控
- 实现性能分析工具集成

### 10.3 代码现代化
- 迁移到 ES6+ 语法
- 使用现代构建工具（Webpack/Vite）
- 实现更好的模块化架构