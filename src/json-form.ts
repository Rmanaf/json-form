/**
 * JsonForm | A lightweight JavaScript library for generating forms from JSON/Object. v0.9.4 (https://github.com/Rmanaf/json-form)
 * Licensed under MIT (https://github.com/Rmanaf/json-form/blob/master/LICENSE)
 */
class JsonForm {

    private _target: any;
    private _d: any;
    private _o: any;
    private _nodes: any[] = [];
    private static _winProps = Object.getOwnPropertyNames(window);

    constructor(d: any, o: any = {}, t: string = null) {

        let defaults = {
            body: document.body,
            model: "",
            exclude: [],
            labels: {},
            sections: {},
            showTypes: false,
            allRequired: false,
            optionals: [],
            types: {},
            attributes: {},
            encodeURI: false,
            templates: {},
            meta: {},
            onchange: {},
            events: {
                "*": "keyup keypress blur change",
                "*-number": "keyup keypress blur change mouseup"
            }
        }

        if (typeof d === "string") {

            let uid = this._uniqueID();

            window[uid] = JSON.parse(d);

            d = window[uid];

        }

        if (t !== null) {
            this._target = <any>document.getElementById(t);
        }

        this._d = d;

        this._o = this._extend(defaults, o);

        this.update();

    }

    private body(): HTMLElement {
        return this._o.body;
    }

