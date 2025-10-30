var assert = chai.assert;

describe('Grid', function() {
    var grid = new ROS3D.Grid();
    var lineSegments = grid.children[0];

    it('should default to 1 child', function() {
      assert.equal(grid.children.length, 1);
    });

    it('the child\'s color is THREE.Color(\'#cccccc\') by default', function() {
      var sample = new THREE.Color('#cccccc').getHex();
      assert.equal(lineSegments.material.color.getHex(), sample);
    });

    it('the child\'s linewidth is 1 by default', function() {
      assert.equal(lineSegments.material.linewidth, 1);
    });

});
