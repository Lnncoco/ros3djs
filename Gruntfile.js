module.exports = function(grunt) {

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    eslint: {
      lint: {
        options: {
          configFile: '.eslintrc',
        },
        src: [
          'Gruntfile.js',
          './src/*.js',
          './src/**/*.js',
          './tests/*.js'
        ],
      },
      fix: {
        options: {
          configFile: '<%= eslint.lint.options.configFile  %>',
          fix: true
        },
        src: '<%= eslint.lint.src  %>',
      }
    },
    concat: {
      dist: {
        src: [
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
          'src/visualization/SceneNode.js',
          'src/visualization/interaction/OrbitControls.js',
          'src/visualization/Viewer.js',
          'src/visualization/interaction/Highlighter.js',
          'src/visualization/interaction/MouseHandler.js',
        ],
        dest: 'build/ros3d.js',
      },
    },
    karma: {
      build: {
        configFile: './test/karma.conf.js',
        singleRun: true,
        browsers: process.env.CI ? ['FirefoxHeadless'] : ['Firefox'] // eslint-disable-line
      }
    },
    watch: {
      build_and_watch: {
        options: {
          interrupt: true
        },
        files: [
          'Gruntfile.js',
          '.eslintrc',
          './src/*.js',
          './src/**/*.js'
        ],
        tasks: ['build']
      }
    },
    clean: {
      options: {
        force: true
      },
      doc: ['./doc']
    },
    jsdoc: {
      doc: {
        src: [
          './src/*.js',
          './src/**/*.js'
        ],
        options: {
          destination: './doc',
          configure: 'jsdoc_conf.json'
        }
      }
    },
  });

  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-jsdoc');
  grunt.loadNpmTasks('grunt-karma');
  grunt.loadNpmTasks('gruntify-eslint');

  grunt.registerTask('build', ['eslint:lint', 'concat']);
  grunt.registerTask('build_and_watch', ['build', 'watch']);
  grunt.registerTask('doc', ['clean', 'jsdoc']);
  grunt.registerTask('lint', ['eslint:lint',]);
  grunt.registerTask('lint-fix', ['eslint:fix',]);
  grunt.registerTask('test', ['karma',]);
};