/**
 * @fileOverview
 * @author David V. Lu!! - davidvlu@gmail.com
 */

/**
 * A PoseArray client
 *
 * @constructor
 * @param options - object with following keys:
 *
 *  * ros - the ROSLIB.Ros connection handle
 *  * topic - the marker topic to listen to
 *  * tfClient - the TF client handle to use
 *  * rootObject (optional) - the root object to add this marker to
 *  * color (optional) - color for line (default: 0xcc00ff)
 *  * length (optional) - the length of the arrow (default: 1.0)
 */
ROS3D.PoseArray = function(options) {
  THREE.Object3D.call(this);
  this.options = options || {};
  this.ros = options.ros;
  this.topicName = options.topic || '/particlecloud';
  this.tfClient = options.tfClient;
  this.color = options.color || 0xcc00ff;
  this.length = options.length || 1.0;
  this.rootObject = options.rootObject || new THREE.Object3D();

  this.sn = null;

  this.rosTopic = undefined;
  this.processMessageBound = this.processMessage.bind(this);
  this.subscribe();
};
ROS3D.PoseArray.prototype.__proto__ = THREE.Object3D.prototype;


ROS3D.PoseArray.prototype.unsubscribe = function(){
  if(this.rosTopic){
    this.rosTopic.unsubscribe(this.processMessageBound);
  }
};

ROS3D.PoseArray.prototype.subscribe = function(){
  this.unsubscribe();

  // subscribe to the topic
  this.rosTopic = new ROSLIB.Topic({
     ros : this.ros,
     name : this.topicName,
     queue_length : 1,
     messageType : 'geometry_msgs/PoseArray'
 });
  this.rosTopic.subscribe(this.processMessageBound);
};

ROS3D.PoseArray.prototype.processMessage = function(message){
  if(this.sn!==null){
      this.sn.unsubscribeTf();
      this.rootObject.remove(this.sn);
  }

  var group = new THREE.Object3D();
  var line;

  for(var i=0;i<message.poses.length;i++){
      var lineGeometry = new THREE.BufferGeometry();

      var v3_pos = new THREE.Vector3( message.poses[i].position.x, message.poses[i].position.y,
                                  message.poses[i].position.z);

      var rot = new THREE.Quaternion(message.poses[i].orientation.x, message.poses[i].orientation.y,
                                     message.poses[i].orientation.z, message.poses[i].orientation.w);

      var tip_rel = new THREE.Vector3(this.length,0,0);
      var side1_rel = new THREE.Vector3(this.length*0.8, this.length*0.2, 0);
      var side2_rel = new THREE.Vector3(this.length*0.8, -this.length*0.2, 0);

      tip_rel.applyQuaternion(rot);
      side1_rel.applyQuaternion(rot);
      side2_rel.applyQuaternion(rot);

      var tip_abs = tip_rel.clone().add(v3_pos);
      var side1_abs = side1_rel.clone().add(v3_pos);
      var side2_abs = side2_rel.clone().add(v3_pos);

      // 5 vertices for the arrow shape: origin, tip, side1, side2, tip (to close the head)
      var positions = new Float32Array(5 * 3);

      // Vertex 1: origin (v3_pos)
      positions[0] = v3_pos.x;
      positions[1] = v3_pos.y;
      positions[2] = v3_pos.z;

      // Vertex 2: tip_abs
      positions[3] = tip_abs.x;
      positions[4] = tip_abs.y;
      positions[5] = tip_abs.z;

      // Vertex 3: side1_abs
      positions[6] = side1_abs.x;
      positions[7] = side1_abs.y;
      positions[8] = side1_abs.z;

      // Vertex 4: side2_abs
      positions[9] = side2_abs.x;
      positions[10] = side2_abs.y;
      positions[11] = side2_abs.z;

      // Vertex 5: tip_abs (to close the arrow head)
      positions[12] = tip_abs.x;
      positions[13] = tip_abs.y;
      positions[14] = tip_abs.z;

      lineGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

      // lineGeometry.computeLineDistances(); // Not needed/deprecated for BufferGeometry with Line
      var lineMaterial = new THREE.LineBasicMaterial( { color: this.color } );
      line = new THREE.Line( lineGeometry, lineMaterial );

      group.add(line);
  }

  this.sn = new ROS3D.SceneNode({
      frameID : message.header.frame_id,
      tfClient : this.tfClient,
      object : group
  });

  this.rootObject.add(this.sn);
};
