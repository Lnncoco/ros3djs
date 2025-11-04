import * as ROS3D from '@/index';

/**
 * @fileoverview 基础组件测试场景
 * @description 创建一个包含网格、坐标轴和一些基础标记的场景，用于快速验证核心渲染功能。
 */

/**
 * 创建基础测试场景
 * @param {HTMLElement} viewerContainer - 用于渲染3D视图的div容器。
 * @returns {object} 包含 `dispose` 方法的对象，用于清理场景。
 */
export function createBasicScene(viewerContainer) {
  // 1. 创建查看器
  const viewer = new ROS3D.Viewer({
    divID: viewerContainer.id,
    width: viewerContainer.clientWidth,
    height: viewerContainer.clientHeight,
    antialias: true,
    background: '#282c34',
  });

  // 2. 添加网格
  const grid = new ROS3D.Grid();
  viewer.addObject(grid);

  // 3. 添加坐标轴
  const axes = new ROS3D.Axes();
  viewer.addObject(axes);

  // 4. 添加一个箭头标记
  const arrowMarker = new ROS3D.Marker({
    message: {
      header: { frame_id: 'base_link' },
      ns: 'test',
      id: 1,
      type: 0, // ARROW
      action: 0, // ADD
      pose: {
        position: { x: 1, y: 1, z: 1 },
        orientation: { x: 0, y: 0, z: 0, w: 1 },
      },
      scale: { x: 1, y: 0.1, z: 0.1 },
      color: { r: 1, g: 0, b: 0, a: 1 },
    },
  });
  viewer.addObject(arrowMarker);

  // 5. 添加一个球体标记
  const sphereMarker = new ROS3D.Marker({
    message: {
      header: { frame_id: 'base_link' },
      ns: 'test',
      id: 2,
      type: 2, // SPHERE
      action: 0, // ADD
      pose: {
        position: { x: -1, y: -1, z: 0.5 },
        orientation: { x: 0, y: 0, z: 0, w: 1 },
      },
      scale: { x: 1, y: 1, z: 1 },
      color: { r: 0, g: 0, b: 1, a: 1 },
    },
  });
  viewer.addObject(sphereMarker);

  // 返回一个清理函数
  return {
    dispose: () => {
      viewer.scene.remove(grid);
      viewer.scene.remove(axes);
      viewer.scene.remove(arrowMarker);
      viewer.scene.remove(sphereMarker);
      viewer.dispose();
    },
  };
}