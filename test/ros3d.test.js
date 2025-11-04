import { describe, it, expect } from 'vitest';
import * as ROS3D from '../src/index.js';

// 基础API测试
describe('ROS3D.js 基础功能测试', () => {
  it('应该正确导出版本号', () => {
    expect(ROS3D.REVISION).toBe('1.2.0');
  });

  it('应该导出所有常量', () => {
    expect(ROS3D.MARKER_CUBE).toBe(1);
    expect(ROS3D.MARKER_SPHERE).toBe(2);
    expect(ROS3D.MARKER_CYLINDER).toBe(3);
    expect(ROS3D.INTERACTIVE_MARKER_KEEP_ALIVE).toBe(0);
    expect(ROS3D.INTERACTIVE_MARKER_POSE_UPDATE).toBe(1);
  });

  it('应该导出所有工具函数', () => {
    expect(typeof ROS3D.makeColorMaterial).toBe('function');
    expect(typeof ROS3D.intersectPlane).toBe('function');
    expect(typeof ROS3D.findClosestPoint).toBe('function');
    expect(typeof ROS3D.closestAxisPoint).toBe('function');
  });

  it('应该导出核心类', () => {
    expect(typeof ROS3D.Viewer).toBe('function');
    expect(typeof ROS3D.SceneNode).toBe('function');
    expect(typeof ROS3D.Marker).toBe('function');
  });

  it('应该导出模型类', () => {
    expect(typeof ROS3D.Grid).toBe('function');
    expect(typeof ROS3D.Arrow).toBe('function');
    expect(typeof ROS3D.Axes).toBe('function');
  });

  it('应该导出交互类', () => {
    expect(typeof ROS3D.OrbitControls).toBe('function');
    expect(typeof ROS3D.MouseHandler).toBe('function');
    expect(typeof ROS3D.Highlighter).toBe('function');
  });
});

// 常量测试
describe('ROS3D.js 常量测试', () => {
  it('标记类型常量应该正确', () => {
    expect(ROS3D.MARKER_ARROW).toBe(0);
    expect(ROS3D.MARKER_CUBE).toBe(1);
    expect(ROS3D.MARKER_SPHERE).toBe(2);
    expect(ROS3D.MARKER_CYLINDER).toBe(3);
    expect(ROS3D.MARKER_LINE_STRIP).toBe(4);
    expect(ROS3D.MARKER_LINE_LIST).toBe(5);
    expect(ROS3D.MARKER_CUBE_LIST).toBe(6);
    expect(ROS3D.MARKER_SPHERE_LIST).toBe(7);
    expect(ROS3D.MARKER_POINTS).toBe(8);
    expect(ROS3D.MARKER_TEXT_VIEW_FACING).toBe(9);
    expect(ROS3D.MARKER_MESH_RESOURCE).toBe(10);
    expect(ROS3D.MARKER_TRIANGLE_LIST).toBe(11);
  });

  it('交互标记类型常量应该正确', () => {
    expect(ROS3D.INTERACTIVE_MARKER_KEEP_ALIVE).toBe(0);
    expect(ROS3D.INTERACTIVE_MARKER_POSE_UPDATE).toBe(1);
    expect(ROS3D.INTERACTIVE_MARKER_MENU_SELECT).toBe(2);
    expect(ROS3D.INTERACTIVE_MARKER_BUTTON_CLICK).toBe(3);
    expect(ROS3D.INTERACTIVE_MARKER_MOUSE_DOWN).toBe(4);
    expect(ROS3D.INTERACTIVE_MARKER_MOUSE_UP).toBe(5);
  });

  it('交互标记控制类型常量应该正确', () => {
    expect(ROS3D.INTERACTIVE_MARKER_NONE).toBe(0);
    expect(ROS3D.INTERACTIVE_MARKER_MENU).toBe(1);
    expect(ROS3D.INTERACTIVE_MARKER_BUTTON).toBe(2);
    expect(ROS3D.INTERACTIVE_MARKER_MOVE_AXIS).toBe(3);
    expect(ROS3D.INTERACTIVE_MARKER_MOVE_PLANE).toBe(4);
    expect(ROS3D.INTERACTIVE_MARKER_ROTATE_AXIS).toBe(5);
    expect(ROS3D.INTERACTIVE_MARKER_MOVE_ROTATE).toBe(6);
    expect(ROS3D.INTERACTIVE_MARKER_MOVE_3D).toBe(7);
    expect(ROS3D.INTERACTIVE_MARKER_ROTATE_3D).toBe(8);
    expect(ROS3D.INTERACTIVE_MARKER_MOVE_ROTATE_3D).toBe(9);
  });

  it('交互标记旋转行为常量应该正确', () => {
    expect(ROS3D.INTERACTIVE_MARKER_INHERIT).toBe(0);
    expect(ROS3D.INTERACTIVE_MARKER_FIXED).toBe(1);
    expect(ROS3D.INTERACTIVE_MARKER_VIEW_FACING).toBe(2);
  });
});

// 工具函数测试
describe('ROS3D.js 工具函数测试', () => {
  it('makeColorMaterial 函数应该存在', () => {
    expect(typeof ROS3D.makeColorMaterial).toBe('function');
  });

  it('intersectPlane 函数应该存在', () => {
    expect(typeof ROS3D.intersectPlane).toBe('function');
  });

  it('findClosestPoint 函数应该存在', () => {
    expect(typeof ROS3D.findClosestPoint).toBe('function');
  });

  it('closestAxisPoint 函数应该存在', () => {
    expect(typeof ROS3D.closestAxisPoint).toBe('function');
  });
});

// 类实例化和功能测试
describe('ROS3D.js 类实例化测试', () => {
  it('Grid 类应该能被实例化', () => {
    expect(() => new ROS3D.Grid()).not.toThrow();
  });

  it('Arrow 类应该能被实例化', () => {
    expect(() => new ROS3D.Arrow()).not.toThrow();
  });

  it('Axes 类应该能被实例化', () => {
    expect(() => new ROS3D.Axes()).not.toThrow();
  });

  it('Marker 类应该能被实例化', () => {
    expect(() => new ROS3D.Marker({
      message: {
        type: 1, // CUBE
        pose: {
          position: { x: 0, y: 0, z: 0 },
          orientation: { x: 0, y: 0, z: 0, w: 1 }
        },
        scale: { x: 1, y: 1, z: 1 },
        color: { r: 1, g: 0, b: 0, a: 1 }
      }
    })).not.toThrow();
  });

  it('Viewer 类定义应该存在', () => {
    expect(typeof ROS3D.Viewer).toBe('function');
  });

  it('SceneNode 类定义应该存在', () => {
    expect(typeof ROS3D.SceneNode).toBe('function');
  });

  it('OrbitControls 类定义应该存在', () => {
    expect(typeof ROS3D.OrbitControls).toBe('function');
  });

  it('MouseHandler 类定义应该存在', () => {
    expect(typeof ROS3D.MouseHandler).toBe('function');
  });

  it('Highlighter 类定义应该存在', () => {
    expect(typeof ROS3D.Highlighter).toBe('function');
  });
});