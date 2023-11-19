import {
    RGBADepthPacking,
    MeshDepthMaterial,
    WebGLRenderTarget,
    NoBlending,
    ShaderMaterial,
    Color,
    ColorManagement,
    Vector3,
    Vector2,
    Quaternion,
    FramebufferTexture,
    RGBAFormat,
    LinearFilter,
} from '../libs/three/current/three.module.js';

import { Pass, FullScreenQuad } from '../jsm/postprocessing/Pass.js';
import { NRMaterial } from './NRMaterial.js';
import { SSRMaterial } from './SSRMaterial.js';
import { TemporalResolveMaterial } from './TemporalResolveMaterial.js';

const zeroVec2 = new Vector2();


// from git@github.com:0beqz/screen-space-reflections.git
export class SSRPass extends Pass {
    constructor({
        width, 
        height,
        scene,
        camera
    }) {
        super();

        this._width = width;
        this._height = height;
        this._scene = scene;
        this._camera = camera;

        this._background = new Color().setHex(0x000000, ColorManagement._workingColorSpace);

        this._fsQuad = new FullScreenQuad( null );
        this._depthMaterial = new MeshDepthMaterial({
			depthPacking: RGBADepthPacking
		}); 

        this._depthMaterial.isDepthMaterial = true; 

        // this._clock = new Clock();
        this._materialCache = new Map();
        this._visibleCache = new Map(); 
        this._nrMaterialCache = new Map();

        // render target

        this._renderTargetNrBuffer = new WebGLRenderTarget( this._width, this._height, { samples: 8 } );
        this._renderTargetNrBuffer.texture.name = 'SSRPass.nr';
		this._renderTargetNrBuffer.texture.generateMipmaps = false;

        this._renderTargetDepthBuffer = new WebGLRenderTarget( this._width, this._height, { samples: 8 } );
        this._renderTargetDepthBuffer.texture.name = 'SSRPass.depth';
		this._renderTargetDepthBuffer.texture.generateMipmaps = false;

        this._renderTargetAccumulatedBuffer = new WebGLRenderTarget( this._width, this._height );
        this._renderTargetAccumulatedBuffer.texture.name = 'SSRPass.acc';
		this._renderTargetAccumulatedBuffer.texture.generateMipmaps = false;

        this._renderCurrentSSRBuffer = new WebGLRenderTarget( this._width, this._height );
        this._renderCurrentSSRBuffer.texture.name = 'SSRPass.current';
		this._renderCurrentSSRBuffer.texture.generateMipmaps = false;

        this._renderTargetVelocityBuffer = new WebGLRenderTarget( this._width, this._height );
        this._renderTargetVelocityBuffer.texture.name = 'SSRPass.velocity';
		this._renderTargetVelocityBuffer.texture.generateMipmaps = false;
 
        // temp
        this._samples = 1;
        this._lastCameraTransform = {
            position: new Vector3(),
		    quaternion: new Quaternion()
        };
        this._accumulatedTexture = new FramebufferTexture(this._width, this._height, RGBAFormat);
        this._accumulatedTexture.minFilter = LinearFilter;
		this._accumulatedTexture.magFilter = LinearFilter;

        this._lastVelocityTexture = new FramebufferTexture(this._width, this._height, RGBAFormat);
        this._lastVelocityTexture.minFilter = LinearFilter;
		this._lastVelocityTexture.magFilter = LinearFilter;

		// this._accumulatedTexture.type = HalfFloatType;
        this._temporalResolveMaterial = new TemporalResolveMaterial();
        this._temporalResolveMaterial.defines.dilation = "";
        this._temporalResolveMaterial.defines.boxBlur = "";
        this._temporalResolveMaterial.uniforms.invTexSize.value.set(1 / this._width, 1 / this._height);
        this._temporalResolveMaterial.uniforms.accumulatedTexture.value = this._accumulatedTexture;
        this._temporalResolveMaterial.uniforms.inputTexture.value = this._renderCurrentSSRBuffer.texture;
        this._temporalResolveMaterial.uniforms.velocityTexture.value = this._renderTargetVelocityBuffer.texture;
        this._temporalResolveMaterial.uniforms.lastVelocityTexture.value = this._lastVelocityTexture;

        // ssr
        this._ssrMaterial = new SSRMaterial();
        if (this._camera.isPerspectiveCamera) {
            this._ssrMaterial.defines.PERSPECTIVE_CAMERA = "";
        }

        this._ssrMaterial.uniforms.normalTexture.value = this._renderTargetNrBuffer.texture;
		this._ssrMaterial.uniforms.depthTexture.value = this._renderTargetDepthBuffer.texture;
		this._ssrMaterial.uniforms.accumulatedTexture.value = this._accumulatedTexture;

		this._ssrMaterial.uniforms.cameraMatrixWorld.value = this._camera.matrixWorld;
		this._ssrMaterial.uniforms._projectionMatrix.value = this._camera.projectionMatrix;
		this._ssrMaterial.uniforms._inverseProjectionMatrix.value = this._camera.projectionMatrixInverse;

        // final

        this._finalSSRMaterial = new ShaderMaterial({
            type: "FinalSSRMaterial",
			uniforms: {
                'inputTexture': {  value: undefined },
                'reflectionsTexture': { value: undefined },
                'blur': { value: 0 },
                'blurSharpness': { value: 0 },
                'blurKernel': { value: 0 },
                'invTexSize': { value: new Vector2() },
            },
            vertexShader: `
            precision highp float;
            precision highp int;
    
            // uniform mat4 modelViewMatrix; // optional
            // uniform mat4 projectionMatrix; // optional
    
            // attribute vec3 position; 
            // attribute vec2 uv;
    
            varying vec2 vUv;
    
            void main()	{
    
                vUv = uv;
    
                gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
    
            }
            `,
            fragmentShader: `
                precision highp float;
                precision highp int;
                // #define MODE_DEFAULT             0
                // #define MODE_REFLECTIONS         1
                // #define MODE_RAW_REFLECTION      2
                // #define MODE_BLURRED_REFLECTIONS 3
                // #define MODE_INPUT               4
                // #define MODE_BLUR_MIX            5

                #define FLOAT_EPSILON            0.00001

                uniform sampler2D inputTexture;
                uniform sampler2D reflectionsTexture;
                uniform vec2 invTexSize;

                uniform float samples;

                varying vec2 vUv;

                uniform float blur;
                uniform float blurSharpness;
                uniform int blurKernel;

                // algorithm is from: https://github.com/evanw/glfx.js/blob/master/src/filters/adjust/denoise.js
                vec3 denoise(vec3 center, sampler2D tex, vec2 uv, vec2 itSize, float blur, float blurSharpness, int blurKernel) {
                    vec3 color;
                    float total;
                    vec3 col;
                    float weight;

                    for (int x = -blurKernel; x <= blurKernel; x++) {
                        for (int y = -blurKernel; y <= blurKernel; y++) {
                            col = textureLod(tex, uv + vec2(x, y) * itSize, 0.0).rgb;
                            weight = 1.0 - abs(dot(col - center, vec3(0.25)));
                            weight = pow(weight, blurSharpness);
                            color += col * weight;
                            total += weight;
                        }
                    }

                    return color / total;
                }

                void main() {
                    vec4 inputColor = texture2D(inputTexture, vUv);
                    vec4 reflectionsTexel = texture2D(reflectionsTexture, vUv);
                    // ivec2 size = textureSize(reflectionsTexture, 0);
                    // vec2 invTexSize = 1. / vec2(size.x, size.y);

                    vec3 reflectionClr = reflectionsTexel.xyz;

                    if (blur > FLOAT_EPSILON) {
                        vec3 blurredReflectionsColor = denoise(reflectionsTexel.rgb, reflectionsTexture, vUv, invTexSize, blur, blurSharpness, blurKernel);

                        reflectionClr = mix(reflectionClr, blurredReflectionsColor.rgb, blur);
                    }

                // #if RENDER_MODE == MODE_DEFAULT
                    gl_FragColor = vec4(inputColor.rgb + reflectionClr, 1.0);
                // #endif

                // #if RENDER_MODE == MODE_REFLECTIONS
                //     gl_FragColor = vec4(reflectionClr, 1.0);
                // #endif

                // #if RENDER_MODE == MODE_RAW_REFLECTION
                //     gl_FragColor = vec4(reflectionsTexel.xyz, 1.0);
                // #endif

                // #if RENDER_MODE == MODE_BLURRED_REFLECTIONS
                //     gl_FragColor = vec4(blurredReflectionsTexel.xyz, 1.0);
                // #endif

                // #if RENDER_MODE == MODE_INPUT
                //     gl_FragColor = vec4(inputColor.xyz, 1.0);
                // #endif

                // #if RENDER_MODE == MODE_BLUR_MIX
                //     gl_FragColor = vec4(vec3(blur), 1.0);
                // #endif
                }
            `,
			defines: new Map([["RENDER_MODE", "0"]]),
            depthTest: false,
            depthWrite: false, 
            blending: NoBlending,
        });
        this._finalSSRMaterial.uniforms.reflectionsTexture.value = this._renderTargetAccumulatedBuffer.texture;
        this._finalSSRMaterial.uniforms.invTexSize.value.set(1 / this._width, 1 / this._height);
        // this._finalSSRMaterial.uniforms.reflectionsTexture.value = this._renderCurrentSSRBuffer.texture;

        this.resize(this._width, this._height);
    }

