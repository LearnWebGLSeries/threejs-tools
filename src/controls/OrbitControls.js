import * as THREE from '../libs/three/current/three.module.js';
import * as CONST from './inputs/const.js';

// const VecZero = new THREE.Vector3(0, 0, 0);
const _xAxis = /*@__PURE__*/ new THREE.Vector3( 1, 0, 0 );
const _yAxis = /*@__PURE__*/ new THREE.Vector3( 0, 1, 0 );
const _zAxis = /*@__PURE__*/ new THREE.Vector3( 0, 0, 1 );

function clamp (number, min, max) {
    return Math.min(Math.max(number, min), max);
}

export class OrbitControls extends THREE.EventDispatcher {
    constructor(camera) {
        super();

        if (!camera.isPerspectiveCamera) {
            console.warn('this is just for PerspectiveCamera!');
            return;
        }

        this.camera = camera;
        // this.domElement = domElement;
        this.target = new THREE.Vector3();

        this.pauseFlag = false;

        this.xRot = 0;
        this.yRot = 0;
        // this.zoomValue = 0;

        /**
         * 相机旋转因子
         */
        this.rotateFactor = 1 / 60;
        /**
         * 相机X轴加速度
         */
        this.rotateAccX = 0;
        /**
         * 相机Y轴加速度
         */
        this.rotateAccY = 0;
        /**
         * 相机X轴旋转角速度
         */
        this.rotateSpeedX = 0;
        /**
         * 相机Y轴旋转角速度
         */
        this.rotateSpeedY = 0;

        /**
         * 摄像机缩放参数
         */
        this.zoomValue = 0;
        /**
         * 相机缩放因子
         */
        // this.zoomFactor = 6;
        this.zoomFactor = 3;
        /**
         * 缩放速度
         */
        this.zoomSpeed = 0;
        /**
         * 缩放加速度
         */
        this.zoomAcc = 0;

        /**
         * 向左平移速度
         */
        this.moveSpeedLeft = 0;
        /**
         * 向上平移速度
         */
        this.moveSpeedUp = 0;
        /**
         * 向左平移加速度
         */
        this.moveAccLeft = 0;
        /**
         * 向上平移加速度
         */
        this.moveAccUp = 0;
        /**
         * 平移因子
         */
        this.moveFactor = 0.1;

        /**
         * 缩放因子
         */
        this.scaleFactor = 1;
        /**
         * 加速因子
         */
        // this.accFactor = 1.8;
        this.accFactor = 3.6;

        this.addEventListener("_update", this.update.bind(this));
        this.addEventListener(CONST.INTERNAL_EVENT_ZOOM, this.zoom.bind(this));
        this.addEventListener(CONST.INTERNAL_EVENT_ROTATE, this.rotate.bind(this));
        this.addEventListener(CONST.INTERNAL_EVENT_PAN, this.pan.bind(this));

        this.explain(this.camera, this.target);
    }

    zoom(event) {
        if (this.pauseFlag) {
            return;
        }
        const value = event.data.value;

        if (value > 0) {
            this.zoomSpeed += this.zoomFactor;
        } else {
            this.zoomSpeed -= this.zoomFactor;
        }
        this.zoomAcc = Math.abs(this.zoomSpeed * this.accFactor);
    }

    rotate(event) {
        if (this.pauseFlag) {
            return;
        }
        const { x, y } = event.data;
        
        this.rotateSpeedX += x * this.rotateFactor;
        this.rotateSpeedY += y * this.rotateFactor;
        this.rotateAccX = Math.abs(this.rotateSpeedX * this.accFactor);
        this.rotateAccY = Math.abs(this.rotateSpeedY * this.accFactor);
    }

    pan(event) {
        if (this.pauseFlag) {
            return;
        }
        // const { x, y } = event.data;

        // this.moveSpeedLeft += x * this.moveFactor;
        // this.moveSpeedUp += y * this.moveFactor;
        // this.moveAccLeft = Math.abs(this.moveSpeedLeft * this.accFactor);
        // this.moveAccUp = Math.abs(this.moveSpeedUp * this.accFactor);
    }

    update(event) {
        if (this.pauseFlag) {
            return;
        }

        this.updateCamera(event);
    }

