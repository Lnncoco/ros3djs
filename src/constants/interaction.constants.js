/**
 * @fileOverview 定义了与3D交互事件相关的常量。
 */

/**
 * @enum {number}
 * @readonly
 * @description 定义了鼠标事件在内部传播过程中的状态，用于控制事件冒泡行为。
 */
export const MouseEventStatus = {
  /**
   * 事件被目标对象成功接受并处理，停止进一步的冒泡。
   * @type {number}
   */
  ACCEPTED: 0,
  /**
   * 事件未被任何目标对象处理，冒泡失败。
   * @type {number}
   */
  FAILED: 1,
  /**
   * 事件被目标对象处理，但允许继续传播（例如，用于高亮等场景）。
   * @type {number}
   */
  CONTINUED: 2,
};
