import {
    Color,
    RawShaderMaterial,
    NoBlending,
    Clock
} from '../libs/three/current/three.module.js';

import { Pass, FullScreenQuad } from '../jsm/postprocessing/Pass.js';

export class VignettePass extends Pass {
    constructor() {
        super();

        this.fsQuad = new FullScreenQuad( null );
        this.material = new RawShaderMaterial({
            uniforms: {

                'time': { value: 0.0 },
                'amount': { value: 0.93 },
                'hardness': { value: 0.5 },
                'color': { value: new Color(1, 0, 0) },
                'texture': { value: undefined },

            },
        
            vertexShader: /* glsl */`
        
                precision highp float;
                precision highp int;
        
                uniform mat4 modelViewMatrix; // optional
                uniform mat4 projectionMatrix; // optional
        
                attribute vec3 position;
                attribute vec4 color;
                attribute vec2 uv;
        
                varying vec2 vUv;
        
                void main()	{
        
                    vUv = uv;
        
                    gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
        
                }`
            ,
        
            fragmentShader: /* glsl */`
        
                precision highp float;
                precision highp int;
        
                uniform float amount;
                uniform float hardness;
                uniform vec3 color;
                uniform float time;

                uniform sampler2D texture;
           
                varying vec2 vUv;

                float interleavedGradientNoise(const in vec2 fragCoord, const in float frameMod) {
                    vec3 magic = vec3(0.06711056, 0.00583715, 52.9829189);
                    return fract(magic.z * fract(dot(fragCoord.xy + frameMod * vec2(47.0, 17.0) * 0.695, magic.xy)));
                } 
                
                float vignetteDithered(const in vec2 screenTextureCoord, const in float vignetteAmount, const in float vignetteHardness, const in vec3 vignetteColor) {
                    vec2 lens = vec2(vignetteAmount, vignetteAmount - vignetteHardness);
                    // smoothesp is not realiable with edge0 == edge1
                    lens.y = min(lens.y, lens.x - 1e-4);

                    float jitter = interleavedGradientNoise(gl_FragCoord.xy, vignetteHardness);

                    // jitter a bit the uv to remove the banding in some cases
                    // (lens.x - lens.y) reduce flickering when the vignette is harder (hardness)
                    // (lens.x + lens.y) reduce the flickering when the vignette has a strong radius
                    jitter = (lens.x - lens.y) * (lens.x + lens.y) * 0.07 * (jitter - 0.5);
                    return smoothstep(lens.x, lens.y, jitter + distance(screenTextureCoord, vec2(0.5)));
                }

                vec4 vignette(const in vec4 color, const in vec2 screenTextureCoord, const in float vignetteAmount, const in float vignetteHardness, const in vec3 vignetteColor) {
                    float factor = vignetteDithered(screenTextureCoord, vignetteAmount, vignetteHardness, vignetteColor);
                    return vec4(mix(color.rgb, vignetteColor, 1.0 - factor), clamp(color.a + (1.0 - factor), 0.0, 1.0));
                }
         
                void main()	{ 
                    vec4 originColor = texture2D( texture, vUv );
                    float buf = sin(time * 10.0) / 60.0;
                     
                    vec4 finalColor = vignette(originColor, vUv, amount + buf, hardness, color);
         
                    gl_FragColor = vec4(finalColor.rgb, 1.0);
                    // gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
        
                }`
            ,
            depthTest: false,
            depthWrite: false, 
            blending: NoBlending,
            // side: DoubleSide,
            transparent: true,
        });

        this.clock = new Clock();
    }

    render( renderer, writeBuffer, readBuffer, deltaTime, maskActive ) {
        this.fsQuad.material = this.material;
        this.material.uniforms[ 'time' ].value = this.clock.getElapsedTime();
        this.material.uniforms[ 'texture' ].value = readBuffer.texture; 
   
        // 输出的
        renderer.setRenderTarget( writeBuffer );
        renderer.clear();
        this.fsQuad.render( renderer ); 
    }
}
