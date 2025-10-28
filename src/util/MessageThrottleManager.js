/**
 * @fileOverview
 * @author ROS3D development team
 * @description Manager for throttling ROS messages to improve performance
 */

/**
 * A manager for throttling ROS messages.
 *
 * @constructor
 */
ROS3D.MessageThrottleManager = function() {
  this.throttleConfigs = new Map();
  this.lastMessages = new Map();
  this.processingTimes = new Map();
  this.pendingMessages = new Map(); // For 'latest' strategy
  this.throttleTimeouts = new Map(); // Active timeouts
};

/**
 * Set throttle configuration for a topic.
 * @param topic - the topic name
 * @param config - configuration object
 */
ROS3D.MessageThrottleManager.prototype.setConfig = function(topic, config) {
  /*
   * config: {
   *   maxFrequency: 最大处理频率 (Hz)
   *   maxProcessingTime: 最大处理时间 (ms)
   *   queueSize: 队列大小
   *   strategy: 节流策略 ('latest', 'average', 'skip')
   * }
   */
  this.throttleConfigs.set(topic, config);
  this.lastMessages.set(topic, { message: null, timestamp: 0 });
  this.processingTimes.set(topic, []);
  this.pendingMessages.set(topic, null);
  this.throttleTimeouts.set(topic, null);
};

/**
 * Check if a message should be processed based on throttle configuration.
 * @param topic - the topic name
 * @param message - the message to check
 * @return true if the message should be processed, false otherwise
 */
ROS3D.MessageThrottleManager.prototype.shouldProcess = function(topic, message) {
  const config = this.throttleConfigs.get(topic);
  if (!config) {
    return true;
  }
  
  const now = performance.now();
  const lastMessage = this.lastMessages.get(topic);
  
  // 频率限制
  const minInterval = 1000 / config.maxFrequency;
  if (now - lastMessage.timestamp < minInterval) {
    // 应用节流策略
    switch (config.strategy) {
      case 'latest':
        // 保存最新消息，跳过当前处理
        this.pendingMessages.set(topic, message);
        if (!this.throttleTimeouts.get(topic)) {
          const timeoutId = setTimeout(() => {
            const latestMessage = this.pendingMessages.get(topic);
            if (latestMessage) {
              // Process the latest message somehow, but this is more complex
              // For now, we'll just store it for potential external processing
              this.pendingMessages.set(topic, null);
              this.throttleTimeouts.set(topic, null);
            }
          }, minInterval - (now - lastMessage.timestamp)); // Wait remaining time
          this.throttleTimeouts.set(topic, timeoutId);
        }
        return false;
      case 'skip':
        // 跳过当前消息
        return false;
      default:
        return false;
    }
  }
  
  return true;
};

/**
 * Process a message with the given processing function, respecting throttle settings.
 * @param topic - the topic name
 * @param message - the message to process
 * @param processFn - the processing function
 * @return result of processing function or null if throttled
 */
ROS3D.MessageThrottleManager.prototype.processMessage = function(topic, message, processFn) {
  if (this.shouldProcess(topic, message)) {
    const startTime = performance.now();
    const result = processFn(message);
    const processingTime = performance.now() - startTime;
    
    // 记录处理时间，用于动态调整
    const times = this.processingTimes.get(topic);
    times.push(processingTime);
    if (times.length > 10) {
      times.shift(); // 保留最近10次记录
    }
    
    const lastMessage = this.lastMessages.get(topic);
    lastMessage.timestamp = performance.now();
    
    return result;
  }
  
  return null;
};

// Global instance
ROS3D.messageThrottleManager = new ROS3D.MessageThrottleManager();