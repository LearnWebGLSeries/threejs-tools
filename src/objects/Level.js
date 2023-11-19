import {
    Group
} from '../libs/three/current/three.module.js';

function searchChildrenLevelToShow (obj) {
    if (obj.isLevel) {
        obj.show();
        return;
    }

    if (obj.children !== undefined && obj.children.length > 0) {
        for (let i = 0; i < obj.children.length; i++) {
            searchChildrenLevelToShow(obj.children[i]);
        }
    }
}

class Level extends Group {
    constructor() {
        super();

        this.containerObj = new Group();
        super.add(this.containerObj);
        this.isLevel = true;
    }

    hasChildrenLevel() {
        for (let i = 0; i < this.children.length; i++) {
            if (this.children[i].isLevel) {
                return true;
            }
        }
        return false;
    }

    showChildrenLevels() {
        for (let i = 0; i < this.children.length; i++) {
            searchChildrenLevelToShow(this.children[i]);
        }
    }

    hideSameLevels() {
        if (this.parent.isScene || this.parent.isLevel) {
            for (let i= 0; i < this.parent.children.length; i++) {
                const obj = this.parent.children[i];
                if (obj !== this && obj.isLevel) {
                    obj.hide();
                }
            }
        }
    }

    showSameLevels() {
        if (this.parent.isScene || this.parent.isLevel) {
            for (let i= 0; i < this.parent.children.length; i++) {
                const obj = this.parent.children[i];
                if (obj !== this && obj.isLevel) {
                    obj.show();
                }
            }
        }
    }

    hasHiddenSameLevel() {
        if (this.parent.isScene || this.parent.isLevel) {
            for (let i= 0; i < this.parent.children.length; i++) {
                const obj = this.parent.children[i];
                if (obj.isLevel && !obj.isVisible()) {
                    return true;
                }
            }
        }
        return false;
    }

    focus() {
        this.hideSameLevels();
    }

    // 将下一个层级的所有内容显示
    next() {
        if (this.hasChildrenLevel()) {
            this.hide();
            this.showChildrenLevels();
        }
        //  else {
        //     console.warn('no children found !');
        // }
    }

    // 查找上一个层级
    pre() {
        const flag = this.hasHiddenSameLevel();
        // console.log(flag);
        if (flag) {
            this.showSameLevels();
        } else {
            if (this.parent.isLevel) {
                this.hide();
                this.hideSameLevels();
                this.parent.show();
            }
        }
    }

    isVisible() {
        return this.containerObj.visible;
    }

    add(obj) {
        if (obj.isLevel) {
            obj.hide();
            super.add(obj);
        } else {
            this.containerObj.add(obj);
        }
    }

    hide () {
        this.containerObj.visible = false;
    }

    show () {
        this.containerObj.visible = true;

        if (this.containerObj.children.length === 0) {
            this.next();
        }
    }
}

export { Level };