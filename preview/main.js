import { scenes } from './scenes/index.js';

/**
 * @fileoverview 可视化测试平台主逻辑
 * @description
 *   - 动态生成场景列表
 *   - 处理场景切换
 *   - 管理当前场景的生命周期（创建和销毁）
 */

document.addEventListener('DOMContentLoaded', () => {
  const sceneList = document.getElementById('scene-list');
  const sceneTitle = document.getElementById('scene-title');
  const sceneControls = document.getElementById('scene-controls');
  const viewerContainer = document.getElementById('viewer');
  const welcomeOverlay = document.getElementById('welcome-overlay');

  let currentScene = null;
  let currentSceneName = null;

  // 动态创建场景列表
  Object.keys(scenes).forEach(name => {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = `#${name}`;
    a.textContent = name;
    a.dataset.sceneName = name;
    li.appendChild(a);
    sceneList.appendChild(li);
  });

  // 场景切换逻辑
  const switchScene = (name) => {
    if (name === currentSceneName) {
      return; // 不切换到相同的场景
    }

    // 1. 清理上一个场景
    if (currentScene && typeof currentScene.dispose === 'function') {
      currentScene.dispose();
    }
    viewerContainer.innerHTML = ''; // 清空容器
    sceneControls.innerHTML = ''; // 清空控件

    // 2. 隐藏欢迎界面
    welcomeOverlay.style.display = 'none';

    // 3. 创建新场景
    const createSceneFn = scenes[name];
    if (typeof createSceneFn === 'function') {
      currentScene = createSceneFn(viewerContainer, sceneControls);
      currentSceneName = name;

      // 更新UI
      sceneTitle.textContent = name;
      document.querySelectorAll('#scene-list a').forEach(el => {
        el.classList.toggle('active', el.dataset.sceneName === name);
      });
    } else {
      console.error(`场景 '${name}' 不存在或无效。`);
    }
  };

  // 事件委托处理导航点击
  sceneList.addEventListener('click', (e) => {
    if (e.target.tagName === 'A') {
      e.preventDefault();
      const sceneName = e.target.dataset.sceneName;
      // Update URL hash without triggering hashchange event initially
      history.pushState(null, null, `#${sceneName}`);
      switchScene(sceneName);
    }
  });

  // 根据URL哈希值加载初始场景
  const loadInitialScene = () => {
    const hash = window.location.hash.substring(1);
    if (scenes[hash]) {
      switchScene(hash);
    } else {
        // 如果没有哈希或者哈希无效，显示欢迎界面
        welcomeOverlay.style.display = 'flex';
    }
  };

  // 监听浏览器前进/后退
  window.addEventListener('popstate', loadInitialScene);

  // 初始加载
  loadInitialScene();
});