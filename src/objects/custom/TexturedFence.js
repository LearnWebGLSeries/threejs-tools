import { Fence } from '../Fence.js';

import { TexturedFenceMaterial } from './TexturedFenceMaterial.js';
 
export class TexturedFence extends Fence {
    constructor(options) {
        super(options);

        this.material = new TexturedFenceMaterial();
 
        this.material.uniforms.texture = { value: options.texture };
 
        this.mesh = new THREE.Mesh(  this.geometry, this.material );

        this.add(this.mesh);
    }
} 


