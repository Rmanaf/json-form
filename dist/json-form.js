var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
/**
 * JsonForm | A lightweight JavaScript library for generating forms from JSON/Object. v0.9.10 (https://github.com/Rmanaf/json-form)
 * Licensed under MIT (https://github.com/Rmanaf/json-form/blob/master/LICENSE)
 */
var JsonFormLogLevel;
(function (JsonFormLogLevel) {
    JsonFormLogLevel[JsonFormLogLevel["Errors"] = 0] = "Errors";
    JsonFormLogLevel[JsonFormLogLevel["Events"] = 1] = "Events";
    JsonFormLogLevel[JsonFormLogLevel["All"] = 2] = "All";
    JsonFormLogLevel[JsonFormLogLevel["None"] = 3] = "None";
})(JsonFormLogLevel || (JsonFormLogLevel = {}));
var JsonForm = /** @class */ (function () {
    /**
     * Constructor
     * @param {any} data The JSON data to be used for generating the form.
     * @param {any} options The Generating options.
     * @param { string|HTMLElement } target The target element to show the JSON data in (for debugging purposes).
     * @returns {JsonForm} The JsonForm instance.
     */
    function JsonForm(data, options, target) {
        var _this = this;
        if (options === void 0) { options = {}; }
        if (target === void 0) { target = null; }
        this._nodes = [];
        this._sections = [];
        var defaults = {
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
        };
        if (typeof data === "string") {
            var uid = this._uniqueID();
            window[uid] = JSON.parse(data);
            data = window[uid];
        }
        if (target !== null) {
            if (typeof target === "string") {
                this._target = document.getElementById(target);
            }
            else if (target instanceof HTMLElement) {
                this._target = target;
            }
            else if (this._mayLog(JsonFormLogLevel.Errors)) {
                this._log('Error', "Type of target is wrong!");
            }
        }
        this._d = data;
        this._raw = data;
        this._o = this._extend(defaults, options);
        this.update();
        setTimeout(function () {
            _this._dispatchEvent("init");
        });
    }
    /**
     * Generates an unique ID.
     * @returns {string} The unique ID.
     */
    JsonForm.prototype._uniqueID = function () {
        return '_' + Math.random().toString(36).substring(2, 9);
    };
    JsonForm.prototype._getObjectName = function (o) {
        for (var p in window) {
            if (JsonForm.WIN_PROPS.indexOf(p) > -1) {
                continue;
            }
            if (window[p] == o) {
                return p;
            }
        }
        return "undefined";
    };
    /**
     * Extends an object with another object.
     * @param args The object to be extended.
     * @returns {object} The extended object.
     */
    JsonForm.prototype._extend = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        for (var i = 1; i < args.length; i++)
            for (var key in args[i])
                if (args[i].hasOwnProperty(key))
                    args[0][key] = args[i][key];
        return args[0];
    };
    /**
    * Merges two objects.
    * @param o1 The first object.
    * @param o2 The second object.
    * @returns {object} The merged object.
    */
    JsonForm.merge = function (o1, o2) {
        var r = {};
        for (var a in o1) {
            r[a] = o1[a];
        }
        for (var a in o2) {
            r[a] = o2[a];
        }
        return r;
    };
    JsonForm.prototype._updateTarget = function () {
        if (typeof this._target === "undefined") {
            return;
        }
        var jsondata = this.updateTarget(JSON.stringify(this._d));
        this._target.value = jsondata;
        this._dispatchEvent('update.target', { target: this._target, data: jsondata });
    };
    JsonForm.prototype.updateTarget = function (value) {
        return value;
    };
    /**
     * Shortcut for binding an event to an element.
     * @param e The element to bind the event to.
     * @param en The event name.
     * @param l The listener.
     * @param options The event options.
     */
    JsonForm.prototype._bindEvents = function (e, en, l, options) {
        var events = typeof en === "string" ? en.split(' ') : en;
        for (var i = 0, iLen = events.length; i < iLen; i++) {
            e.addEventListener(events[i], l, options);
        }
    };
    JsonForm.prototype._createFromTemplate = function (id, path, v, t, type, l, template) {
        var _a;
        var _this = this;
        var templateVal = this._o.templates[template];
        var doc = this._o.body.ownerDocument;
        var temp = doc.getElementById(templateVal);
        var clone = temp.cloneNode(true);
        var dict = {
            "id": id,
            "inputType": t,
            "type": type,
            "label": l,
            "value": v,
            "path": path
        };
        var meta = this._pathIncludes(path, Object.keys(this._o.meta), t);
        if (meta) {
            dict = JsonForm.merge(dict, this._o.meta[meta.match]);
        }
        Object.keys(dict).forEach(function (key) {
            var args = JsonForm.merge(dict, { parsePath: _this._parsePath });
            clone.innerHTML = clone.innerHTML.replace(/{{[^{}]+}}/g, function (key) {
                var keySeq = key.replace(/[{}]+/g, "").split("|");
                var result = dict[keySeq[0]] || "";
                if (typeof result === "function") {
                    var userData = keySeq.length ? keySeq.slice(1, keySeq.length) : [];
                    result = result(JsonForm.merge(args, { userData: userData }));
                }
                return result;
            }.bind(_this));
        });
        var fragment = document.importNode(clone.content, true);
        (_a = this._nodes).push.apply(_a, fragment.childNodes);
        this._appendInput(fragment, path);
    };
    JsonForm.prototype._createInput = function (n, v, t, path, type) {
        var _this = this;
        var id = this._uniqueID();
        var input;
        var label;
        if (this._o.labels.hasOwnProperty("*")) {
            label = this._o.labels['*'];
        }
        if (this._o.labels.hasOwnProperty(path)) {
            label = this._o.labels[path];
        }
        if (typeof label === "function") {
            n = label(n, path);
        }
        else if (typeof label !== "undefined") {
            n = label;
        }
        var template = this._pathIncludes(path, Object.keys(this._o.templates), t);
        if (template) {
            this._createFromTemplate(id, path, v, t, type, n, template.match);
            input = document.getElementById(id);
            if (typeof input === "undefined") {
                if (this._mayLog(JsonFormLogLevel.Errors)) {
                    this._log('Error', "Missing element in <".concat(template.match, ">"));
                }
                return;
            }
        }
        else {
            input = document.createElement("input");
            input.setAttribute("id", id);
        }
        input.setAttribute("name", id);
        if (input instanceof HTMLInputElement) {
            input.setAttribute("type", t);
        }
        else {
            input.dataset.jfInputType = t;
        }
        input.dataset.jfPath = path;
        input.dataset.jfType = type;
        input.value = v;
        if (t === "checkbox" && type === "boolean") {
            input.checked = v;
        }
        var attribute = this._pathIncludes(path, Object.keys(this._o.attributes), t);
        if (attribute) {
            Object.keys(this._o.attributes[attribute.match]).forEach(function (attr) {
                input.setAttribute(attr, _this._o.attributes[attribute.match][attr]);
            });
        }
        if (!template) {
            var label_1 = document.createElement("label");
            label_1.setAttribute("for", id);
            if (t === "checkbox") {
                var span = document.createElement("span");
                span.innerHTML = n;
                label_1.appendChild(input);
                label_1.appendChild(span);
            }
            else {
                label_1.innerHTML = n;
                label_1.appendChild(input);
            }
            this._nodes.push(this._appendInput(label_1, path));
        }
        var events = this._o.events;
        var event = this._pathIncludes(path, Object.keys(this._o.events), t);
        if (event) {
            events = this._o.events[event.match];
        }
        this._bindEvents(input, events, this._eventHandler.bind(this));
    };
    /**
     * Append input to the form
     * @param {any} element DOM element
     * @returns {HTMLElement} The element
     */
    JsonForm.prototype._appendInput = function (element, path, type) {
        var _this = this;
        if (type === void 0) { type = 'input'; }
        var parent = path.split(".").slice(0, -1).join(".");
        // Check for section
        var skey = Object.keys(this._o.sections).filter(function (s) {
            var res = _this._pathIncludes(path, _this._o.sections[s].children, type);
            return res !== false;
        });
        var isInArray = this._testArray(parent) !== false;
        if (skey.length) {
            var theKey = skey[0];
            // Get section object from options
            var section = this._o.sections[theKey];
            if (this._sections.hasOwnProperty(parent) && isInArray) {
                theKey = parent;
            }
            // Check if section is already in the form
            if (this._sections.hasOwnProperty(theKey)) {
                section = this._sections[theKey];
            }
            else {
                // Otherwise create a new section
                var newSection = this._createElementFromHTML(section.template || "section");
                if (section.repeat !== true) {
                    // Store section in the sections object for later use
                    newSection.setAttribute("data-section", theKey);
                    this._sections[theKey] = newSection;
                }
                else if (section.merge === true && isInArray) {
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
    };
    /**
     *  Check if the path is in the paths array
     * @param {string} path The path to check
     * @param {string[]} paths The paths array
     * @param {string} type The type of input that associated with the path
     * @param {boolean} checkAncestors If true, the path must be an exact match
     * @returns {any}
     */
    JsonForm.prototype._pathIncludes = function (path, paths, type, checkAncestors) {
        if (type === void 0) { type = 'input'; }
        if (checkAncestors === void 0) { checkAncestors = true; }
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
        if (paths.some(function (x) { return /\/\S+\//.test(x); })) {
            for (var p in paths) {
                if (/\/\S+\//.test(paths[p])) {
                    var regex = JsonForm.stringToRegex(paths[p]);
                    if (regex.test(path)) {
                        return {
                            path: path,
                            match: paths[p],
                            mode: "regex"
                        };
                    }
                }
            }
        }
        if (paths.some(function (x) { return x === "*-".concat(type); })) {
            return {
                path: path,
                match: "*-".concat(type),
                mode: "type"
            };
        }
        // Check for wildcard in paths
        if (paths.some(function (x) { return x === "*" || x === '*.*'; })) {
            return {
                path: path,
                match: '*',
                mode: "wildcard"
            };
        }
        // Check if any of the parents are in paths
        if (checkAncestors) {
            var pathClone = path;
            while (pathClone.length) {
                var p = pathClone.split(".").slice(0, -1).join(".");
                //[a-zA-Z]+[\[0-9\]]*?\.*?[a-zA-Z]+[\[0-9\]]*?\.*?[a-zA-Z]+[\[0-9\]]*?
                if (paths.indexOf(p) >= 0) {
                    return {
                        path: path,
                        match: p,
                        mode: "ancestor"
                    };
                }
                pathClone = p;
            }
        }
        return false;
    };
    JsonForm.stringToRegex = function (s, m) {
        if (m === void 0) { m = null; }
        return (m = s.match(/^([\/~@;%#'])(.*?)\1([gimsuy]*)$/)) ? new RegExp(m[2], m[3].split('').filter(function (i, p, s) { return s.indexOf(i) === p; }).join('')) : new RegExp(s);
    };
    /**
     * Event handler for all inputs
     * @param {any} e The event
     * @returns {void}
     */
    JsonForm.prototype._eventHandler = function (e) {
        var t = e.target.getAttribute("type"); // type of property
        var type = e.target.dataset.jfType; // type of input
        var path = e.target.dataset.jfPath; // path of property
        var value = e.target.value; // value of input
        if (t === "checkbox") {
            value = e.target.checked;
        }
        if (type === "number" && value === "") {
            value = 0;
        }
        try {
            this._updateData(path, value, type);
        }
        catch (error) {
            if (this._mayLog(JsonFormLogLevel.Errors)) {
                this._log('Error', "Unable to set value \"".concat(value, "\" for \"").concat(path, "\".\n").concat(error.message));
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
    };
    JsonForm.prototype._parsePath = function (p) {
        var _this = this;
        var arr = p.split('.');
        var obj = {};
        if (arr[0] === 'window') {
            arr.shift();
        }
        var param = arr.pop();
        var ta = this._testArray(param);
        // check for array
        if (ta) {
            arr.push(ta.value);
            param = ta.matches[1];
        }
        obj = arr.reduce(function (a, b) {
            var ta = _this._testArray(b);
            if (ta) {
                return a[ta.value][ta.matches[1]];
            }
            return a[b];
        }, window);
        return {
            object: obj,
            parameter: param,
            get: function () {
                return typeof param === "undefined" ? obj : obj[param];
            },
            set: function (value) {
                if (typeof param === "undefined") {
                    return;
                }
                obj[param] = value;
            }
        };
    };
    /**
     * Returns true if the path is an array
     * @param {string} text The path to check
     * @returns {boolean|any} False if not an array, otherwise the details of the array
     */
    JsonForm.prototype._testArray = function (text) {
        var arrayRegex = /\[([^)]+)\]/;
        if (arrayRegex.test(text)) {
            return {
                matches: arrayRegex.exec(text),
                value: text.replace(arrayRegex, '')
            };
        }
        return false;
    };
    JsonForm.prototype._updateData = function (p, v, t) {
        var args = { path: p, value: this._castToType(t, v), type: t };
        var data = this._parsePath(p);
        data.object[data.parameter] = this.updateData(args).value;
        this._dispatchEvent('update.data', args);
    };
    JsonForm.prototype.updateData = function (args) {
        return args;
    };
    JsonForm.prototype._castToType = function (type, input) {
        switch (type) {
            case 'number':
                return Number(input);
            case 'boolean':
                return Boolean(input);
            default:
                return input;
        }
    };
    JsonForm.prototype._checkValues = function (d, path) {
        var _this = this;
        var pathInfo = this._parsePath(path);
        var child = pathInfo.get();
        var type = typeof child;
        var inputType = "text";
        switch (type) {
            case "object":
                if (Array.isArray(child)) {
                    child.forEach(function (v, i, a) {
                        var newPath = "".concat(path, "[").concat(i, "]");
                        _this._checkValues(v, newPath);
                    });
                }
                else {
                    Object.keys(child).forEach(function (e) {
                        var newPath = "".concat(path, ".").concat(e);
                        _this._checkValues(e, newPath);
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
        var types = this._pathIncludes(path, Object.keys(this._o.types), inputType);
        if (types) {
            inputType = this._o.types[types.match];
        }
        var exclude = this._pathIncludes(path, this._o.exclude, inputType);
        if (exclude) {
            return;
        }
        this._createInput(d, child, inputType, path, type);
    };
    JsonForm.prototype._clearForm = function (dispatch) {
        if (dispatch === void 0) { dispatch = false; }
        this._nodes.forEach(function (node) {
            if (node.parentNode !== null) {
                node.parentNode.removeChild(node);
            }
        });
        this._nodes = [];
        this._sections = [];
        if (dispatch) {
            this._dispatchEvent('clear');
        }
    };
    /**
     * Check if passed log level satisfies the minimum log level
     * @param {JsonFormLogLevel} level The log level to check
     */
    JsonForm.prototype._mayLog = function (level) {
        return JsonForm.LOG_LEVEL !== JsonFormLogLevel.None && (JsonForm.LOG_LEVEL === level || JsonForm.LOG_LEVEL == JsonFormLogLevel.All);
    };
    /**
     * Logs a message to the console
     * @param {string[]} args The arguments to pass to the console
     */
    JsonForm.prototype._log = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        var now = (new Date()).toISOString().slice(11, -1);
        console.log.apply(console, __spreadArray([now], args, false));
    };
    /**
     * Shortcut for triggering an event.
     * @param {string} type The type of event
     * @param {any} detail The detail of the event
     * @returns {void}
     */
    JsonForm.prototype._dispatchEvent = function (type, detail) {
        if (detail === void 0) { detail = null; }
        var evt = "".concat(JsonForm.EVENT_NS, ".").concat(type);
        this._o.body.dispatchEvent(detail ? new CustomEvent(evt, { detail: detail }) : new Event(evt));
        if (this._mayLog(JsonFormLogLevel.Events)) {
            this._log("Event", evt, JSON.stringify(detail) || "");
        }
    };
    /**
     * It destroys the form
     */
    JsonForm.prototype.destroy = function () {
        // Reset data to default
        this.resetAll();
        // Remove all of the generated nodes
        this._clearForm();
        // Dispatch the 'distroy' event
        this._dispatchEvent('distroy');
    };
    /**
     * Returns the data
     * @returns {any} The data
     */
    JsonForm.prototype.data = function () {
        return this._d;
    };
    JsonForm.prototype.set = function (o, v) {
        if (!this._o.hasOwnProperty(o)) {
            if (this._mayLog(JsonFormLogLevel.Errors)) {
                this._log('Error', "\"".concat(o, "\" is not defined."));
            }
            return;
        }
        var type = typeof this._o[o];
        var valType = typeof v;
        if (typeof v !== typeof this._o[o]) {
            if (this._mayLog(JsonFormLogLevel.Errors)) {
                this._log('Error', "Type mismatch for \"".concat(o, "\" : \"").concat(type, "\". Current value is \"").concat(valType, "\"."));
            }
            return;
        }
        this._o[o] = v;
    };
    /**
     * Removes all the input fields from the form
     */
    JsonForm.prototype.clear = function () {
        this._clearForm(true);
    };
    /**
     * Regenerates the form using the current data
     */
    JsonForm.prototype.update = function () {
        var model = this.model();
        var objName = this._getObjectName(this._d);
        var path = this.hasModel() ? "".concat(objName, ".").concat(model) : objName;
        this._clearForm();
        this._checkValues(model, path);
        this._updateTarget();
        this._dispatchEvent('update');
    };
    /**
     * Returns the model
     * @returns {string} The model
     */
    JsonForm.prototype.model = function () {
        return this._o.model;
    };
    /**
     * Checks if the model is set
     * @returns {boolean} True if the model is set
     */
    JsonForm.prototype.hasModel = function () {
        return !!this.model().length;
    };
    /**
     * Returns the value of the form
     * @returns {any} The value of the form
     */
    JsonForm.prototype.value = function () {
        var model = this.model();
        var data = this.data();
        return model.length ? data[model] : data;
    };
    /**
     * Returns the default value of the data
     * @returns {any} The default value of the data
     */
    JsonForm.prototype.raw = function () {
        return this._raw;
    };
    /**
     * Resets the form to the default state
     * @param {string} model The model to reset.
     * @returns {any} The value of the form
     */
    JsonForm.prototype.reset = function (model) {
        if (model === void 0) { model = ""; }
        var initData = this._raw;
        var _m = this.model();
        if (model.length) {
            _m = model;
        }
        if (_m.length) {
            this._o.data[model] = initData[model];
        }
        else {
            this._o.data = initData;
        }
        return this.data();
    };
    /**
     * Resets the whole data to the default value
     * @returns {any} The value of the form
     */
    JsonForm.prototype.resetAll = function () {
        return this.reset("");
    };
    /**
     * Creates an element by using the given html string or node name.
     * @param {string} htmlString The html string to create the element from.
     * @returns {HTMLElement} The created element
     */
    JsonForm.prototype._createElementFromHTML = function (htmlString) {
        if (/<\/?[a-z][\s\S]*>/i.test(htmlString)) {
            var tmp = document.implementation.createHTMLDocument();
            tmp.body.innerHTML = htmlString;
            return tmp.body.firstChild;
        }
        else {
            return document.createElement(htmlString);
        }
    };
    /**
     * Attaches an event handler to the body
     * @param {string} type Event type
     * @param {EventListenerOrEventListenerObject} listener Event listener
     * @param {boolean | AddEventListenerOptions} [options] Event listener options
     */
    JsonForm.prototype.addEventListener = function (type, listener, options) {
        this._bindEvents(this._o.body, type, listener, options);
    };
    JsonForm.EVENT_NS = 'json-form';
    // Window default properties
    JsonForm.WIN_PROPS = Object.getOwnPropertyNames(window);
    JsonForm.LOG_LEVEL = JsonFormLogLevel.None;
    return JsonForm;
}());
//# sourceMappingURL=json-form.js.map