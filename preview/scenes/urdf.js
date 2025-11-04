import * as ROS3D from '@/index';
import * as THREE from 'three';

/**
 * @fileoverview URDF 模型测试场景
 * @description 展示 ROS3D.Urdf 加载和渲染 URDF 模型。
 */

/**
 * 从本地资源加载 URDF 文件内容
 * @param {string} modelName - 模型名称 (burger, waffle, waffle_pi)
 * @returns {Promise<string>} URDF 文件内容
 */
async function loadTurtleBotModel(modelName) {
  try {
    // 从本地资源加载实际的 TurtleBot3 URDF 模型
    const response = await fetch(`resource/turtlebot3-description/urdf/turtlebot3_${modelName}.urdf`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    let urdfContent = await response.text();

    // 修改URDF内容以适配浏览器环境，将package://引用改为相对路径
    urdfContent = urdfContent.replace(/package:\/\/turtlebot3_description/g, '.');
    
    return urdfContent;
  } catch (error) {
    console.error('Error loading TurtleBot3 URDF:', error);
    return null;
  }
}

/**
 * 创建 URDF 模型测试场景
 * @param {HTMLElement} viewerContainer - 用于渲染3D视图的div容器。
 * @returns {object} 包含 `dispose` 方法的对象，用于清理场景。
 */
export function createUrdfScene(viewerContainer) {
  const viewer = new ROS3D.Viewer({
    divID: viewerContainer.id,
    width: viewerContainer.clientWidth,
    height: viewerContainer.clientHeight,
    antialias: true,
    background: '#282c34',
  });

  // 添加坐标系和网格
  viewer.addObject(new ROS3D.Grid());
  viewer.addObject(new ROS3D.Axes());

  // 创建控制面板
  const controlsContainer = document.createElement('div');
  controlsContainer.style.position = 'absolute';
  controlsContainer.style.top = '10px';
  controlsContainer.style.right = '10px';
  controlsContainer.style.zIndex = '10';
  controlsContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
  controlsContainer.style.padding = '10px';
  controlsContainer.style.borderRadius = '5px';
  controlsContainer.style.color = 'white';
  controlsContainer.style.fontFamily = 'Arial, sans-serif';
  controlsContainer.innerHTML = `
    <h3 style="margin: 0 0 10px 0; font-size: 14px;">URDF 模型选择</h3>
    <button id="loadBurgerBtn" style="display: block; width: 100%; margin-bottom: 5px; padding: 5px;">TurtleBot3 Burger</button>
    <button id="loadWaffleBtn" style="display: block; width: 100%; margin-bottom: 5px; padding: 5px;">TurtleBot3 Waffle</button>
    <button id="loadWafflePiBtn" style="display: block; width: 100%; margin-bottom: 5px; padding: 5px;">TurtleBot3 Waffle Pi</button>
    <button id="clearSceneBtn" style="display: block; width: 100%; margin-bottom: 5px; padding: 5px;">清空场景</button>
  `;

  viewerContainer.appendChild(controlsContainer);

  // 创建状态显示元素
  const statusElement = document.createElement('div');
  statusElement.id = 'urdf-status';
  statusElement.style.position = 'absolute';
  statusElement.style.bottom = '10px';
  statusElement.style.left = '10px';
  statusElement.style.zIndex = '10';
  statusElement.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
  statusElement.style.padding = '5px';
  statusElement.style.borderRadius = '3px';
  statusElement.style.color = 'white';
  statusElement.style.fontFamily = 'Arial, sans-serif';
  statusElement.style.fontSize = '12px';
  statusElement.textContent = '当前模型: TurtleBot3 Burger';
  viewerContainer.appendChild(statusElement);

  // 初始化 URDF 客户端
  let urdfClient = null;

  // 加载并显示 URDF 模型的函数
  const loadUrdfModel = async (modelName) => {
    if (urdfClient) {
      urdfClient.dispose();  // 清理现有模型
    }
    
    statusElement.textContent = `正在加载 ${modelName} 模型...`;
    
    const urdfContent = await loadTurtleBotModel(modelName);
    if (urdfContent) {
      urdfClient = new ROS3D.UrdfClient({
        ros: null, // 在此示例中不连接ROS
        param: 'robot_description', // 通常从ROS参数服务器获取，这里模拟
        string: urdfContent, // 直接提供URDF XML字符串
        rootObject: viewer.scene,
        tfClient: null, // 在此示例中不使用TF
        path: 'resource/turtlebot3-description/', // 基础路径，用于加载外部网格文件
      });

      // 更新状态
      statusElement.textContent = `当前模型: ${modelName}`;
    } else {
      statusElement.textContent = `加载 ${modelName} 模型失败`;
    }
  };

  // 加载 TurtleBot3 Burger 模型
  document.getElementById('loadBurgerBtn').addEventListener('click', () => {
    loadUrdfModel('burger');
  });

  // 加载 TurtleBot3 Waffle 模型
  document.getElementById('loadWaffleBtn').addEventListener('click', () => {
    loadUrdfModel('waffle');
  });

  // 加载 TurtleBot3 Waffle Pi 模型
  document.getElementById('loadWafflePiBtn').addEventListener('click', () => {
    loadUrdfModel('waffle_pi');
  });

  // 清空场景
  document.getElementById('clearSceneBtn').addEventListener('click', () => {
    if (urdfClient) {
      urdfClient.dispose();
      urdfClient = null;
    }
    statusElement.textContent = '场景已清空';
  });

  // 首次加载 Burger 模型
  loadUrdfModel('burger');

  return {
    dispose: () => {
      if (urdfClient) {
        urdfClient.dispose();
        urdfClient = null;
      }
      viewer.dispose();
      // 清理 DOM 元素
      if (controlsContainer.parentNode) {
        controlsContainer.parentNode.removeChild(controlsContainer);
      }
      if (statusElement.parentNode) {
        statusElement.parentNode.removeChild(statusElement);
      }
    },
  };
}
