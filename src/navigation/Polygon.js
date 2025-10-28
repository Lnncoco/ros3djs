/**
 * @fileOverview
 * @author David V. Lu!! - davidvlu@gmail.com
 */

/**
 * A PolygonStamped client that listens to a given topic and displays the polygon
 *
 * @constructor
 * @param options - object with following keys:
 *
 *  * ros - the ROSLIB.Ros connection handle
 *  * topic - the marker topic to listen to
 *  * tfClient - the TF client handle to use
 *  * rootObject (optional) - the root object to add this marker to
 *  * color (optional) - color for line (default: 0xcc00ff)
 */
ROS3D.Polygon = function(options) {
  THREE.Object3D.call(this);
  options = options || {};
  this.ros = options.ros;
  this.topicName = options.topic || '/path';
  this.tfClient = options.tfClient;
  this.color = options.color || 0xcc00ff;
  this.rootObject = options.rootObject || new THREE.Object3D();

  this.sn = null;
  this.line = null;

  this.rosTopic = undefined;
  this.processMessageBound = this.processMessage.bind(this);
  this.subscribe();
};
ROS3D.Polygon.prototype.__proto__ = THREE.Object3D.prototype;


ROS3D.Polygon.prototype.unsubscribe = function(){
  if(this.rosTopic){
    this.rosTopic.unsubscribe(this.processMessageBound);
  }
};

ROS3D.Polygon.prototype.subscribe = function(){
  this.unsubscribe();

  // subscribe to the topic
  this.rosTopic = new ROSLIB.Topic({
      ros : this.ros,
      name : this.topicName,
      queue_length : 1,
      messageType : 'geometry_msgs/PolygonStamped'
  });
  this.rosTopic.subscribe(this.processMessageBound);
};

ROS3D.Polygon.prototype.processMessage = function(message){
  if(this.sn!==null){
      this.sn.unsubscribeTf();
      this.rootObject.remove(this.sn);
  }

  var lineGeometry = new THREE.BufferGeometry();
  // Polygon needs to close the loop, so message.polygon.points.length + 1
  var positions = new Float32Array((message.polygon.points.length + 1) * 3);
  for(var i=0; i<message.polygon.points.length;i++){
      positions[i * 3] = message.polygon.points[i].x;
      positions[i * 3 + 1] = message.polygon.points[i].y;
      positions[i * 3 + 2] = message.polygon.points[i].z;
  }
  // Close the loop
  positions[message.polygon.points.length * 3] = message.polygon.points[0].x;
  positions[message.polygon.points.length * 3 + 1] = message.polygon.points[0].y;
  positions[message.polygon.points.length * 3 + 2] = message.polygon.points[0].z;

  lineGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  // lineGeometry.computeLineDistances(); // Not needed/deprecated for BufferGeometry with Line
  var lineMaterial = new THREE.LineBasicMaterial( { color: this.color } );
  var line = new THREE.Line( lineGeometry, lineMaterial );

  this.sn = new ROS3D.SceneNode({
      frameID : message.header.frame_id,
      tfClient : this.tfClient,
      object : line
  });

  this.rootObject.add(this.sn);
};
