/**
 * @fileOverview
 * @description 日志管理器，基于loglevel和loglevel-plugin-prefix实现，保持原始错误堆栈信息
 */

import log from "loglevel";
import prefix from "loglevel-plugin-prefix";

// 自定义格式化
prefix.reg(log);
prefix.apply(log, {
  template: "[%t] [%n]",
  timestampFormatter: (timestamp) => {
    return new Intl.DateTimeFormat("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      fractionalSecondDigits: 3,
      hour12: false,
    }).format(timestamp);
  },
});

/**
 * 日志管理器类
 * 提供模块化日志功能，支持不同级别的日志输出
 * 添加了'[模块名]'前缀的日志格式，同时保持原始堆栈信息
 */
class LoggerManager {
  /**
   * 构造函数
   */
  constructor() {
    // 根据环境设置默认日志级别
    // 开发环境: debug级别，生产环境: warn级别
    // Vite使用import.meta.env而不是process.env
    const isProduction =
      import.meta.env?.MODE === "production" || import.meta.env?.DEV === false;
    const defaultLevel = isProduction ? "warn" : "debug";
    log.setDefaultLevel(defaultLevel);
  }

  /**
   * 获取指定模块的日志实例
   * @param {string} moduleName - 模块名称
   * @param {string} level - 日志级别 (trace, debug, info, warn, error, silent)
   * @returns {Object} 包含各级别日志方法的对象
   */
  getLogger(moduleName, level) {
    const logger = log.getLogger(moduleName);
    if (level) {
      logger.setLevel(level);
    }
    return logger;
  }

  /**
   * 设置全局日志级别
   * @param {string} level - 日志级别 (trace, debug, info, warn, error, silent)
   */
  setGlobalLevel(level) {
    log.setLevel(level);
  }

  /**
   * 获取全局日志级别
   * @returns {number} 当前日志级别
   */
  getGlobalLevel() {
    return log.getLevel();
  }

  /**
   * 设置特定模块的日志级别
   * @param {string} moduleName - 模块名称
   * @param {string} level - 日志级别
   */
  setModuleLevel(moduleName, level) {
    const moduleLogger = log.getLogger(moduleName);
    moduleLogger.setLevel(level);
  }

  /**
   * 启用所有日志输出（开发调试用）
   */
  enableAllLogs() {
    log.setLevel("trace");
  }

  /**
   * 禁用所有日志输出（生产环境优化用）
   */
  disableAllLogs() {
    log.setLevel("silent");
  }
}

// 创建全局日志管理器实例
export const loggerManager = new LoggerManager();

// 默认导出常用的日志方法
export default loggerManager;

// 便捷方法：获取默认logger
export const getLogger = (moduleName, level) =>
  loggerManager.getLogger(moduleName, level);

// 便捷方法：设置全局日志级别
export const setGlobalLogLevel = (level) => loggerManager.setGlobalLevel(level);

// 便捷方法：启用所有日志
export const enableAllLogs = () => loggerManager.enableAllLogs();

// 便捷方法：禁用所有日志
export const disableAllLogs = () => loggerManager.disableAllLogs();
