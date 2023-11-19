import * as THREE from '../libs/three/current/three.module.js';
import * as ThreeMeshUI from "../libs/three-mesh-ui/current/three-mesh-ui.module.js";
import { GUI }  from '../libs/lil-gui.module.min.js';
import Stats from '../libs/stats.module.js';

import { EffectComposer } from '../jsm/postprocessing/EffectComposer.js';
import { RenderPass } from '../jsm/postprocessing/RenderPass.js';
import { ShaderPass } from '../jsm/postprocessing/ShaderPass.js';
import { OutputPass } from '../jsm/postprocessing/OutputPass.js';
import { FXAAShader } from '../jsm/shaders/FXAAShader.js';
import { UnrealBloomPass } from '../jsm/postprocessing/UnrealBloomPass.js'
import { SAOPass } from '../jsm/postprocessing/SAOPass.js';

import { CSS2DRenderer } from '../jsm/renderers/CSS2DRenderer.js';

import { VignettePass  } from '../postprocessing/VignettePass.js';
import { SSRPass  } from '../postprocessing/SSRPass.js';
import { SimpleOutlinePass } from '../postprocessing/SimpleOutlinePass.js';

import { ColorPicker2 } from '../technique/ColorPicker2.js';

import { LocalInputManager } from '../controls/inputs/LocalInputManager.js';
import { OrbitControls } from '../controls/OrbitControls.js';
import * as INPUT_CONST from '../controls/inputs/const.js';

import { ZINDEX } from './Const.js';
 
