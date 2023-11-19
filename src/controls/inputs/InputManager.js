export class InputManager {
    constructor() {
        this.controls = [];
    }

    /**
     * 激发事件
     */
    fire(event) {
        for (let i = 0; i < this.controls.length; i++) {
            this.controls[i].dispatchEvent(event);
        }
    }

    /**
     * 添加控制器 用于对控制器的唤醒
     */
    add(control) {
        this.controls.push(control);
    }

    clear() {
        this.controls.splice(0, this.controls.length);
    }

    update(delay) {}

    pause() {
        for (let i = 0; i < this.controls.length; i++) {
            this.controls[i].pause();
        }
    }

    resume() {
        for (let i = 0; i < this.controls.length; i++) {
            this.controls[i].resume();
        }
    }
}