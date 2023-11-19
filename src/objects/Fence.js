import {
    Group,
    Clock,
    Box3,
    Shape,
    Vector2
} from '../libs/three/current/three.module.js';

import { CustomExtrudeGeometry } from '../geometries/CustomExtrudeGeometry.js';

const FenceUVGenerator = {

	generateTopUV: function ( geometry, vertices, indexA, indexB, indexC ) {
 
        return [
			new Vector2( 1, 1 ),
			new Vector2( 1, 1 ),
			new Vector2( 1, 1 )
		];
	},

    generateBottomUV: function ( geometry, vertices, indexA, indexB, indexC ) {
  
        return [
			new Vector2( 0, 0 ),
			new Vector2( 0, 0 ),
			new Vector2( 0, 0 )
		];
	},

	generateSideWallUV: function ( geometry, vertices, indexA, indexB, indexC, indexD ) {
 
        return [
            new Vector2( 1, 0 ),
            new Vector2( 1, 0 ),
            new Vector2( 0, 1 ),
            new Vector2( 0, 1 )
        ];

	}

};

export class Fence extends Group {
    constructor(options) {
        super();

        this.height = options.height;
        this.extension = options.extension;

        this.isFence = true;
        this.clock = new Clock();
        this.uniformTimeRef = {
            value: this.clock.getElapsedTime()
        };

        this.geometry = undefined;
        if (options.shape !== undefined) {
            this.setGeometryFromShape(options.shape);
        } else if (options.objects !== undefined) { 
            this.setGeometryFromObjects(...options.objects);
        }
    }

    setGeometryFromObjects(...objs) {
        const box = new Box3();
        const points = [];

        for (let i = 0; i < objs.length; i++) {
            const boundingBox = objs[i].getBoundingBox();

            points.push(boundingBox.min);
            points.push(boundingBox.max);
        }

        box.setFromPoints(points);

        // console.log(box);

        const shape = new Shape();

        shape.moveTo(box.min.x - this.extension, box.min.z - this.extension);
        shape.lineTo(box.max.x + this.extension, box.min.z - this.extension);
        shape.lineTo(box.max.x + this.extension, box.max.z + this.extension);
        shape.lineTo(box.min.x - this.extension, box.max.z + this.extension);
        shape.lineTo(box.min.x - this.extension, box.min.z - this.extension);

        this.setGeometryFromShape(shape);
    }

    setGeometryFromShape(shape) {
        this.geometry = new CustomExtrudeGeometry(shape, {
            steps: 1,
            depth: -this.height,
            bevelEnabled: false,
            bevelThickness: 1,
            bevelSize: 0,
            bevelOffset: 0,
            bevelSegments: 1,
            UVGenerator: FenceUVGenerator
        });
        this.geometry.rotateX(90 * Math.PI / 180);
    }

    updateTime() {
        this.uniformTimeRef.value = this.clock.getElapsedTime();
    }
}
