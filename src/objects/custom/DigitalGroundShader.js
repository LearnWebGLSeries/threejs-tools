import {
    DoubleSide
} from '../../libs/three/current/three.module.js';

const DigitalGroundShader = {

	uniforms: {

		'time': { value: 0 },
		'radius': { value: 10.0 },
        'texture0': { value: undefined },
        'texture1': { value: undefined },
        'texture2': { value: undefined },
        'texture3': { value: undefined }

	},

	vertexShader: /* glsl */`

        precision highp float;
        precision highp int;

        uniform mat4 modelViewMatrix; // optional
        uniform mat4 projectionMatrix; // optional

        attribute vec3 position;
        attribute vec4 color;
        attribute vec2 uv;

        varying vec3 vPosition;
        varying vec4 vColor;
        varying vec2 vUv;

        void main()	{

            vPosition = position;
            vColor = color;
            vUv = uv;

            gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

        }`
    ,

	fragmentShader: /* glsl */`

        precision highp float;
        precision highp int;

        uniform float time;
        uniform float radius;

        uniform sampler2D texture0;
        uniform sampler2D texture1;
        uniform sampler2D texture2;
        uniform sampler2D texture3;

        varying vec3 vPosition;
        varying vec4 vColor;
        varying vec2 vUv;

        // 振幅 波长 波速 时间
        float wave(float a, float l, float s, float second, float val) {
            float PI = 3.141592653;
            float wave = a * sin(- val * 2.0 * PI / l + second * s * 2.0 * PI / l);

            return (wave + 1.0) / 2.0;
        }

        void main()	{
            // B7FCF9
            vec4 basceColor = vec4( 141.0 / 255.0, 253.0 / 253.0, 254.0 / 255.0, 1.0 );

            vec4 back = texture2D( texture0, vUv * 16.0);

            // basceColor = back * basceColor;

            vec4 ori1 = texture2D( texture1, vUv * 4.0); // 电子元件
            vec4 ori2 = texture2D( texture2, vUv * 16.0 ); // 点
            vec4 ori3 = texture2D( texture3, vUv * 16.0 ); // 网格

            float length = length( vec2(vPosition.x, vPosition.y) );

            // 应用波函数蒙版
            float flag1 = wave(1.0, radius / 2.0, 45.0, time, length);
            if (flag1 < 0.5) {
                flag1 = 0.0;
            }
            ori1.a = ori1.a * (flag1 * 0.8 + 0.2);
            
            float flag2 = wave(1.0, radius / 3.0, 30.0, time, length);
            ori2.a = ori2.a * (flag2 * 0.8 + 0.2);

            float flag3 = wave(1.0, 60.0, 20.0, time, length);
            ori3.a = ori3.a * (flag3 * 2.0 - 1.5);

            // 应用蒙版
            float alpha = clamp(ori1.a + ori2.a + ori3.a + back.a * 0.01, 0.0, 1.0);
            basceColor.a = alpha;

            gl_FragColor = basceColor * clamp((2.0 - (length * 2.0 / radius)), 0.0, 1.0);
            // gl_FragColor = back;

        }`
    ,
    side: DoubleSide,
    transparent: true,
    // polygonOffset: true,
    // polygonOffsetFactor: 1, // positive value pushes polygon further away
    // polygonOffsetUnits: 1
};

export { DigitalGroundShader };