    resize(width, height) {
        this._width = width;
        this._height = height;
        this._renderTargetNrBuffer.setSize(width, height);
        this._renderTargetDepthBuffer.setSize(width, height);
        this._renderTargetAccumulatedBuffer.setSize(width, height);
        this._renderCurrentSSRBuffer.setSize(width, height);
        this._renderTargetVelocityBuffer.setSize(width, height);

        this._temporalResolveMaterial.uniforms.invTexSize.value.set(1 / this._width, 1 / this._height);
        this._finalSSRMaterial.uniforms.invTexSize.value.set(1 / this._width, 1 / this._height);

        this._accumulatedTexture.dispose();
        this._accumulatedTexture = new FramebufferTexture(this._width, this._height, RGBAFormat);
        this._accumulatedTexture.minFilter = LinearFilter;
		this._accumulatedTexture.magFilter = LinearFilter;
		// this._accumulatedTexture.type = HalfFloatType;

        this._lastVelocityTexture.dispose();
        this._lastVelocityTexture = new FramebufferTexture(this._width, this._height, RGBAFormat);
        this._lastVelocityTexture.minFilter = LinearFilter;
		this._lastVelocityTexture.magFilter = LinearFilter;
		// this._lastVelocityTexture.type = HalfFloatType;

        this._temporalResolveMaterial.uniforms.accumulatedTexture.value = this._accumulatedTexture;
    }

