import {
    RawShaderMaterial
} from '../../libs/three/current/three.module.js';

import { DigitalGroundShader } from './DigitalGroundShader.js';

export class DigitalGroundMaterial extends RawShaderMaterial {
    constructor() {
        super(DigitalGroundShader); 
    }
}
