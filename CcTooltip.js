class CcTooltip extends HTMLElement {
  constructor() {
    super();
    this.full = false;
  }

  connectedCallback() {
    this.style.display = "inline-block";
    this.style.position = "relative";
    
    this.src = this.getAttribute("src");
    this.icon = this.getAttribute("icon");
    setTimeout(() => {this.draw();}, 1);
  }

  draw() {
    this.tooltip = document.createElement("div");
    this.tooltip.style.display = "none";
    this.tooltip.style.backgroundColor = "#f0f0f0";
    this.tooltip.style.padding = "30px";
    this.tooltip.style.border = "1px solid #B4B4B5";
    this.tooltip.style.borderRadius = "5px";
    this.tooltip.style.position = "absolute";
    this.tooltip.style.color = "#555555";
    this.tooltip.style.textAlign = "center";
    this.tooltip.style.boxShadow = "0 0 3px #B4B4B5";
    this.tooltip.style.top = "100%";
    
    while(this.childNodes.length > 0) {
      this.tooltip.appendChild(this.childNodes[0]);
    }

    this.close = document.createElement("i");
    this.close.className = "material-icons"
    this.close.innerHTML = "close";
    this.close.style.position = "absolute";
    this.close.style.color = "#000";
    this.close.style.top = "5px";
    this.close.style.right = "5px";
    this.tooltip.appendChild(this.close);

    this.appendChild(this.tooltip);

    this.info = document.createElement("div");
    if (this.src) {
      this.info.innerHTML = `<img src="${this.src}" style="max-width:100%;max-height:100%;" >`;
    } else if (this.icon) {
      this.info.innerHTML = `<i class="material-icons" style="font-size:20px;width:20px;height:20px;">${this.icon}</i>`;
    } else {
      this.info.style.color = "blue";
      this.info.innerHTML = `&#9432;`;
    }
    this.appendChild(this.info);    


    
    
    this.addEventListener ("mouseenter", () => {
      console.log ("mouseenter");
      this.showTooltip(0);
    });

    this.addEventListener ("mouseleave", () => {
      console.log ("mouseleave");
      if (!this.full) {
        this.hidetimeout = setTimeout(() => {
          this.hideTooltip();
        }, 200);
      }
    });

    this.addEventListener ("click", () => {
      this.showFullscreenTooltip();
    });

    this.tooltip.addEventListener ("click", () => {
      this.hideTooltip();
    });
  }
  
  showTooltip(timeout) {
    if (this.hidetimeout) {
      clearTimeout(this.hidetimeout);
    }
    document.body.appendChild(this.tooltip);
    var pos = getCoords(this);    
    this.tooltip.style.position = "absolute";
    this.tooltip.style.display = "block";
    this.tooltip.style.top = (pos.top + 25) + "px";
    this.tooltip.style.left = "auto";
    this.tooltip.style.right = "auto";
    this.tooltip.style.maxWidth = Math.min(document.body.clientWidth, 500) + "px";
    this.tooltip.style.bottom = "";
    if (timeout) {
      this.hidetimeout = setTimeout(() => {
        this.hideTooltip();
      }, timeout);
    }
  }
  
  showFullscreenTooltip() {
    if (this.hidetimeout) {
      clearTimeout(this.hidetimeout);
    }
    this.full = true;
    document.body.appendChild(this.tooltip);
    this.tooltip.style.position = "fixed";
    this.tooltip.style.display = "block";
    this.tooltip.style.top = "10px";
    this.tooltip.style.left = "10px";
    this.tooltip.style.right = "10px";
    this.tooltip.style.maxWidth = "";
    this.tooltip.style.bottom = "10px";
  }

  hideTooltip() {
    this.hidetimeout = null;
    this.tooltip.style.display = "none";
    this.appendChild(this.tooltip);    
  }
}

window.customElements.define("cc-tooltip", CcTooltip);

function getCoords(elem) { // crossbrowser version
  var box = elem.getBoundingClientRect();

  var body = document.body;
  var docEl = document.documentElement;

  var scrollTop = window.pageYOffset || docEl.scrollTop || body.scrollTop;
  var scrollLeft = window.pageXOffset || docEl.scrollLeft || body.scrollLeft;

  var clientTop = docEl.clientTop || body.clientTop || 0;
  var clientLeft = docEl.clientLeft || body.clientLeft || 0;

  var top  = box.top +  scrollTop - clientTop;
  var left = box.left + scrollLeft - clientLeft;

  return { top: Math.round(top), left: Math.round(left) };
}