/**
 * JsonForm | A lightweight JavaScript library for generating forms from JSON/Object. v0.9.8 (https://github.com/Rmanaf/json-form)
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

        setTimeout(() => {
            this._dispatchEvent("json-form.init");
        });

    }

    private _uniqueID(): string {
        return '_' + Math.random().toString(36).substr(2, 9);
    }

    private _getObjectName(o: any): string {

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

    private _extend(...args: any[]): any {
        for (var i = 1; i < args.length; i++)
            for (var key in args[i])
                if (args[i].hasOwnProperty(key))
                    args[0][key] = args[i][key];
        return args[0];
    }

    private _updateTarget(): void {

        if (typeof this._target === "undefined") {
            return;
        }

        let jsondata = JSON.stringify(this._d);

        if (this._o.encodeURI) {
            jsondata = encodeURIComponent(jsondata)
        }

        this._target.value = jsondata;

        this._dispatchEvent('json-form.update.target');

    }

    private _bindEvents(e: HTMLElement, en: string | string[], l: (e: any) => {}): void {
        var events = typeof en === "string" ? en.split(' ') : en;
        for (var i = 0, iLen = events.length; i < iLen; i++) {
            e.addEventListener(events[i], l, false);
        }
    }

    private _createFromTemplate(id, p, v, t, type, l, template): void {

        let temp = <any>document.getElementById(this._o.templates[template]);

        let clone = temp.cloneNode(true);

        var dict: object = {
            "id": id,
            "inputType": t,
            "type": type,
            "label": l,
            "value": v,
            "path": p
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

            const args = this._merge(dict, { parsePath: this._parsePath });

            clone.innerHTML = clone.innerHTML.replace(/{{[^{}]+}}/g, function (key) {

                let result = dict[key.replace(/[{}]+/g, "")] || "";

                if (typeof result === "function") {
                    result = result(args);
                }

                return result;

            });

        });

        let fragment = document.importNode(clone.content, true);

        this._nodes.push(...fragment.childNodes);

        this._o.body.appendChild(fragment);

    }

    private _merge(o1: any, o2: any): any {
        var r = {};
        for (var a in o1) { r[a] = o1[a]; }
        for (var a in o2) { r[a] = o2[a]; }
        return r;
    }

    private _createInput(n, v, t, p, type) {

        let id = this._uniqueID();

        let fromTemplate = null;

        let input: any;

        let label: any;


        if (this._o.labels.hasOwnProperty(`*`)) {
            label = this._o.labels['*'];
        }

        if (this._o.labels.hasOwnProperty(p)) {
            label = this._o.labels[p];
        }

        if (typeof label === "function") {
            n = label(n, p);
        } else if (typeof label !== "undefined") {
            n = label;
        }


        if (this._o.templates.hasOwnProperty(p)) {

            this._createFromTemplate(id, p, v, t, type, n, p);

            fromTemplate = p;

        }

        if (this._o.templates.hasOwnProperty(`*-${t}`) && !fromTemplate) {

            this._createFromTemplate(id, p, v, t, type, n, `*-${t}`);

            fromTemplate = `*-${t}`;

        }

        if (this._o.templates.hasOwnProperty(`*`) && !fromTemplate) {

            this._createFromTemplate(id, p, v, t, type, n, "*");

            fromTemplate = "*";

        }

        if (fromTemplate != null) {

            input = document.getElementById(id);

            if (typeof input === "undefined") {
                console.error(`Missing element in <${fromTemplate}>`);
                return;
            }

        } else {

            input = document.createElement("input");

            input.setAttribute("id", id);

        }


        input.setAttribute("name", id);

        input.setAttribute("type", t);

        input.dataset.path = p;

        input.dataset.type = type;

        input.value = v;

        if (t === "checkbox") {
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
            console.error(`Unable to set value "${value}" for "${path}".\n${e.message}`);
            return;
        }

        this._updateTarget();

        if (this._o.onchange.hasOwnProperty(path)) {
            this._o.onchange[path](e.target, value, path, type);
        }
    }

    private _parsePath(p) {

        const arr: string[] = p.split('.');

        if (arr[0] === 'window') {
            arr.shift();
        }

        let param = arr.pop();

        let obj = arr.reduce((a, b) => {
            return a[b]
        }, window);

        return {
            object: obj,
            parameter: param,
            get: () => {
                return typeof param === "undefined" ? obj : obj[param];
            },
            set: (value) => {
                if (typeof param === "undefined") {
                    return;
                }
                obj[param] = value;
            }
        }

    }

    private _updateValue(p, v, t) {

        let data = this._parsePath(p);

        data.object[data.parameter] = this._castToType(t, v);

        this._dispatchEvent('json-form.update.value');

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

    private _checkValues(d: string, path: string): void {

        let pathInfo = this._parsePath(path);

        let child = pathInfo.get();

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

                if (Array.isArray(child)) {
                    child.forEach((e) => {
                        let newPath = `${path}.${e}`;
                        this._checkValues(e, newPath);
                    });
                } else {
                    Object.keys(child).forEach((e) => {
                        let newPath = `${path}.${e}`;
                        this._checkValues(e, newPath);
                    });
                }

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

    private _clearForm() {

        this._nodes.forEach(node => {
            this._o.body.removeChild(node);
        });

        this._nodes = [];

        this._dispatchEvent('json-form.clear');

    }

    private _dispatchEvent(type: string) {
        this._o.body.dispatchEvent(new Event(type));
    }

    data() {
        return this._d;
    }

    set(o, v) {
        if (!this._o.hasOwnProperty(o)) {
            console.error(`"${o}" is not supported.`);
            return;
        }

        let type = typeof this._o[o];

        let valType = typeof v;

        if (typeof v !== typeof this._o[o]) {
            console.error(`Type mismatch for "${o}" : "${type}". Current value is "${valType}".`);
            return;
        }

        this._o[o] = v;
    }

    update() {

        let objName = this._getObjectName(this._d);

        let path = this._o.model.length > 0 ? `${objName}.${this._o.model}` : objName;

        this._clearForm();

        this._checkValues(this._o.model, path);

        this._updateTarget();

        this._dispatchEvent('json-form.update');

    }

    addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void {
        this._o.body.addEventListener(type, listener, options);
    }

}