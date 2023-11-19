import * as THREE from '../libs/three/current/three.module.js';

// 2 的目标是增加新能 减少参数

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

class ColorPicker2 {
	constructor({width, height, renderer, scene, camera}) {
        // this._width = width;
        // this._height = height;
		this._renderer = renderer;
		this._camera = camera;
        this._scene = scene;
		
		this._objectsById = new Map();

		this._pickingRenderTarget = new THREE.WebGLRenderTarget(width / 4, height / 4, { minFilter: THREE.LinearFilter, magFilter: THREE.NearestFilter });
		
        this._background = new THREE.Color().setHex(0x000000, THREE.ColorManagement._workingColorSpace);
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
        this._pickMaterialCache = [];
        this._pickMaterialIncreaseStep = 5;
        this._increasePickingId = 1;
        this._currentPickingPointer = 0;

        // for change visible and material
        this._cacheMaterial = new Map();
        this._visibleCache = new Map();
	} 

    resize(width, height) {
        this._pickingRenderTarget.setSize( width / 4, height / 4 );
    }

    _reset() {
        this._objectsById.clear();
        this._cacheMaterial.clear();
        this._visibleCache.clear();
        this._currentPickingPointer = 0;
    }

    _createNewPickingMaterial() {
        const newMaterial = this._pickMaterial.clone();

        newMaterial.isPickingMaterial = true;
        newMaterial.pickingId = this._increasePickingId;
        newMaterial.uniforms.pickingColor.value.setHex(this._increasePickingId, THREE.ColorManagement._workingColorSpace);

        this._increasePickingId++;
        this._pickMaterialCache.push(newMaterial);
    }

    _checkMaterialCache() {
        if (this._pickMaterialCache[this._currentPickingPointer] === undefined) {
            for (let i = 0; i < this._pickMaterialIncreaseStep; i++) {
                this._createNewPickingMaterial();
            }
        }
    }

    _getNewMaterial(){
        const newMaterial = this._pickMaterialCache[this._currentPickingPointer];
        this._currentPickingPointer++;
        return newMaterial;
    }


    _changeMaterialForMesh(mesh, newMaterial) {
        this._cacheMaterial.set(mesh, mesh.material);
        mesh.material = newMaterial;

        const lines = mesh.children
            .filter(child => child.isLine);

        lines.forEach(line => {
            line.visible = false;
        });
    }

    _changeMaterialForGroup(group, newMaterial) {
        const me = this;
        
        group.traverse((sub) => {
            if (sub.isMesh) {
                me._changeMaterialForMesh(sub, newMaterial);
            }
        });  
    }

    _changeSelectedObjectMaterial(subject) {
        this._checkMaterialCache();

        const newMaterial = this._getNewMaterial(); 

        if (subject.isGroup) {
            this._changeMaterialForGroup(subject, newMaterial);
        } else if (subject.isMesh) {
            this._changeMaterialForMesh(subject, newMaterial);
        }

        return newMaterial.pickingId;
    } 

    _changeMaterial() {
        let selectedFlag = false;

        const me = this;
        me._scene.traverse(object => {
            if ( object.isLevel && object.isVisible() ) {
                // 查找可选择物体
                object.containerObj.traverse(subject => {
                    if (subject.userData.selectable) {
                        // 修改可选择物体中 mesh 的材质
                        selectedFlag = true;

                        const pickId = me._changeSelectedObjectMaterial(subject);
                        me._objectsById.set(pickId, subject);
                    }
                });
            }
        });

        return selectedFlag;
    }

    _resetMaterial() {
        const me = this;

        me._scene.traverse(object => {
            if ( object.isLevel && object.isVisible() ) {
                // 查找可选择物体
                object.containerObj.traverse(subject => {
                    if (subject.isMesh && subject.material.isPickingMaterial) {
                        // 修改可选择物体中 mesh 的材质
                        const originMaterial = me._cacheMaterial.get(subject);

                        subject.material = originMaterial;

                        const lines = subject.children
                            .filter(child => child.isLine);

                        lines.forEach(line => {
                            line.visible = true;
                        });
                    }
                });
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

        // 设置材质未 picking 的可见 并且设置 pick 的父亲可见
        me._scene.traverse(sub => {
            if (sub.isMesh && sub.material.isPickingMaterial) {
                sub.visible = true;

                let par = sub.parent;

                while (!par.visible) {
                    par.visible = true;

                    par = par.parent;
                }
            }
        });
    }

    _resetVisible() {
        const me = this;

        me._scene.traverse(sub => {
            sub.visible = me._visibleCache.get(sub);
        });
    }

	pick(x, y) {
        // debugger; 
        const bg = this._scene.background;
        const env = this._scene.environment;

        this._scene.background = this._background;
        this._scene.environment = null;
        // console.log(bg);
        this._reset();

        const flag = this._changeMaterial();

        if (!flag) {
            this._scene.background = bg;
            this._scene.environment = env;
            return undefined;
        }

        this._changeVisible();

         
        // this._renderer.setRenderTarget(null);
        this._renderer.setRenderTarget(this._pickingRenderTarget);
		this._renderer.clear(true, true, true);
		this._renderer.render(this._scene, this._camera);
        // this._renderer.setRenderTarget(null);

        this._scene.background = bg;
        this._scene.environment = env;
        // console.log(bg);
        
        this._resetVisible();
        this._resetMaterial();
         
        // console.time();
		this._renderer.readRenderTargetPixels(
			this._pickingRenderTarget,
			x / 4,
			this._pickingRenderTarget.height - y / 4,
			1,
			1,
			this._pixelBuffer
		); 
        // console.timeEnd();

        // console.log(this._pixelBuffer);
		const id = (this._pixelBuffer[0] << 16) | (this._pixelBuffer[1] << 8) | (this._pixelBuffer[2]);      
        // console.log(id);
        
		return this._objectsById.get(id) || undefined;
	}
}

export { ColorPicker2 };
