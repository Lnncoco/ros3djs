/**
 * @fileOverview
 * @description 日志系统测试
 */

import {
  getLogger,
  setGlobalLogLevel,
  enableAllLogs,
  disableAllLogs,
} from "../src/utils/Logger.js";

// 测试日志功能
function testLogging() {
  console.log("开始测试日志系统...");

  // 设置全局日志级别
  setGlobalLogLevel("debug");
  console.log("已设置全局日志级别为debug");

  // 获取不同模块的日志实例
  const viewerLogger = getLogger("Viewer");
  const sensorLogger = getLogger("Sensor");
  const navLogger = getLogger("Navigation");

  // 测试不同级别的日志输出
  viewerLogger.trace("Trace级别日志");
  viewerLogger.debug("Debug级别日志");
  viewerLogger.info("Info级别日志");
  viewerLogger.warn("Warn级别日志");
  viewerLogger.error("Error级别日志");

  sensorLogger.debug("传感器模块调试信息");
  sensorLogger.info("传感器数据处理完成");
  sensorLogger.warn("传感器数据可能存在异常");

  navLogger.error("导航模块错误");

  // 测试启用所有日志
  console.log("启用所有日志...");
  enableAllLogs();

  viewerLogger.trace("启用所有日志后的Trace信息");

  // 测试禁用所有日志
  console.log("禁用所有日志...");
  disableAllLogs();

  viewerLogger.debug("禁用所有日志后的Debug信息（不应显示）");

  // 重新启用日志进行最后测试
  setGlobalLogLevel("debug");
  viewerLogger.info("日志系统测试完成");
}

// 运行测试
testLogging();
