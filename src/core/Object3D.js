import {
    Object3D,
    Box3
} from '../libs/three/current/three.module.js';

function findLevel(obj) {
    if (obj === undefined) {
        return undefined;
    }

    if (obj.parent === undefined) {
        return undefined;
    }

    if (obj.parent.isLevel) {
        return obj.parent;
    }

    return findLevel(obj.parent);
}

Object3D.prototype.getLevel = function() {
    return findLevel(this);
}

Object3D.prototype.getBoundingBox = function() {

    if (this.boundingBox !== undefined) {
        return this.boundingBox;
    }

    const boundingBox = new Box3();
    boundingBox.setFromObject(this, true);

    this.boundingBox = boundingBox;

    return this.boundingBox;
}

Object3D.prototype.getBoundingBoxNotSet = function() {

    const boundingBox = new Box3();
    boundingBox.setFromObject(this, true);

    return boundingBox;
}
