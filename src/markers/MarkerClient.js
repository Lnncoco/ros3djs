/**
 * @fileOverview
 * @author Russell Toris - rctoris@wpi.edu
 */

/**
 * A marker client that listens to a given marker topic.
 *
 * Emits the following events:
 *
 *  * 'change' - there was an update or change in the marker
 *
 * @constructor
 * @param options - object with following keys:
 *
 *   * ros - the ROSLIB.Ros connection handle
 *   * topic - the marker topic to listen to
 *   * tfClient - the TF client handle to use
 *   * rootObject (optional) - the root object to add this marker to
 *   * path (optional) - the base path to any meshes that will be loaded
 *   * lifetime - the lifetime of marker
 */
ROS3D.MarkerClient = function(options) {
  options = options || {};
  this.ros = options.ros;
  this.topicName = options.topic;
  this.tfClient = options.tfClient;
  this.rootObject = options.rootObject || new THREE.Object3D();
  this.path = options.path || '/';
  this.lifetime = options.lifetime || 0;

  // Markers that are displayed (Map ns+id--Marker)
  this.markers = {};
  this.rosTopic = undefined;
  this.updatedTime = {};

  this.processMessageBound = this.processMessage.bind(this);
  this.subscribe();
  
  // Start periodic check for expired markers if lifetime is set
  if (this.lifetime > 0) {
    this.checkExpiredMarkers();
  }
};
ROS3D.MarkerClient.prototype.__proto__ = EventEmitter3.prototype;

ROS3D.MarkerClient.prototype.unsubscribe = function(){
  if(this.rosTopic){
    this.rosTopic.unsubscribe(this.processMessageBound);
  }
};

ROS3D.MarkerClient.prototype.checkTime = function(name){
    var curTime = new Date().getTime();
    if (curTime - this.updatedTime[name] > this.lifetime) {
        this.removeMarker(name);
        this.emit('change');
    } else {
        var that = this;
        setTimeout(function() {that.checkTime(name);},
                   100);
    }
};

ROS3D.MarkerClient.prototype.subscribe = function(){
  this.unsubscribe();

  // subscribe to the topic
  this.rosTopic = new ROSLIB.Topic({
    ros : this.ros,
    name : this.topicName,
    messageType : 'visualization_msgs/Marker',
    compression : 'png'
  });
  this.rosTopic.subscribe(this.processMessageBound);
};

ROS3D.MarkerClient.prototype.processMessage = function(message){
  // Implement message throttling for marker updates
  const topic = this.topicName;
  
  // Check if we have throttle config for this topic
  if (ROS3D.messageThrottleManager.throttleConfigs.has(topic)) {
    // Use throttle manager to determine if we should process
    if (!ROS3D.messageThrottleManager.shouldProcess(topic, message)) {
      return; // Skip processing this message
    }
  }
  
  // remove old marker from Three.Object3D children buffer
  var key = message.ns + message.id;
  var oldNode = this.markers[key];
  this.updatedTime[key] = new Date().getTime();
  
  if (message.action === 0) {  // "ADD" or "MODIFY"
    if (oldNode) {
      // Try to update existing marker instead of recreating (performance optimization)
      var existingMarker = oldNode.children[0];
      if (existingMarker && existingMarker.update) {
        var canUpdate = existingMarker.update(message);
        if (canUpdate) {
          // Update successful, just change the pose
          existingMarker.setPose(message.pose);
          if (this.lifetime) {
            this.checkTime(message.ns + message.id);
          }
          this.emit('change');
          return;
        } else {
          // Update failed, need to recreate
          this.removeMarker(key);
        }
      } else {
        // No update method, recreate
        this.removeMarker(key);
      }
    } else if (this.lifetime) {
      this.checkTime(message.ns + message.id);
    }

    // Create new marker
    var newMarker = new ROS3D.Marker({
      message : message,
      path : this.path,
    });

    this.markers[key] = new ROS3D.SceneNode({
      frameID : message.header.frame_id,
      tfClient : this.tfClient,
      object : newMarker
    });
    this.rootObject.add(this.markers[key]);
  } else if (message.action === 2) {  // "DELETE"
    this.removeMarker(key);
  } else if (message.action === 3) {  // "DELETE ALL"
    this.removeAllMarkers();
  }

  this.emit('change');
  
  // Update last processed time for throttling
  if (ROS3D.messageThrottleManager.throttleConfigs.has(topic)) {
    const lastMessage = ROS3D.messageThrottleManager.lastMessages.get(topic);
    lastMessage.timestamp = performance.now();
  }
};

ROS3D.MarkerClient.prototype.removeMarker = function(key) {
  var oldNode = this.markers[key];
  if(!oldNode) {
    return;
  }
  oldNode.unsubscribeTf();
  this.rootObject.remove(oldNode);
  
  // Properly dispose of geometry and materials in the scene graph
  oldNode.traverse(function(object) {
    if (object.geometry) {
      object.geometry.dispose();
    }
    if (object.material) {
      if (Array.isArray(object.material)) {
        object.material.forEach(function(material) {
          if (material && typeof material.dispose === 'function') {
            material.dispose();
          }
        });
      } else {
        if (object.material && typeof object.material.dispose === 'function') {
          object.material.dispose();
        }
      }
    }
  });
  
  delete(this.markers[key]);
  delete(this.updatedTime[key]);
};

// Add method to remove all markers at once
ROS3D.MarkerClient.prototype.removeAllMarkers = function() {
  for (var key in this.markers) {
    this.removeMarker(key);
  }
  this.markers = {};
  this.updatedTime = {};
};

// Add method to check and remove expired markers periodically
ROS3D.MarkerClient.prototype.checkExpiredMarkers = function() {
  if (this.lifetime <= 0) {
    return;
  }
  
  var curTime = new Date().getTime();
  var expiredKeys = [];
  
  for (var key in this.updatedTime) {
    if (curTime - this.updatedTime[key] > this.lifetime) {
      expiredKeys.push(key);
    }
  }
  
  for (var i = 0; i < expiredKeys.length; i++) {
    this.removeMarker(expiredKeys[i]);
  }
  
  // Schedule next check
  var that = this;
  setTimeout(function() { that.checkExpiredMarkers(); }, 1000); // Check every second
};