    updateCamera(event) {
        // 以 单位秒 计算
        const delayTimeBuf = event.data.delay / 1000;

        // 移动控制
        if (this.moveSpeedLeft !== 0) {
            const dirLeft = Math.abs(this.moveSpeedLeft) / this.moveSpeedLeft;
            const left = new THREE.Vector3(-1, 0, 0);

            this.toLocalRotation(left);
            left.multiplyScalar(this.moveSpeedLeft * delayTimeBuf);
            this.moveSpeedLeft = dirLeft * Math.max(Math.abs(this.moveSpeedLeft) - this.moveAccLeft * delayTimeBuf, 0);
            this.target.add(left);
        }

        if (this.moveSpeedUp !== 0) {
            const dirUp = Math.abs(this.moveSpeedUp) / this.moveSpeedUp;
            const up = new THREE.Vector3(0, 1, 0);

            this.toLocalRotation(up);
            up.multiplyScalar(this.moveSpeedUp * delayTimeBuf);
            this.moveSpeedUp = dirUp * Math.max(Math.abs(this.moveSpeedUp) - this.moveAccUp * delayTimeBuf, 0);
            this.target.add(up);
        }
        // 旋转控制
        if (this.rotateSpeedX !== 0) {
            const dirX = Math.abs(this.rotateSpeedX) / this.rotateSpeedX;

            this.xRot += this.rotateSpeedX * delayTimeBuf;
            this.rotateSpeedX = dirX * Math.max(Math.abs(this.rotateSpeedX) - this.rotateAccX * delayTimeBuf, 0);
        }

        if (this.rotateSpeedY !== 0) {
            const dirY = Math.abs(this.rotateSpeedY) / this.rotateSpeedY;

            this.yRot += this.rotateSpeedY * delayTimeBuf;
            this.rotateSpeedY = dirY * Math.max(Math.abs(this.rotateSpeedY) - this.rotateAccY * delayTimeBuf, 0);
        }
        // const yMax = Math.PI / 2 - 0.01;

        this.yRot = clamp(this.yRot, Math.PI / 36, Math.PI / 3);

        // 滚轮控制
        // calculate direction from focus to camera (assuming camera is at positive z)
        // yRot rotates *around* x-axis, xRot rotates *around* y-axis
        const direction = new THREE.Vector3(0, 0, 1);

        this.toLocalRotation(direction);

        const position = new THREE.Vector3(0, 0, 0);

        if (this.zoomSpeed !== 0) {
            const dir = Math.abs(this.zoomSpeed) / this.zoomSpeed;

            this.zoomValue += this.zoomSpeed * delayTimeBuf;
            this.zoomSpeed = dir * Math.max(Math.abs(this.zoomSpeed) - this.zoomAcc * delayTimeBuf, 0);
        }
        this.zoomValue = clamp(this.zoomValue, this.camera.near, this.camera.far);
        direction.multiplyScalar(this.zoomValue);
        position.copy(direction);
        position.add(this.target);

        if (position.y < 0.1) {
            position.y = 0.1;
        } 

        this.camera.position.set(position.x, position.y, position.z);
        this.camera.lookAt(this.target);
    }

    toLocalRotation(vector) {
        vector.applyAxisAngle(_xAxis, -this.yRot);
        vector.applyAxisAngle(_yAxis, -this.xRot);
    }

    explain(camera, target) {
        // 将camera的参数 解析到 xRot yRot 和 zoomValue
        const position = new THREE.Vector3(0, 0, 0);

        position.copy(camera.position);
        position.sub(target);

        this.zoomValue = position.length();
        this.xRot = -Math.atan(camera.position.x / camera.position.z) + Math.PI;
        const buf = new THREE.Vector2(camera.position.x, camera.position.z);

        this.yRot = Math.atan(camera.position.y / buf.length());

        this.update({
            data: {
                delay: 0
            }
        });
    }

    pause() {
        this.pauseFlag = true;
    }

    resume() {
        this.pauseFlag = false;
    }

    targetTo(tg, seconds) {
        const me = this;
        me.pause(); 
        const dir = new THREE.Vector3(0, 0, 0);

        dir.copy(tg).sub(me.target);

        const len = dir.length();
        const speed = len / seconds; // 单位每秒

        dir.normalize();

        let time = 0;

        const func = function(event) {
            const delaySeconds = event.data.delay / 1000;
            time += delaySeconds;

            if (time >= seconds) {
                // 最终确认一下 位置
                this.target.copy(tg);
                this.updateCamera(event);
 
                me.removeEventListener("_update", func);
                me.resume();
                return;
            }

            // debugger;

            const scalar = delaySeconds * speed;
            const buff = new THREE.Vector3(0, 0, 0);

            buff.copy(dir);

            me.target.add(buff.multiplyScalar(scalar));
            me.updateCamera(event);
        };

        me.addEventListener("_update", func);
    }

    fitTo(box3, seconds) {
        const me = this;
        me.pause(); 

        // target
        const tg = box3.getCenter(new THREE.Vector3());
        const dir = new THREE.Vector3(0, 0, 0);

        dir.copy(tg).sub(me.target);

        const len = dir.length();
        const speed = len / seconds; // 单位每秒
 
        dir.normalize();

        // zoom
        const viewLen = box3.getSize(new THREE.Vector3()).length();
        const yfov = this.camera.fov * Math.PI / 180;
        const xfov = yfov * this.camera.aspect;
        const yZoom = viewLen / 2 / Math.tan(yfov / 2);
        const xZoom = viewLen / 2 / Math.tan(xfov / 2);

        const zoomFinal = Math.max(xZoom, yZoom);
        const zoomSpeed = (zoomFinal - this.zoomValue) / seconds;

        let time = 0;

        const func = function(event) {
            const delaySeconds = event.data.delay / 1000;
            time += delaySeconds;

            if (time >= seconds) {
                // 最终确认一下 位置
                me.target.copy(tg);
                me.zoomValue = zoomFinal;
                me.updateCamera(event);
 
                me.removeEventListener("_update", func);
                me.resume();
                return;
            }

            // debugger;

            // zoom
            const scalar = delaySeconds * speed;
            const buff = new THREE.Vector3(0, 0, 0);

            buff.copy(dir);

            me.target.add(buff.multiplyScalar(scalar));

            // target
            me.zoomValue = me.zoomValue + (zoomSpeed * delaySeconds);
            me.updateCamera(event);
        };

        me.addEventListener("_update", func);
    }
}