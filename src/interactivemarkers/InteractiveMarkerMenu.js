/**
 * @fileOverview 交互式标记的菜单。这将覆盖在画布上。
 */

import { EventEmitter } from "eventemitter3";

/**
 * @class InteractiveMarkerMenu
 * @description 一个用于交互式标记的菜单。这将覆盖在画布上。
 * @param {object} options - 配置选项。
 * @param {object[]} options.menuEntries - 要添加的菜单条目。
 * @param {string} [options.className='default-interactive-marker-menu'] - 菜单div的自定义CSS类。
 * @param {string} [options.entryClassName='default-interactive-marker-menu-entry'] - 菜单条目的自定义CSS类。
 * @param {string} [options.overlayClassName='default-interactive-marker-overlay'] - 菜单覆盖层的自定义CSS类。
 * @param {string} [options.menuFontSize='0.8em'] - 菜单字体大小。
 */
export class InteractiveMarkerMenu extends EventEmitter {
  constructor(options = {}) {
    super();
    const {
      menuEntries,
      className = "default-interactive-marker-menu",
      entryClassName = "default-interactive-marker-menu-entry",
      overlayClassName = "default-interactive-marker-overlay",
      menuFontSize = "0.8em",
    } = options;

    // 菜单树
    const allMenus = [];
    allMenus[0] = {
      children: [],
    };

    // 如果尚未创建，生成CSS样式
    if (
      document.getElementById("default-interactive-marker-menu-css") === null
    ) {
      const style = document.createElement("style");
      style.id = "default-interactive-marker-menu-css";
      style.type = "text/css";
      style.innerHTML = `
        .${className} {
          background-color: #444444;
          border: 1px solid #888888;
          padding: 0px;
          color: #FFFFFF;
          font-family: sans-serif;
          font-size: ${menuFontSize};
          z-index: 1002;
          position: absolute;
        }
        .${className} ul {
          padding: 0px 0px 5px 0px;
          margin: 0px;
          list-style-type: none;
        }
        .${className} ul li div {
          -webkit-touch-callout: none;
          -webkit-user-select: none;
          -khtml-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
          user-select: none;
          cursor: default;
          padding: 3px 10px 3px 10px;
        }
        .${entryClassName}:hover {
          background-color: #666666;
          cursor: pointer;
        }
        .${className} ul ul {
          font-style: italic;
          padding-left: 10px;
        }
        .${overlayClassName} {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-color: black;
          z-index: 1001;
          opacity: 0;
        }
      `;
      document.getElementsByTagName("head")[0].appendChild(style);
    }

    // 将菜单放在一个div中
    this.menuDomElem = document.createElement("div");
    this.menuDomElem.className = className;
    this.menuDomElem.addEventListener("contextmenu", (event) => {
      event.preventDefault();
    });

    // 创建覆盖层DOM
    this.overlayDomElem = document.createElement("div");
    this.overlayDomElem.className = overlayClassName;

    this.hideListener = this.hide.bind(this);
    this.overlayDomElem.addEventListener("contextmenu", this.hideListener);
    this.overlayDomElem.addEventListener("click", this.hideListener);
    this.overlayDomElem.addEventListener("touchstart", this.hideListener);

    // 解析所有条目并链接子项到父项
    menuEntries.forEach((entry) => {
      allMenus[entry.id] = {
        title: entry.title,
        id: entry.id,
        children: [],
      };
    });
    menuEntries.forEach((entry) => {
      const menu = allMenus[entry.id];
      const parent = allMenus[entry.parent_id];
      if (parent) {
        parent.children.push(menu);
      }
    });

    const emitMenuSelect = (menuEntry, domEvent) => {
      this.emit("menu-select", {
        domEvent,
        id: menuEntry.id,
        controlName: this.controlName,
      });
      this.hide(domEvent);
    };

    const makeUl = (parentDomElem, parentMenu) => {
      const ulElem = document.createElement("ul");
      parentDomElem.appendChild(ulElem);

      parentMenu.children.forEach((childMenu) => {
        const liElem = document.createElement("li");
        const divElem = document.createElement("div");
        divElem.appendChild(document.createTextNode(childMenu.title));
        ulElem.appendChild(liElem);
        liElem.appendChild(divElem);

        if (childMenu.children.length > 0) {
          makeUl(liElem, childMenu);
          divElem.addEventListener("click", this.hide.bind(this));
          divElem.addEventListener("touchstart", this.hide.bind(this));
        } else {
          divElem.addEventListener("click", (event) =>
            emitMenuSelect(childMenu, event)
          );
          divElem.addEventListener("touchstart", (event) =>
            emitMenuSelect(childMenu, event)
          );
          divElem.className = entryClassName;
        }
      });
    };

    // 构造DOM元素
    makeUl(this.menuDomElem, allMenus[0]);
  }

  /**
   * 显示菜单DOM元素。
   * @param {object} control - The control for the menu.
   * @param {object} event - The event that caused this.
   */
  show(control, event) {
    if (event && event.preventDefault) {
      event.preventDefault();
    }

    this.controlName = control.name;

    // 点击位置
    if (event.domEvent.changedTouches) {
      // touch click
      this.menuDomElem.style.left = `${event.domEvent.changedTouches[0].pageX}px`;
      this.menuDomElem.style.top = `${event.domEvent.changedTouches[0].pageY}px`;
    } else {
      // mouse click
      this.menuDomElem.style.left = `${event.domEvent.clientX}px`;
      this.menuDomElem.style.top = `${event.domEvent.clientY}px`;
    }
    document.body.appendChild(this.overlayDomElem);
    document.body.appendChild(this.menuDomElem);
  }

  /**
   * 隐藏菜单DOM元素。
   * @param {object} [event] - The event that caused this.
   */
  hide(event) {
    if (event && event.preventDefault) {
      event.preventDefault();
    }

    if (this.overlayDomElem.parentElement === document.body) {
      document.body.removeChild(this.overlayDomElem);
    }
    if (this.menuDomElem.parentElement === document.body) {
      document.body.removeChild(this.menuDomElem);
    }
  }

  /**
   * @method dispose
   * @description 销毁此对象并释放所有相关资源。
   */
  dispose() {
    this.hide();
    this.overlayDomElem.removeEventListener("contextmenu", this.hideListener);
    this.overlayDomElem.removeEventListener("click", this.hideListener);
    this.overlayDomElem.removeEventListener("touchstart", this.hideListener);
  }
}
