import {
    Group,
    Clock
} from '../libs/three/current/three.module.js';

export class Ground extends Group {
    constructor() {
        super();

        this.isGround = true;
        this.clock = new Clock();
        this.uniformTimeRef = {
            value: this.clock.getElapsedTime()
        };
    }

    updateTime() { 
        this.uniformTimeRef.value = this.clock.getElapsedTime();
    }
}