    _reset() {
        this._materialCache.clear();
        this._visibleCache.clear();
    }

    _changeNRMaterial() {
        this._scene.traverse(object => {
            if (object.userData.ssrEnable) {
                const originMaterial = object.material;

                this._materialCache.set(object, originMaterial);

                let nrMaterial = this._nrMaterialCache.get(object);

                if (nrMaterial === undefined) {
                    nrMaterial = new NRMaterial();
                    nrMaterial.isNRMaterial = true;
                    nrMaterial.normalScale = originMaterial.normalScale;
                    nrMaterial.uniforms.normalScale.value = originMaterial.normalScale;

                    const map = 
                        originMaterial.map ||
                        originMaterial.normalMap ||
                        originMaterial.roughnessMap ||
                        originMaterial.metalnessMap;

                    if (map) {
                        nrMaterial.uniforms.uvTransform.value = map.matrix;
                    }

                    this._nrMaterialCache.set(object, nrMaterial);

                    
                    nrMaterial.side = originMaterial.side;
                }

                object.material = nrMaterial;
                object.material.uniforms.roughness.value = originMaterial.roughness;

                object.visible = true;

                let par = object.parent;

                while (!par.visible) {
                    par.visible = true;

                    par = par.parent;
                }
            }
        });
    }

    _changeNRToDMaterial() {
        this._scene.traverse(object => {
            if (object.material && object.material.isNRMaterial) {
                object.material = this._depthMaterial;
            }
        });
    }

