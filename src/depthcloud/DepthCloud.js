/**
 * @fileOverview DepthCloud - 从深度/颜色视频流创建三维点云。
 */

import * as THREE from "three";

/**
 * @class DepthCloud
 * @description 一个深度云对象，用于从包含深度和颜色信息的视频流创建点云。
 * @extends THREE.Object3D
 */
export class DepthCloud extends THREE.Object3D {
  static #vertexShader = `
    uniform sampler2D map;
    uniform float width;
    uniform float height;
    uniform float nearClipping, farClipping;
    uniform float pointSize;
    uniform float zOffset;
    uniform float focallength;
    uniform float maxDepthPerTile;
    uniform float resolutionFactor;

    varying vec2 vUvP;
    varying vec2 colorP;
    varying float depthVariance;
    varying float maskVal;

    float sampleDepth(vec2 pos) {
      vec2 vUv = vec2(pos.x / (width * 2.0), pos.y / (height * 2.0) + 0.5);
      vec2 vUv2 = vec2(pos.x / (width * 2.0) + 0.5, pos.y / (height * 2.0) + 0.5);
      vec4 depthColor = texture2D(map, vUv);
      float depth = (depthColor.r + depthColor.g + depthColor.b) / 3.0;
      if (depth > 0.99) {
        vec4 depthColor2 = texture2D(map, vUv2);
        float depth2 = (depthColor2.r + depthColor2.g + depthColor2.b) / 3.0;
        depth = 0.99 + depth2;
      }
      return depth;
    }

    float median(float a, float b, float c) {
      return max(min(a, b), min(max(a, b), c));
    }

    float variance(float d1, float d2, float d3, float d4, float d5, float d6, float d7, float d8, float d9) {
      float mean = (d1 + d2 + d3 + d4 + d5 + d6 + d7 + d8 + d9) / 9.0;
      float t1 = (d1 - mean); float t2 = (d2 - mean); float t3 = (d3 - mean);
      float t4 = (d4 - mean); float t5 = (d5 - mean); float t6 = (d6 - mean);
      float t7 = (d7 - mean); float t8 = (d8 - mean); float t9 = (d9 - mean);
      return (t1*t1 + t2*t2 + t3*t3 + t4*t4 + t5*t5 + t6*t6 + t7*t7 + t8*t8 + t9*t9) / 9.0;
    }

    vec2 decodeDepth(vec2 pos) {
      float d1 = sampleDepth(pos + vec2(-1.0, -1.0));
      float d2 = sampleDepth(pos + vec2(0.0, -1.0));
      float d3 = sampleDepth(pos + vec2(1.0, -1.0));
      float d4 = sampleDepth(pos + vec2(-1.0, 0.0));
      float d5 = sampleDepth(pos + vec2(0.0, 0.0));
      float d6 = sampleDepth(pos + vec2(1.0, 0.0));
      float d7 = sampleDepth(pos + vec2(-1.0, 1.0));
      float d8 = sampleDepth(pos + vec2(0.0, 1.0));
      float d9 = sampleDepth(pos + vec2(1.0, 1.0));

      float median1 = median(d1, d2, d3);
      float median2 = median(d4, d5, d6);
      float median3 = median(d7, d8, d9);

      vec2 ret;
      ret.x = median(median1, median2, median3);
      ret.y = variance(d1, d2, d3, d4, d5, d6, d7, d8, d9);
      return ret;
    }

    void main() {
      vUvP = vec2(position.x / (width * 2.0), position.y / (height * 2.0) + 0.5);
      colorP = vec2(position.x / (width * 2.0) + 0.5, position.y / (height * 2.0));

      vec4 pos = vec4(0.0, 0.0, 0.0, 0.0);
      depthVariance = 0.0;

      if (vUvP.x >= 0.0 && vUvP.x <= 0.5 && vUvP.y >= 0.5 && vUvP.y <= 1.0) {
        vec2 smp = decodeDepth(position.xy);
        float depth = smp.x;
        depthVariance = smp.y;

        float z = -depth;

        pos = vec4(
          (position.x / width - 0.5) * z * 0.5 * maxDepthPerTile * resolutionFactor * (1000.0 / focallength) * -1.0,
          (position.y / height - 0.5) * z * 0.5 * maxDepthPerTile * resolutionFactor * (1000.0 / focallength),
          (-z + zOffset / 1000.0) * maxDepthPerTile,
          1.0
        );

        vec2 maskP = vec2(position.x / (width * 2.0), position.y / (height * 2.0));
        vec4 maskColor = texture2D(map, maskP);
        maskVal = (maskColor.r + maskColor.g + maskColor.b) / 3.0;
      }

      gl_PointSize = pointSize;
      gl_Position = projectionMatrix * modelViewMatrix * pos;
    }
  `;

  static #fragmentShader = `
    uniform sampler2D map;
    uniform float varianceThreshold;
    uniform float whiteness;

