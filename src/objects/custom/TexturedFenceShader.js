import {
    DoubleSide
} from '../../libs/three/current/three.module.js';

const TexturedFenceShader = {

	uniforms: {
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

        uniform float time; 

        uniform sampler2D texture;
 
        varying vec2 vUv;
 
        void main()	{
            vec4 origin = texture2D( texture, vUv );

            origin.a = origin.a * 0.6;
 
            gl_FragColor = origin;
        }`
    ,
    side: DoubleSide,
    transparent: true,
    polygonOffset: true,
    polygonOffsetFactor: 1, // positive value pushes polygon further away
    polygonOffsetUnits: 1
};

export { TexturedFenceShader };