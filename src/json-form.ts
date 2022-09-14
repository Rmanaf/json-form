/**
 * JsonForm | A lightweight JavaScript library for generating forms from JSON/Object. v0.9.9 (https://github.com/Rmanaf/json-form)
 * Licensed under MIT (https://github.com/Rmanaf/json-form/blob/master/LICENSE)
 */
enum JsonFormLogLevel {
    Errors, Events, All, None
}

class JsonForm {

    private static EVENT_NS = 'json-form';

    // Window default properties
    private static WIN_PROPS = Object.getOwnPropertyNames(window);

    static LOG_LEVEL: JsonFormLogLevel = JsonFormLogLevel.None;

    private _target: any;

    private _d: any;

    private _raw: any;

    private _o: any;

    private _nodes: any[] = [];

    private _sections: any[] = [];

    /**
     * Constructor
     * @param {any} data The JSON data to be used for generating the form.
     * @param {any} options The Generating options.
     * @param { string|HTMLElement } target The target element to show the JSON data in (for debugging purposes).
     * @returns {JsonForm} The JsonForm instance.
     */
    constructor(data: any, options: any = {}, target: string|HTMLElement = null) {

        let defaults: any = {
            body: document.body,
            model: "",
            exclude: [],
            labels: {},
            sections: {},
            types: {},
            attributes: {},
            templates: {},
            meta: {},
            events: {
                "*": "keyup keypress blur change",
                "*-number": "keyup keypress blur change mouseup"
            }
        }

        if (typeof data === "string") {

            let uid = this._uniqueID();

            window[uid] = JSON.parse(data);

            data = window[uid];

        }

        if (target !== null) {
            if (typeof target === "string") {
                this._target = <any>document.getElementById(target);
            } else if (target instanceof HTMLElement) {
                this._target = target;
            } else if (this._mayLog(JsonFormLogLevel.Errors)) {
                this._log('Error', `Type of target is wrong!`);
            }
        }

        this._d = data;

        this._raw = data;

        this._o = this._extend(defaults, options);

        this.update();

        setTimeout(() => {
            this._dispatchEvent("init");
        });

    }


    /**
     * Generates an unique ID.
     * @returns {string} The unique ID.
     */
    private _uniqueID(): string {
        return '_' + Math.random().toString(36).substring(2, 9);
    }



    private _getObjectName(o: any): string {

        for (let p in window) {
            if (JsonForm.WIN_PROPS.indexOf(p) > -1) {
                continue;
            }
            if (window[p] == o) {
                return p;
            }
        }

        return "undefined";
    }


    /**
     * Extends an object with another object.
     * @param args The object to be extended.
     * @returns {object} The extended object.
     */
    private _extend(...args: any[]): any {
        for (var i = 1; i < args.length; i++)
            for (var key in args[i])
                if (args[i].hasOwnProperty(key))
                    args[0][key] = args[i][key];
        return args[0];
    }



    /**
    * Merges two objects.
    * @param o1 The first object.
    * @param o2 The second object.
    * @returns {object} The merged object.
    */
    protected static merge(o1: any, o2: any): any {
        var r = {};
        for (var a in o1) { r[a] = o1[a]; }
        for (var a in o2) { r[a] = o2[a]; }
        return r;
    }

    private _updateTarget(): void {

        if (typeof this._target === "undefined") {
            return;
        }

        const jsondata = this.updateTarget(JSON.stringify(this._d));

        this._target.value = jsondata;

        this._dispatchEvent('update.target' , { target: this._target , data: jsondata });

    }


    public updateTarget( value: string ): string {
        return value;
    }


