import {
    Vector3
} from "../libs/three/current/three.module.js";

import { GLTFLoader } from '../jsm/loaders/GLTFLoader.js';
import { Level } from '../objects/Level.js';

export class GltfLevelConstructureLoader extends GLTFLoader {
    constructor(app) {
        super();

        this.app = app;
        this.rootLevel = new Level();
        this.scale = new Vector3(1, 1, 1);
        this.handleObjectFunctions = {};
    }

    // __Object3DDbClick (obj) {
    //     const level = obj.getLevel();
        
    //     if (level === undefined) {
    //         console.warn('no level find');
    //     }
    
    //     level.next();
    // }
    
    // __Object3DClick (obj) {
        // const level = obj.getLevel();
        
        // if (level === undefined) {
        //     console.warn('no level find');
        // }
    
        // level.focus();

        // ========

        // let position = undefined;

        // obj.traverse(sub => {
        //     if (sub.isMesh) {
        //         const box = sub.geometry.boundingBox;

        //         if (!box) {
        //             sub.geometry.computeBoundingBox();
        //             box = sub.geometry.boundingBox;
        //         }

        //         const { max, min } = box;
        //         const center = max.clone().add(min).divideScalar(2.0);

        //         center.applyMatrix4(obj.matrixWorld);
 
        //         if (position === undefined) {
        //             position = center;
        //         } else {
        //             position.add(center).divideScalar(2.0);
        //         }
                
        //     }
        // });

        // if (position === undefined) {
        //     position = obj.position.clone().applyMatrix4(obj.matrixWorld);
        // }

        // const controls = this.app.inputManager.getOrbitControls();

        // controls.targetTo(position, 0.5);
    // }

    _buildWireframe(mesh, color) {
        const geo = new THREE.EdgesGeometry( mesh.geometry ); 
        const mat = new THREE.LineBasicMaterial( { color, linewidth: 1 } );
        const wireframe = new THREE.LineSegments( geo, mat );
        mesh.add( wireframe );
    }  
    
    _levelConstructureLoop (parentLevel, level, objs, name) {
        const me = this;

        objs.forEach(obj => {
            if (obj.userData.level === level && obj.userData.parent === name) {
                const newLevel = new Level();
    
                newLevel.add(obj);
    
                parentLevel.add(newLevel);
    
                // 查询子 level
                me._levelConstructureLoop(newLevel, level + 1, objs, obj.name);

                // if (obj.userData.selectable === true) {
                    // obj.addEventListener('click', function() {
                    //     me.__Object3DClick(obj);
                    // });

                    // obj.addEventListener('dblclick', function() {
                    //     me.__Object3DDbClick(obj);
                    // });
                // }
            }
        });
    }
    
    _levelConstructure (parentLevel, level, objs) {
        const me = this;

        objs.forEach(obj => {
            if (obj.userData.level === level) {
                const newLevel = new Level();
    
                newLevel.add(obj);
                parentLevel.add(newLevel);
    
                // 查询子 level
                me._levelConstructureLoop(newLevel, level + 1, objs, obj.name);
    
                // if (obj.userData.selectable === true) {
                    // obj.addEventListener('click', function() {
                    //     me.__Object3DClick(obj);
                    // });
  
                    // obj.addEventListener('dblclick', function() {
                    //     me.__Object3DDbClick(obj);
                    // });
                // }
            }
        });
    }

    load(url, callback) {
        const me = this;

        me.rootLevel.scale.copy(me.scale);
        
        super.load(url, function(gltf) {
            const subjectRefs = [];

            for (let i = 0; i < gltf.scene.children.length; i++) {
                const obj = gltf.scene.children[i];

                if (me.handleObjectFunctions[obj.userData.name]) {
                    if (me.handleObjectFunctions[obj.userData.name](obj)) {
                        subjectRefs.push(obj);
                    }
                } else {
                    subjectRefs.push(obj);
                }
            }

            me._levelConstructure(me.rootLevel, 1, subjectRefs);
  
            me.rootLevel.show();

            callback(me.rootLevel);
        });
    }
}