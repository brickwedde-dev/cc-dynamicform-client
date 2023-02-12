const g_urlParams = new URLSearchParams(window.location.search);

function getValueOrDefault (value, def) {
  if (value || value === false || value === "" || value === 0) {
    return value;
  }
  return def;
}

function toIsoDateString(d) {
  return d.getUTCFullYear() + '-' + ("0" + (d.getUTCMonth() + 1)).slice(-2) + '-' + ("0" + (d.getUTCDate())).slice(-2);
}

class CcDynamicForm extends HTMLElement {
  constructor() {
    super();
    
    this.mandatorystring = "";
    this.nonmandatorystring = " *";
    this.saving = false;

    this.redrawByVarname = {}

    this.firstFormLoad = true

    this.subFormIndizes = []

    this.invalidfields = []
  }
  
  connectedCallback () {
    setTimeout(() => {
      this.connectedCallbackStep2();
    }, 0);
  }
  
  connectedCallbackStep2 () {
    var src = this.getAttribute("src");
    if (src) {
      var linkElem = document.createElement('style');
      linkElem.textContent = `
  @font-face {
    font-family: 'Material Icons';
    font-style: normal;
    font-weight: 400;
    src: url(cc-material-helpers/materialicons20230105-fill.woff2) format('woff2');
  }
  `;
      document.head.appendChild(linkElem);

      var script = document.createElement("script");
      script.src = "cc-material-helpers/material-components-web.min.js";
      document.head.appendChild(script);

      var linkElem = document.createElement('link');
      linkElem.setAttribute('rel', 'stylesheet');
      linkElem.setAttribute('href', 'cc-material-helpers/material-components-web.min.css');
      this.appendChild(linkElem);

      var linkElem = document.createElement('style');
      linkElem.textContent = `
  .mdc-select--outlined {
    height:50px;
  }
  
  @media print
  {    
      .print8pt {
        font-size:8pt;
      }
      
      .no-print, .no-print * {
          display: none !important;
      }
      
      .mdc-select__dropdown-icon {
          display: none !important;
      }
      
      .mdc-select--outlined {
        height: 24px;
      }

      .mdc-text-field--outlined {
        height: 24px;
      }
      
      .mdc-select--outlined .mdc-select__native-control {
        height: 24px;
        line-height: 24px;
        padding-top:0px;
        padding-bottom:0px;
      }
      
      .mdc-text-field__input {
        height: 24px;
        line-height: 24px;
        padding-top:0px;
        padding-bottom:0px;
      }
      
      .mdc-notched-outline {
        display: none;
      }
  }

  dynamic-form {
    box-sizing: content-box;
  }

  span {
    box-sizing: border-box;
  }

  .formLabel {
    display:inline-block;
    padding-left:4px;
    padding-right:4px;
    overflow:hidden;
    text-overflow:ellipsis;
    vertical-align:top;
    margin-top:10px;
    max-width:90vw;
    white-space:break-spaces;
  }

  td {
    vertical-align:top;
  }

  .material-icons {
    font-family: 'Material Icons';
    font-weight: normal;
    font-style: normal;
    font-size: 24px;
    line-height: 1;
    letter-spacing: normal;
    text-transform: none;
    display: inline-block;
    white-space: nowrap;
    word-wrap: normal;
    direction: ltr;
    -webkit-font-feature-settings: 'liga';
    -webkit-font-smoothing: antialiased;
  }
  `;
      this.appendChild(linkElem);
      
      var script = document.createElement("script");
      script.src = "cc-material-helpers/material-components-web.min.js";
      script.addEventListener("load", () => {

        fetch(src, { 
          method: "GET",
          cache: "no-cache",
        })
        .then(response => { return response.text(); })
        .then(json => {
          try {
            json = JSON.parse(json);
            this.formsource = json;
            
            this.mandatorystring = typeof this.formsource.mandatory == "string" ? this.formsource.mandatory : "";
            this.nonmandatorystring = typeof this.formsource.nonmandatory == "string" ? this.formsource.nonmandatory : " *";

            if (g_urlParams.get('edit')) {
              var objectid = g_urlParams.get('edit');
              this.loadContent(objectid);
            } else {
              this.init(this.formsource.mainForm, {});
            }
          } catch (e) {
            debugger;
          }
        })
        .catch(() => {
          alert("Sorry, das Formular konnte nicht geladen werden.");
        });
        
      });
      this.appendChild(script);
    }
  }

  init(Form, Content) {
    var oldtable = this.table;

    this.table = document.createElement("table");
    this.appendChild(this.table);

    this.loadForm(Form, Content);

    if(oldtable) {
      this.removeChild(oldtable);
    }
  }

  loadForm(form, content) {
    var depth = 0;
    this.form = form;
    this.content = content;

    this.colspan = 1;
    this.table.innerHTML = "";
    this.table.cellPadding = 0;
    this.table.cellSpacing = 0;
    this.tr = document.createElement("tr");
    this.table.appendChild(this.tr);
    
    if (this.firstFormLoad) {
      var formelements = {}
      for (var i = 0; i < form.length; i++) {
        let formElement = form[i];
        formelements[formElement.name] = formElement
      }

      for (var i = 0; i < form.length; i++) {
        let formElement = form[i];
        switch (formElement.type) {
        case "number":
        case "select":
          if (formElement.initcalc) {
            let params = {content, element:formElement, form:formelements,}
            try {
              content[formElement.name] = JSON.parse(formElement.initcalc.interpolate(params))
            } catch(e) {}
          }
          break;
        }
      }
    }

    this.firstFormLoad = false

    this.renderForm(this.form, this.content, depth, "root");
  }
  
  checkRedraw (varname) {
    if (this.redrawByVarname[varname]) {
      this.init(this.form, this.content);
    }
  }

