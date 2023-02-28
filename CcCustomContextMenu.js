class CustomContextMenu extends HTMLElement {
  constructor() {
    super();
    this.innerHTML = `
    <div class="mdc-menu mdc-menu-surface" tabindex="-1">
      <ul class="mdc-list" role="menu" aria-hidden="true" aria-orientation="vertical">
      </ul>
    </div>
`;
  }
  
  init(anchor, event, items) {
    var el = this.querySelector('.mdc-menu');
    this.menu = new mdc.menu.MDCMenu(el);
    
    el.addEventListener("MDCMenu:selected", (event) => {
      this.dispatchEvent(new CustomEvent("CustomContextMenu:click", {detail : event.detail.item.detail}));
      this.parentNode.removeChild(this);
    });
    
    if (event) {
      this.menu.setAnchorMargin ({top: event.offsetY, right: 0, bottom: 0, left: event.offsetX});
    }

    var ul = this.querySelector('ul');
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      var li = document.createElement("li");
      li.className = "mdc-list-item";
      li.role = "menuitem";
      li.detail = item.detail;
      if (item.icon) {
        li.innerHTML = "<span class='mdc-list-item__graphic mdc-menu__selection-group-icon'><button class='mdc-icon-button material-icons'>" + item.icon + "</button></span><span class='mdc-list-item__text'>" + item.text + "</span>";
      } else {
        li.innerHTML = "<span class='mdc-list-item__text'>" + item.text + "</span>";
      }
      ul.appendChild (li);
    }

    this.menu.menuSurface_.setIsHoisted(true);
    this.menu.setAnchorElement (anchor);
    this.menu.open = true;
  }
}

window.customElements.define("custom-context-menu", CustomContextMenu);
