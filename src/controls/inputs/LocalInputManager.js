import { InputManager } from "./InputManager.js";
import { MouseInput } from "./MouseInput.js";
import * as CONST from "./const.js";

function handlerFunction (event) { 
    this.fire(event);
}

export class LocalInputManager extends InputManager {
    constructor(canvas) {
        super();

        this.canvas = canvas;

        // mouse
        this.mouseInput = new MouseInput(this.canvas);
        
        this.mouseInput.addEventListener(CONST.INTERNAL_EVENT_ZOOM, handlerFunction.bind(this));
        this.mouseInput.addEventListener(CONST.INTERNAL_EVENT_ROTATE, handlerFunction.bind(this));
        this.mouseInput.addEventListener(CONST.INTERNAL_EVENT_PAN, handlerFunction.bind(this));
        this.mouseInput.addEventListener(CONST.INTERNAL_EVENT_CLICK, handlerFunction.bind(this));
        this.mouseInput.addEventListener(CONST.INTERNAL_EVENT_DBCLICK, handlerFunction.bind(this));
        this.mouseInput.addEventListener(CONST.INTERNAL_EVENT_MOVE, handlerFunction.bind(this));
        this.mouseInput.addEventListener(CONST.INTERNAL_EVENT_RESIZE, handlerFunction.bind(this));

        this.mouseInput.setupGlobalInputBindings(document);
        this.mouseInput.setupCanvasInputBindings();
    }

    update(delay) {
        this.fire({
            type: '_update',
            data: {
                delay
            }
        })
    }

    getOrbitControls() {
        return this.controls[0];
    }
}