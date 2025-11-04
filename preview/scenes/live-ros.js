import * as THREE from 'three';
import {
  Viewer,
  Grid,
  Marker,
  MarkerArrayClient,
  LaserScan,
  PointCloud2,
  Path,
  Odometry,
  Pose,
  PoseArray,
} from '@/index';
import * as ROSLIB from 'roslib';

/**
 * @fileoverview ROS 实时调试场景
 * @description 提供UI以连接到ROS WebSocket服务器，并动态可视化支持的主题。
 */

// 支持可视化的主题类型
const SUPPORTED_TYPES = {
  'visualization_msgs/Marker': Marker,
  'visualization_msgs/MarkerArray': MarkerArrayClient,
  'sensor_msgs/LaserScan': LaserScan,
  'sensor_msgs/PointCloud2': PointCloud2,
  'nav_msgs/Path': Path,
  'nav_msgs/Odometry': Odometry,
  'geometry_msgs/PoseStamped': Pose,
  'geometry_msgs/PoseArray': PoseArray,
};

/**
 * 创建ROS实时调试场景
 * @param {HTMLElement} viewerContainer - 3D视图的div容器。
 * @param {HTMLElement} controlsContainer - 放置UI控件的div容器。
 * @returns {object} 包含 `dispose` 方法的对象，用于清理场景。
 */