  renderForm(form, content, depth, path) {
    var getMandatory = (mandatory) => {
      if (mandatory == "hidden") {
        return "";
      }
      return (mandatory ? this.mandatorystring : this.nonmandatorystring);
    }

//precalc calculated values
    var formelements = {}
    for (var i = 0; i < form.length; i++) {
      let formElement = form[i];
      formelements[formElement.name] = formElement
    }

    if (!this.subFormIndizes[depth]) {
      this.subFormIndizes[depth] = 1
    }

    for (var i = 0; i < form.length; i++) {
      let formElement = form[i];
      var elementContent = content[formElement.name];
      switch (formElement.type) {
      case "subform":
        if (!elementContent) {
          elementContent = [];
          content[formElement.name] = elementContent;
        }
        if (formElement.count) {
          let params = {content, element:formElement, form:formelements, precalc: true, index: this.subFormIndizes[depth],}
          var forend = parseInt(formElement.count.interpolate(params)) || formElement.min || 0
          if (content[formElement.name].length > forend) {
            content[formElement.name].splice(forend)
          }
          while (content[formElement.name].length < forend) {
            content[formElement.name].push({})
          }
        }
        break;

      case "number":
      case "select":
        if (formElement.precalc) {
          let params = {content, element:formElement, form:formelements, precalc: true, index: this.subFormIndizes[depth],}
          content[formElement.name] = JSON.parse(formElement.precalc.interpolate(params))
        }
        break;
      }
    }

    if(depth == 0) {
      this.invalidscrollto = -1;
    } 

    var smalldisplay = document.documentElement.clientWidth < 900

    for (var i = 0; i < form.length; i++) {
      let formElement = form[i];
      var elementContent = content[formElement.name];

      var invalid = (formElement.name && this.invalidfields.some((x) => { return  x.element && x.element.name == formElement.name && path == x.path } ))
      var invalidstyle = ""
      if (invalid) {
        invalidstyle = "color:red;"
      }

      if (formElement.depends) {
        for(var dep of formElement.depends.split(",")) {
          this.redrawByVarname[dep] = true
        }
      }

      if (formElement.visible) {
        let params = {content, element:formElement, form:formelements, precalc: false, index: this.subFormIndizes[depth],}
        let divvisible = formElement.visible.interpolate(params)
        if (divvisible !== "true") {
          continue;
        }
      }

      if (smalldisplay && formElement.type != "nextline") {
        var tr = document.createElement("tr");
        tr.innerHTML = "<td>&nbsp;</td>";
        this.table.appendChild(tr);
        
        this.tr = document.createElement("tr");
        this.table.appendChild(this.tr);
      }

      var breaklabel = false
      if (smalldisplay) {
        var l = parseInt(formElement.labelwidth);
        var c = (parseInt(formElement.controlwidth) || 0) + (parseInt(formElement.controlwidth1) || 0) + (parseInt(formElement.controlwidth2) || 0)
        if (l + c > document.documentElement.clientWidth) {
          breaklabel = true
        }
      }

      switch (formElement.type) {
      case "nextline":
        var tr = document.createElement("tr");
        tr.innerHTML = "<td>&nbsp;</td>";
        this.table.appendChild(tr);
        
        this.tr = document.createElement("tr");
        this.table.appendChild(this.tr);
        this.colspan = formElement.span;
        break;
      case "subform":
        if (!elementContent) {
          elementContent = [];
          content[formElement.name] = elementContent;
        }
        var forend = 0
        var add = false
        var remove = false

        if (formElement.count) {
          let params = {content, element:formElement, form:formelements, precalc: false, index: this.subFormIndizes[depth],}
          forend = parseInt(formElement.count.interpolate(params)) || formElement.min || 0
        } else {
          var c = elementContent.length;
          var remove = false;
          var add = false;
          if (c < formElement.max) {
            add = true;
          }
          if (c < formElement.max) {
            add = true;
          }
          if (c > formElement.min) {
            remove = true;
          }

          forend = Math.max(c, formElement.min);
        }
        
        for (var j = 0; j < forend; j++) {
          let jj = j;
          let ec = elementContent;
          if (j >= elementContent.length) {
            elementContent[j] = {};
          } 
          var subform = this.formsource[formElement.form];
          this.subFormIndizes[depth + 1] = j + 1
          this.renderForm(subform, elementContent[j], depth + 1, path + "." + formElement.name + "_" + j);
          if (remove) {
            var td = document.createElement("td");
            td.innerHTML = `
                  <button style="margin-right:10px;" class="mdc-fab mdc-fab--extended no-print"><span style="margin-right:-8px;margin-left:-8px;" class="material-icons">delete</span></button>
              `;
            td.querySelector("button").addEventListener("click", () => {
              ec.splice(jj, 1);
              this.init(this.form, this.content);
            });
            this.tr.appendChild(td);
          }
        }
        if (add && formElement.titleheaderadd) {
          this.tr = document.createElement("tr");
          this.table.appendChild(this.tr);

          let ec = elementContent;
          var td = document.createElement("td");
          td.innerHTML = `
                  <h2>${formElement.titleheaderadd}&nbsp;<button style="margin-right:10px;" class="mdc-fab mdc-fab--extended no-print">
                      <span class="mdc-fab__icon material-icons">add</span>
                      <span class="mdc-fab__label">${formElement.title}</span>
                    </button>
                  </h2>
            `;
          td.colSpan = "10";
          td.querySelector("button").addEventListener("click", () => {
            ec.splice (ec.length, 0, {});
            this.init(this.form, this.content);
          });
          this.tr.appendChild(td);
          
        } else if (add) {
//          this.tr = document.createElement("tr");
//          this.table.appendChild(this.tr);

          let ec = elementContent;
          var td = document.createElement("td");
          td.innerHTML = `
                  <button style="margin-right:10px;" class="mdc-fab mdc-fab--extended no-print">
                    <span class="mdc-fab__icon material-icons">add</span>
                    <span class="mdc-fab__label">${formElement.title}</span>
                  </button>
            `;
          td.querySelector("button").addEventListener("click", () => {
            ec.splice (ec.length, 0, {});
            this.init(this.form, this.content);
          });
          this.tr.appendChild(td);
        }
        break;
        
      case "paragraph":
        var td = document.createElement("td");
        td.colSpan = this.colspan;
        td.style.whiteSpace = "nowrap";
        td.innerHTML = `
            <span class="formLabel" style="width:` + formElement.labelwidth + `;">`+ formElement.title + `</span>` +
          (breaklabel ? "<br>" : "") +
            `<div style="margin-bottom:5px;" class="mdc-text-field mdc-text-field--textarea">
              <textarea style="width:` + formElement.controlwidth + `;height:180px;white-space: break-spaces;max-width:90vw;" class="mdc-text-field__input" rows="8" cols="40"></textarea>
              <div class="mdc-notched-outline">
                <div class="mdc-notched-outline__leading"></div>
                <div class="mdc-notched-outline__notch">
                </div>
                <div class="mdc-notched-outline__trailing"></div>
              </div>
            </div>
          `;

        var inputx = mdc.textField.MDCTextField.attachTo(td.querySelector("div"));
        
        let textarea = td.querySelector("textarea");
        let fEName1 = formElement.name;
        textarea.textContent = getValueOrDefault (elementContent, "");
        textarea.addEventListener("change", () => {
          content[fEName1] = textarea.value;
        });
        this.tr.appendChild(td);
        break;

      case "plzort":
        var td = document.createElement("td");
        td.colSpan = this.colspan;
        td.style.whiteSpace = "nowrap";
        var breakplzort = parseInt(formElement.controlwidth1) + parseInt(formElement.controlwidth2) > document.documentElement.clientWidth
        td.innerHTML = `
          <span class="formLabel" style="width:` + formElement.labelwidth + `;${invalidstyle}">`+ formElement.title + getMandatory(formElement.mandatory) + `</span>` +
          (breaklabel ? "<br>" : "") +
          `<div id="plz" class="mdc-text-field text-field mdc-text-field--outlined">
              <input style="width:` + formElement.controlwidth1 + `;" type="text" id="text-field-outlined" class="mdc-text-field__input" aria-describedby="text-field-outlined-helper-text">
              <div class="mdc-notched-outline mdc-notched-outline--upgraded">
                <div class="mdc-notched-outline__leading"></div>
                <div class="mdc-notched-outline__notch" style=""></div>
                <div class="mdc-notched-outline__trailing"></div>
              </div>
            </div>`+ 
            (breakplzort ? "<br>" : "") +
            `<div id="ort" style="height:57px;" class="mdc-select mdc-select--outlined">
            <i class="mdc-select__dropdown-icon"></i>
            <select style="width:` + Math.min(parseInt(formElement.controlwidth2), (document.documentElement.clientWidth - (parseInt(formElement.controlwidth1) + 20 + (breaklabel ? 0 : parseInt(formElement.labelwidth))))) + `;" class="mdc-select__native-control"></select>
            <div class="mdc-notched-outline">
              <div class="mdc-notched-outline__leading"></div>
              <div class="mdc-notched-outline__trailing"></div>
            </div>
          </div>`;

        let plzortvalues = {plz : "", ort : "" }
        let inputplz = td.querySelector("input");
        let selectOrt = td.querySelector("select");
        let fENamePlzort = formElement.name;

        var addOption = (text, value, selectedvalue) => {
          var option = document.createElement("option");
          option.value = value;
          option.innerText = text;
          option.selected = (option.value === selectedvalue);
          selectOrt.appendChild(option);
        }

        let saveValues = () => {
          content[fENamePlzort] = plzortvalues.plz + " " + plzortvalues.ort;
        };

        var fillOrt = (typed) => {
          var hasold = false;
          if (!plzortvalues.plzort) {
            return;
          }
          var oldort = selectOrt.selectedIndex >= 0 ? selectOrt.options[selectOrt.selectedIndex].value : "";
          selectOrt.innerHTML = "";
          addOption("", "", false);
          for(var plzort of plzortvalues.plzort) {
            if (plzort.plz.indexOf(plzortvalues.plz) == 0) {
              if (plzort.ort == plzortvalues.ort && plzort.plz == plzortvalues.plz) {
                addOption(plzort.ort, JSON.stringify(plzort), JSON.stringify(plzort));
                hasold = true;
              } else {
                addOption(plzort.ort + " (" + plzort.plz + ")", JSON.stringify(plzort), false);
              }
            }
          }
          if (oldort && !hasold) {
            plzortvalues.ort = "";
            saveValues();
          }
          if (typed && selectOrt.options.length == 2) {
            selectOrt.selectedIndex = 1;
            var plzort = JSON.parse(selectOrt.options[1].value);
            if (plzortvalues.plz != plzort.plz || plzortvalues.ort != plzort.ort) {
              plzortvalues.plz = plzort.plz;
              plzortvalues.ort = plzort.ort;
              inputplz.value = plzortvalues.plz;
              fillOrt(false);
              saveValues();
            }
          }
        };

        var fetchPlzort = () => {
          fetch(formElement.source, { method: "GET", cache: "no-cache", })
          .then(response => response.json())
          .then((json) => {
            plzortvalues.plzort = json;
            fillOrt(true);
          })
          .catch ((error) => {});
        };


        inputplz.addEventListener("change", () => {
          let v = inputplz.value;
          if (v.length > 5) {
            v = v.substring(0, 5);
            inputplz.value = v;
          }
          if (plzortvalues.plz != v) {
            var addedchar = plzortvalues.plz.length < v.length
            plzortvalues.plz = v;
            fillOrt(addedchar);
            saveValues();
          }
        });
        inputplz.addEventListener("keyup", () => {
          let v = inputplz.value;
          if (v.length > 5) {
            v = v.substring(0, 5);
            inputplz.value = v;
          }
          if (plzortvalues.plz != v) {
            var addedchar = plzortvalues.plz.length < v.length
            plzortvalues.plz = v;
            fillOrt(addedchar);
            saveValues();
          }
        });

        selectOrt.addEventListener("change", () => {
          var plzort = JSON.parse(selectOrt.options[selectOrt.selectedIndex].value);
          if (plzortvalues.ort != plzort.ort || plzortvalues.plz != plzort.plz) {
            plzortvalues.plz = plzort.plz;
            plzortvalues.ort = plzort.ort;
            inputplz.value = plzortvalues.plz;
            fillOrt(false);
            saveValues();
          }
        });

        let z = content[fENamePlzort] ? content[fENamePlzort].split(" ") : []
        if (z.length > 0) {
          plzortvalues.plz = z[0];
        }
        inputplz.value = plzortvalues.plz;
        if (z.length > 1) {
          plzortvalues.ort = z[1];
        }

        fetchPlzort();

        this.tr.appendChild(td);

        if (invalid) {
          if(this.invalidscrollto < 0) {
            this.invalidscrollto = td.offsetTop;
          }
        }
        break;
        
      case "string":
        var td = document.createElement("td");
        td.colSpan = this.colspan;
        td.style.whiteSpace = "nowrap";
        td.innerHTML = `
          <span class="formLabel" style="width:` + formElement.labelwidth + `;${invalidstyle}">`+ formElement.title + getMandatory(formElement.mandatory) + `</span>` +
          (breaklabel ? "<br>" : "") +
          `<div class="mdc-text-field text-field mdc-text-field--outlined">
              <input style="width:` + formElement.controlwidth + `;" type="text" id="text-field-outlined" class="mdc-text-field__input" aria-describedby="text-field-outlined-helper-text">
              <div class="mdc-notched-outline mdc-notched-outline--upgraded">
                <div class="mdc-notched-outline__leading"></div>
                <div class="mdc-notched-outline__notch" style=""></div>
                <div class="mdc-notched-outline__trailing"></div>
              </div>
            </div>
            
          `;

        var inputx = mdc.textField.MDCTextField.attachTo(td.querySelector("div"));

        let input = td.querySelector("input");
        let fEName2 = formElement.name;
        input.value = getValueOrDefault (elementContent, "");
        input.addEventListener("change", () => {
          content[fEName2] = input.value;
        });
        this.tr.appendChild(td);

        if (invalid) {
          if(this.invalidscrollto < 0) {
            this.invalidscrollto = td.offsetTop;
          }
        }
        break;
        
      case "value":
        var td = document.createElement("td");
        td.colSpan = this.colspan;
        td.style.whiteSpace = "nowrap";
        td.innerHTML = `
          <span class="formLabel" style="width:` + formElement.labelwidth + `;${invalidstyle}">`+ formElement.title + getMandatory(formElement.mandatory) + `</span><span class="formLabel" style="width:` + formElement.controlwidth + `;` + (formElement.bold ? "font-weight:bold;" : "") + `">`+ getValueOrDefault (elementContent, ""); + `</span>`
        this.tr.appendChild(td);

        if (invalid) {
          if(this.invalidscrollto < 0) {
            this.invalidscrollto = td.offsetTop;
          }
        }
        break;
        
      case "select":
        var td = document.createElement("td");
        var tooltip = "";
        if (formElement.helpicon) {
          tooltip = `&nbsp;<cc-tooltip style="height:16px;width:16px;" icon="info"></cc-tooltip>`;
        }
        td.colSpan = this.colspan;
        td.style.whiteSpace = "nowrap";
        td.innerHTML = `
          <span class="formLabel" style="width:` + formElement.labelwidth + `;${invalidstyle}">`+ formElement.title + getMandatory(formElement.mandatory) + tooltip + `</span>` +
          (breaklabel ? "<br>" : "") +
          `<div class="mdc-select mdc-select--outlined">
            <i class="mdc-select__dropdown-icon"></i>
            <select style="width:` + formElement.controlwidth + `;max-width:90vw;" class="mdc-select__native-control"></select>
            <div class="mdc-notched-outline">
              <div class="mdc-notched-outline__leading"></div>
              <div class="mdc-notched-outline__trailing"></div>
            </div>
          </div>`;
        if (formElement.helpicon) {
          td.querySelector("cc-tooltip").innerHTML = formElement.helpicon;
        }

        let selected = false;
        let select = td.querySelector("select");
        for(var i3 = 0; i3 < formElement.options.length; i3++) {
          var option = document.createElement("option");
          if (typeof formElement.options[i3] == "string") {
            option.value = JSON.stringify(formElement.options[i3]);
            if (formElement.options[i3]) {
              option.innerText = formElement.options[i3];
            } else {
              option.innerHTML = "&nbsp;";
            }
            option.selected = (formElement.options[i3] == elementContent);
            selected |= option.selected;
          } else if (typeof formElement.options[i3] == "object") {
            option.value = JSON.stringify(formElement.options[i3].value);
            if (formElement.options[i3].name) {
              option.innerText = formElement.options[i3].name;
            } else {
              option.innerHTML = "&nbsp;";
            }
            option.selected = (formElement.options[i3].value === elementContent);
            selected |= option.selected;
          }
          select.appendChild(option);
        }
        if (!selected && formElement.addMissing && elementContent) {
          option.value = JSON.stringify(elementContent);
          option.innerText = elementContent;
          option.selected = true;
          select.appendChild(option);
        }
        let fEName4 = formElement.name;
        select.addEventListener("change", () => {
          content[fEName4] = JSON.parse(select.options[select.selectedIndex].value);
          this.checkRedraw (fEName4)
        });
        this.tr.appendChild(td);

        if (invalid) {
          if(this.invalidscrollto < 0) {
            this.invalidscrollto = td.offsetTop;
          }
        }
        break;

      case "multiselect":
        var td = document.createElement("td");
        td.colSpan = this.colspan;
        td.style.whiteSpace = "nowrap";
        td.innerHTML = `
          <span class="formLabel" style="width:` + formElement.labelwidth + `;${invalidstyle}">`+ formElement.title + getMandatory(formElement.mandatory) + `</span>` +
          (breaklabel ? "<br>" : "") +
          `<div style="width:` + formElement.controlwidth + `;max-width:90vw;" class="mdc-chip-set" role="grid"></div>`;

        let chips = td.querySelector(".mdc-chip-set");

        let fEName9 = formElement.name;

        let aValues = (content[fEName9] || "").split(",");

        let toggleChip = (chipvalue) => {
          var index = aValues.indexOf(chipvalue);
          if (index >= 0) {
            aValues[index] = "-" + chipvalue
          } else {
            var index = aValues.indexOf("-" + chipvalue);
            if (index >= 0) {
              aValues.splice(index, 1);
            } else {
              aValues.push(chipvalue)
            }
          }
          content[fEName9] = aValues.join(",");
          redraw();
        };

        let addChip = (label, value, selected) => {
          var div = document.createElement("div");
          div.className = "mdc-chip";
          div.role = "row";
          var icon = "";
          switch (selected) {
            case -1:
              icon = `<i class="material-icons mdc-chip__icon mdc-chip__icon--leading" style="font-size:26px;width:26px;height:26px;">block</i>`
              div.style.backgroundColor = "#ffaaaa";
              break;
            case 1:
              icon = `<i class="material-icons mdc-chip__icon mdc-chip__icon--leading" style="font-size:26px;width:26px;height:26px;">check</i>`
              div.style.backgroundColor = "#aaffaa";
              break;
            default:
              icon = `<i class="material-icons mdc-chip__icon mdc-chip__icon--leading" style="font-size:26px;width:26px;height:26px;">question_mark</i>`
              break;
          }
          div.innerHTML = icon + `<div class="mdc-chip__ripple"></div>
            <span role="gridcell">
              <span role="button" tabindex="0" class="mdc-chip__text">${label}</span>
            </span>`;


          div.addEventListener("click", () => {
            toggleChip(value)
          });
          chips.appendChild(div);
        }

        let redraw = () => {
          chips.innerHTML = "";

          var hasChip = {}
          if (formElement.options) {
            for(let i8 = 0; i8 < formElement.options.length; i8++) {
              let option = formElement.options[i8]
              if (!option) {
                continue
              }
              let label;
              let value;
              if (typeof option == "object") {
                if (option.value) {
                  label = option.name
                  value = option.value
                } else {
                  continue
                }
              } else {
                label = option;
                value = option;
              }
              if (!value) {
                continue
              }
              var indexOk = aValues.indexOf(value);
              var indexNok = aValues.indexOf("-" + value);
              let selected = indexNok >= 0 ? -1 : (indexOk >= 0 ? 1 : 0)
              hasChip[value] = true
              addChip(label, value, selected)
            }
          }

          if (formElement.addMissing) {
            for(let i8 = aValues.length - 1; i8 >= 0 ; i8--) {
              var value = aValues[i8]
              if (!value) {
                continue
              }
              var selected = 1;
              var text = value;
              if (text.charAt(0) == "-") {
                selected = -1
                text = text.substring(1)
                value = value.substring(1)
                if (!text) {
                  continue
                }
              }
              if (!hasChip[text] && !hasChip[value]) {
                hasChip[value] = true
                addChip(text, value, selected)
              }
            }
          }

          if (formElement.addFreely) {
            let div2 = document.createElement("div");
            div2.className = "mdc-chip";
            div2.role = "row";
            div2.innerHTML = `<div class="mdc-chip__ripple"></div>
              <span role="gridcell">
                <span role="button" tabindex="0" class="mdc-chip__text">+</span>
              </span>`;
            div2.addEventListener("click", (e) => {
              var menu = new CustomContextMenu();
              div2.appendChild (menu);
              menu.init(div2, event, formElement.values || []);
              menu.addEventListener("CustomContextMenu:click", (event) => {
                event.preventDefault();
                event.stopPropagation();
                aValues.push (event.detail);
                content[fEName9] = aValues.join(",");
                redraw();
              });
            });
            chips.appendChild(div2);
          }
        };
        redraw();
        this.tr.appendChild(td);

        if (invalid) {
          if(this.invalidscrollto < 0) {
            this.invalidscrollto = td.offsetTop;
          }
        }
        break;
        
      case "date":
        var td = document.createElement("td");
        td.colSpan = this.colspan;
        td.style.whiteSpace = "nowrap";
        td.innerHTML = `
        <span class="formLabel" style="width:` + formElement.labelwidth + `;${invalidstyle}">`+ formElement.title + getMandatory(formElement.mandatory) + `</span>` +
          (breaklabel ? "<br>" : "") +
        `<div class="mdc-text-field text-field mdc-text-field--outlined">
              <input style="width:` + formElement.controlwidth + `;" type="date" id="text-field-outlined" class="mdc-text-field__input" aria-describedby="text-field-outlined-helper-text">
              <div class="mdc-notched-outline mdc-notched-outline--upgraded">
                <div class="mdc-notched-outline__leading"></div>
                <div class="mdc-notched-outline__trailing"></div>
              </div>
            </div>
            
          `;
        
        let input2 = td.querySelector("input");
        let fEName3 = formElement.name;
        let datedefault = formElement.defaultempty ? -1 : new Date().getTime();
        var datevalue = getValueOrDefault (elementContent, datedefault);
        if (datevalue.indexOf && datevalue.indexOf("-") > 0) {
          input2.value = datevalue;
        } else {
          var x = parseInt(datevalue);
          if (x >= 0) {
            var d = new Date();
            d.setTime((x > 0) ? x : 0);
            datevalue = toIsoDateString(d).substring (0, 10);
            input2.value = datevalue;
          }
        }
        input2.addEventListener("change", () => {
          content[fEName3] = input2.value;
        });
        this.tr.appendChild(td);

        if (invalid) {
          if(this.invalidscrollto < 0) {
            this.invalidscrollto = td.offsetTop;
          }
        }
        break;

      case "date3":
        var td = document.createElement("td");
        td.colSpan = this.colspan;
        td.style.whiteSpace = "nowrap";
        td.innerHTML = `
        <span class="formLabel" style="width:` + formElement.labelwidth + `;${invalidstyle}">`+ formElement.title + getMandatory(formElement.mandatory) + `</span>` +
          (breaklabel ? "<br>" : "") +
        `
            <select id="day"   style="height:57px;width:56px;border-radius:4px;border-color:rgba(0, 0, 0, 0.42);outline-color:rgba(0, 0, 0, 0.87);" ><option value=""></option></select>
            <select id="month" style="height:57px;width:56px;border-radius:4px;border-color:rgba(0, 0, 0, 0.42);outline-color:rgba(0, 0, 0, 0.87);" ><option value=""></option></select>
            <select id="year"  style="height:57px;width:68px;border-radius:4px;border-color:rgba(0, 0, 0, 0.42);outline-color:rgba(0, 0, 0, 0.87);" ><option value=""></option></select>
        `;
        
        let inputDay = td.querySelector("#day");
        let inputMonth = td.querySelector("#month");
        let inputYear = td.querySelector("#year");

        for(var i55 = 1; i55 <= 31; i55++) {
          var option55 = document.createElement("option");
          option55.value = i55;
          option55.innerText = "" + i55;
          inputDay.appendChild(option55);
        }
        for(var i55 = 1; i55 <= 12; i55++) {
          var option55 = document.createElement("option");
          option55.value = i55;
          option55.innerText = "" + i55;
          inputMonth.appendChild(option55);
        }
        for(var i55 = 1900; i55 <= new Date().getUTCFullYear() + 1; i55++) {
          var option55 = document.createElement("option");
          option55.value = i55;
          option55.innerText = "" + i55;
          inputYear.appendChild(option55);
        }

        let fEName33 = formElement.name;
        var datevalue3 = getValueOrDefault (elementContent, formElement.defaultempty ? -1 : new Date().getTime());
        if (datevalue3.indexOf && datevalue3.indexOf("-") > 0) {
          var t = new Date(datevalue3);
          inputDay.selectedIndex = t.getUTCDate();
          inputMonth.selectedIndex = t.getUTCMonth() + 1;
          inputYear.selectedIndex = t.getUTCFullYear() - 1899;
        } else {
          var x = parseInt(datevalue3);
          if (x > 0) {
            var t = new Date(x);
            inputDay.selectedIndex = t.getUTCDate();
            inputMonth.selectedIndex = t.getUTCMonth() + 1;
            inputYear.selectedIndex = t.getUTCFullYear() - 1899;
          } else {
            inputDay.selectedIndex = 0;
            inputMonth.selectedIndex = 0;
            inputYear.selectedIndex = 0;
          }
        }

        inputDay.addEventListener("change", () => {
          if (inputDay.selectedIndex > 0 && inputMonth.selectedIndex > 0 && inputYear.selectedIndex > 0) {
            var d = new Date();
            d.setUTCFullYear(inputYear.selectedIndex + 1899, inputMonth.selectedIndex - 1, inputDay.selectedIndex);
            content[fEName33] = d.toISOString().substring(0,10);
          } else {
            content[fEName33] = null;
          }
        });
        inputMonth.addEventListener("change", () => {
          if (inputDay.selectedIndex > 0 && inputMonth.selectedIndex > 0 && inputYear.selectedIndex > 0) {
            var d = new Date();
            d.setUTCFullYear(inputYear.selectedIndex + 1899, inputMonth.selectedIndex - 1, inputDay.selectedIndex);
            content[fEName33] = d.toISOString().substring(0,10);
          } else {
            content[fEName33] = null;
          }
        });
        inputYear.addEventListener("change", () => {
          if (inputDay.selectedIndex > 0 && inputMonth.selectedIndex > 0 && inputYear.selectedIndex > 0) {
            var d = new Date();
            d.setUTCFullYear(inputYear.selectedIndex + 1899, inputMonth.selectedIndex - 1, inputDay.selectedIndex);
            content[fEName33] = d.toISOString().substring(0,10);
          } else {
            content[fEName33] = null;
          }
        });
        this.tr.appendChild(td);

        if (invalid) {
          if(this.invalidscrollto < 0) {
            this.invalidscrollto = td.offsetTop;
          }
        }
        break;

      case "date-initonly":
        if (!content[formElement.name]) {
          var offsetvalue = formElement.nowoffset;
          switch (("" + formElement.nowoffset).substring(0, 1)) {
          case "m":
            var d = new Date();
            offsetvalue = d.getTime(); 
            d.setMonth(d.getMonth() + parseInt(("" + formElement.nowoffset).substring(1)));
            offsetvalue = d.getTime() - offsetvalue;
            break;
          }
          content[formElement.name] = new Date().getTime() + offsetvalue;
        }

        var s = new Date(content[formElement.name]).toLocaleDateString('de-DE', { timeZone: 'UTC' });

        var td = document.createElement("td");
        td.colSpan = this.colspan;
        td.style.whiteSpace = "nowrap";
        td.innerHTML = `
        <span class="formLabel" style="width:` + formElement.labelwidth + `;${invalidstyle}">`+ formElement.title + getMandatory(formElement.mandatory) + `</span>` +
          (breaklabel ? "<br>" : "") +
          `<div class="mdc-text-field text-field mdc-text-field--outlined">
              <span>${s}</span>
            </div>
          `;
        this.tr.appendChild(td);
        break;

      case "number":
        var tooltip = "";
        if (formElement.helpicon) {
          tooltip = `&nbsp;<cc-tooltip style="height:16px;width:16px;" icon="info"></cc-tooltip>`;
        }
        var td = document.createElement("td");
        td.colSpan = this.colspan;
        td.style.whiteSpace = "nowrap";
        td.innerHTML = `
        <span class="formLabel" style="width:` + formElement.labelwidth + `;${invalidstyle}">`+ formElement.title + getMandatory(formElement.mandatory) + tooltip + `</span>` +
          (breaklabel ? "<br>" : "") +
        `<div class="mdc-text-field text-field mdc-text-field--outlined">
              <input style="width:` + formElement.controlwidth + `;" type="number" id="text-field-outlined" class="mdc-text-field__input" aria-describedby="text-field-outlined-helper-text">
              <div class="mdc-notched-outline mdc-notched-outline--upgraded">
                <div class="mdc-notched-outline__leading"></div>
                <div class="mdc-notched-outline__trailing"></div>
              </div>
            </div>
            
          `;
        if (formElement.helpicon) {
          td.querySelector("cc-tooltip").innerHTML = formElement.helpicon;
        }
        
        let input3 = td.querySelector("input");
        let fEName5 = formElement.name;
        var d = new Date();
        var x = parseFloat(getValueOrDefault (elementContent, ""));
        if (isFinite(x)) {
          input3.value = x;
        } else if (formElement.defaultempty) {
          //
        } else {
          input3.value = 0;
        }
        input3.addEventListener("change", () => {
          var x = parseFloat(input3.value);
          content[fEName5] = x;
          this.checkRedraw (fEName5)
        });
        this.tr.appendChild(td);

        if (invalid) {
          if(this.invalidscrollto < 0) {
            this.invalidscrollto = td.offsetTop;
          }
        }
        break;
        
      case "drawing":
        let params = {content, element:formElement, form:formelements, precalc: false, index: this.subFormIndizes[depth], }
        var td = document.createElement("td");
        td.colSpan = this.colspan;
        td.style.whiteSpace = "nowrap";
        td.innerHTML = `
        <span class="formLabel" style="width:` + formElement.labelwidth + `;${invalidstyle}">`+ formElement.title.interpolate(params) + getMandatory(formElement.mandatory) + `</span>` +
          (breaklabel ? "<br>" : "") +
        `<drawing-app></drawing-app>`;
        
        let drawingapp = td.querySelector("drawing-app");
        drawingapp.style.width = Math.min(parseInt(formElement.controlwidth), (document.documentElement.clientWidth - (30 + (breaklabel ? 0 : parseInt(formElement.labelwidth))))) + "px";
        drawingapp.style.height = formElement.controlheight;
        let fEName6 = formElement.name;
        drawingapp.value = getValueOrDefault (elementContent, "");
        drawingapp.addEventListener("change", () => {
          content[fEName6] = drawingapp.value;
          content[fEName6 + "_hasContent_11111111111111111"] = drawingapp.hasContent;
        });
        drawingapp.addEventListener("contentloaded", () => {
          content[fEName6 + "_hasContent_11111111111111111"] = drawingapp.hasContent;
        });
        content[fEName6 + "_hasContent_11111111111111111"] = false;
        this.tr.appendChild(td);

        if (invalid) {
          if(this.invalidscrollto < 0) {
            this.invalidscrollto = td.offsetTop;
          }
        }
        break;

      case "save":
        var td = document.createElement("td");
        td.colSpan = this.colspan;
        td.style.whiteSpace = "nowrap";
        td.innerHTML = `<button style="margin-right:10px;" class="mdc-fab mdc-fab--extended no-print">
                    <span class="mdc-fab__icon material-icons">save_alt</span>
                    <span class="mdc-fab__label">${formElement.title}</span>
                  </button><input style="display:none;" type="text" class="no-print" name="objectid" disabled>`;
        
        let savebutton = td.querySelector("button");
        savebutton.addEventListener("click", () => {
          this.invalidfields = [];
          var o = this.checkform (this.form, this.content, this.invalidfields, "root", 1);
          if (this.invalidfields.length == 1) {
            alert("Bitte füllen Sie das Feld '" + this.invalidfields[0].name + "' aus. Danke.");
            this.init(this.form, this.content);
          } else if (this.invalidfields.length > 1) {
            var s = "";
            var i5 = 0
            for(; i5 < this.invalidfields.length && i5 < 5; i5++) {
              s += (s ? ", " : "") + "'" + this.invalidfields[i5].name + "'";
            }
            if (i5 == 5) {
              s += " und weitere"
            }
            alert("Bitte füllen Sie die Felder " + s + " aus. Danke.");
            this.init(this.form, this.content);
          } else {
            this.saveContent(formElement);
          }
        });
        
        let objectid = td.querySelector("input");
        objectid.value = getValueOrDefault (elementContent, "");

        this.tr.appendChild(td);
        break;

      case "div":
        var td = document.createElement("td");
        td.colSpan = this.colspan;
        td.style.whiteSpace = "nowrap";
        td.style.maxWidth = "100vw";
        td.style.width = formElement.controlwidth;
        td.innerHTML = `<div style="width:${formElement.controlwidth};white-space: break-spaces;max-width:90vw;">${formElement.content.interpolate({content, element:formElement, form:formelements, precalc: false, index: this.subFormIndizes[depth], })}</div>`;
        
        if (formElement.cssclass) {
          td.className = formElement.cssclass;
        }
        
        this.tr.appendChild(td);
        break;
        
      case "d3-spider":
        var td = document.createElement("td");
        td.colSpan = this.colspan;
        td.style.whiteSpace = "nowrap";
        td.innerHTML = `<span class="formLabel" style="width:` + formElement.labelwidth + `;">`+ formElement.title + `</span>`;

        var diagdiv = document.createElement("div");
        diagdiv.style.width = formElement.controlwidth + "px";
        diagdiv.style.height = formElement.controlwidth + "px";
        td.appendChild(diagdiv);
        this.tr.appendChild(td);

        var data = [];

        for(var i2 = 0; i2 < formElement.series.length; i2++) {
          var series = formElement.series[i2];
          var newSeries = {};
          newSeries.className = series.name;
          newSeries.axes = [];
          for(var j2 = 0; j2 < series.values.length; j2++) {
            var value = series.values[j2];
            var elementContent = content[value.source];
            newSeries.axes.push({"axis":[value.name], "value": formElement.offset + ((formElement.invert ? -1 : 1) *  parseInt(getValueOrDefault (elementContent, formElement.defaultValue)))});
          }
          data.push(newSeries);
        }

        RadarChart.defaultConfig.radius = 2;
        RadarChart.defaultConfig.levels = 6;
        RadarChart.defaultConfig.maxValue = 6;
        RadarChart.defaultConfig.w = formElement.controlwidth;
        RadarChart.defaultConfig.h = formElement.controlwidth;
        RadarChart.draw(diagdiv, data);
        break;
      }
    }

    if (depth == 0 && this.invalidscrollto >= 50) {
      document.documentElement.scrollTop = this.invalidscrollto - 50;
    }
  }

