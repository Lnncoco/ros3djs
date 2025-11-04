# 项目概览

ROS3D.js 是一个现代 JavaScript 库，用于在 Web 浏览器中对 ROS (Robot Operating System) 数据进行 3D 可视化。它是流行的 ros3djs 库的当前迭代，使用现代 ES6 模块和改进的架构进行了重建。

**主要特性：**

- 实时 3D 可视化 ROS 消息
- 机器人 URDF 模型渲染
- 传感器数据可视化 (LaserScan, PointCloud2 等)
- 交互式标记和控件
- 通过 Three.js 实现高性能 WebGL 渲染
- 模块化架构，支持 ES6 导入/导出

**主要技术：**

- Three.js (3D 渲染引擎)
- ROSLIB.js (ROS 通信)
- EventEmmitter3 (事件处理)
- Vite (构建工具)
- Vitest (测试框架)

# 架构

项目采用模块化架构，职责分离清晰：

- `src/visualization/` - 核心查看器和场景管理
- `src/models/` - 基本 3D 模型 (Grid, Axes, Arrow 等)
- `src/markers/` - ROS 标记可视化
- `src/interaction/` - 鼠标和相机控制
- `src/sensors/` - 传感器数据可视化
- `src/urdf/` - 机器人模型 (URDF) 处理
- `src/navigation/` - 导航数据可视化
- `src/utils/` - 实用函数和日志记录

# 构建与运行

项目使用 `pnpm` 进行包管理。如果需要，您也可以使用 `npm` 或 `yarn`。

### 开发命令

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev

# 构建生产版本
pnpm build

# 预览构建的应用
pnpm preview

# 运行测试
pnpm test

# 以 UI 模式运行测试
pnpm test:ui

