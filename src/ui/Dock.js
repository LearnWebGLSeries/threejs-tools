export class Dock {
    constructor(app, zIndex = 19) {
        this.app = app;

        this.domElement = document.createElement('div');
        this.domElement.style.zIndex = zIndex;
        this.domElement.style.position = 'absolute';
        this.domElement.style.left = '0px';
        this.domElement.style.top = '0px';
        this.domElement.style.width = '300px';
        // this.domElement.style.bottom = '0px';
        // this.domElement.style.backdropFilter = 'blur(10px)';
        this.domElement.style.overflow = 'hidden';

        app.domElement.appendChild(this.domElement);

        this.children = [];
    }

    add(panel) {
        this.children.push(panel);
        this.domElement.appendChild(panel.domElement);
    }

    clear() {
        for (let i = 0; i < this.children.length; i++) {
            this.children[i].destroy();
            this.domElement.removeChild(this.children[i].domElement);
        }

        this.children.splice(0, this.children.length);
    }
}