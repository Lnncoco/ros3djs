/**
 * ROS3D.js 基础功能测试
 * 验证核心API是否正常工作
 */

// 在浏览器环境中测试
if (typeof window !== 'undefined') {
  // 等待库加载完成
  window.addEventListener('load', function() {
    console.log('开始执行基础功能测试...');
    
    // 测试1: 检查全局ROS3D对象
    test('全局ROS3D对象存在', () => {
      return typeof window.ROS3D !== 'undefined';
    });
    
    // 测试2: 检查版本号
    test('版本号正确', () => {
      return window.ROS3D.REVISION === '1.2.0';
    });
    
    // 测试3: 检查常量
    test('常量定义正确', () => {
      return window.ROS3D.MARKER_CUBE === 1;
    });
    
    // 测试4: 检查工具函数
    test('工具函数存在', () => {
      return typeof window.ROS3D.makeColorMaterial === 'function';
    });
    
    // 测试5: 检查核心类
    test('核心类存在', () => {
      return typeof window.ROS3D.Viewer === 'function' && 
             typeof window.ROS3D.SceneNode === 'function' && 
             typeof window.ROS3D.Marker === 'function';
    });
    
    // 测试6: 检查模型类
    test('模型类存在', () => {
      return typeof window.ROS3D.Grid === 'function' && 
             typeof window.ROS3D.Arrow === 'function' && 
             typeof window.ROS3D.Axes === 'function';
    });
    
    // 测试7: 检查交互类
    test('交互类存在', () => {
      return typeof window.ROS3D.OrbitControls === 'function' && 
             typeof window.ROS3D.MouseHandler === 'function' && 
             typeof window.ROS3D.Highlighter === 'function';
    });
    
    console.log('基础功能测试完成！');

    // 测试函数定义
    function test(description, testFn) {
      try {
        const result = testFn();
        if (result) {
          console.log(`✅ ${description}`);
        } else {
          console.log(`❌ ${description}`);
        }
        return result;
      } catch (error) {
        console.log(`❌ ${description}: 错误 - ${error.message}`);
        return false;
      }
    }
  });
}