class ParkApp extends THREE.EventDispatcher {
    constructor({width = window.innerWidth, height = window.innerHeight, domElement = document.createElement('div'), config = {}}) {
        super();
        // 配置
        this.config = {
            camera: {
                position: new THREE.Vector3(0, 0, 10),
                far: 500.0,
                near: 1.0
            },
            scene: {
                background: new THREE.Color( 0x000000 )
            },
            outlinePass: {
                edgeStrength: 4.0,
				edgeGlow: 2.0,
				edgeThickness: 3.0,
				pulsePeriod: 0,
                edgeColor: new THREE.Color(0xffffff)
            },
            bloomPass: {
                enabled: false,
                threshold: 1,
                strength: 1,
                radius: 1,
            },
            debug: {
                ui: false,
                uiConfig: { }
            }
        };
 
        this.config.scene.background = config.scene.background || this.config.scene.background;

        if (config.hasOwnProperty('outlinePass')) {
            this.config.outlinePass.edgeColor = config.outlinePass.hasOwnProperty('edgeColor') ? config.outlinePass.edgeColor : this.config.outlinePass.edgeColor;
        } else {
            for (let p in config.outlinePass) {
                this.config.outlinePass[p] = config.outlinePass[p];
            }
        }
        
        this.config.camera.position = config.camera.position || this.config.camera.position;
        this.config.camera.far = config.camera.far || this.config.camera.far;
        this.config.camera.near = config.camera.near || this.config.camera.near;
        this.config.debug = config.debug || this.config.debug;

        if (config.hasOwnProperty('bloomPass')) {
            this.config.bloomPass.enabled = config.bloomPass.hasOwnProperty('enabled') ? config.bloomPass.enabled : this.config.bloomPass.enabled;
            this.config.bloomPass.threshold = config.bloomPass.hasOwnProperty('threshold') ? config.bloomPass.threshold : this.config.bloomPass.threshold;
            this.config.bloomPass.strength = config.bloomPass.hasOwnProperty('strength') ? config.bloomPass.strength : this.config.bloomPass.strength;
            this.config.bloomPass.radius = config.bloomPass.hasOwnProperty('radius') ? config.bloomPass.radius : this.config.bloomPass.radius;
        } else {
            for (let p in config.bloomPass) {
                this.config.bloomPass[p] = config.bloomPass[p];
            }
        }

        if (this.config.debug.ui === true) {
            this.debugUI = new GUI({
                width: 300
            });
            this.debugUI_object = this.debugUI.addFolder('当前物体');
            this.debugUI_object_prop = this.debugUI_object.addFolder('属性');
            this.debugUI_theme = this.debugUI.addFolder('主题');
            this.debugUI_func = this.debugUI.addFolder('功能');

            this.debugUI.domElement.style.zIndex = 999;
        }

        this.width = width;
        this.height = height;
        this.devicePixelRatio = window.devicePixelRatio;

        // 基础设施
        this.camera = new THREE.PerspectiveCamera( 45, this.width / this.height, 1, 200 );
        this.camera.position.copy(this.config.camera.position);
        this.camera.far = this.config.camera.far;
        this.camera.near = this.config.camera.near;
        this.camera.updateProjectionMatrix();
 
        this.scene = new THREE.Scene();
        this.renderer = new THREE.WebGLRenderer( { antialias: true } );
        this.renderer.setPixelRatio( this.devicePixelRatio );
        this.renderer.setSize( this.width, this.height );
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
        this.renderer.toneMappingExposure = 1;
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.physicallyCorretLights = true;
        this.renderer.gammaOutput = true;
 
        this.colorPicker = new ColorPicker2({
            width: this.width,
            height: this.height,
            renderer: this.renderer,
            camera: this.camera,
            scene: this.scene
        }); 

        this.directionalLight1 = new THREE.DirectionalLight( 0xffffff, 2 );
        this.directionalLight1.position.set( -1, 1, -1 );
        this.directionalLight1.target.position.set( 0, 0, 0 );
        this.scene.add(this.directionalLight1);

        this.directionalLight2 = new THREE.DirectionalLight( 0xffffff, 2 );
        this.directionalLight2.position.set( 1, 1, 1 );
        this.directionalLight2.target.position.set( 0, 0, 0 );
        this.scene.add(this.directionalLight2);

        this.directionalLight3 = new THREE.DirectionalLight( 0xffffff, 2 );
        this.directionalLight3.position.set( -1, 1, 1 );
        this.directionalLight3.target.position.set( 0, 0, 0 );
        this.scene.add(this.directionalLight3);

        this.directionalLight4 = new THREE.DirectionalLight( 0xffffff, 2 );
        this.directionalLight4.position.set( 1, 1, -1 );
        this.directionalLight4.target.position.set( 0, 0, 0 );
        this.scene.add(this.directionalLight4);

        this.directionalLight5 = new THREE.DirectionalLight( 0xffffff, 2 );
        this.directionalLight5.position.set( 0, 1, 0 );
        this.directionalLight5.target.position.set( 0, 0, 0 );
        this.scene.add(this.directionalLight5);
  
        // 背景
        this.scene.background = this.config.scene.background;

        // domElement 和 样式
        this.domElement = domElement;

        document.body.style.margin = 0;
        document.body.style.padding = 0;
        document.body.style.border = 0;
        document.body.style.backgroundColor = '#000';
        document.body.style.color = '#fff';
        document.body.style.fontFamily = 'monospace';
        document.body.style.fontSize = '13px';
        document.body.style.lineHeight = '24px';
        document.body.style.overscrollBehavior = 'none';

        this.htmlRenderer = new CSS2DRenderer();
        this.htmlRenderer.setSize( this.width, this.height );
        this.htmlRenderer.domElement.style.position = 'absolute';
        this.htmlRenderer.domElement.style.top = '0px';
        

        this.eventLayer = document.createElement('div');
        
        this.eventLayer.style.width = this.width + 'px';
        this.eventLayer.style.height = this.height + 'px';
        this.eventLayer.style.position = 'absolute';
        this.eventLayer.style.top = '0px';

        this.renderer.domElement.style.zIndex = ZINDEX.CANVAS_LAYER;
        this.htmlRenderer.domElement.style.zIndex = ZINDEX.CSS2D_LAYER;
        this.eventLayer.style.zIndex = ZINDEX.EVENT_LAYER;
 
        this.domElement.appendChild(this.renderer.domElement);
        this.domElement.appendChild(this.htmlRenderer.domElement);
        this.domElement.appendChild(this.eventLayer);

        if (this.config.debug.ui) {
            this.stats = new Stats();
            this.stats.showPanel(0);
            this.domElement.appendChild(this.stats.dom);
        } 

        // 后期
        this.msaaRenderTarget = new THREE.WebGLRenderTarget( this.width, this.height, { samples: 8 } );
        this.composer = new EffectComposer(this.renderer, this.msaaRenderTarget);

        this.renderPass = new RenderPass(this.scene, this.camera);
        this.composer.addPass(this.renderPass);

        this.ssrPass = new SSRPass({
            width: this.width,
            height: this.height,
            scene: this.scene,
            camera: this.camera
        });
        this.composer.addPass(this.ssrPass);
        // this.ssrPass.enabled = false;

        this.bloomPass = new UnrealBloomPass( new THREE.Vector2( this.width, this.height ), 1.5, 0.4, 0.85 );
        this.bloomPass.threshold = this.config.bloomPass.threshold;
        this.bloomPass.strength = this.config.bloomPass.strength;
        this.bloomPass.radius = this.config.bloomPass.radius;
        this.composer.addPass( this.bloomPass );
        this.bloomPass.enabled = this.config.bloomPass.enabled;

        this.saoPass = new SAOPass( this.scene, this.camera );
        this.composer.addPass( this.saoPass );

        // this.saoPass.params.output = SAOPass.OUTPUT.SAO;
        this.saoPass.params.saoBias = 0.6;
        this.saoPass.params.saoIntensity = 0.004;
        this.saoPass.params.saoScale = 2.0;
        this.saoPass.params.saoKernelRadius = 83;
        this.saoPass.params.saoMinResolution = 0;
        this.saoPass.params.saoBlur = true;
        this.saoPass.params.saoBlurRadius = 4;
        this.saoPass.params.saoBlurStdDev = 0.5;
        this.saoPass.params.saoBlurDepthCutoff = 0.02;
        this.saoPass.enabled = false;
   
        this.objStatusOutlinePass = new SimpleOutlinePass(new THREE.Vector2(this.width, this.height), this.scene, this.camera);
        this.composer.addPass(this.objStatusOutlinePass);

        this.objStatusOutlinePass.edgeStrength = 4.0;
        this.objStatusOutlinePass.edgeGlow = 2.0;
        this.objStatusOutlinePass.edgeThickness = 3.0;
        this.objStatusOutlinePass.pulsePeriod = 1;
        this.objStatusOutlinePass.edgeColor = new THREE.Color(0xff0000); 
  
        this.outlinePass = new SimpleOutlinePass(new THREE.Vector2(this.width, this.height), this.scene, this.camera);
        this.composer.addPass(this.outlinePass);

        this.outlinePass.edgeStrength = this.config.outlinePass.edgeStrength;
        this.outlinePass.edgeGlow = this.config.outlinePass.edgeGlow;
        this.outlinePass.edgeThickness = this.config.outlinePass.edgeThickness;
        this.outlinePass.pulsePeriod = this.config.outlinePass.pulsePeriod;
        this.outlinePass.edgeColor = this.config.outlinePass.edgeColor;
 
        this.effectFXAA = new ShaderPass( FXAAShader );
        this.effectFXAA.uniforms[ 'resolution' ].value.set( 1 / this.width, 1 / this.height );
        this.composer.addPass( this.effectFXAA );

        this.vignettePass = new VignettePass();
        this.composer.addPass( this.vignettePass );
        this.vignettePass.enabled = false;

        this.outputPass = new OutputPass();
        this.composer.addPass( this.outputPass );

        this.inputManager = new LocalInputManager(this.eventLayer);

        const controls = new OrbitControls( this.camera ); 

        this.inputManager.add(controls);

        if (!document.body.contains(this.domElement)) {
            document.body.appendChild( this.domElement );
        }

        this.inputManager.mouseInput.addEventListener(INPUT_CONST.INTERNAL_EVENT_RESIZE, this._onWindowResize.bind(this));
        
        this.inputManager.mouseInput.addEventListener(INPUT_CONST.INTERNAL_EVENT_CLICK, this._onClick.bind(this));
        this.inputManager.mouseInput.addEventListener(INPUT_CONST.INTERNAL_EVENT_DBCLICK, this._onDbClick.bind(this));

        this.inputManager.mouseInput.addEventListener(INPUT_CONST.INTERNAL_EVENT_MOVE, this._onPointerMove.bind(this));
        this.inputManager.mouseInput.addEventListener(INPUT_CONST.INTERNAL_EVENT_RCLICK, this._onContextMenu.bind(this));

        this.mouseOverObj = undefined;
        this.selectObj = undefined;
    }