    /**
     * Shortcut for binding an event to an element.
     * @param e The element to bind the event to.
     * @param en The event name.
     * @param l The listener.
     * @param options The event options.
     */
    private _bindEvents(e: HTMLElement, en: string | string[], l: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void {

        const events = typeof en === "string" ? en.split(' ') : en;

        for (var i = 0, iLen = events.length; i < iLen; i++) {
            e.addEventListener(events[i], l, options);
        }

    }

    private _createFromTemplate(id, path: string, v, t, type, l, template): void {

        const templateVal = this._o.templates[template];

        const doc = this._o.body.ownerDocument;

        const temp = <any>doc.getElementById(templateVal);
        
        let clone = temp.cloneNode(true);

        var dict: object = {
            "id": id,
            "inputType": t,
            "type": type,
            "label": l,
            "value": v,
            "path": path
        }

        const meta = this._pathIncludes(path, Object.keys(this._o.meta), t);

        if (meta) {
            dict = JsonForm.merge(dict, this._o.meta[meta.match]);
        }

        Object.keys(dict).forEach(key => {

            const args = JsonForm.merge(dict, { parsePath: this._parsePath });

            clone.innerHTML = clone.innerHTML.replace(/{{[^{}]+}}/g, function (key) {

                const keySeq = key.replace(/[{}]+/g, "").split("|");

                let result = dict[keySeq[0]] || "";

                if (typeof result === "function") {
                    const userData = keySeq.length ? keySeq.slice(1, keySeq.length) : [];
                    result = result(JsonForm.merge(args, { userData: userData }));
                }

                return result;

            }.bind(this));
            
        });


        let fragment = document.importNode(clone.content, true);

        

        this._nodes.push(...fragment.childNodes);

        this._appendInput(fragment, path);

    }




    private _createInput(n, v, t, path: string, type) {

        let id = this._uniqueID();

        let input: any;

        let label: any;

        if (this._o.labels.hasOwnProperty(`*`)) {
            label = this._o.labels['*'];
        }

        if (this._o.labels.hasOwnProperty(path)) {
            label = this._o.labels[path];
        }

        if (typeof label === "function") {
            n = label(n, path);
        } else if (typeof label !== "undefined") {
            n = label;
        }

        const template = this._pathIncludes(path, Object.keys(this._o.templates), t);

        if (template) {

            this._createFromTemplate(id, path, v, t, type, n, template.match);

            input = document.getElementById(id);

            if (typeof input === "undefined") {

                if (this._mayLog(JsonFormLogLevel.Errors)) {
                    this._log('Error', `Missing element in <${template.match}>`);
                }

                return;
            }

        } else {

            input = document.createElement("input");

            input.setAttribute("id", id);

        }

        input.setAttribute("name", id);

        if(input instanceof HTMLInputElement){
            input.setAttribute("type", t);
        }else{
            input.dataset.jfInputType = t;
        }

        input.dataset.jfPath = path;

        input.dataset.jfType = type;

        input.value = v;

        if (t === "checkbox" && type === "boolean") {
            input.checked = v;
        }

        let attribute = this._pathIncludes(path, Object.keys(this._o.attributes), t);

        if (attribute) {
            Object.keys(this._o.attributes[attribute.match]).forEach(attr => {
                input.setAttribute(attr, this._o.attributes[attribute.match][attr]);
            });
        }

        if (!template) {

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

            this._nodes.push(this._appendInput(label, path));

        }

        let events = this._o.events;

        let event = this._pathIncludes(path, Object.keys(this._o.events), t);

        if (event) {
            events = this._o.events[event.match];
        }

        this._bindEvents(input, events, this._eventHandler.bind(this));

    }


    /**
     * Append input to the form
     * @param {any} element DOM element
     * @returns {HTMLElement} The element
     */
    private _appendInput(element: HTMLElement, path: string, type: string = 'input'): HTMLElement {

        let parent = path.split(".").slice(0, -1).join(".");

        // Check for section
        let skey = Object.keys(this._o.sections).filter(s => {
            let res = this._pathIncludes(path, this._o.sections[s].children, type);
            return res !== false;
        });

        let isInArray = this._testArray(parent) !== false;

        if (skey.length) {

            let theKey = skey[0];

            // Get section object from options
            let section = this._o.sections[theKey];

            if (this._sections.hasOwnProperty(parent) && isInArray) {
                theKey = parent;
            }

            // Check if section is already in the form
            if (this._sections.hasOwnProperty(theKey)) {

                section = this._sections[theKey];

            } else {

                // Otherwise create a new section
                let newSection = this._createElementFromHTML(section.template || "section");

                if (section.repeat !== true) {

                    // Store section in the sections object for later use
                    newSection.setAttribute("data-section", theKey);
                    this._sections[theKey] = newSection;

                } else if (section.merge === true && isInArray) {

                    newSection.setAttribute("data-section", parent);
                    this._sections[parent] = newSection;

                }

                this._o.body.appendChild(newSection);

                section = newSection;

                this._nodes.push(newSection);

            }

            // Append to section
            section.appendChild(element);

            return element;

        }

        // Otherwise append to body
        this._o.body.appendChild(element);

        return element;

    }


    /**
     *  Check if the path is in the paths array
     * @param {string} path The path to check
     * @param {string[]} paths The paths array
     * @param {string} type The type of input that associated with the path
     * @param {boolean} checkAncestors If true, the path must be an exact match
     * @returns {any}
     */
    private _pathIncludes(path: string, paths: string[], type: string = 'input', checkAncestors: boolean = true): any {

        // Return false if the paths array is empty
        if (paths.length === 0) {
            return false;
        }

        // Check if path is in paths
        if (paths.indexOf(path) >= 0) {
            return {
                path: path,
                match: path,
                mode: "exact"
            };
        }

        // Check for regex match
        if (paths.some(x => /\/\S+\//.test(x))) {

            for (let p in paths) {

                if (/\/\S+\//.test(paths[p])) {

                    let regex = JsonForm.stringToRegex(paths[p]);

                    if (regex.test(path)) {

                        return {
                            path: path,
                            match: paths[p],
                            mode: "regex"
                        }
                    }
                }

            }
        }


        if (paths.some(x => x === `*-${type}`)) {

            return {
                path: path,
                match: `*-${type}`,
                mode: "type"
            }

        }

        // Check for wildcard in paths
        if (paths.some(x => x === "*" || x === '*.*')) {
            return {
                path: path,
                match: '*',
                mode: "wildcard"
            }
        }

        // Check if any of the parents are in paths
        if (checkAncestors) {

            var pathClone = path;

            while (pathClone.length) {

                let p = pathClone.split(".").slice(0, -1).join(".");
                //[a-zA-Z]+[\[0-9\]]*?\.*?[a-zA-Z]+[\[0-9\]]*?\.*?[a-zA-Z]+[\[0-9\]]*?
                if (paths.indexOf(p) >= 0) {
                    return {
                        path: path,
                        match: p,
                        mode: "ancestor"
                    }
                }

                pathClone = p;

            }

        }

        return false;

    }


    protected static stringToRegex(s: string, m: RegExpMatchArray = null) {
        return (m = s.match(/^([\/~@;%#'])(.*?)\1([gimsuy]*)$/)) ? new RegExp(m[2], m[3].split('').filter((i, p, s) => s.indexOf(i) === p).join('')) : new RegExp(s);
    }


    /**
     * Event handler for all inputs
     * @param {any} e The event
     * @returns {void}
     */
    private _eventHandler(e) {

        const t = e.target.getAttribute("type"); // type of property
        const type = e.target.dataset.jfType; // type of input
        const path = e.target.dataset.jfPath; // path of property

        let value: any = e.target.value; // value of input

        if (t === "checkbox") {
            value = e.target.checked;
        }

        if (type === "number" && value === "") {
            value = 0;
        }

        try {
            this._updateData(path, value, type);
        } catch (error) {
            if (this._mayLog(JsonFormLogLevel.Errors)) {
                this._log('Error', `Unable to set value "${value}" for "${path}".\n${error.message}`);
            }
            return;
        }

        this._updateTarget();

        this._dispatchEvent("change", {
            path: path,
            value: value,
            type: type,
            target: e.target
        });

    }

    private _parsePath(p) {

        const arr: string[] = p.split('.');

        let obj = {};

        if (arr[0] === 'window') {
            arr.shift();
        }

        let param = arr.pop();

        let ta = this._testArray(param);

        // check for array
        if (ta) {
            arr.push(ta.value);
            param = ta.matches[1];
        }

        obj = arr.reduce((a, b) => {
            let ta = this._testArray(b);
            if (ta) {
                return a[ta.value][ta.matches[1]];
            }
            return a[b];
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

    /**
     * Returns true if the path is an array
     * @param {string} text The path to check 
     * @returns {boolean|any} False if not an array, otherwise the details of the array
     */
    private _testArray(text: string): boolean | any {

        const arrayRegex = /\[([^)]+)\]/;

        if (arrayRegex.test(text)) {
            return {
                matches: arrayRegex.exec(text),
                value: text.replace(arrayRegex, '')
            }
        }

        return false;

    }


    private _updateData(p, v, t) {

        const args = { path: p, value: this._castToType(t, v) , type: t }

        let data = this._parsePath(p);

        data.object[data.parameter] = this.updateData( args ).value;

        this._dispatchEvent('update.data' , args);

    }

    public updateData(args: any): any {
        return args;
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

    private _checkValues(d: string, path: string): void {

        let pathInfo = this._parsePath(path);

        let child = pathInfo.get();


        let type = typeof child;

        let inputType = "text";



        switch (type) {

            case "object":

                if (Array.isArray(child)) {

                    child.forEach((v, i, a) => {
                        let newPath = `${path}[${i}]`;
                        this._checkValues(v, newPath);
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

        const types = this._pathIncludes(path, Object.keys(this._o.types), inputType);

        if (types) {
            inputType = this._o.types[types.match];
        }

        const exclude = this._pathIncludes(path, this._o.exclude, inputType);

        if (exclude) {
            return;
        }

        this._createInput(d, child, inputType, path, type);

    }

    private _clearForm(dispatch: boolean = false) {

        this._nodes.forEach((node: HTMLElement) => {
            if(node.parentNode !== null) {
                node.parentNode.removeChild(node);
            }
        });

        this._nodes = [];

        this._sections = [];

        if (dispatch) {
            this._dispatchEvent('clear');
        }

    }


    /**
     * Check if passed log level satisfies the minimum log level
     * @param {JsonFormLogLevel} level The log level to check
     */
    private _mayLog(level: JsonFormLogLevel): boolean {
        return JsonForm.LOG_LEVEL !== JsonFormLogLevel.None && (JsonForm.LOG_LEVEL === level || JsonForm.LOG_LEVEL == JsonFormLogLevel.All);
    }


    /**
     * Logs a message to the console
     * @param {string[]} args The arguments to pass to the console
     */
    private _log(...args: string[]): void {
        const now = (new Date()).toISOString().slice(11, -1);
        console.log(now, ...args);
    }


    /**
     * Shortcut for triggering an event.
     * @param {string} type The type of event
     * @param {any} detail The detail of the event
     * @returns {void}
     */
    private _dispatchEvent(type: string, detail: any = null): void {

        const evt = `${JsonForm.EVENT_NS}.${type}`;

        this._o.body.dispatchEvent(detail ? new CustomEvent(evt, { detail: detail }) : new Event(evt));

        if (this._mayLog(JsonFormLogLevel.Events)) {
            this._log("Event", evt, JSON.stringify(detail) || "");
        }

    }


    /**
     * It destroys the form
     */
    protected destroy(): void {

        // Reset data to default
        this.resetAll();

        // Remove all of the generated nodes
        this._clearForm();

        // Dispatch the 'distroy' event
        this._dispatchEvent('distroy');

    }


    /**
     * Returns the data
     * @returns {any} The data
     */
    protected data(): any {
        return this._d;
    }


    protected set(o: string, v: any) {

        if (!this._o.hasOwnProperty(o)) {

            if (this._mayLog(JsonFormLogLevel.Errors)) {
                this._log('Error', `"${o}" is not defined.`);
            }

            return;

        }

        let type = typeof this._o[o];

        let valType = typeof v;

        if (typeof v !== typeof this._o[o]) {

            if (this._mayLog(JsonFormLogLevel.Errors)) {
                this._log('Error', `Type mismatch for "${o}" : "${type}". Current value is "${valType}".`);
            }

            return;
        }

        this._o[o] = v;

    }

    /**
     * Removes all the input fields from the form
     */
    protected clear(): void {
        this._clearForm(true);
    }


    /**
     * Regenerates the form using the current data
     */
    protected update(): void {

        const model = this.model();

        const objName = this._getObjectName(this._d);

        const path = this.hasModel() ? `${objName}.${model}` : objName;

        this._clearForm();

        this._checkValues(model, path);

        this._updateTarget();

        this._dispatchEvent('update');

    }

    /**
     * Returns the model
     * @returns {string} The model
     */
    protected model(): string {
        return this._o.model;
    }


    /**
     * Checks if the model is set
     * @returns {boolean} True if the model is set
     */
    protected hasModel(): boolean {
        return !!this.model().length;
    }


    /**
     * Returns the value of the form
     * @returns {any} The value of the form
     */
    protected value(): any {
        const model = this.model();
        const data = this.data();
        return model.length ? data[model] : data;
    }


    /**
     * Returns the default value of the data
     * @returns {any} The default value of the data
     */
    protected raw(): any {
        return this._raw;
    }


    /**
     * Resets the form to the default state
     * @param {string} model The model to reset.
     * @returns {any} The value of the form
     */
    protected reset(model: string = ""): any {

        const initData = this._raw;

        var _m = this.model();

        if (model.length) {
            _m = model;
        }

        if (_m.length) {
            this._o.data[model] = initData[model];
        } else {
            this._o.data = initData;
        }

        return this.data();

    }


    /**
     * Resets the whole data to the default value
     * @returns {any} The value of the form
     */
    protected resetAll(): any {
        return this.reset("");
    }

    /**
     * Creates an element by using the given html string or node name.
     * @param {string} htmlString The html string to create the element from.
     * @returns {HTMLElement} The created element
     */
    private _createElementFromHTML(htmlString: string): HTMLElement {

        if (/<\/?[a-z][\s\S]*>/i.test(htmlString)) {
            var tmp = document.implementation.createHTMLDocument();
            tmp.body.innerHTML = htmlString;
            return tmp.body.firstChild as HTMLElement;
        } else {
            return document.createElement(htmlString);
        }
    }

    /**
     * Attaches an event handler to the body
     * @param {string} type Event type
     * @param {EventListenerOrEventListenerObject} listener Event listener
     * @param {boolean | AddEventListenerOptions} [options] Event listener options
     */
    protected addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void {
        this._bindEvents(this._o.body, type, listener, options);
    }


}

