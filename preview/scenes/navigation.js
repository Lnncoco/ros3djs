import * as ROS3D from '@/index';
import * as THREE from 'three';

/**
 * @fileoverview 导航数据测试场景
 * @description 展示 ROS3D.OccupancyGrid, ROS3D.Path, ROS3D.Odometry, ROS3D.Pose, ROS3D.PoseArray 的可视化。
 */

/**
 * 创建导航数据测试场景
 * @param {HTMLElement} viewerContainer - 用于渲染3D视图的div容器。
 * @returns {object} 包含 `dispose` 方法的对象，用于清理场景。
 */
export function createNavigationScene(viewerContainer) {
  const viewer = new ROS3D.Viewer({
    divID: viewerContainer.id,
    width: viewerContainer.clientWidth,
    height: viewerContainer.clientHeight,
    antialias: true,
    background: '#282c34',
  });

  viewer.addObject(new ROS3D.Grid());
  viewer.addObject(new ROS3D.Axes());

  const navObjects = [];

  // 1. OccupancyGrid 示例
  // 首先，创建模拟的地图消息
  const width = 50;
  const height = 50;
  const resolution = 0.1; // meters/pixel
  const data = new Int8Array(width * height);

  // 绘制一个简单的“U”形墙壁
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = y * width + x;
      if (x < 5 || x >= width - 5 || (y < 5 && x > 5 && x < width - 5)) {
        data[index] = 100; // 占用
      } else if (x % 5 === 0 && y % 5 === 0) {
        data[index] = -1; // 未知
      } else {
        data[index] = 0; // 空闲
      }
    }
  }

  const mapMessage = {
    header: { frame_id: 'map' },
    info: {
      resolution: resolution,
      width: width,
      height: height,
      origin: {
        position: { x: -width * resolution / 2, y: -height * resolution / 2, z: 0 },
        orientation: { x: 0, y: 0, z: 0, w: 1 },
      },
    },
    data: data,
  };

  // 然后，将消息传入构造函数来创建 OccupancyGrid
  const occupancyGrid = new ROS3D.OccupancyGrid({
    message: mapMessage, // 直接传入消息
    color: { r: 0, g: 102, b: 255 }, // 蓝色调
  });
  viewer.addObject(occupancyGrid);
  navObjects.push(occupancyGrid);

  // 2. Path 示例
  const path = new ROS3D.Path({
    ros: null, // 在此示例中不连接ROS
    topic: '/path',
    rootObject: viewer.scene,
    tfClient: null, // 在此示例中不使用TF
    color: 0xff00ff, // 紫色
  });
  navObjects.push(path);

  // 模拟 Path 数据
  const simulatePath = () => {
    const poses = [];
    for (let i = 0; i < 10; i++) {
      poses.push({
        header: { frame_id: 'map' },
        pose: {
          position: { x: i * 0.5 - 2, y: Math.sin(i * 0.5) * 2, z: 0.1 },
          orientation: { x: 0, y: 0, z: Math.sin(i * 0.2), w: Math.cos(i * 0.2) },
        },
      });
    }
    const pathMessage = {
      header: { frame_id: 'map' },
      poses: poses,
    };
    path.processMessage(pathMessage);
  };
  simulatePath();

  // 3. Odometry 示例 (显示为带箭头的坐标系)
  const odometry = new ROS3D.Odometry({
    ros: null, // 在此示例中不连接ROS
    topic: '/odom',
    rootObject: viewer.scene,
    tfClient: null, // 在此示例中不使用TF
    color: 0x00ff00, // 绿色
    keep: 10, // 保留10条历史轨迹
  });
  navObjects.push(odometry);

  // 模拟 Odometry 数据, 生成一条轨迹
  const simulateOdometry = () => {
    let i = 0;
    const interval = setInterval(() => {
      if (i++ >= 10) {
        clearInterval(interval);
        return;
      }
      const odomMessage = {
        header: { frame_id: 'odom' },
        pose: {
          pose: {
            position: { x: i * 0.2, y: i * 0.2, z: 0 },
            orientation: { x: 0, y: 0, z: Math.sin(i * 0.1), w: Math.cos(i * 0.1) },
          },
        },
      };
      odometry.processMessage(odomMessage);
    }, 100);
  };
  simulateOdometry();

  // 4. Pose 示例 (显示为带箭头的坐标系)
  const pose = new ROS3D.Pose({
    ros: null, // 在此示例中不连接ROS
    topic: '/robot_pose',
    rootObject: viewer.scene,
    tfClient: null, // 在此示例中不使用TF
    color: 0xffa500, // 橙色
    arrowSize: 0.3,
  });
  navObjects.push(pose);

  // 模拟 Pose 数据
  const simulatePose = () => {
    const poseMessage = {
      header: { frame_id: 'map' },
      pose: {
        position: { x: -1, y: 2, z: 0 },
        orientation: { x: 0, y: 0, z: 0.382, w: 0.923 }, // 22.5度旋转
      },
    };
    pose.processMessage(poseMessage);
  };
  simulatePose();

  // 5. PoseArray 示例 (显示为多个带箭头的坐标系)
  const poseArray = new ROS3D.PoseArray({
    ros: null, // 在此示例中不连接ROS
    topic: '/pose_array',
    rootObject: viewer.scene,
    tfClient: null, // 在此示例中不使用TF
    color: 0x00ffff, // 青色
    arrowSize: 0.2,
  });
  navObjects.push(poseArray);

  // 模拟 PoseArray 数据
  const simulatePoseArray = () => {
    const poses = [];
    for (let i = 0; i < 200; i++) {
      poses.push({
        position: { x: Math.random() * 4 - 2, y: Math.random() * 4 - 2, z: Math.random() * 0.5 },
        orientation: { x: 0, y: 0, z: Math.random(), w: Math.random() },
      });
    }
    const poseArrayMessage = {
      header: { frame_id: 'map' },
      poses: poses,
    };
    poseArray.processMessage(poseArrayMessage);
  };
  simulatePoseArray();

  return {
    dispose: () => {
      navObjects.forEach(obj => {
        viewer.scene.remove(obj);
        if (typeof obj.dispose === 'function') {
          obj.dispose();
        }
      });
      viewer.dispose();
    },
  };
}
