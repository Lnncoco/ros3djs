## 待办事项

- [ ] 重构 `src/interactivemarkers/InteractiveMarkerControl.js` 中的 `const that = this;` 模式，改为使用箭头函数或 `.bind(this)` 来处理 `this` 上下文，以符合现代 JavaScript 编码风格。
- [ ] 统一“客户端”设计模式 (长远考虑)
       * 现状：项目中大部分组件都遵循一种清晰的“客户端-可视化对象”模式，例如 MarkerClient 负责订阅和管理，Marker 负责纯粹的可视化。但也有少数类，如
         Path、Pose、Odometry，将订阅和可视化逻辑混合在同一个类中。
       * 分析：虽然现有实现功能正确，但从架构一致性的角度看，将数据获取（ROS订阅）和数据表现（THREE.js可视化）分离是一种更优的设计。
       * 建议：作为一项未来的架构统一性工作，可以考虑将 Path、Pose 等类也重构为 PathClient + Path
         的模式。这并非当前必须的修改，但可以在未来的迭代中考虑，以使整个库的设计模式达到完全统一。