    _resetMaterial() {
        this._scene.traverse(object => {
            if (object.material && (object.material.isDepthMaterial || object.material.isNRMaterial)) {
                object.material = this._materialCache.get(object);
            }
        });
    }

    _changeVisible() {
        const me = this;

        // 全部不可见
        me._scene.traverse(sub => {
            me._visibleCache.set(sub, sub.visible);

            sub.visible = false;
        });

        me._scene.visible = true;
    }

    _resetVisible() {
        const me = this;

        me._scene.traverse(sub => {
            sub.visible = me._visibleCache.get(sub);
        });
    }

    _checkNeedsResample() {
        const moveDist = this._lastCameraTransform.position.distanceToSquared(this._camera.position);
		const rotateDist = 8 * (1 - this._lastCameraTransform.quaternion.dot(this._camera.quaternion));

        // console.log(moveDist, rotateDist);

		if (moveDist > 0.000001 || rotateDist > 0.000001) {
        // if (moveDist > 0.01 || rotateDist > 0.01) {
			this.samples = 1

			this._lastCameraTransform.position.copy(this._camera.position);
			this._lastCameraTransform.quaternion.copy(this._camera.quaternion);
		}
    }

    render( renderer, writeBuffer, readBuffer, deltaTime, maskActive ) {
        const bg = this._scene.background;
        const env = this._scene.environment;

        this._scene.background = this._background;
        this._scene.environment = null;

        this._reset();
        this._changeVisible();
        // 得到 normal 和 roughness
        this._changeNRMaterial();

        renderer.setRenderTarget( this._renderTargetNrBuffer );
        renderer.render(this._scene, this._camera);
 
        // 得到 depth
        this._changeNRToDMaterial();

        renderer.setRenderTarget( this._renderTargetDepthBuffer );
        renderer.render(this._scene, this._camera);

        this._resetMaterial();
        this._resetVisible();
        this._scene.background = bg;
        this._scene.environment = env;

        // 屏幕渲染（重复利用加速图） 
        
        this._fsQuad.material = this._ssrMaterial;
        this._fsQuad.material.uniforms.inputTexture.value = readBuffer.texture;
		this._fsQuad.material.uniforms.samples.value = this._samples;
		this._fsQuad.material.uniforms.cameraNear.value = this._camera.near
		this._fsQuad.material.uniforms.cameraFar.value = this._camera.far

		this._fsQuad.material.uniforms.viewMatrix.value.copy(this._camera.matrixWorldInverse);
    
        renderer.setRenderTarget( this._renderCurrentSSRBuffer );
        this._fsQuad.render( renderer );

        // 渲染加速图
        this._samples ++;
        this._checkNeedsResample();

        this._fsQuad.material = this._temporalResolveMaterial;
        this._fsQuad.material.uniforms.samples.value = this._samples;
        
        renderer.setRenderTarget( this._renderTargetAccumulatedBuffer );
        this._fsQuad.render( renderer );

        renderer.copyFramebufferToTexture(zeroVec2, this._accumulatedTexture);

        renderer.setRenderTarget(this._renderTargetVelocityBuffer);
        renderer.copyFramebufferToTexture(zeroVec2, this._lastVelocityTexture);

        // 最终渲染
        this._fsQuad.material = this._finalSSRMaterial;
        this._fsQuad.material.uniforms.inputTexture.value = readBuffer.texture;
        // this._fsQuad.material.uniforms.inputTexture.value = this._renderTargetAccumulatedBuffer.texture;
        renderer.setRenderTarget( writeBuffer ); 
        this._fsQuad.render( renderer );
    }
}
