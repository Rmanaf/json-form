/**
 * JsonForm | A lightweight JavaScript library for generating forms from JSON/Object. v0.9.7 (https://github.com/Rmanaf/json-form)
 * Licensed under MIT (https://github.com/Rmanaf/json-form/blob/master/LICENSE)
 */
var JsonForm = /** @class */ (function () {
    function JsonForm(d, o, t) {
        var _this = this;
        if (o === void 0) { o = {}; }
        if (t === void 0) { t = null; }
        this._nodes = [];
        var defaults = {
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
        };
        if (typeof d === "string") {
            var uid = this._uniqueID();
            window[uid] = JSON.parse(d);
            d = window[uid];
        }
        if (t !== null) {
            this._target = document.getElementById(t);
        }
        this._d = d;
        this._o = this._extend(defaults, o);
        this.update();
        setTimeout(function () {
            _this._dispatchEvent("json-form.init");
        });
    }
    JsonForm.prototype._uniqueID = function () {
        return '_' + Math.random().toString(36).substr(2, 9);
    };
    JsonForm.prototype._getObjectName = function (o) {
        for (var p in window) {
            if (JsonForm._winProps.indexOf(p) > -1) {
                continue;
            }
            if (window[p] == o) {
                return p;
            }
        }
        return "undefined";
    };
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
    JsonForm.prototype._updateTarget = function () {
        if (typeof this._target === "undefined") {
            return;
        }
        var jsondata = JSON.stringify(this._d);
        if (this._o.encodeURI) {
            jsondata = encodeURIComponent(jsondata);
        }
        this._target.value = jsondata;
        this._dispatchEvent('json-form.update.target');
    };
    JsonForm.prototype._bindEvents = function (e, en, l) {
        var events = typeof en === "string" ? en.split(' ') : en;
        for (var i = 0, iLen = events.length; i < iLen; i++) {
            e.addEventListener(events[i], l, false);
        }
    };
    JsonForm.prototype._createFromTemplate = function (id, p, v, t, type, l, template) {
        var _a;
        var _this = this;
        var temp = document.getElementById(this._o.templates[template]);
        var clone = temp.cloneNode(true);
        var dict = {
            "id": id,
            "inputType": t,
            "type": type,
            "label": l,
            "value": v,
            "path": p
        };
        if (this._o.meta.hasOwnProperty('*')) {
            dict = this._merge(dict, this._o.meta["*"]);
        }
        if (this._o.meta.hasOwnProperty("*-" + t)) {
            dict = this._merge(dict, this._o.meta["*-" + t]);
        }
        if (this._o.meta.hasOwnProperty(p)) {
            dict = this._merge(dict, this._o.meta[p]);
        }
        Object.keys(dict).forEach(function (key) {
            var args = _this._merge(dict, { parsePath: _this._parsePath });
            clone.innerHTML = clone.innerHTML.replace(/{{[^{}]+}}/g, function (key) {
                var result = dict[key.replace(/[{}]+/g, "")] || "";
                if (typeof result === "function") {
                    result = result(args);
                }
                return result;
            });
        });
        var fragment = document.importNode(clone.content, true);
        (_a = this._nodes).push.apply(_a, fragment.childNodes);
        this._o.body.appendChild(fragment);
    };
    JsonForm.prototype._merge = function (o1, o2) {
        var r = {};
        for (var a in o1) {
            r[a] = o1[a];
        }
        for (var a in o2) {
            r[a] = o2[a];
        }
        return r;
    };
    JsonForm.prototype._createInput = function (n, v, t, p, type) {
        var _this = this;
        var id = this._uniqueID();
        var fromTemplate = null;
        var input;
        var label;
        if (this._o.labels.hasOwnProperty("*")) {
            label = this._o.labels['*'];
        }
        if (this._o.labels.hasOwnProperty(p)) {
            label = this._o.labels[p];
        }
        if (typeof label === "function") {
            n = label(n, p);
        }
        else if (typeof label !== "undefined") {
            n = label;
        }
        if (this._o.templates.hasOwnProperty(p)) {
            this._createFromTemplate(id, p, v, t, type, n, p);
            fromTemplate = p;
        }
        if (this._o.templates.hasOwnProperty("*-" + t) && !fromTemplate) {
            this._createFromTemplate(id, p, v, t, type, n, "*-" + t);
            fromTemplate = "*-" + t;
        }
        if (this._o.templates.hasOwnProperty("*") && !fromTemplate) {
            this._createFromTemplate(id, p, v, t, type, n, "*");
            fromTemplate = "*";
        }
        if (fromTemplate != null) {
            input = document.getElementById(id);
            if (typeof input === "undefined") {
                console.error("No input defined for <" + fromTemplate + ">");
                return;
            }
        }
        else {
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
            Object.keys(this._o.attributes["*"]).forEach(function (attr) {
                input.setAttribute(attr, _this._o.attributes["*"][attr]);
            });
        }
        if (this._o.attributes.hasOwnProperty("*-" + t)) {
            Object.keys(this._o.attributes["*-" + t]).forEach(function (attr) {
                input.setAttribute(attr, _this._o.attributes["*-" + t][attr]);
            });
        }
        if (this._o.attributes.hasOwnProperty(p)) {
            Object.keys(this._o.attributes[p]).forEach(function (attr) {
                input.setAttribute(attr, _this._o.attributes[p][attr]);
            });
        }
        if (this._o.allRequired) {
            input.required = true;
        }
        if (this._o.optionals.indexOf(p) >= 0) {
            input.required = false;
        }
        if (!fromTemplate) {
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
            if (this._o.showTypes && !fromTemplate) {
                var cite = document.createElement('cite');
                cite.innerHTML = type;
                label_1.appendChild(cite);
            }
            this._o.body.appendChild(label_1);
            this._nodes.push(label_1);
        }
        var events = this._o.events;
        if (this._o.events.hasOwnProperty("*")) {
            events = this._o.events["*"];
        }
        if (this._o.events.hasOwnProperty("*-" + t)) {
            events = this._o.events["*-" + t];
        }
        if (this._o.events.hasOwnProperty(p)) {
            events = this._o.events[p];
        }
        this._bindEvents(input, events, this._eventHandler.bind(this));
    };
    JsonForm.prototype._eventHandler = function (e) {
        var value = e.target.value;
        var t = e.target.getAttribute("type");
        var type = e.target.dataset.type;
        var path = e.target.dataset.path;
        if (t === "checkbox") {
            value = e.target.checked;
        }
        if (type === "number" && value === "") {
            value = 0;
        }
        try {
            this._updateValue(path, value, type);
        }
        catch (e) {
            console.error("Unable to set value \"" + value + "\" for \"" + path + "\".\n" + e.message);
            return;
        }
        this._updateTarget();
        if (this._o.onchange.hasOwnProperty(path)) {
            this._o.onchange[path](e.target, value, path, type);
        }
    };
    JsonForm.prototype._parsePath = function (p) {
        var arr = p.split('.');
        if (arr[0] === 'window') {
            arr.shift();
        }
        var param = arr.pop();
        var obj = arr.reduce(function (a, b) {
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
    JsonForm.prototype._updateValue = function (p, v, t) {
        var data = this._parsePath(p);
        data.object[data.parameter] = this._castToType(t, v);
        this._dispatchEvent('json-form.update.value');
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
    JsonForm.prototype._createSection = function (path) {
        var header = document.createElement("h2");
        header.innerHTML = this._o.sections[path];
        this._o.body.appendChild(header);
        this._o.body.appendChild(document.createElement('hr'));
    };
    JsonForm.prototype._checkValues = function (d, path) {
        var _this = this;
        var pathInfo = this._parsePath(path);
        var child = pathInfo.get();
        var type = typeof child;
        var inputType = "text";
        if (this._o.exclude.indexOf(path) >= 0) {
            return;
        }
        switch (type) {
            case "object":
                if (this._o.sections.hasOwnProperty(path)) {
                    this._createSection(path);
                }
                if (Array.isArray(child)) {
                    child.forEach(function (e) {
                        var newPath = path + "." + e;
                        _this._checkValues(e, newPath);
                    });
                }
                else {
                    Object.keys(child).forEach(function (e) {
                        var newPath = path + "." + e;
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
        if (this._o.types.hasOwnProperty(path)) {
            inputType = this._o.types[path];
        }
        this._createInput(d, child, inputType, path, type);
    };
    JsonForm.prototype._clearForm = function () {
        var _this = this;
        this._nodes.forEach(function (node) {
            _this._o.body.removeChild(node);
        });
        this._nodes = [];
        this._dispatchEvent('json-form.clear');
    };
    JsonForm.prototype._dispatchEvent = function (type) {
        this._o.body.dispatchEvent(new Event(type));
    };
    JsonForm.prototype.data = function () {
        return this._d;
    };
    JsonForm.prototype.set = function (o, v) {
        if (!this._o.hasOwnProperty(o)) {
            console.error("\"" + o + "\" is not defined in the JsonForm options.");
            return;
        }
        var type = typeof this._o[o];
        var valType = typeof v;
        if (typeof v !== typeof this._o[o]) {
            console.error("The type of supplied value is wrong! \"" + o + "\" : \"" + type + "\". Current value is \"" + valType + "\".");
            return;
        }
        this._o[o] = v;
    };
    JsonForm.prototype.update = function () {
        var objName = this._getObjectName(this._d);
        var path = this._o.model.length > 0 ? objName + "." + this._o.model : objName;
        this._clearForm();
        this._checkValues(this._o.model, path);
        this._updateTarget();
        this._dispatchEvent('json-form.update');
    };
    JsonForm.prototype.addEventListener = function (type, listener, options) {
        this._o.body.addEventListener(type, listener, options);
    };
    JsonForm._winProps = Object.getOwnPropertyNames(window);
    return JsonForm;
}());
//# sourceMappingURL=json-form.js.map