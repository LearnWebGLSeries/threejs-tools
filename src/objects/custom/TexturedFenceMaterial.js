import {
    RawShaderMaterial
} from '../../libs/three/current/three.module.js';

import { TexturedFenceShader } from './TexturedFenceShader.js';

export class TexturedFenceMaterial extends RawShaderMaterial {
    constructor() {
        super(TexturedFenceShader); 
    }
}