    resize(width, height) {
        this.width = width;
        this.height = height;

        this.camera.aspect = this.width / this.height;
        this.camera.updateProjectionMatrix();

        this.renderer.setSize( this.width, this.height );
        this.composer.setSize( this.width, this.height );

        this.effectFXAA.uniforms[ 'resolution' ].value.set( 1 / this.width, 1 / this.height );
     
        this.colorPicker.resize(this.width, this.height);

        this.htmlRenderer.setSize( this.width, this.height );

        this.eventLayer.style.width = this.width + 'px';
        this.eventLayer.style.height = this.height + 'px';

        this.ssrPass.resize(this.width, this.height); 
    }

    fit(obj) {
        const box = obj.getBoundingBox();
   
        this.inputManager.getOrbitControls().fitTo(box, 0.5);
    }

    _clearDebugUIFolder(folder) {
        const children = [];

        for (let i = 0; i < folder.children.length; i++) {
            children.push(folder.children[i]);
        }

        for (let i = 0; i < children.length; i++) {
            children[i].destroy();
        } 
    }

    _onClick() {
        if (this.mouseOverObj !== undefined) {
            // 需要更新属性 debugUI_object_prop

            this.selectObj = this.mouseOverObj;
            if (this.config.debug.ui === true) {
                this._clearDebugUIFolder(this.debugUI_object_prop);

                const userData = this.selectObj.userData;

                for (let prop in userData) {
                    this.debugUI_object_prop.add(userData, prop).disable();
                }
            }

            this.outlinePass.selectedObjects = [this.selectObj];
            
            this.selectObj.dispatchEvent({ type: 'selected' });
        } else {
            if (this.config.debug.ui === true) {
                this._clearDebugUIFolder(this.debugUI_object_prop);
            }
            this.outlinePass.selectedObjects = [];
            if (this.selectObj !== undefined) {
                this.selectObj.dispatchEvent({ type: 'unselected' });
                this.selectObj = undefined;
            }
        }
    }

