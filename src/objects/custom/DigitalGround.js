import { Ground } from '../Ground.js';

import { DigitalGroundMaterial } from './DigitalGroundMaterial.js';

export class DigitalGround extends Ground {
    constructor(options) {
        super();

        this.material = new DigitalGroundMaterial();

        this.material.uniforms.time = this.uniformTimeRef;
        this.material.uniforms.radius = { value: options.radius };
        this.material.uniforms.texture0 = { value: options.textures[0] };
        this.material.uniforms.texture1 = { value: options.textures[1] };
        this.material.uniforms.texture2 = { value: options.textures[2] };
        this.material.uniforms.texture3 = { value: options.textures[3] };

        if (options.geometry !== undefined) {
            this.geometry = options.geometry;
        } else {
            this.geometry = new THREE.CircleGeometry(options.radius);
        }
 
        const plant = new THREE.Mesh(  this.geometry, this.material );
        plant.rotateX(-(90 * Math.PI) / 180);

        plant.userData.ssrEnable = options.ssrEnable;

        this.add(plant);
    }
} 