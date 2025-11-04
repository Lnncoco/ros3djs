/**
 * ROS 3D Viewer 钩子函数
 * @description 管理 ROS3D.Viewer 实例及其相关的3D可视化客户端。已重构为使用 useRosSubscriptions 钩子。
 */
import { ref, watch, onUnmounted, nextTick, computed, shallowRef } from 'vue';
import * as ROSLIB from 'roslib';
import * as ROS3D from 'ros3d';
import * as THREE from 'three';
import { useRosSubscriptions } from './use-ros-subscriptions';
import { handlerCreators } from '../render';

/**
 * 创建并管理ROS 3D可视化环境
 * @param {Object} options - 配置选项
 * @param {import('vue').Ref<import('roslib').Ros | null>} options.rosInstance - ROS实例的Ref
 * @param {import('vue').Ref<HTMLElement | null>} options.viewerContainerRef - 视图容器的Ref
 * @param {import('vue').Ref<string>} options.fixedFrame - 固定坐标系的Ref
 * @param {import('vue').Ref<Array<Object>>} options.topics - 3D主题配置列表的Ref
 * @param {import('vue').Ref<number>} options.maxPoints - 点云最大点数的Ref
 * @param {import('vue').Ref<boolean>} options.isConnected - ROS连接状态的Ref
 * @param {import('vue').Ref<Object>} options.cameraPose - 相机视角配置的Ref
 * @param {import('vue').Ref<Object>} options.cameraLookAt - 相机看向目标点的Ref
 * @param {import('vue').Ref<boolean>} options.debugMode - 是否启用调试模式的Ref
 * @returns {Object} 控制和状态接口
 */
