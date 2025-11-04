import { createBasicScene } from './basic.js';
import { createLiveRosScene } from './live-ros.js';
import { createMarkersScene } from './markers.js';
import { createSensorsScene } from './sensors.js';
import { createNavigationScene } from './navigation.js';
import { createUrdfScene } from './urdf.js';

/**
 * @fileoverview 场景注册中心
 * @description
 *   此文件统一导入并导出所有可用的测试场景。
 *   `main.js` 会使用此文件来动态构建侧边栏导航，并根据用户的选择加载相应的场景。
 *   每个键名将作为场景标题显示在UI上。
 */

export const scenes = {
  '基础组件测试': createBasicScene,
  'ROS 实时调试': createLiveRosScene,
  '标记类型测试': createMarkersScene,
  '传感器数据测试': createSensorsScene,
  '导航数据测试': createNavigationScene,
  'URDF 模型测试': createUrdfScene,
  // 在这里添加更多场景...
};