  checkform (form, content, result, path, index) {
    for (var i = 0; i < form.length; i++) {
      var formElement = form[i];
      var elementContent = content[formElement.name];
      
      switch (formElement.type) {
      case "subform":
        if (!elementContent) {
          elementContent = [];
          content[formElement.name] = elementContent;
        }
        var c = elementContent.length;
        var forend = Math.max(c, formElement.min || 0);
        
        for (var j = 0; j < forend; j++) {
          let jj = j;
          let ec = elementContent;
          if (j >= elementContent.length) {
            elementContent[j] = {};
          }
          var subform = this.formsource[formElement.form];
          this.checkform(subform, elementContent[j], result, path + "." + formElement.name + "_" + j, j + 1);
        }
        break;

      case "drawing":
        if (formElement.mandatory === true) {
          var value = getValueOrDefault (elementContent, null);  
          let params = {content, element:formElement, form:form, precalc: false, index: index}
          if (value === null) {
            result.push ({ok : false, name : formElement.title.interpolate(params), element : formElement, path});
          } else {
            var checkpixel = false;
            if (content[formElement.name + "_hasContent_11111111111111111"]) {
              checkpixel = true;
            }
            if (!checkpixel) {
              result.push ({ok : false, name : formElement.title.interpolate(params), element : formElement, path});
            }
          }
        }
        break;
        
      case "multiselect":
        if (formElement.mandatory === true) {
          var value = getValueOrDefault (elementContent, null);  
          if (value === null || value === "") {
            result.push ({ok : false, name : formElement.title, element : formElement, path});
          }
        }
        break;
        
      case "string":
        if (formElement.mandatory === true) {
          var value = getValueOrDefault (elementContent, null);  
          if (value === null || value === "") {
            result.push ({ok : false, name : formElement.title, element : formElement, path});
          }
        }
        break;

      case "number":
        if (formElement.mandatory === true) {
          var value = getValueOrDefault (elementContent, null);  
          if (value === null || !isFinite(value)) {
            result.push ({ok : false, name : formElement.title, element : formElement, path});
          }
        }
        break;

      case "select":
      case "date":
      case "date3":
        if (formElement.mandatory === true) {
          var value = getValueOrDefault (elementContent, null);  
          if (value === null) {
            result.push ({ok : false, name : formElement.title, element : formElement, path});
          }
        }
        break;

      case "plzort":
        if (formElement.mandatory === true) {
          var value = getValueOrDefault (elementContent, null);  
          if (value === null || value.length < 7) {
            result.push ({ok : false, name : formElement.title, element : formElement, path});
          }
        }
        break;

      case "paragraph":
        //AAA
        break;

      case "div":
      case "date-initonly":
      case "nextline":
      case "save":
        break;

      default:
        console.error(formElement)
        break;
      }
    }
  }
  