export function useRos3dViewer({
  rosInstance,
  viewerContainerRef,
  fixedFrame,
  topics,
  maxPoints,
  isConnected,
  rosModelServerUrl,
  cameraPose,
  cameraLookAt,
  debugMode,
}) {
  const viewer = shallowRef(null); // ROS3D.Viewer 实例
  const grid = shallowRef(null); // 网格实例

  /**
   * 初始化TF客户端
   */
  const initTfClient = () => {
    if (!rosInstance.value) {
      console.warn('[ROS3DViewer] ROS实例无效，无法初始化TF客户端');
      return;
    }

    // 清理之前的TF客户端
    if (tfClient.value) {
      try {
        tfClient.value.unsubscribe();
      } catch (e) {
        console.warn('[ROS3DViewer] 清理旧TF客户端时出错:', e);
      }
    }

    tfClient.value = new ROSLIB.TFClient({
      ros: rosInstance.value,
      angularThres: 0.01,
      transThres: 0.01,
      rate: 10.0,
      fixedFrame: fixedFrame.value,
    });

    console.log(`[ROS3DViewer] TFClient 初始化成功，固定坐标系: ${fixedFrame.value}`);
  };

  const tfClient = shallowRef(null); // TF客户端



  /**
   * 创建一个渲染处理器（用于onSubscribe回调）
   * @param {Object} topicConfig - 主题配置
   * @returns {Object|null} 创建的处理器实例
   */
  const createRos3dHandler = (topicConfig) => {
    // 增加前置条件检查日志，确认所有依赖是否就绪
    if (!viewer.value || !viewer.value.scene || !rosInstance.value || !tfClient.value || !topicConfig) {
      console.warn(
        '[ROS3DViewer] createRos3dHandler called with incomplete dependencies. Aborting handler creation.',
        {
          hasViewer: !!viewer.value,
          hasScene: !!viewer.value?.scene,
          hasRos: !!rosInstance.value,
          hasTfClient: !!tfClient.value,
          hasTopicConfig: !!topicConfig,
        },
      );
      return null;
    }

    const creator = handlerCreators[topicConfig.type];
    if (!creator) {
      if (topicConfig.type !== 'unknown') {
        console.warn(`[ROS3DViewer] 未知或不支持的3D主题类型: ${topicConfig.type} for ${topicConfig.name}`);
      }
      return null;
    }

    try {
      // 创建处理器实例
      const handler = creator({
        ros: rosInstance.value,
        tfClient: tfClient.value,
        topic: topicConfig,
        scene: viewer.value.scene,
        maxPoints: maxPoints.value,
        path: rosModelServerUrl.value,
      });
      
      return handler;
    } catch (error) {
      console.error(`[ROS3DViewer] 创建处理器 ${topicConfig.name} (类型: ${topicConfig.type}) 失败:`, error);
      return null;
    }
  };

  /**
   * 销毁渲染处理器（用于onUnsubscribe回调）
   * @param {Object} handlerInstance - 处理器实例
   * @param {Object} config - 主题配置
   */
  const destroyRos3dHandler = (handlerInstance, config) => {
    console.log(`[ROS3DViewer] Destroying handler for: ${config.name}`);
    if (!handlerInstance) {
      return;
    }
    
    try {
      // 对于高性能标记渲染器（需要检查是否存在dispose方法）
      if (handlerInstance.dispose) {
        handlerInstance.dispose();
      }
      // 对于其他类型的处理器
      else if (handlerInstance instanceof ROS3D.MarkerArrayClient) {
        handlerInstance.clear();
      }

      // 对所有客户端，调用unsubscribe停止接收新消息（如果存在）
      if (typeof handlerInstance.unsubscribe === 'function') {
        handlerInstance.unsubscribe();
        console.log(`[ROS3DViewer] > handler.unsubscribe() has been called for ${config.name}`);
      }
    } catch (error) {
      console.warn(`[ROS3DViewer] Error while destroying handler for ${config.name}:`, error);
    }
  };

  // 创建一个计算属性，仅当Viewer和TFClient都准备好后才提供topics
  // 这解决了 `useRosSubscriptions` 过早运行订阅而 `viewer` 或 `tfClient` 尚未创建的竞态问题
  const effectiveTopics = computed(() => {
    if (viewer.value && tfClient.value) {
      return topics.value;
    }
    return [];
  });

  // 使用新的订阅引擎来管理3D可视化客户端
  useRosSubscriptions({
    ros: rosInstance,
    isConnected,
    configs: effectiveTopics, // 使用响应式的 effectiveTopics
    handler: {
      onSubscribe: createRos3dHandler,
      onUnsubscribe: destroyRos3dHandler,
    },
  });

  /**
   * 初始化3D查看器
   */
  const initializeViewer = async () => {
    if (!rosInstance.value || !viewerContainerRef.value || !isConnected.value) {
      return;
    }

    if (viewer.value) {
      await destroyViewer();
    }

    await nextTick();

    try {
      console.log('[ROS3DViewer] 初始化ROS3D.Viewer，容器:', viewerContainerRef.value);
      // 使用传入的相机视角配置，如果未提供则使用默认值
      const pose = cameraPose?.value || { x: 16, y: 16, z: 16 };
      viewer.value = new ROS3D.Viewer({
        divID: viewerContainerRef.value.id,
        width: viewerContainerRef.value.clientWidth,
        height: viewerContainerRef.value.clientHeight,
        antialias: true,
        background: '#1e1e1e',
        intensity: 5000,
        alpha: 1.0,
        cameraPose: pose,
      });

      if (viewer.value.cameraControls) {
        viewer.value.cameraControls.userZoomSpeed = -viewer.value.cameraControls.userZoomSpeed;
      }

      // 如果提供了相机看向的目标点，则设置相机朝向
      if (cameraLookAt?.value) {
        // 需要等待下一帧以确保相机已初始化
        await nextTick();
        if (viewer.value && viewer.value.cameraControls) {
          // ROS3D.Viewer 的 cameraControls 通常使用 center 属性来设置目标点
          if (viewer.value.cameraControls.center) {
            viewer.value.cameraControls.center.set(
              cameraLookAt.value.x,
              cameraLookAt.value.y,
              cameraLookAt.value.z
            );
          }
          // 确保控件更新
          if (viewer.value.cameraControls.controls && typeof viewer.value.cameraControls.controls.update === 'function') {
            viewer.value.cameraControls.controls.update();
          } else if (viewer.value.cameraControls.update) {
            viewer.value.cameraControls.update();
          }
        }
      }

      console.log('[ROS3DViewer] ROS3D.Viewer 初始化成功');
      addGrid();

      // Viewer 初始化成功后，立即初始化TFClient
      // 这会触发 effectiveTopics 的更新，进而启动订阅流程
      if (!tfClient.value) {
        initTfClient();
      }
    } catch (error) {
      console.error('[ROS3DViewer] 初始化ROS3D.Viewer失败:', error);
      viewer.value = null;
      grid.value = null;
    }
  };

  /**
   * 添加3D网格
   */
  const addGrid = (options = {}) => {
    if (!viewer.value) return;
    try {
      if (grid.value && viewer.value.scene) {
        viewer.value.scene.remove(grid.value);
      }
      const gridOptions = {
        color: options.color || 0xaaaaaa,
        cellSize: options.cellSize || 1.0,
        numCells: options.numCells || 40,
      };
      grid.value = new ROS3D.Grid(gridOptions);
      viewer.value.scene.add(grid.value);
      console.log('[ROS3DViewer] 添加3D网格');
    } catch (error) {
      console.error('[ROS3DViewer] 添加网格失败:', error);
    }
  };

  /**
   * 销毁3D查看器
   */
  const destroyViewer = async () => {
    console.log('[ROS3DViewer] 开始销毁ROS3D.Viewer');

    if (viewer.value) {
      try {
        // 停止渲染循环，这是解决残余GPU占用的关键
        if (viewer.value.animation_id) {
          cancelAnimationFrame(viewer.value.animation_id);
        }

        // 彻底清理Three.js场景资源，防止GPU内存泄漏
        if (viewer.value.scene) {
          // 遍历场景中的所有对象
          viewer.value.scene.traverse((object) => {
            // 只处理可释放资源的对象类型
            if (!object.isMesh && !object.isLine && !object.isPoints) {
              return;
            }

            // 1. 释放几何体
            if (object.geometry) {
              object.geometry.dispose();
            }

            // 2. 释放材质（和相关纹理）
            if (object.material) {
              if (Array.isArray(object.material)) {
                object.material.forEach((material) => {
                  if (material.map) material.map.dispose();
                  material.dispose();
                });
              } else {
                if (object.material.map) object.material.map.dispose();
                object.material.dispose();
              }
            }
          });

          // 从场景中移除所有子对象
          while (viewer.value.scene.children.length > 0) {
            viewer.value.scene.remove(viewer.value.scene.children[0]);
          }
        }

        // 3. 释放渲染器
        if (viewer.value.renderer) {
          viewer.value.renderer.dispose();
          // 从DOM中移除canvas
          const canvas = viewer.value.renderer.domElement;
          if (canvas && canvas.parentElement) {
            canvas.parentElement.removeChild(canvas);
          }
        }
      } catch (error) {
        console.warn('[ROS3DViewer] 清理Three.js资源时出错:', error);
      } finally {
        // 4. 清空引用
        viewer.value = null;
        grid.value = null;
        console.log('[ROS3DViewer] ROS3D.Viewer实例及相关资源已销毁');
      }
    }
  };

  /**
   * 更新固定坐标系
   */
  const updateFixedFrame = (newFrame) => {
    if (newFrame && fixedFrame.value !== newFrame) {
      console.warn('[ROS3DViewer] Fixed frame 更改，将重新初始化TF客户端');
      // 重新初始化TF客户端以使用新的固定坐标系
      if (tfClient.value) {
        tfClient.value.unsubscribe();
      }
      initTfClient();
    }
  };

  // 监视连接状态，以初始化或销毁查看器
  watch(
    isConnected,
    (connected) => {
      if (connected && viewerContainerRef.value) {
        initializeViewer();
      } else {
        destroyViewer();
      }
    },
    { immediate: true },
  );

  // 监视容器DOM元素的变化
  watch(viewerContainerRef, (newRef) => {
    if (newRef && isConnected.value && !viewer.value) {
      initializeViewer();
    } else if (!newRef && viewer.value) {
      destroyViewer();
    }
  });

  // 监视外部传入的fixedFrame变化
  watch(fixedFrame, updateFixedFrame);

  /**
   * 获取当前相机视角
   * @returns {Object|null} 当前相机位置信息 {x, y, z}
   */
  const getCurrentCameraPose = () => {
    if (!viewer.value || !viewer.value.cameraControls || !viewer.value.cameraControls.camera) {
      console.warn('[ROS3DViewer] 无法获取当前相机视角');
      return null;
    }

    const camera = viewer.value.cameraControls.camera;
    return {
      x: camera.position.x,
      y: camera.position.y,
      z: camera.position.z
    };
  };

  // 组件卸载时，确保所有资源都被清理
  onUnmounted(() => {
    console.log('[ROS3DViewer] 组件即将卸载，销毁所有资源');
    destroyViewer();
  });

  return {
    initializeViewer,
    destroyViewer,
    addGrid,
    getCurrentCameraPose,
    tfClient,
    viewer, // 将viewer引用也暴露出来
  };
}
