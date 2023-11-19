import * as THREE from '../../libs/three/current/three.module.js';
import * as CONST from './const.js';

export class MouseInput extends THREE.EventDispatcher { 
    constructor(canvas) {
        super();
        this.canvas = canvas;

        this.mouseDown = false;
        this.pressedButton = undefined;
        this.lastMouseX = 0;
        this.lastMouseY = 0;
        this.orignMouseX = 0;
        this.orignMouseY = 0;
        this.enterCanvas = true;

        this.timeout = setTimeout(() => {}, 0);
        this.dbclickFlag = false;
        this.dbclickTime = 250;

        this.mouseMoveTimeout = setTimeout(() => {}, 0);
        this.mouseMoveTime = 5;

        // 屏蔽右键菜单
        document.oncontextmenu = () => false;
    }

    setupGlobalInputBindings(document) {
        const me = this;

        document.addEventListener('mouseup', this.mouseUpHandler.bind(this), {
            passive: true
        });
        document.addEventListener('mousemove', function (event) {
            clearTimeout(me.mouseMoveTimeout);

            me.mouseMoveTimeout = setTimeout(() => {
                me.mouseMoveHandler(event);
            }, me.mouseMoveTime);
        }, {
            passive: true
        });
        document.addEventListener('wheel', this.mouseDcumentWheelHandler.bind(this), {
            passive: false
        });
        window.addEventListener('resize', this.mouseWindowResizeHandler.bind(this), {
            passive: false
        });
    }

    setupCanvasInputBindings() {
        this.canvas.addEventListener('mousedown', this.mouseDownHandler.bind(this), {
            passive: true
        });
        this.canvas.addEventListener('wheel', this.mouseWheelHandler.bind(this), {
            passive: true
        });
        this.canvas.addEventListener('mouseenter', this.mouseEnterHandler.bind(this), {
            passive: true
        });
        this.canvas.addEventListener('mouseleave', this.mouseLeaveHandler.bind(this), {
            passive: true
        });
    }

    mouseWindowResizeHandler() {
        const width = this.canvas.clientWidth;
        const height = this.canvas.clientHeight;

        this.dispatchEvent({
            type: CONST.INTERNAL_EVENT_RESIZE,
            data: {
                width: width,
                height: height,
            }
        });
    }

    mouseDownHandler(event) {
        this.mouseDown = true;
        this.pressedButton = event.button;
        this.lastMouseX = event.clientX;
        this.lastMouseY = event.clientY;
        this.orignMouseX = event.clientX;
        this.orignMouseY = event.clientY;
        this.canvas.style.cursor = 'none';
    }

    mouseUpHandler(event) {
        const me = this;
        this.mouseDown = false;
        this.pressedButton = undefined;
        this.canvas.style.cursor = 'grab';
        if (event.clientX - this.orignMouseX === 0 && event.clientY - this.orignMouseY === 0) {
            // 点击事件
            // console.log(event.button);
            if (event.button === 0) {
                clearTimeout(this.timeout);
                if (this.dbclickFlag) {
                    this.dbclickFlag = false;
                    // console.log('dbclick');
                    this.dispatchEvent({
                        type: CONST.INTERNAL_EVENT_DBCLICK,
                        data: {
                            x: event.offsetX,
                            y: event.offsetY,
                        }
                    });
                } else {
                    this.dbclickFlag = true;
                    this.timeout = setTimeout(() => {
                        this.dbclickFlag = false;
                        // console.log('click');
                        me.dispatchEvent({
                            type: CONST.INTERNAL_EVENT_CLICK,
                            data: {
                                x: event.offsetX,
                                y: event.offsetY,
                            }
                        });
                    }, this.dbclickTime);
                }
            } else if (event.button === 2) {
                clearTimeout(this.timeout);
                this.dbclickFlag = false;
                me.dispatchEvent({
                    type: CONST.INTERNAL_EVENT_RCLICK,
                    data: {
                        x: event.offsetX,
                        y: event.offsetY,
                    }
                });
            }
        }
    }

    mouseMoveHandler(event) {
        if (!this.mouseDown) {
            this.canvas.style.cursor = 'grab';
        }

        const deltaX = event.clientX - this.lastMouseX;
        const deltaY = event.clientY - this.lastMouseY;

        this.lastMouseX = event.clientX;
        this.lastMouseY = event.clientY;

        switch (this.pressedButton) {
            case CONST.INPUT_ROTATE:
                this.dispatchEvent({
                    type: CONST.INTERNAL_EVENT_ROTATE,
                    data: {
                        x: deltaX,
                        y: deltaY,
                    }
                });
                break;
            case CONST.INPUT_PAN:
                this.dispatchEvent({
                    type: CONST.INTERNAL_EVENT_PAN,
                    data: {
                        x: deltaX,
                        y: deltaY,
                    }
                });
                break;
            default:
                this.dispatchEvent({
                    type: CONST.INTERNAL_EVENT_MOVE,
                    data: {
                        x: event.offsetX,
                        y: event.offsetY,
                    }
                });
        }
    }

    mouseWheelHandler(event) {
        if (Math.abs(event.deltaY) < CONST.ZoomThreshold) {
            return;
        }

        this.canvas.style.cursor = 'none';
        this.dispatchEvent({
            type: CONST.INTERNAL_EVENT_ZOOM,
            data: {
                value: event.deltaY,
            }
        });
    }

    mouseEnterHandler() {
        this.enterCanvas = true;
    }
    mouseLeaveHandler() {
        this.enterCanvas = false;
    }
    mouseDcumentWheelHandler(event) {
        if (this.enterCanvas) {
            event.preventDefault();
        }
    }
}