export function createLiveRosScene(viewerContainer, controlsContainer) {
  // --- 默认配置 ---
  const defaultConfig = {
    websocketUrl: "ws://10.20.20.6:9090",
    tfFixFrame: "/camera_init",
    cameraConfig: {
      pose: { x: -27.95, y: 0.46, z: 5.474 },
      lookAt: { x: -0.084, y: -1.245, z: -1.659 },
    },
    defaultTopics: [
      { name: "/iris_0/utenet/scan_point_cloud", type: "sensor_msgs/PointCloud2" },
      { name: "/path", type: "nav_msgs/Path" },
    ],
  };

  let ros = null;
  let viewer = null;
  let activeClients = [];
  let availableTopics = [];

  // --- UI 创建 ---
  const panel = document.createElement('div');
  panel.className = 'rviz-panel';
  controlsContainer.append(panel);

  // 1. Connection Bar
  const connectionBar = document.createElement('div');
  connectionBar.className = 'panel-row connection-bar';
  const statusLight = document.createElement('span');
  statusLight.className = 'status-light';
  const urlInput = document.createElement('input');
  urlInput.type = 'text';
  urlInput.className = 'control-input';
  urlInput.placeholder = 'ws://localhost:9090';
  urlInput.value = defaultConfig.websocketUrl;
  const connectButton = document.createElement('button');
  connectButton.className = 'control-button';
  connectButton.innerText = '连接';
  connectionBar.append(statusLight, urlInput, connectButton);

  // 2. Global Options
  const globalOptions = document.createElement('div');
  globalOptions.className = 'panel-row global-options';
  const fixedFrameLabel = document.createElement('label');
  fixedFrameLabel.innerText = 'Fixed Frame:';
  const fixedFrameSelect = document.createElement('select');
  fixedFrameSelect.disabled = true;
  globalOptions.append(fixedFrameLabel, fixedFrameSelect);

  // 3. Displays (Active Topics)
  const displaysContainer = document.createElement('div');
  displaysContainer.className = 'displays-container';
  const displaysHeader = document.createElement('div');
  displaysHeader.className = 'displays-header';
  displaysHeader.innerText = 'Displays';
  const activeTopicsList = document.createElement('div');
  activeTopicsList.className = 'displays-list';
  displaysContainer.append(displaysHeader, activeTopicsList);

  // 4. Add Display Button
  const addDisplayBar = document.createElement('div');
  addDisplayBar.className = 'panel-row add-display-bar';
  const addDisplayButton = document.createElement('button');
  addDisplayButton.className = 'control-button';
  addDisplayButton.innerText = '添加';
  addDisplayButton.disabled = true;
  addDisplayBar.append(addDisplayButton);

  panel.append(connectionBar, globalOptions, displaysContainer, addDisplayBar);

  // --- ROS 连接逻辑 ---
  const connect = () => {
    if (ros && ros.isConnected) {
      disconnect();
      return;
    }
    ros = new ROSLIB.Ros({ url: urlInput.value });

    ros.on('connection', () => {
      updateStatus('connected', '已连接');
      updateTFFrames().then(() => {
        setupScene();
        updateTopicList().then(() => {
          defaultConfig.defaultTopics.forEach(topic => {
            if (availableTopics.some(t => t.name === topic.name)) {
              createSubscription(topic.name);
            }
          });
        });
      });
    });

    ros.on('error', () => updateStatus('error', '连接错误'));
    ros.on('close', () => {
      updateStatus('disconnected', '已断开');
      cleanupScene();
      ros = null;
    });

    updateStatus('connecting', '连接中...');
  };

  const disconnect = () => ros && ros.close();

  const updateStatus = (status, text) => {
    statusLight.className = `status-light ${status}`;
    urlInput.disabled = status === 'connected' || status === 'connecting';
    fixedFrameSelect.disabled = status !== 'connected';
    addDisplayButton.disabled = status !== 'connected';
    connectButton.innerText = status === 'connected' ? '断开' : '连接';
    connectButton.className = `control-button ${status === 'connected' ? 'disconnected' : ''}`;
    if (status !== 'connected') resetSubscriptionUI();
  };

  connectButton.addEventListener('click', connect);

  // --- 场景和可视化 ---
  const setupScene = () => {
    if (!fixedFrameSelect.value) return;
    viewer = new Viewer({
      divID: viewerContainer.id,
      width: viewerContainer.clientWidth,
      height: viewerContainer.clientHeight,
      antialias: true,
      ros: ros,
      fixedFrame: fixedFrameSelect.value,
      background: '#000000',
    });
    viewer.addObject(new Grid());
    const { pose, lookAt } = defaultConfig.cameraConfig;
    viewer.camera.position.set(pose.x, pose.y, pose.z);
    viewer.camera.lookAt(lookAt.x, lookAt.y, lookAt.z);
    viewer.camera.up.set(0, 0, 1);
  };

  const updateTFFrames = () => {
    return new Promise((resolve) => {
      new ROSLIB.Service({
        ros: ros,
        name: '/tf2_web_republisher/get_frames',
        serviceType: 'tf2_web_republisher/GetFrames',
        timeout: 2000,
      }).callService(new ROSLIB.ServiceRequest({}), (result) => {
        fixedFrameSelect.innerHTML = '';
        result.frames.forEach(frame => fixedFrameSelect.add(new Option(frame, frame)));
        const preferred = defaultConfig.tfFixFrame;
        if (result.frames.includes(preferred)) {
          fixedFrameSelect.value = preferred;
        } else {
          const fallback = ['map', 'odom', 'base_link', 'world'].find(f => result.frames.includes(f));
          fixedFrameSelect.value = fallback || result.frames[0];
        }
        resolve();
      }, () => {
        fixedFrameSelect.innerHTML = '';
        fixedFrameSelect.add(new Option(defaultConfig.tfFixFrame, defaultConfig.tfFixFrame));
        resolve();
      });
    });
  };

  const updateTopicList = () => {
    return new Promise(resolve => {
      ros.getTopics(topics => {
        availableTopics = topics.topics
          .map((name, i) => ({ name, type: topics.types[i] }))
          .filter(topic => SUPPORTED_TYPES[topic.type]);
        resolve();
      });
    });
  };

  const createSubscription = (topicName) => {
    if (!topicName || activeClients.some(c => c.topicName === topicName)) return;

    const topicInfo = availableTopics.find(t => t.name === topicName);
    if (!topicInfo) return;

    const ClientClass = SUPPORTED_TYPES[topicInfo.type];
    const newClient = new ClientClass({
      ros: ros,
      topic: topicName,
      tfClient: viewer.tfClient,
      rootObject: viewer.scene,
      max_pts: 1000000,
    });
    activeClients.push(newClient);
    updateActiveTopicsList();
  };

  const removeSubscription = (topicName) => {
    const index = activeClients.findIndex(c => c.topicName === topicName);
    if (index > -1) {
      activeClients[index].dispose();
      activeClients.splice(index, 1);
      updateActiveTopicsList();
    }
  };

  const cleanupAllVisualizations = () => {
    activeClients.forEach(client => client.dispose());
    activeClients = [];
    updateActiveTopicsList();
  };

  const cleanupScene = () => {
    cleanupAllVisualizations();
    if (viewer) {
      viewer.dispose();
      viewer = null;
    }
  };

  const resetSubscriptionUI = () => {
    availableTopics = [];
    activeClients = [];
    updateActiveTopicsList();
  };

  const handleFrameChange = () => {
    if (viewer && viewer.tfClient) {
      viewer.tfClient.fixedFrame = fixedFrameSelect.value;
    }
  };

  const updateActiveTopicsList = () => {
    activeTopicsList.innerHTML = '';
    activeClients.forEach(client => {
      const topicName = client.topicName;
      const topicType = availableTopics.find(t => t.name === topicName)?.type || 'N/A';

      const item = document.createElement('div');
      item.className = 'display-item is-collapsed'; // Start collapsed

      const header = document.createElement('div');
      header.className = 'display-item-header';
      header.innerHTML = `
        <span class="collapse-icon">▶</span>
        <input type="checkbox" checked>
        <span class="display-name">${topicName}</span>
        <button class="remove-btn">×</button>
      `;

      const content = document.createElement('div');
      content.className = 'display-item-content';
      content.innerHTML = `<div class="display-property"><span>Type</span><span>${topicType}</span></div>`;

      item.append(header, content);
      activeTopicsList.append(item);

      header.querySelector('.remove-btn').onclick = (e) => {
        e.stopPropagation();
        removeSubscription(topicName);
      };
      header.querySelector('input[type="checkbox"]').onchange = (e) => {
        client.rootObject.visible = e.target.checked;
      };
      header.onclick = () => {
        item.classList.toggle('is-collapsed');
        const icon = header.querySelector('.collapse-icon');
        icon.innerText = item.classList.contains('is-collapsed') ? '▶' : '▼';
      };
    });
  };

  const showAddDisplayModal = () => {
    const modal = document.createElement('div');
    modal.className = 'add-display-modal';

    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';
    
    const select = document.createElement('select');
    select.size = 10;
    availableTopics
      .filter(t => !activeClients.some(c => c.topicName === t.name))
      .forEach(t => select.add(new Option(`${t.name} (${t.type})`, t.name)));

    const addBtn = document.createElement('button');
    addBtn.className = 'control-button';
    addBtn.innerText = '添加选中项';
    addBtn.onclick = () => {
      if (select.value) createSubscription(select.value);
      modal.remove();
    };

    const closeBtn = document.createElement('button');
    closeBtn.className = 'control-button';
    closeBtn.innerText = '关闭';
    closeBtn.onclick = () => modal.remove();

    modalContent.append(select, addBtn, closeBtn);
    modal.append(modalContent);
    panel.append(modal);
  };

  fixedFrameSelect.addEventListener('change', handleFrameChange);
  addDisplayButton.addEventListener('click', showAddDisplayModal);

  // --- Init ---
  updateStatus('disconnected', '未连接');

  return {
    dispose: () => {
      disconnect();
      controlsContainer.innerHTML = '';
    },
  };
}