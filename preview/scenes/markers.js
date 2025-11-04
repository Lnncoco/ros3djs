import * as ROS3D from "@/index";
import * as THREE from "three";

/**
 * @fileoverview 标记类型测试场景
 * @description 展示 ROS3D.Marker 支持的各种类型。
 */

/**
 * 创建标记类型测试场景
 * @param {HTMLElement} viewerContainer - 用于渲染3D视图的div容器。
 * @returns {object} 包含 `dispose` 方法的对象，用于清理场景。
 */
export function createMarkersScene(viewerContainer) {
  const viewer = new ROS3D.Viewer({
    divID: viewerContainer.id,
    width: viewerContainer.clientWidth,
    height: viewerContainer.clientHeight,
    antialias: true,
    background: "#282c34",
  });

  viewer.addObject(new ROS3D.Grid());
  viewer.addObject(new ROS3D.Axes());

  const markers = [];

  // 1. 箭头 (ARROW)
  const arrowMarker = new ROS3D.Marker({
    message: {
      header: { frame_id: "base_link" },
      ns: "markers",
      id: 0,
      type: ROS3D.MARKER_ARROW,
      action: 0,
      pose: {
        position: { x: 2, y: 0, z: 0 },
        orientation: { x: 0, y: 0, z: 0, w: 1 },
      },
      scale: { x: 1, y: 0.1, z: 0.1 },
      color: { r: 1, g: 0, b: 0, a: 1 },
    },
  });
  viewer.addObject(arrowMarker);
  markers.push(arrowMarker);

  // 2. 立方体 (CUBE)
  const cubeMarker = new ROS3D.Marker({
    message: {
      header: { frame_id: "base_link" },
      ns: "markers",
      id: 1,
      type: ROS3D.MARKER_CUBE,
      action: 0,
      pose: {
        position: { x: 0, y: 2, z: 0 },
        orientation: { x: 0, y: 0, z: 0, w: 1 },
      },
      scale: { x: 0.5, y: 0.5, z: 0.5 },
      color: { r: 0, g: 1, b: 0, a: 1 },
    },
  });
  viewer.addObject(cubeMarker);
  markers.push(cubeMarker);

  // 3. 球体 (SPHERE)
  const sphereMarker = new ROS3D.Marker({
    message: {
      header: { frame_id: "base_link" },
      ns: "markers",
      id: 2,
      type: ROS3D.MARKER_SPHERE,
      action: 0,
      pose: {
        position: { x: -2, y: 0, z: 0 },
        orientation: { x: 0, y: 0, z: 0, w: 1 },
      },
      scale: { x: 0.7, y: 0.7, z: 0.7 },
      color: { r: 0, g: 0, b: 1, a: 1 },
    },
  });
  viewer.addObject(sphereMarker);
  markers.push(sphereMarker);

  // 4. 圆柱体 (CYLINDER)
  const cylinderMarker = new ROS3D.Marker({
    message: {
      header: { frame_id: "base_link" },
      ns: "markers",
      id: 3,
      type: ROS3D.MARKER_CYLINDER,
      action: 0,
      pose: {
        position: { x: 0, y: -2, z: 0 },
        orientation: { x: 0, y: 0, z: 0, w: 1 },
      },
      scale: { x: 0.4, y: 0.4, z: 1.0 },
      color: { r: 1, g: 1, b: 0, a: 1 },
    },
  });
  viewer.addObject(cylinderMarker);
  markers.push(cylinderMarker);

  // 5. 线段 (LINE_STRIP)
  const lineStripMarker = new ROS3D.Marker({
    message: {
      header: { frame_id: "base_link" },
      ns: "markers",
      id: 4,
      type: ROS3D.MARKER_LINE_STRIP,
      action: 0,
      pose: {
        position: { x: 0, y: 0, z: 0 },
        orientation: { x: 0, y: 0, z: 0, w: 1 },
      },
      scale: { x: 0.05 }, // 线宽
      color: { r: 1, g: 0.5, b: 0, a: 1 },
      points: [
        { x: -1, y: -1, z: 1 },
        { x: 0, y: -1, z: 1.5 },
        { x: 1, y: -1, z: 1 },
      ],
    },
  });
  viewer.addObject(lineStripMarker);
  markers.push(lineStripMarker);

  // 6. 线段列表 (LINE_LIST)
  const lineListMarker = new ROS3D.Marker({
    message: {
      header: { frame_id: "base_link" },
      ns: "markers",
      id: 5,
      type: ROS3D.MARKER_LINE_LIST,
      action: 0,
      pose: {
        position: { x: 0, y: 0, z: 0 },
        orientation: { x: 0, y: 0, z: 0, w: 1 },
      },
      scale: { x: 0.03 }, // 线宽
      color: { r: 0.5, g: 0, b: 1, a: 1 },
      points: [
        { x: -1, y: 1, z: 1 },
        { x: 0, y: 1, z: 1.5 },
        { x: 0, y: 1, z: 1.5 },
        { x: 1, y: 1, z: 1 },
      ],
    },
  });
  viewer.addObject(lineListMarker);
  markers.push(lineListMarker);

  // 7. 点 (POINTS)
  const pointsMarker = new ROS3D.Marker({
    message: {
      header: { frame_id: "base_link" },
      ns: "markers",
      id: 6,
      type: ROS3D.MARKER_POINTS,
      action: 0,
      pose: {
        position: { x: 0, y: 0, z: 0 },
        orientation: { x: 0, y: 0, z: 0, w: 1 },
      },
      scale: { x: 0.1 }, // 点的大小
      color: { r: 0, g: 1, b: 1, a: 1 },
      points: [
        { x: -1.5, y: -1.5, z: 0.5 },
        { x: 0, y: -1.5, z: 0.5 },
        { x: 1.5, y: -1.5, z: 0.5 },
      ],
    },
  });
  viewer.addObject(pointsMarker);
  markers.push(pointsMarker);

  // 8. 文本 (TEXT_VIEW_FACING)
  const textMarker = new ROS3D.Marker({
    message: {
      header: { frame_id: "base_link" },
      ns: "markers",
      id: 7,
      type: ROS3D.MARKER_TEXT_VIEW_FACING,
      action: 0,
      pose: {
        position: { x: 0, y: 0, z: 2 },
        orientation: { x: 0, y: 0, z: 0, w: 1 },
      },
      scale: { x: 0.5 }, // 文本高度
      color: { r: 1, g: 1, b: 1, a: 1 },
      text: "Hello ROS3D!",
    },
  });
  viewer.addObject(textMarker);
  markers.push(textMarker);

  // 9. 网格资源 (MESH_RESOURCE) - 需要一个实际的.dae/.obj/.stl文件
  // 为了简化，这里不加载外部文件，只展示其结构
  const meshResourceMarker = new ROS3D.Marker({
    message: {
      header: { frame_id: "base_link" },
      ns: "markers",
      id: 8,
      type: ROS3D.MARKER_MESH_RESOURCE,
      action: 0,
      pose: {
        position: { x: 0, y: -20, z: -5 },
        orientation: { x: 0, y: 0.5, z: 0, w: 1 },
      },
      scale: { x: 0.25, y: 0.25, z: 0.25 },
      color: { r: 0.5, g: 0.5, b: 0.5, a: 1 },
      mesh_resource: "preview/resource/wyvern/wyvern.dae",
      mesh_use_embedded_materials: true,
    },
  });
  // 调整模型方向，使其脚朝下
  meshResourceMarker.rotation.x = Math.PI / 2;
  viewer.addObject(meshResourceMarker);

  // 10. 三角形列表 (TRIANGLE_LIST)
  const triangleListMarker = new ROS3D.Marker({
    message: {
      header: { frame_id: "base_link" },
      ns: "markers",
      id: 9,
      type: ROS3D.MARKER_TRIANGLE_LIST,
      action: 0,
      pose: {
        position: { x: -2, y: -2, z: 0 },
        orientation: { x: 0, y: 0, z: 0, w: 1 },
      },
      scale: { x: 1, y: 1, z: 1 },
      color: { r: 0.8, g: 0.2, b: 0.8, a: 1 },
      points: [
        { x: 0, y: 0, z: 0 },
        { x: 1, y: 0, z: 0 },
        { x: 0.5, y: 1, z: 0 }, // 第一个三角形
        { x: 1, y: 1, z: 0 },
        { x: 2, y: 1, z: 0 },
        { x: 1.5, y: 2, z: 0 }, // 第二个三角形
      ],
      colors: [
        { r: 1, g: 0, b: 0, a: 1 },
        { r: 0, g: 1, b: 0, a: 1 },
        { r: 0, g: 0, b: 1, a: 1 },
        { r: 1, g: 1, b: 0, a: 1 },
        { r: 0, g: 1, b: 1, a: 1 },
        { r: 1, g: 0, b: 1, a: 1 },
      ],
    },
  });
  viewer.addObject(triangleListMarker);
  markers.push(triangleListMarker);

  // 11. 立方体列表 (CUBE_LIST)
  const cubeListMarker = new ROS3D.Marker({
    message: {
      header: { frame_id: "base_link" },
      ns: "markers",
      id: 10,
      type: ROS3D.MARKER_CUBE_LIST,
      action: 0,
      pose: {
        position: { x: 0, y: 0, z: 0 },
        orientation: { x: 0, y: 0, z: 0, w: 1 },
      },
      scale: { x: 0.2, y: 0.2, z: 0.2 }, // 单个立方体尺寸
      color: { r: 0.7, g: 0.7, b: 0.7, a: 1 },
      points: [
        { x: -1, y: 0, z: 0.2 },
        { x: 0, y: 0, z: 0.2 },
        { x: 1, y: 0, z: 0.2 },
      ],
    },
  });
  viewer.addObject(cubeListMarker);
  markers.push(cubeListMarker);

  // 12. 球体列表 (SPHERE_LIST)
  const sphereListMarker = new ROS3D.Marker({
    message: {
      header: { frame_id: "base_link" },
      ns: "markers",
      id: 11,
      type: ROS3D.MARKER_SPHERE_LIST,
      action: 0,
      pose: {
        position: { x: 0, y: 0, z: 0 },
        orientation: { x: 0, y: 0, z: 0, w: 1 },
      },
      scale: { x: 0.15, y: 0.15, z: 0.15 }, // 单个球体尺寸
      color: { r: 0.9, g: 0.9, b: 0.1, a: 1 },
      points: [
        { x: -1, y: -0.5, z: 0.7 },
        { x: 0, y: -0.5, z: 0.7 },
        { x: 1, y: -0.5, z: 0.7 },
      ],
    },
  });
  viewer.addObject(sphereListMarker);
  markers.push(sphereListMarker);

  return {
    dispose: () => {
      markers.forEach((marker) => {
        viewer.scene.remove(marker);
        if (typeof marker.dispose === "function") {
          marker.dispose();
        }
      });
      viewer.dispose();
    },
  };
}