  saveContent(formElement) {
    if (this.saving) {
      return;
    }
    this.saving = true;
    fetch("/dynform/save", { 
      method: "POST", cache: "no-cache", headers: { 
          "Content-Type": "application/json; charset=utf-8", 
      },body: JSON.stringify({ cmd : "save", formtype: this.getAttribute("src"), type : this.formsource.type, obj : this.content }) 
    })
    .then(response => response.json() )
    .then((oJson) => {
      this.content = oJson;
      
      if (formElement.successmessage) {
        alert(formElement.successmessage);
      }

      if (formElement.successredirect) {
        document.location.replace(formElement.successredirect);
      } else if (formElement.successreplace) {
        document.location.replace(formElement.successreplace);
      } else if (formElement.successeditmode) {
        history.pushState({}, "Edit", formElement.successeditmode + "?edit=" + this.content.objectid);
      }
      
      this.saving = false;
      this.init(this.form, this.content);
    })
    .catch(error => {
      this.saving = false;
      window.alert("Save failed", "Saving form failed.");
    });
  }
  
  loadContent(objectid) {
    fetch("/dynform/load", { 
      method: "POST", cache: "no-cache", headers: { 
          "Content-Type": "application/json; charset=utf-8",
      },body: JSON.stringify({ cmd : "load", type : this.formsource.type, formtype: this.getAttribute("src"), objectid : objectid })
    })
    .then(response => response.json() )
    .then((oJson) => {
      if (!oJson.objectid) {
        oJson.objectid = objectid;
      }
      this.init(this.formsource.mainForm, oJson);
    })
    .catch(error => {
      this.init(this.formsource.mainForm, {});
    });
  }
}

window.customElements.define("cc-dynamic-form", CcDynamicForm);