    varying vec2 vUvP;
    varying vec2 colorP;
    varying float depthVariance;
    varying float maskVal;

    void main() {
      if (depthVariance > varianceThreshold || maskVal > 0.5 || vUvP.x < 0.0 || vUvP.x > 0.5 || vUvP.y < 0.5 || vUvP.y > 1.0) {
        discard;
      } else {
        vec4 color = texture2D(map, colorP);
        float fader = whiteness / 100.0;
        color.r = color.r * (1.0 - fader) + fader;
        color.g = color.g * (1.0 - fader) + fader;
        color.b = color.b * (1.0 - fader) + fader;
        color.a = 1.0;
        gl_FragColor = color;
      }
    }
  `;

  /**
   * @param {object} options - 配置选项。
   * @param {string} options.url - 视频流的URL。
   * @param {string} [options.streamType='vp8'] - 流类型: 'mjpeg' 或 'vp8'。
   * @param {number} [options.f=526] - 相机焦距。
   * @param {number} [options.maxDepthPerTile=1.0] - 控制深度范围的因子。
   * @param {number} [options.pointSize=3] - 点云的点大小（像素）。
   * @param {number} [options.width=1024] - 视频流宽度。
   * @param {number} [options.height=1024] - 视频流高度。
   * @param {number} [options.whiteness=0] - 将RGB值混合为白色的程度 (0-100)。
   * @param {number} [options.varianceThreshold=0.000016667] - 用于去除压缩伪影的方差阈值。
   */
  constructor(options = {}) {
    super();
    Object.assign(this, {
      streamType: "vp8",
      f: 526,
      maxDepthPerTile: 1.0,
      pointSize: 3,
      width: 1024,
      height: 1024,
      whiteness: 0,
      varianceThreshold: 0.000016667,
      ...options,
    });

    this.resolutionFactor = Math.max(this.width, this.height) / 1024;
    this.isMjpeg = this.streamType.toLowerCase() === "mjpeg";

    this.video = document.createElement(this.isMjpeg ? "img" : "video");
    this.video.crossOrigin = "Anonymous";
    this.video.src = this.url;
    if (!this.isMjpeg) {
      this.video.loop = true;
    }

    this.onMetaLoaded = this.onMetaLoaded.bind(this);
    this.video.addEventListener(
      this.isMjpeg ? "load" : "loadedmetadata",
      this.onMetaLoaded,
      false
    );
  }

  /**
   * @private
   * @method onMetaLoaded
   * @description 视频元数据加载完成后的回调，用于初始化流媒体和THREE.js对象。
   */
  onMetaLoaded() {
    this.texture = new THREE.Texture(this.video);
    this.geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.width * this.height * 3);
    for (let i = 0, l = this.width * this.height; i < l; i++) {
      positions[i * 3] = i % this.width;
      positions[i * 3 + 1] = Math.floor(i / this.width);
    }
    this.geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(positions, 3)
    );

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        map: { type: "t", value: this.texture },
        width: { type: "f", value: this.width },
        height: { type: "f", value: this.height },
        focallength: { type: "f", value: this.f },
        pointSize: { type: "f", value: this.pointSize },
        zOffset: { type: "f", value: 0 },
        whiteness: { type: "f", value: this.whiteness },
        varianceThreshold: { type: "f", value: this.varianceThreshold },
        maxDepthPerTile: { type: "f", value: this.maxDepthPerTile },
        resolutionFactor: { type: "f", value: this.resolutionFactor },
      },
      vertexShader: DepthCloud.#vertexShader,
      fragmentShader: DepthCloud.#fragmentShader,
    });

    this.mesh = new THREE.Points(this.geometry, this.material);
    this.add(this.mesh);

    this.updateInterval = setInterval(() => {
      if (
        this.isMjpeg ||
        this.video.readyState === this.video.HAVE_ENOUGH_DATA
      ) {
        this.texture.needsUpdate = true;
      }
    }, 1000 / 30);
  }

  /**
   * @method startStream
   * @description 开始视频播放。
   */
  startStream() {
    if (!this.isMjpeg) {
      this.video.play();
    }
  }

  /**
   * @method stopStream
   * @description 停止视频播放。
   */
  stopStream() {
    if (!this.isMjpeg) {
      this.video.pause();
    }
  }

  /**
   * @method dispose
   * @description 清理并释放所有相关资源。
   */
  dispose() {
    this.stopStream();
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    if (this.video) {
      this.video.removeEventListener(
        this.isMjpeg ? "load" : "loadedmetadata",
        this.onMetaLoaded,
        false
      );
      this.video.src = "";
      this.video = null;
    }
    if (this.texture) {
      this.texture.dispose();
    }
    if (this.material) {
      this.material.dispose();
    }
    if (this.geometry) {
      this.geometry.dispose();
    }
    this.clear();
  }
}
