import {
    RawShaderMaterial,
    NoBlending,
    BackSide
} from '../libs/three/current/three.module.js';

export class BackgroundMaterial extends RawShaderMaterial {
    constructor () {
        super({
            uniforms: {

                'cubeTexture': { type: 'samplerCube', value: undefined },

            },
        
            vertexShader: /* glsl */`
        
                precision highp float;
                precision highp int;
        
                uniform mat4 modelViewMatrix; // optional
                uniform mat4 projectionMatrix; // optional
        
                attribute vec3 position; 
                attribute vec2 uv;
        
                varying vec3 vNormal;
        
                void main()	{
        
                    vNormal = normalize(position);
        
                    gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
        
                }`
            ,
        
            fragmentShader: /* glsl */`
        
                precision highp float;
                precision highp int;
          
                uniform samplerCube cubeTexture;
           
                varying vec3 vNormal;
         
                void main()	{ 
                    vec4 originColor = textureCube( cubeTexture, normalize(vNormal) ); 
         
                    gl_FragColor = vec4(originColor.rgb, 1.0);
                    // gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
        
                }`
            ,
            // depthTest: false,
            // depthWrite: false, 
            blending: NoBlending,
            side: BackSide,
            transparent: false,
        });
    }
}