# 生成文档
pnpm docs
```

### 构建配置

项目使用 Vite 进行构建，支持多种模块格式：

- ES 模块 (`./dist/ros3d.es.js`)
- CommonJS (`./dist/ros3d.cjs.js`)
- IIFE (立即执行函数表达式) 用于浏览器使用 (`./dist/ros3d.iife.js`)

# 开发规范

### 编码风格

- 使用 ES6 模块进行导入/导出
- 现代 JavaScript (ES2015+)
- 所有公共 API 和复杂函数都应有 JSDoc 注释
- 可配置日志级别的统一日志记录
- 模块化组件设计
- 在适用情况下，使用扩展 THREE.js 对象的类架构
- 统一的错误处理和资源释放模式

### 文件组织

- `/src/` - 按功能组织的主源代码

  - `/core/` - 核心功能 (目前未使用但保留)
  - `/constants/` - 常量定义和枚举
  - `/interaction/` - 鼠标、相机控制和用户交互
  - `/markers/` - ROS 标记可视化组件
  - `/models/` - 基本 3D 模型类
  - `/navigation/` - 导航特定可视化
  - `/sensors/` - 传感器数据可视化 (LaserScan, PointCloud2 等)
  - `/urdf/` - 机器人模型 (URDF) 处理
  - `/visualization/` - 核心可视化和查看器组件
  - `/utils/` - 实用函数和全局辅助函数
  - `/client/` - ROS 客户端通信
  - `/depthcloud/` - 深度云可视化
  - `/interactivemarkers/` - 交互式标记组件
  - `index.js` - 导出所有公共 API 的主入口点

- `/test/` - 单元和集成测试
- `/examples/` - 示例实现
- `/preview/` - 开发测试页面
- `/docs/` - 文档文件
- `/public/` - 静态资源

### 命名约定

- **类**: PascalCase (例如 `Viewer`, `Marker`, `OrbitControls`)
- **常量**: UPPERCASE_SNAKE_CASE (例如 `MARKER_CUBE`, `EPS`, `PI`)
- **函数**: camelCase (例如 `createSceneNode`, `makeColorMaterial`)
- **变量**: camelCase (例如 `cameraControls`, `selectableObjects`)
- **文件**: 类文件使用 PascalCase (例如 `Viewer.js`, `Marker.js`)
- **目录**: 小写，如果需要可使用连字符 (例如 `interactivemarkers`, `depthcloud`)

### 导入/导出风格

- 使用 ES6 导入，并使用 `vite.config.js` 中定义的别名：
  - `@` 代表 `./src`
  - `@constants` 代表 `./src/constants`
  - `@utils` 代表 `./src/utils`
  - `@models` 代表 `./src/models`
  - `@markers` 代表 `./src/markers`
  - `@visualization` 代表 `./src/visualization`
  - `@interaction` 代表 `./src/interaction`
- 单个组件和函数使用命名导出
- 主库入口点使用默认导出

### 代码结构和最佳实践

- **JSDoc 文档**: 所有公共方法、类和复杂函数必须有 JSDoc 注释
- **类结构**: 构建可视化组件时，类应扩展适当的 THREE.js 对象
- **资源管理**: 实现 `dispose()` 方法以正确释放 Three.js 资源 (几何体、材质)
- **属性访问**: 在构造函数中对选项使用一致的对象解构
- **日志记录**: 使用模块特定的日志系统，并设置适当的日志级别 (debug, info, warn, error)
- **错误处理**: 在需要的地方使用适当的 try-catch 块，并进行适当的错误传播
- **内存管理**: 正确清理 Three.js 对象、事件监听器和动画帧
- **条件逻辑**: 尽可能使用早期返回以减少嵌套
- **常量使用**: 为魔术数字和固定值定义并使用常量
- **方法组织**: 公共方法在前，然后是私有/受保护方法
- **构造函数模式**: 构造函数中使用选项对象模式以增加灵活性
- **代码注释**: 对复杂逻辑进行清晰注释，但尽可能优先使用自文档化代码

### 测试实践

- 使用 Vitest 进行单元测试
- 测试组织遵循 AAA 模式 (Arrange, Act, Assert)
- 测试正向和负向用例
- 适当模拟外部依赖
- 保持公共 API 的高测试覆盖率
- 使用清晰描述测试内容的测试名称

### 性能考量

- 实现适当的资源释放以防止内存泄漏
- 对重复对象使用高效的 Three.js 模式，如 InstancedMesh
- 优化渲染循环，避免不必要的更新
- 使用适当的 Three.js 材质和几何体以提高性能

### 国际化

- 支持多语言注释和文档 (本项目中为中文和英文)
- 整个代码库中术语一致

### 测试

- Vitest 用于单元测试
- JSDOM 用于浏览器环境模拟
- 核心功能的全面测试覆盖
- 启用类型检查支持

### 日志

- 模块化日志系统，可配置级别
- 不同模块的命名日志实例
- Debug, info, warn 和 error 级别
- 全局日志级别控制

### 文件结构

项目组织成清晰的模块：

- 每个模块都有自己的目录，包含相关功能
- 常量单独存放，便于引用
- 实用函数在模块间共享
- 交互逻辑与可视化逻辑分离

# API 概览

该库提供了几个主要的类和函数：

- `Viewer` - 带有相机控制的主 3D 查看器组件
- `SceneNode` - 场景中对象的基础类
- `Marker` - ROS 标记可视化
- `Grid`, `Axes`, `Arrow` - 基本 3D 模型
- `LaserScan`, `PointCloud2` - 传感器数据可视化
- `InteractiveMarker` - 交互式标记控制
- `Urdf` - 机器人模型可视化

# 测试

项目包含全面的测试：

- 核心功能的单元测试
- API 验证测试
- 组件特定测试
- 模拟 ROS 连接，无需实时 ROS 系统即可测试

运行测试：

```bash
pnpm test        # 运行一次测试
pnpm test:watch  # 以监视模式运行测试
pnpm test:verify # 构建并运行测试
```

# 可视化验证

`/preview` 目录中提供了用于开发测试的演示页面。

# 遗留版本

项目在 `/ros3djs-legacy` 目录中包含一个遗留版本，显示了原始实现。此版本已弃用，并将在未来版本中移除。当前版本已完全重构，使用现代 JavaScript 模块和工具。

# 项目状态

这是一个活跃的项目，具有：

- 现代构建工具 (Vite)
- 基于模块的架构
- 全面测试
- 类型检查支持
- 积极的开发和维护

# 贡献

项目遵循标准的 JavaScript 开发实践：

- 使用 pnpm 进行依赖管理
- 遵循现有代码风格
- 为新功能编写测试
- 使用 JSDoc 为公共 API 编写文档
- 为新功能采用模块化架构方法

# 开发指南

### 语言要求

- 所有代码响应、文档和注释必须用中文编写
- 这适用于本项目中的所有开发活动

### 开发记忆和上下文

- 根据经验评估出重要开发细节、决策、或者其他重要信息记录在 `.cache/memory.md` 中
- 开发人员在开始开发工作之前应阅读 `.cache/memory.md`
- 利用积累的知识为未来的开发决策提供信息
- 如果文件过长，请考虑按类别将其拆分为多个文件 (例如，`.cache/memory_components.md`, `.cache/memory_architecture.md` 等)
- 可以根据实际情况建立适合的记忆文件，例如 `.cache/todo.md` 作为当前大任务的规划记录，给用户确认编辑，每次处理完就更新。你可以根据适合的场景自己创建适合的文件。
- .cache 文件就是你的临时数据库，方便在各个会话或者大修改中维持上下文统一，编写出合理规范、高质量、风格统一的代码。
