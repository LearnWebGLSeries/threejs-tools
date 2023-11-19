import * as THREE from '../libs/three/current/three.module.js';

const ColorPickVert = `
precision highp float;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
attribute vec3 position;

void main()	{
	// vec3 positionEye = (modelViewMatrix * vec4(position, 1.0)).xyz;
	// gl_Position = projectionMatrix * vec4(positionEye, 1.0);
    gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}
`;

const ColorPickFrag = `
precision highp float;

uniform vec3 pickingColor;

void main()	{	
	gl_FragColor = vec4(pickingColor, 1.0);
}
`;

class ColorPicker {
	constructor({width, height, renderer, camera}) {
		this._renderer = renderer;
		this._camera = camera;
		
		this._objectsById = new Map();

		this._pickingRenderTarget = this._createColorPickingRT(width, height);
		this._pickingScene = new THREE.Scene();
        this._pickingScene.background = new THREE.Color().setHex(0x000000, THREE.ColorManagement._workingColorSpace);
		this._pixelBuffer = new Uint8Array(4);

        this._pickMaterial = new THREE.RawShaderMaterial({
			vertexShader: ColorPickVert,
			fragmentShader: ColorPickFrag,
			uniforms: {
				pickingColor: {
					value: new THREE.Color().setHex(0x000000, THREE.ColorManagement._workingColorSpace)
				}
			}
		});
	}

	_createColorPickingRT(width, height) {
		return new THREE.WebGLRenderTarget(width, height, { minFilter: THREE.LinearFilter, magFilter: THREE.NearestFilter });
	}
    
	_initPickingObjects(objectsForPicking) {
        this._pickingScene.clear();
        this._objectsById.clear();
        // console.log(objectsForPicking.length);
		for (let i = 0; i < objectsForPicking.length; i++) {
            const pickingObject = objectsForPicking[i].clone();

            if (pickingObject.isGroup) {
                // console.log(pickingObject);
                pickingObject.traverse(obj => {
                    if (obj.isMesh) {
                        const lines = obj.children
                            .filter(child => child.isLine);

                        lines.forEach(line => {
                            const index = obj.children.indexOf(line);
                            if (index !== -1) {
                                obj.children.splice(index, 1);
                            }
                        });
                        
                        obj.material = this._pickMaterial.clone();
                        obj.material.uniforms.pickingColor.value.setHex(i + 1, THREE.ColorManagement._workingColorSpace);
                    }
                });
            } else {

                const lines = pickingObject.children
                    .filter(child => child.isLine);

                lines.forEach(line => {
                    const index = pickingObject.children.indexOf(line);
                    if (index !== -1) {
                        pickingObject.children.splice(index, 1);
                    }
                    
                });

                pickingObject.material = this._pickMaterial.clone();
                pickingObject.material.uniforms.pickingColor.value.setHex(i + 1, THREE.ColorManagement._workingColorSpace);
            }

            this._pickingScene.add(pickingObject);
            this._objectsById.set(i + 1, objectsForPicking[i]);
		}
	}

	pick(x, y, objectsForPicking) {		
        if (objectsForPicking.length === 0) {
            return undefined; 
        }

        this._initPickingObjects(objectsForPicking);	
        
        // this._renderer.setRenderTarget(null);
        this._renderer.setRenderTarget(this._pickingRenderTarget);
		this._renderer.clear(true, true, true);
		this._renderer.render(this._pickingScene, this._camera);
        this._renderer.setRenderTarget(null);

		this._renderer.readRenderTargetPixels(
			this._pickingRenderTarget,
			x,
			this._pickingRenderTarget.height - y,
			1,
			1,
			this._pixelBuffer
		);

        // console.log(this._pixelBuffer);
		const id = (this._pixelBuffer[0] << 16) | (this._pixelBuffer[1] << 8) | (this._pixelBuffer[2]);      
        // console.log(id);
		return this._objectsById.get(id) || undefined;
	}
}

export { ColorPicker };
