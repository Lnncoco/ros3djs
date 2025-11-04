/**
 * @fileOverview 定义交互式标记的常量
 * @author ROS3D Development Team
 */

export const INTERACTIVE_MARKER_NONE = 0;
export const INTERACTIVE_MARKER_MENU = 1;
export const INTERACTIVE_MARKER_BUTTON = 2;
export const INTERACTIVE_MARKER_MOVE_AXIS = 3;
export const INTERACTIVE_MARKER_MOVE_PLANE = 4;
export const INTERACTIVE_MARKER_ROTATE_AXIS = 5;
export const INTERACTIVE_MARKER_MOVE_ROTATE = 6;
export const INTERACTIVE_MARKER_MOVE_3D = 7;
export const INTERACTIVE_MARKER_ROTATE_3D = 8;
export const INTERACTIVE_MARKER_MOVE_ROTATE_3D = 9;

export const INTERACTIVE_MARKER_INHERIT = 0;
export const INTERACTIVE_MARKER_FIXED = 1;
export const INTERACTIVE_MARKER_VIEW_FACING = 2;

// Event types for InteractiveMarkerFeedback
export const FEEDBACK_KEEP_ALIVE = 0;
export const FEEDBACK_POSE_UPDATE = 1;
export const FEEDBACK_MENU_SELECT = 2;
export const FEEDBACK_BUTTON_CLICK = 3;
export const FEEDBACK_MOUSE_DOWN = 4;
export const FEEDBACK_MOUSE_UP = 5;