    /**
     * Returns an unique ID.
     */
    private _uniqueID(): string {
        return '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Returns the associated name of the supplied object.
     * @param o The Object
     */
    private _getObjectName(o : any) : string {

        for (let p in window) {
            if (JsonForm._winProps.indexOf(p) > -1) {
                continue;
            }
            if (window[p] == o) {
                return p;
            }
        }

        return "undefined";
    }
    

    private _extend(...args: any[]) : any {
        for (var i = 1; i < args.length; i++)
            for (var key in args[i])
                if (args[i].hasOwnProperty(key))
                    args[0][key] = args[i][key];
        return args[0];
    }


    private _updateTarget() : void {

        if (typeof this._target !== "undefined") {
            let jsondata = JSON.stringify(this._d);

            if (this._o.encodeURI) {
                jsondata = encodeURIComponent(jsondata)
            }

            this._target.value = jsondata
        }

        this.body().dispatchEvent(new Event('update'));

    }


    private _bindEvents(e : HTMLElement, en : string | string[], l: (e : any) => {}) : void {
        var events = typeof en === "string" ? en.split(' ') : en;
        for (var i = 0, iLen = events.length; i < iLen; i++) {
            e.addEventListener(events[i], l, false);
        }
    }


    private _createFromTemplate(id, p, t, type, l, template) :void {

        let temp = <any>document.getElementById(this._o.templates[template]);

        let clone = temp.cloneNode(true);

        var dict: object = {
            "id": id,
            "inputType": t,
            "type": type,
            "label": l
        }

        if (this._o.meta.hasOwnProperty('*')) {

            dict = this._merge(dict, this._o.meta["*"]);

        }

        if (this._o.meta.hasOwnProperty(`*-${t}`)) {

            dict = this._merge(dict, this._o.meta[`*-${t}`]);

        }

        if (this._o.meta.hasOwnProperty(p)) {

            dict = this._merge(dict, this._o.meta[p]);

        }

        Object.keys(dict).forEach(key => {

            clone.innerHTML = clone.innerHTML.replace(/{{[^{}]+}}/g, function (key) {
                return dict[key.replace(/[{}]+/g, "")] || "";
            });

        });

        let fragment = document.importNode(clone.content, true);

        this._nodes.push(...fragment.childNodes);

        this._o.body.appendChild(fragment);
        
    }

    /**
     * Merges two objects into one.
     * @param o1 The First Object
     * @param o2 The Second Object
     */
    private _merge(o1 : any, o2 : any)  : any {
        var r = {};
        for (var a in o1) { r[a] = o1[a]; }
        for (var a in o2) { r[a] = o2[a]; }
        return r;
    }


    private _createInput(n, v, t, p, type) {

        let id = this._uniqueID();

        let fromTemplate = false;

        let input: any;

        if (this._o.labels.hasOwnProperty(p)) {
            n = this._o.labels[p];
        }


        if (this._o.templates.hasOwnProperty(p)) {

            this._createFromTemplate(id, p, t, type, n, p);

            fromTemplate = true;

        }

        if (this._o.templates.hasOwnProperty(`*-${t}`) && !fromTemplate) {

            this._createFromTemplate(id, p, t, type, n, `*-${t}`);

            fromTemplate = true;

        }

        if (this._o.templates.hasOwnProperty(`*`) && !fromTemplate) {

            this._createFromTemplate(id, p, t, type, n, "*");

            fromTemplate = true;

        }



        if (fromTemplate) {

            input = document.getElementById(id);

        } else {

            input = document.createElement("input");

            input.setAttribute("id", id);

        }


        input.setAttribute("name", id);

        input.setAttribute("type", t);

        input.dataset.path = p;

        input.dataset.type = type;

        input.value = v;

        if(t === "checkbox"){
            input.checked = v;
        }

        if (this._o.attributes.hasOwnProperty("*")) {
            Object.keys(this._o.attributes["*"]).forEach(attr => {
                input.setAttribute(attr, this._o.attributes["*"][attr]);
            });
        }

        if (this._o.attributes.hasOwnProperty(`*-${t}`)) {
            Object.keys(this._o.attributes[`*-${t}`]).forEach(attr => {
                input.setAttribute(attr, this._o.attributes[`*-${t}`][attr]);
            });
        }

        if (this._o.attributes.hasOwnProperty(p)) {
            Object.keys(this._o.attributes[p]).forEach(attr => {
                input.setAttribute(attr, this._o.attributes[p][attr]);
            });
        }



        if (this._o.allRequired) {
            input.required = true;
        }

        if (this._o.optionals.indexOf(p) >= 0) {
            input.required = false;
        }

        if (!fromTemplate) {

            let label = document.createElement("label");

            label.setAttribute("for", id);


            if (t === "checkbox") {

                let span = document.createElement("span");
                span.innerHTML = n;

                label.appendChild(input);
                label.appendChild(span);

            } else {

                label.innerHTML = n;
                label.appendChild(input);


            }


            if (this._o.showTypes && !fromTemplate) {

                let cite = document.createElement('cite');

                cite.innerHTML = type;

                label.appendChild(cite);

            }

            this._o.body.appendChild(label);

            this._nodes.push(label);

        }

        let events = this._o.events;

        
        if (this._o.events.hasOwnProperty(`*`)) {
            events = this._o.events[`*`];
        }

        if (this._o.events.hasOwnProperty(`*-${t}`)) {
            events = this._o.events[`*-${t}`];
        }

        if (this._o.events.hasOwnProperty(p)) {
            events = this._o.events[p];
        }

        this._bindEvents(input, events, this._eventHandler.bind(this));

    }

    private _eventHandler(e) {

        let value: any = e.target.value;


        let t = e.target.getAttribute("type");
        let type = e.target.dataset.type;
        let path = e.target.dataset.path;


        if (t === "checkbox") {
            value = e.target.checked;
        }

        if (type === "number" && value === "") {
            value = 0;
        }

        try {
            this._updateValue(path, value, type);
        } catch (e) {
            console.error(`Unable to set value "${value}" for "${path}"`);
            return;
        }

        this._updateTarget();

        if (this._o.onchange.hasOwnProperty(path)) {
            this._o.onchange[path](e.target, value, path, type);
        }
    }

    private _updateValue(p, v, t) {

        const arr: string[] = p.split('.');

        if (arr[0] === 'window') {
            arr.shift();
        }

        let param = arr.pop();

        let a = arr.reduce((a, b) => {
            return a[b]
        }, window);

        a[param] = this._castToType(t, v);

    }

    private _castToType(type, input) {
        switch (type) {
            case 'number':
                return Number(input);
            case 'boolean':
                return Boolean(input);
            default:
                return input;
        }
    }

    private _createSection(path) {

        let header = document.createElement("h2");

        header.innerHTML = this._o.sections[path];

        this._o.body.appendChild(header);

        this._o.body.appendChild(document.createElement('hr'));

    }


    private _checkValues(p : any, d: string, path : string) : void {

        let child = d.length > 0 ? p[d] : p;

        let type = typeof child;

        let inputType = "text";

        if (this._o.exclude.indexOf(path) >= 0) {
            return;
        }

        switch (type) {
            case "object":

                if (this._o.sections.hasOwnProperty(path)) {
                    this._createSection(path);
                }

                Object.keys(child).forEach((e) => {
                    let newPath = `${path}.${e}`;
                    this._checkValues(child, e, newPath);
                });

                return;

            case "boolean":
                inputType = "checkbox";
                break;

            case "number":
                inputType = "number";
                break;
        }

        if (this._o.types.hasOwnProperty(path)) {
            inputType = this._o.types[path];
        }

        this._createInput(d, child, inputType, path, type);
    }

    data(){
        return this._d;
    }

    set(o, v) {
        if (!this._o.hasOwnProperty(o)) {
            console.error(`"${o}" is not defined in the JsonForm options.`);
            return;
        }

        let type = typeof this._o[o];

        let valType = typeof v;

        if (typeof v !== typeof this._o[o]) {
            console.error(`The type of supplied value is wrong! "${o}" : "${type}". Current value is "${valType}".`);
            return;
        }

        this._o[o] = v;
    }

    update() {

        let o = this._getObjectName(this._d);

        let p = this._o.model.length > 0 ? `${o}.${this._o.model}` : o;

        this._nodes.forEach(node => {
            this._o.body.removeChild(node);
        });

        this._nodes = [];

        this._checkValues(this._d, this._o.model, p);

        this._updateTarget();

    }

    addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void {
        this.body().addEventListener(type, listener, options);
    }

}