    _onDbClick() {
        // 仅第一个选择的进行事件分发
        if (this.mouseOverObj !== undefined) {
            this.mouseOverObj.dispatchEvent({ type: 'dblclick' });
        }
    }

    // _findFirstVisibleLevelLoop(level) {
    //     if (level.isVisible()) {
    //         return level;
    //     }

    //     for (let i = 0; i < level.children.length; i++) {
    //         if (level.children[i].isLevel) {
    //             const lev =  this._findFirstVisibleLevelLoop(level.children[i]);

    //             if (lev !== undefined) {
    //                 return lev;
    //             }
    //         }
    //     }

    //     return undefined;
    // }

    // _findFirstVisibleLevel() {
    //     for (let i = 0; i < this.scene.children.length; i++) {
    //         if (this.scene.children[i].isLevel) {
    //             const level = this._findFirstVisibleLevelLoop(this.scene.children[i]);

    //             if (level !== undefined) {
    //                 return level;
    //             }
    //         }
    //     }

    //     return undefined;
    // }

    _onWindowResize() {
        this.dispatchEvent({ type: 'resize' });
    }

    _onContextMenu() {
        this.dispatchEvent({ type: 'contextmenu' });
    }

    // _findVisibleLevels() {
    //     const visibleObjects = [];

    //     this.scene.traverse( object => {
    //         if ( object.isLevel && object.isVisible() ) {
    //             visibleObjects.push( object );
    //         }
    //     } );

    //     return visibleObjects;
    // }

    // _findSelectableObjects() {
    //     const visibleObjects = [];
    //     const levels = this._findVisibleLevels();

    //     levels.forEach((lev) => {
    //         lev.containerObj.traverse(object => {
    //             if (object.userData.selectable) {
    //                 visibleObjects.push(object);
    //             }
    //         });
    //     });

    //     return visibleObjects;
    // }

