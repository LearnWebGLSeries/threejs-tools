import { Line2 } from '../jsm/lines/Line2.js';
import { LineMaterial } from '../jsm/lines/LineMaterial.js';
import { LineGeometry } from '../jsm/lines/LineGeometry.js';

function updateFunc() {
    const me = this;
    const app = me.app;

    const world = app._transScreenToWorld(new THREE.Vector2(me.domElement.offsetLeft + me.domElement.offsetWidth, me.domElement.offsetTop + 1));
    const world2 = app._transScreenToWorld(new THREE.Vector2(me.domElement.offsetLeft + me.domElement.offsetWidth + 30, me.domElement.offsetTop + 1));
    // debugger;
    // console.log(me.position, world, world2);
    me.geometry.setPositions( [me.position.x, me.position.y, me.position.z, world2.x, world2.y, world2.z, world.x, world.y, world.z] );
    me.line.computeLineDistances();
}

export class DockPanel {
    constructor(app, position) {
        this.app = app;

        this.domElement = document.createElement('div');

        this.domElement.style.position = 'relative';
        this.domElement.style.height = '30px';
        this.domElement.style.opacity = 0.8; 
        this.domElement.style.border = '1px solid #3EE5E7';
        this.domElement.style.borderRadius = '10px 0px 10px 0px';
        this.domElement.style.margin = '5px 0px 5px 5px';
        this.domElement.style.padding = '5px';

        this.position = position;

        // 增加线

        this.geometry = new LineGeometry();
        this.material = new LineMaterial({
            color: 0x3EE5E7,
            linewidth: 0.001, // in world units with size attenuation, pixels otherwise
            vertexColors: false,

            //resolution:  // to be set by renderer, eventually
            dashed: false,
            alphaToCoverage: true,
        });
        this.line = new Line2(this.geometry, this.material);
        // this.line.computeLineDistances();
        app.scene.add(this.line);

        this.bindUpdateFunc = updateFunc.bind(this);
  
        app.addEventListener('beforerenderer', this.bindUpdateFunc);
    }

    destroy () {
        this.app.removeEventListener('beforerenderer', this.bindUpdateFunc);
        this.app.scene.remove(this.line);
    }
}