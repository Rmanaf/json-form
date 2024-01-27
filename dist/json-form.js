/** 
 * JsonForm | A lightweight JavaScript library for generating dynamic forms from JSON/Object. v1.0.1 (https://github.com/Rmanaf/json-form) 
 * Licensed under MIT (https://github.com/Rmanaf/json-form/blob/master/LICENSE) 
 */var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
var JsonForm;
(function (JsonForm) {
    JsonForm.NS_EVENTS = 'json-form';
    JsonForm.STAGE_DELAY_INITIAL = 20;
    JsonForm.STAGE_DELAY_INTERMEDIATE = 40;
    JsonForm.STAGE_DELAY_FINAL = 60;
    var LogLevel;
    (function (LogLevel) {
        LogLevel[LogLevel["Errors"] = 0] = "Errors";
        LogLevel[LogLevel["Events"] = 1] = "Events";
        LogLevel[LogLevel["All"] = 2] = "All";
        LogLevel[LogLevel["None"] = 3] = "None"; 
    })(LogLevel = JsonForm.LogLevel || (JsonForm.LogLevel = {}));
    var Extension =  (function () {
        function Extension(form) {
            this.form = form;
        }
        return Extension;
    }());
    JsonForm.Extension = Extension;
    function create(data, options, target) {
        return new JsonForm.Engine(data, options, target);
    }
    JsonForm.create = create;
    var Utilities =  (function () {
        function Utilities() {
        }
        Utilities.uniqueID = function (prefix) {
            if (prefix === void 0) { prefix = '_'; }
            var randomDecimal = Math.random();
            var base36String = randomDecimal.toString(36);
            return prefix + base36String.substring(2, 9);
        };
        Utilities.merge = function (o1, o2) {
            var r = {};
            for (var a in o1) {
                r[a] = o1[a];
            }
            for (var a in o2) {
                r[a] = o2[a];
            }
            return r;
        };
        return Utilities;
    }());
    JsonForm.Utilities = Utilities;
    var Engine =  (function () {
        function Engine(data, options, target) {
            if (options === void 0) { options = {}; }
            if (target === void 0) { target = null; }
            var _this = this;
            this._nodes = [];
            this._sections = [];
            this._extensions = new Array();
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
                secure: false,
                events: {
                    "*": "keyup keypress focus blur change",
                    "*-number": "keyup keypress focus blur change mouseup"
                }
            };
            if (typeof data === "string") {
                var uid = JsonForm.Utilities.uniqueID();
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
                else if (this._mayLog(LogLevel.Errors)) {
                    this._log('Error', "Type of target is wrong!");
                }
            }
            this._d = data;
            this._raw = data;
            this._o = this._extend(defaults, options);
            if (typeof this._o.body === 'string') {
                this._o.body = document.getElementById(this._o.body);
            }
            setTimeout(function () {
                _this.update();
                setTimeout(function () {
                    _this._dispatchEvent('init');
                });
            }, JsonForm.STAGE_DELAY_INITIAL);
        }
        Engine.prototype._getObjectName = function (o) {
            for (var p in window) {
                if (Engine.WIN_PROPS.indexOf(p) > -1) {
                    continue;
                }
                if (window[p] == o) {
                    return p;
                }
            }
            return "undefined";
        };
        Engine.prototype._extend = function () {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i] = arguments[_i];
            }
            for (var i = 1; i < args.length; i++) {
                for (var key in args[i]) {
                    if (args[i].hasOwnProperty(key)) {
                        args[0][key] = args[i][key];
                    }
                }
            }
            return args[0];
        };
        Engine.prototype._updateTarget = function () {
            if (typeof this._target === "undefined") {
                return;
            }
            var jsondata = this.filterTargetValue(JSON.stringify(this._d));
            this._target.value = jsondata;
            this._dispatchEvent('update.target', { target: this._target, data: jsondata });
        };
        Engine.prototype.updateTarget = function () {
            this._updateTarget();
        };
        Engine.prototype._bindEvents = function (e, en, l, options) {
            var events = typeof en === "string" ? en.split(' ') : en;
            for (var i = 0, iLen = events.length; i < iLen; i++) {
                e.addEventListener(events[i], l, options);
            }
        };
        Engine.prototype._createFromTemplate = function (id, path, value, inputType, type, label, template) {
            var _a;
            var templateVal = this._o.templates[template];
            var doc = this._o.body.ownerDocument;
            var temp = doc.getElementById(templateVal);
            var clone = temp.cloneNode(true);
            var dict = {
                id: id,
                type: type,
                label: label,
                path: path,
                inputType: inputType,
                value: value,
                form: this
            };
            var meta = this._pathIncludes(path, Object.keys(this._o.meta), inputType);
            if (meta) {
                dict = JsonForm.Utilities.merge(dict, this._o.meta[meta.match]);
            }
            var args = JsonForm.Utilities.merge(dict, { parsePath: this._parsePath });
            clone.innerHTML = clone.innerHTML.replace(/{{[^{}]+}}/g, function (key) {
                var keySeq = key.replace(/[{}]+/g, "").split("|");
                var result = dict[keySeq[0]] || "";
                if (typeof result === "function") {
                    var templateData = keySeq.length ? keySeq.slice(1, keySeq.length) : [];
                    result = result(JsonForm.Utilities.merge(args, { templateData: templateData }));
                }
                return result;
            }.bind(this));
            var fragment = document.importNode(clone.content, true);
            (_a = this._nodes).push.apply(_a, fragment.childNodes);
            this._appendInput(fragment, path);
        };
        Engine.prototype._createInput = function (value, inputType, path, type) {
            var _this = this;
            var id = JsonForm.Utilities.uniqueID();
            var input;
            var inputName = this.filterInputName(path);
            var inputLabel = this.getLabel(path);
            var template = this._pathIncludes(path, Object.keys(this._o.templates), inputType);
            if (template) {
                this._createFromTemplate(id, path, value, inputType, type, inputLabel, template.match);
                input = document.getElementById(id);
                if (typeof input === "undefined") {
                    if (this._mayLog(LogLevel.Errors)) {
                        this._log('Error', "Missing element for <".concat(template.match, ">"));
                    }
                    return;
                }
            }
            else {
                input = document.createElement("input");
                input.setAttribute("id", id);
            }
            input.setAttribute("name", inputName);
            if (input instanceof HTMLInputElement) {
                input.setAttribute("type", inputType);
            }
            else {
                this._setElementData(input, { jfInputType: inputType });
            }
            this._setElementData(input, { jfPath: path, jfType: type });
            input.value = value;
            if (inputType === "checkbox" && type === "boolean") {
                input.checked = value;
            }
            var attribute = this._pathIncludes(path, Object.keys(this._o.attributes), inputType);
            if (attribute) {
                Object.keys(this._o.attributes[attribute.match]).forEach(function (attr) {
                    input.setAttribute(attr, _this._o.attributes[attribute.match][attr]);
                });
            }
            if (!template) {
                var label = document.createElement("label");
                label.setAttribute("for", id);
                if (inputType === "checkbox") {
                    var span = document.createElement("span");
                    span.innerHTML = inputLabel;
                    label.appendChild(input);
                    label.appendChild(span);
                }
                else {
                    label.innerHTML = inputLabel;
                    label.appendChild(input);
                }
                this._nodes.push(this._appendInput(label, path));
            }
            var events = this._o.events;
            var event = this._pathIncludes(path, Object.keys(this._o.events), inputType);
            if (event) {
                events = this._o.events[event.match];
            }
            this._bindEvents(input, events, this._eventHandler.bind(this));
        };
        Engine.prototype._appendInput = function (element, path, type) {
            var _this = this;
            if (type === void 0) { type = 'input'; }
            var parent = path.split('.').slice(0, -1).join('.');
            var skey = Object.keys(this._o.sections).filter(function (s) {
                var res = _this._pathIncludes(path, _this._o.sections[s].children, type);
                return res !== false;
            });
            var isInArray = this._testArray(parent) !== false;
            if (skey.length) {
                var theKey = skey[0];
                var section = this._o.sections[theKey];
                if (this._sections.hasOwnProperty(parent) && isInArray) {
                    theKey = parent;
                }
                if (this._sections.hasOwnProperty(theKey)) {
                    section = this._sections[theKey];
                }
                else {
                    var newSection = this._createElementFromHTML(section.template || "section");
                    if (section.repeat !== true) {
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
                section.appendChild(element);
                return element;
            }
            this._o.body.appendChild(element);
            return element;
        };
        Engine.prototype._pathIncludes = function (path, paths, type, checkAncestors) {
            if (type === void 0) { type = 'input'; }
            if (checkAncestors === void 0) { checkAncestors = true; }
            if (paths.length === 0) {
                return false;
            }
            if (paths.indexOf(path) >= 0) {
                return {
                    path: path,
                    match: path,
                    mode: "exact"
                };
            }
            if (paths.some(function (x) { return /\/\S+\//.test(x); })) {
                for (var p in paths) {
                    if (/\/\S+\//.test(paths[p])) {
                        var regex = Engine.stringToRegex(paths[p]);
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
            if (paths.some(function (x) { return x === "*" || x === '*.*'; })) {
                return {
                    path: path,
                    match: '*',
                    mode: "wildcard"
                };
            }
            if (checkAncestors) {
                var pathClone = path;
                while (pathClone.length) {
                    var p = pathClone.split('.').slice(0, -1).join('.');
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
        Engine.stringToRegex = function (s, m) {
            if (m === void 0) { m = null; }
            if (m = s.match(/^([\/~@;%#'])(.*?)\1([gimsuy]*)$/)) {
                var innerPattern = m[2];
                var flags = m[3].split('').filter(function (i, p, s) { return s.indexOf(i) === p; }).join('');
                return new RegExp(innerPattern, flags);
            }
            else {
                return new RegExp(s);
            }
        };
        Engine.prototype._eventHandler = function (e) {
            var target = e.target;
            var eventType = e.type;
            var t = target.getAttribute("type");
            var _a = this._getElementData(target, 'jfType', 'jfPath'), jfType = _a.jfType, jfPath = _a.jfPath;
            var value = target.value;
            if (t === "checkbox") {
                value = target.checked;
            }
            if (jfType === "number" && value === "") {
                value = 0;
            }
            try {
                this._updateData(jfPath, value, jfType);
            }
            catch (error) {
                if (this._mayLog(LogLevel.Errors)) {
                    this._log('Error', "Unable to set value \"".concat(value, "\" for \"").concat(jfPath, "\".\n").concat(error.message));
                }
                return;
            }
            this._updateTarget();
            this._dispatchEvent('change', {
                path: jfPath,
                type: jfType,
                event: eventType
            });
        };
        Engine.prototype._getElementData = function (element) {
            var _this = this;
            var properties = [];
            for (var _i = 1; _i < arguments.length; _i++) {
                properties[_i - 1] = arguments[_i];
            }
            var props = {};
            if (!element) {
                element = this._o.body;
            }
            else {
                element = this._validateElement(element);
            }
            properties.forEach(function (property) {
                try {
                    if (_this._o.secure === true && element.jf && element.jf[property] !== undefined) {
                        props[property] = element.jf[property];
                    }
                    else if (element.dataset[property] !== undefined) {
                        props[property] = element.dataset[property];
                    }
                    else {
                        props[property] = false;
                    }
                }
                catch (e) {
                    if (_this._mayLog(LogLevel.Errors)) {
                        console.error(e);
                    }
                    props[property] = false;
                }
            });
            if (properties.length === 1) {
                return props[properties[0]];
            }
            return props;
        };
        Engine.prototype.getElementData = function (element) {
            var properties = [];
            for (var _i = 1; _i < arguments.length; _i++) {
                properties[_i - 1] = arguments[_i];
            }
            return this._getElementData.apply(this, __spreadArray([element], properties, false));
        };
        Engine.prototype._setElementData = function (element, data) {
            if (!element) {
                element = this._o.body;
            }
            for (var property in data) {
                if (data.hasOwnProperty(property)) {
                    if (this._o.secure === true) {
                        element.jf = element.jf || {};
                        element.jf[property] = data[property];
                    }
                    else {
                        if (data[property]) {
                            element.dataset[property] = typeof data[property] === 'string' ? data[property] : JSON.stringify(data[property]);
                        }
                        else {
                            delete element.dataset[property];
                        }
                    }
                }
            }
        };
        Engine.prototype.setElementData = function (element, data) {
            this._setElementData(element, data);
        };
        Engine.prototype._parsePath = function (p) {
            var _this = this;
            var arr = p.split('.');
            var obj = {};
            if (arr[0] === 'window') {
                arr.shift();
            }
            var param = arr.pop();
            var ta = this._testArray(param);
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
        Engine.prototype._testArray = function (text) {
            var arrayRegex = /\[([^)]+)\]/;
            if (arrayRegex.test(text)) {
                var matches = arrayRegex.exec(text);
                var value = text.replace(arrayRegex, '');
                return {
                    matches: matches,
                    value: value
                };
            }
            return false;
        };
        Engine.prototype._updateData = function (p, v, t) {
            var args = { path: p, value: this._castToType(t, v), type: t };
            var data = this._parsePath(p);
            this._dispatchEvent('updating.data');
            data.object[data.parameter] = this.filterData(args).value;
            this._dispatchEvent('updated.data');
        };
        Engine.prototype._castToType = function (type, input) {
            switch (type) {
                case 'number':
                    return Number(input); 
                case 'boolean':
                    return Boolean(input); 
                default:
                    return input; 
            }
        };
        Engine.prototype._checkValues = function (d, path) {
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
            this._createInput(child, inputType, path, type);
            this._dispatchEvent('append', { path: path });
        };
        Engine.prototype._clearForm = function (dispatch) {
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
        Engine.prototype._mayLog = function (level) {
            return Engine.LOG_LEVEL !== LogLevel.None && (Engine.LOG_LEVEL === level || Engine.LOG_LEVEL == LogLevel.All);
        };
        Engine.prototype._log = function () {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i] = arguments[_i];
            }
            var now = (new Date()).toISOString().slice(11, -1);
            console.log.apply(console, __spreadArray([now], args, false));
        };
        Engine.prototype._dispatchEvent = function (type, detail) {
            if (detail === void 0) { detail = null; }
            var evt = "".concat(JsonForm.NS_EVENTS, ".").concat(type);
            if (this._mayLog(LogLevel.Events)) {
                this._log("Event", evt, JSON.stringify(detail) || "");
            }
            if (detail) {
                this._o.body.dispatchEvent(new CustomEvent(evt, { detail: detail }));
            }
            else {
                this._o.body.dispatchEvent(new Event(evt));
            }
        };
        Engine.prototype.dispatchEvent = function (type, detail) {
            if (detail === void 0) { detail = null; }
            this._dispatchEvent(type, detail);
        };
        Engine.prototype.destroy = function () {
            this.reset();
            this._clearForm();
            this._dispatchEvent('destroy');
        };
        Engine.prototype.set = function (o, v) {
            if (!this._o.hasOwnProperty(o)) {
                if (this._mayLog(LogLevel.Errors)) {
                    this._log('Error', "\"".concat(o, "\" is not defined."));
                }
                return;
            }
            var type = typeof this._o[o];
            var valType = typeof v;
            if (typeof v !== typeof this._o[o]) {
                if (this._mayLog(LogLevel.Errors)) {
                    this._log('Error', "Type mismatch for \"".concat(o, "\" : \"").concat(type, "\". Current value is \"").concat(valType, "\"."));
                }
                return;
            }
            this._o[o] = v;
        };
        Engine.prototype.clear = function () {
            this._clearForm(true);
        };
        Engine.prototype.update = function () {
            var model = this._o.model;
            var objName = this._getObjectName(this._d);
            var path = this.hasModel() ? "".concat(objName, ".").concat(model) : objName;
            this._dispatchEvent('updating');
            this._clearForm();
            this._checkValues(model, path);
            this._updateTarget();
            this._dispatchEvent('updated');
        };
        Engine.prototype.hasModel = function () {
            return !!this._o.model.length;
        };
        Engine.prototype.reset = function (model) {
            if (model === void 0) { model = ""; }
            var initData = this._raw;
            var _m = this._o.model;
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
        Engine.prototype.resetAll = function () {
            return this.reset();
        };
        Engine.prototype._createElementFromHTML = function (htmlString) {
            if (/<\/?[a-z][\s\S]*>/i.test(htmlString)) {
                var tmp = document.implementation.createHTMLDocument();
                tmp.body.innerHTML = htmlString;
                return tmp.body.firstChild;
            }
            else {
                return document.createElement(htmlString);
            }
        };
        Engine.prototype._validateElement = function (element) {
            if (typeof element === 'string') {
                var search = this.find(element);
                if (search) {
                    element = search[0];
                }
                else {
                    return undefined;
                }
            }
            return element;
        };
        Engine.prototype.addEventListener = function (type, listener, options) {
            this._bindEvents(this._o.body, type, listener, options);
        };
        Engine.prototype.on = function (type, listener, options) {
            this._bindEvents(this._o.body, type, listener, options);
            return this;
        };
        Engine.prototype.find = function () {
            var _this = this;
            var paths = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                paths[_i] = arguments[_i];
            }
            var inputs = __spreadArray([], this._o.body.querySelectorAll('input'), true);
            if (paths.length) {
                inputs = inputs.filter(function (x) { return _this._pathIncludes(_this._getElementData(x, 'jfPath'), paths); });
            }
            if (inputs.length) {
                return inputs;
            }
            return undefined;
        };
        Engine.prototype.getPath = function (element) {
            return this._getElementData(this._validateElement(element), 'jfPath');
        };
        Engine.prototype.getType = function (element) {
            return this._getElementData(this._validateElement(element), 'jfType');
        };
        Engine.prototype.getLabel = function (path) {
            var label = this._pathIncludes(path, Object.keys(this._o.labels));
            var pathInfo = this._parsePath(path);
            var inputLabel;
            if (label) {
                inputLabel = this._o.labels[label.match];
            }
            if (typeof inputLabel === "function") {
                inputLabel = inputLabel(pathInfo.parameter, path);
            }
            else if (typeof inputLabel === "undefined") {
                inputLabel = pathInfo.parameter;
            }
            return inputLabel;
        };
        Engine.prototype.pathIncludes = function (path, paths, type, checkAncestors) {
            if (type === void 0) { type = 'input'; }
            if (checkAncestors === void 0) { checkAncestors = true; }
            return this._pathIncludes(path, paths, type, checkAncestors);
        };
        Engine.prototype.use = function (ext) {
            var args = [];
            for (var _i = 1; _i < arguments.length; _i++) {
                args[_i - 1] = arguments[_i];
            }
            if (this.get(ext)) {
                if (this._mayLog(LogLevel.Errors)) {
                    this._log('Extension is already added to the form!');
                }
                return this;
            }
            var instance = new ext(this);
            instance.init.apply(instance, args);
            this._extensions.push({
                _constructor: ext,
                name: Engine._getExtName(ext),
                instance: instance
            });
            return this;
        };
        Engine.prototype.get = function (ext) {
            var name = Engine._getExtName(ext);
            var extension;
            this._extensions.forEach(function (x) {
                if (name === x.name) {
                    extension = x;
                }
            });
            return extension === null || extension === void 0 ? void 0 : extension.instance;
        };
        Engine._getExtName = function (ext) {
            return ext.toString().replace(/function\s+(\w+)\(\)\s*\{[\S\s]*\}\s*/, '$1');
        };
        Engine.prototype.filterData = function (args) {
            return args;
        };
        Engine.prototype.filterTargetValue = function (value) {
            return value;
        };
        Engine.prototype.filterInputName = function (path) {
            return path;
        };
        Object.defineProperty(Engine.prototype, "data", {
            get: function () {
                return this._d;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(Engine.prototype, "json", {
            get: function () {
                return JSON.stringify(this._d);
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(Engine.prototype, "value", {
            get: function () {
                var model = this._o.model;
                var data = this._d;
                if (model.length) {
                    return data[model];
                }
                else {
                    return data;
                }
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(Engine.prototype, "model", {
            get: function () {
                return this._o.model;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(Engine.prototype, "raw", {
            get: function () {
                return this._raw;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(Engine.prototype, "ownerDocument", {
            get: function () {
                return this._o.body.ownerDocument;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(Engine.prototype, "body", {
            get: function () {
                return this._o.body;
            },
            enumerable: false,
            configurable: true
        });
        Engine.WIN_PROPS = Object.getOwnPropertyNames(window);
        Engine.LOG_LEVEL = LogLevel.None;
        return Engine;
    }());
    JsonForm.Engine = Engine;
})(JsonForm || (JsonForm = {}));
