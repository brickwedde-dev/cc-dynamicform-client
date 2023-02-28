class CcDynamicFormAdmin extends HTMLElement {
  constructor(formtype, api, options) {
    super();

    this.api = api;
    this.formtype = formtype;

    this.options = options || {type : "none"};
  
    this.filtervalues = {};
    
    this.className = "absolutefullsize";

    this.sortproperty = "";
    this.sortorderup = false;

    this.formcontents = {};
  }

  connectedCallback() {
    this.innerHTML = html`<cc-mdc-button id="refreshBtn" icon="refresh" style="top:10px;left:10px;position:absolute;" label="Reload"></cc-mdc-button>
        ${this.options.filterhtml ? this.options.filterhtml : ""}
        <cc-big-table style="position:absolute;left:0px;right:0px;bottom:0px;overflow:auto;top:80px;"></cc-big-table>
    `;

    this.bigtable = this.querySelector("cc-big-table");

    this.bigtable.cellrenderer = (rowelem, colelem, datacol, datarow, uiRowIndex, uiColIndex) => {
      colelem.style.verticalAlign = "middle";
      colelem.style.lineHeight = "30px";

      var col = this.columns[uiColIndex];

      colelem.style.backgroundColor = (uiRowIndex % 2) ? "#eee" : "#ddd";
      rowelem.style.backgroundColor = (uiRowIndex % 2) ? "#eee" : "#ddd";

      let obj = datarow.data;

      this.cellrenderer(rowelem, colelem, uiRowIndex, uiColIndex, obj, col);
    }
    
    this.bigtable.data = [];
    this.bigtable.data.push (new CcBigTableDataRow(false, true, 30));
    this.bigtable.headerDef = { cols : [ ], };
    for(var i = 0 ; i < this.columns.length; i++) {
      this.bigtable.headerDef.cols.push(new CcBigTableDataCol(false, false, this.columns[i].width,
          this.columns[i].property, this.columns[i].sortable ? CcBigTableDataCol_Sorting_UpDown : CcBigTableDataCol_Sorting_None,
          false, CcBigTableDataCol_SortType_String));
    }
    this.bigtable.addEventListener("sorting", (e) => {} );

    if (this.fillfilter) {
      this.fillfilter(this);
    }

    this.loadformcontents();

    var refreshBtn = this.querySelector("#refreshBtn");
    refreshBtn.addEventListener("click", () => {
      this.loadformcontents();
    });
  }

  loadformcontents() {
    this.bigtable.data = [];
    this.bigtable.data.push (new CcBigTableDataRow(false, true, 30));
    this.bigtable.fillRows ();

    this.api.list(this.formtype)
    .then(content => {
      try {
        this.formcontents[this.formtype] = content;

        if (this.options.filterUpdate) {
          this.options.filterUpdate.apply(this);
        }
  
        this.redrawtable();
      } catch (e) {
      }
    })
    .catch(() => {
      alert("Sorry, die Formularinhalte konnten nicht geladen werden.");
    });
  }
  
  redrawtable() {
    if (!this.formcontents[this.formtype]) {
      return;
    }

    this.bigtable.data = [];
    this.bigtable.data.push (new CcBigTableDataRow(false, true, 30));
    
    for (var i = 0; i < this.formcontents[this.formtype].length; i++) {
      var match = true;
      if (this.filterMatch) {
        match = this.filterMatch.apply(this, [this.formcontents[this.formtype][i]]);
      }
      if (match) {
        this.bigtable.data.push (new CcBigTableDataRow(false, false, 30, this.formcontents[this.formtype][i]));
      }
    }

    this.bigtable.doSort();
  }
}

window.customElements.define("cc-dynamic-form-admin", CcDynamicFormAdmin);
