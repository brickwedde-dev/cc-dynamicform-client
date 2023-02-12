class CcDynamicFormAdmin extends HTMLElement {
  constructor(options) {
    super();
    
    this.options = options || {type : "none"};
  
    this.filtervalues = {};
    
    this.className = "absolutefullsize";

    this.sortproperty = "";
    this.sortorderup = false;

    this.formcontents = {};
    this.innerHTML = `
    <button id="refreshBtn" style="margin:10px;margin-left:80px;" class="mdc-fab mdc-fab--extended">
      <span class="mdc-fab__icon material-icons">refresh</span>
      <span class="mdc-fab__label">Reload</span>
    </button>
    ` + (this.options.filterhtml ? this.options.filterhtml : "") + `

    <cc-table class="absolutefullsize" style="overflow:auto;top:80px;">
    </cc-table>
`;
  }

  filterchange() {
    if (this.options.filterChange) {
      this.options.filterChange.apply(this);
    }
  }

  init() {
    if (this.options.filterInit) {
      this.options.filterInit.apply(this);
    }
    
    var cctable = this.querySelector("cc-table");
    cctable.init (this.options.columns);
    
    var refreshBtn = this.querySelector("#refreshBtn");
    refreshBtn.addEventListener("click", () => {
      this.loadformcontents();
    });

    this.redrawtable();
    
    this.loadformcontents();
  }

  loadformcontents() {
    var types = this.options.types || this.options.type;
    for(let type of types) {
      fetch("/dynform/list", {
        method: "POST",
        cache: "no-cache",
        headers: { "Content-Type": "application/json; charset=utf-8",  },
        body: JSON.stringify(
            {
              sessionkey : global.session.sessionkey,
              cmd : "list",
              type : type, 
            })})
      .then((response) => { return response.json(); })
      .then((json) => {
        this.formcontents[type] = json;
        
        if (this.options.filterUpdate) {
          this.options.filterUpdate.apply(this);
        }
  
        this.redrawtable();
      })
      .catch(() => {
        alert("Failed loading form contents");
      });
    }
  }
  
  resizetable() {
    var cctable = this.querySelector("cc-table");
    cctable.resizetable();
  }

  redrawtable() {
    var aVisible = [];

    if (!this.formcontents[this.options.type]) {
      return;
    }

    for (var i = 0; i < this.formcontents[this.options.type].length; i++) {
      var match = true;
      if (this.options.filterMatch) {
        match = this.options.filterMatch.apply(this, [this.formcontents[this.options.type][i]]);
      }
      if (match) {
        aVisible.push (this.formcontents[this.options.type][i]);
      }
    }
    
    if (this.sortproperty) {
      aVisible.sort((a, b) => {
        var avalue = a[this.sortproperty] || null;
        var bvalue = b[this.sortproperty] || null;
        if (avalue === null || avalue === undefined) {
          if (bvalue === null || bvalue === undefined) {
            if (a.objectid < b.objectid) {
              return this.sortorderup ? -1 : 1;
            }
            if (a.objectid > b.objectid) {
              return this.sortorderup ? 1 : -1;
            }
            return 0;
          } else {
            return this.sortorderup ? 1 : -1;
          }
        } else if (bvalue === null || bvalue === undefined) {
          return this.sortorderup ? -1 : 1;
        }
        
        if (isFinite(avalue) && isFinite(bvalue)) {
          if (avalue < bvalue) {
            return this.sortorderup ? 1 : -1;
          }
          if (avalue > bvalue) {
            return this.sortorderup ? -1 : 1;
          }
          return 0;
        }
 
        if (this.sortproperty == "ablaufdatum") {
          if (isFinite(avalue)) {
            var d = new Date(avalue);
            avalue = d.getInputDate();
          }
          if (isFinite(bvalue)) {
            var d = new Date(bvalue);
            bvalue = d.getInputDate();
          }
        }

        if (isFinite(avalue) && isFinite(bvalue)) {
          if (avalue < bvalue) {
            return this.sortorderup ? 1 : -1;
          }
          if (avalue > bvalue) {
            return this.sortorderup ? -1 : 1;
          }
          return 0;
        }

        var i = (""+avalue).localeCompare(""+bvalue);
        if (i != 0) {
          return this.sortorderup ? -i : i;
        }
        if (a.objectid < b.objectid) {
          return this.sortorderup ? -1 : 1;
        }
        if (a.objectid > b.objectid) {
          return this.sortorderup ? 1 : -1;
        }
        return 0;
      });
    }

    
    let now = new Date().getTime();
    var cctable = this.querySelector("cc-table");
    cctable.redrawtableasync(aVisible.length, (row, index) => {
//      if ((aVisible[index].ablaufdatum || 0) < now) {
//        row.style.color = "red";
//      }
      row.fill(aVisible[index]);
    }, this);
  }
}

window.customElements.define("cc-dynamic-form-admin", CcDynamicFormAdmin);