    _onPointerMove( event ) {
        // const objects = this._findSelectableObjects();
        // const obj = this.colorPicker.pick(event.data.x, event.data.y, objects);
        const obj = this.colorPicker.pick(event.data.x, event.data.y);
        // console.log(event.data.x, event.data.y);
        // const me = this;

        if (obj !== undefined) {

            this.mouseOverObj = obj;

            // 处理 label
            // console.log(obj);
            // if (this.currentLabel.parent) {
            //     this.currentLabel.parent.remove(this.currentLabel);
            // }

            // this.currentLabel.element.textContent = obj.userData.name;
            // let y = this.currentLabel.position.y;
            // obj.traverse(sub => {
            //     if (sub.isMesh) {
            //         const box = sub.geometry.boundingBox;

            //         if (!box) {
            //             sub.geometry.computeBoundingBox();
            //             box = sub.geometry.boundingBox;
            //         }

            //         // console.log(box);
            //         y = (box.max.y + (box.max.y - box.min.y) / 2.0) * me.scene.scale.y;
            //     }
            // });

            // this.currentLabel.position.y = y;
            // obj.add(this.currentLabel);
 
            // if (this.currentSelectObj === undefined || this.currentSelectObj === obj) {
            //     this.outlinePass.selectedObjects = [ obj ];
            // } else {
            //     this.outlinePass.selectedObjects = [ obj, this.currentSelectObj ];
            // } 
        } else {

            this.mouseOverObj = undefined;
            // if (this.currentLabel.parent) {
            //     this.currentLabel.parent.remove(this.currentLabel);
            // }

            // this.outlinePass.selectedObjects = [];
        }

        this.outlinePass.selectedObjects = [];

        if (this.mouseOverObj !== undefined) {
            this.outlinePass.selectedObjects.push(this.mouseOverObj);
        }

        if (this.selectObj !== undefined && this.selectObj !== this.mouseOverObj) {
            this.outlinePass.selectedObjects.push(this.selectObj);
        }
    }

    // 左上角 是 0， 0
    _transScreenToWorld(screen) {
        // const world = new THREE.Vector3();

        const bufY = screen.y;

        const vecX = (screen.x / this.width) * 2 - 1;
        const vecY = -(bufY / this.height) * 2 + 1;
        const vec = new THREE.Vector3(vecX, vecY, 0);

        vec.unproject(this.camera);
        // vec.sub(this.camera.position).normalize();

        // const distance = -this.camera.position.z / vec.z;
        // world.copy(this.camera.position).add(vec.multiplyScalar(distance));
 
        // return world;
        return vec;
    }

    queryByNames(...name) {
        const rets = [];
        this.scene.traverse((obj) => {
            if (obj.userData.name !== undefined && name.indexOf(obj.userData.name) !== -1) {
                rets.push(obj);
            }
        });
 
        return rets;
    }

    queryByName(name) {
        const rets = this.queryByNames(name);

        if (rets.length !== 0) {
            return rets[0];
        }

        return null;
    }

    alarm(...objName) {
        const objs = this.queryByNames(...objName);
 
        if (objs.length === 0) {
            return;
        }
        
        for (let i = 0; i < objs.length; i++) {
            const index = this.objStatusOutlinePass.selectedObjects.indexOf(objs[i]);

            if (index !== -1) {
                continue;
            }
    
            this.objStatusOutlinePass.selectedObjects.push(objs[i]);
        }
    }

    cancelAlarm(... objName) {
        const objs = this.queryByNames(...objName);

        if (objs.length === 0) {
            return;
        }

        for (let i = 0; i < objs.length; i++) {
            const index = this.objStatusOutlinePass.selectedObjects.indexOf(objs[i]);

            if (index === -1) {
                continue;
            }
    
            this.objStatusOutlinePass.selectedObjects.splice(index, 1);
        }
    }

    clearAlarm(){
        this.objStatusOutlinePass.selectedObjects.splice(0, this.objStatusOutlinePass.selectedObjects.length);
    }

    screenAlarm() {
        this.vignettePass.enabled = true;
    }

    cancelScreenAlarm() {
        this.vignettePass.enabled = false;
    }

    start() {
        const me = this;
        let currentMs = 0;

        function loop(ms) {
            const delay = ms - currentMs;
            currentMs = ms;
 
            requestAnimationFrame(loop);

            if (me.stats) me.stats.begin();

            me.inputManager.update(delay);
 
            ThreeMeshUI.update();
            me.htmlRenderer.render(me.scene, me.camera);

            me.dispatchEvent({ type: 'beforerenderer' });
            me.composer.render(); 
            me.dispatchEvent({ type: 'afterrenderer' });

            if (me.stats) me.stats.end();
        }

        requestAnimationFrame(loop);
    }
}

export { ParkApp };
