import multi from '@rollup/plugin-multi-entry';
const rollup = require('rollup');

// plugin that transpiles output into commonjs format
const commonjs = require('@rollup/plugin-commonjs');
// plugin that transpiles es6 to es5 for legacy platforms
const buble = require('@rollup/plugin-buble');
// plugin that shows output file info
const filesize = require('rollup-plugin-filesize');
/// plugin that resolves node module imports
const { nodeResolve } = require('@rollup/plugin-node-resolve');
// plugin that minifies and obfuscates code
const { terser } = require('rollup-plugin-terser');

const pkg = require('./package.json');

const orderedSrc = [
  'src/Ros3D.js',
  'src/navigation/OcTreeBaseNode.js',
  'src/navigation/OcTreeBase.js',
  'src/navigation/OcTree.js',
  'src/navigation/ColorOcTree.js',
  'src/depthcloud/DepthCloud.js',
  'src/interactivemarkers/InteractiveMarkerHandle.js',
  'src/interactivemarkers/InteractiveMarkerMenu.js',
  'src/interactivemarkers/InteractiveMarker.js',
  'src/interactivemarkers/InteractiveMarkerControl.js',
  'src/interactivemarkers/InteractiveMarkerClient.js',
  'src/markers/InstancedMarkerManager.js',
  'src/markers/Marker.js',
  'src/markers/MarkerArrayClient.js',
  'src/markers/MarkerClient.js',
  'src/models/Arrow.js',
  'src/models/Arrow2.js',
  'src/models/Axes.js',
  'src/models/Grid.js',
  'src/models/MeshLoader.js',
  'src/models/MeshResource.js',
  'src/models/TriangleList.js',
  'src/navigation/OccupancyGrid.js',
  'src/navigation/OccupancyGridClient.js',
  'src/navigation/OcTreeClient.js',
  'src/navigation/Odometry.js',
  'src/navigation/Path.js',
  'src/navigation/Point.js',
  'src/navigation/Polygon.js',
  'src/navigation/Pose.js',
  'src/navigation/PoseArray.js',
  'src/navigation/PoseWithCovariance.js',
  'src/sensors/LaserScan.js',
  'src/sensors/NavSatFix.js',
  'src/sensors/PointCloud2.js',
  'src/sensors/Points.js',
  'src/sensors/TFAxes.js',
  'src/urdf/Urdf.js',
  'src/urdf/UrdfClient.js',
  'src/util/MessageThrottleManager.js',
  'src/visualization/SceneNode.js',
  'src/visualization/interaction/OrbitControls.js',
  'src/visualization/Viewer.js',
  'src/visualization/interaction/Highlighter.js',
  'src/visualization/interaction/MouseHandler.js',
];

const input = orderedSrc;

const browserGlobals = {
  roslib: 'ROSLIB',
};

const moduleGlobals = {
  roslib: 'ROSLIB',
};

const outputFiles = {
  commonModule: pkg.main,
  esModule: pkg.module,
  browserGlobal: './build/ros3d.js',
  browserGlobalMinified: './build/ros3d.min.js',
};

export default [
  // build browser as IIFE module for script tag inclusion, unminified
  // Usage:
  // <script src="../build/ros3d.js"></script>
  {
    input,
    output: {
      name: 'ROS3D',
      file: outputFiles.browserGlobal,
      format: 'iife',
      globals: {
        ...browserGlobals,
      },
    },
    external: [
      ...Object.keys(browserGlobals),
    ],
    plugins: [
      multi(),
      nodeResolve({ browser: true }),
      commonjs(),
      filesize(),
    ],
  },
];