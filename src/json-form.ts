/**
 * JsonForm | A lightweight JavaScript library for generating dynamic forms from JSON/Object.
 * Version: 1.0.0
 * Homepage: https://github.com/Rmanaf/json-form
 * Licensed under MIT (https://github.com/Rmanaf/json-form/blob/master/LICENSE)
 * Author: Rmanaf
 * Email: me@rmanaf.com
 * Description: This is a library for generating dynamic forms based on JSON data.
 * It provides various options to customize the form and handle form events.
 */

namespace JsonForm {

    // This static variable defines the namespace used for custom events within the class.
    export const NS_EVENTS = 'json-form';


    export const STAGE_DELAY_INITIAL = 20;
    export const STAGE_DELAY_INTERMEDIATE = 40;
    export const STAGE_DELAY_FINAL = 60;



    // Definition of a constructor that creates an instance of an extension class.
    export type ExtensionConstructor<T extends Extension> = new (form: IJsonForm) => T;

    // Interface representing an instance of an extension class.
    interface IExtensionInstance<T extends Extension> {
        _constructor: ExtensionConstructor<T>;  // Reference to the constructor function.
        name: string;  // Name of the extension.
        instance: T;   // The actual instance of the extension class.
    }

    // Enumeration defining different levels of logging for the JsonForm library.
    export enum LogLevel {
        Errors,  // Log only error messages (for critical issues and unexpected behavior).
        Events,  // Log events triggered during form generation and updates.
        All,     // Log all messages (provides detailed information for debugging).
        None     // Disable all logging output.
    }

    // Abstract class representing an extension for JsonForm.
    export abstract class Extension {
        constructor(public readonly form: IJsonForm) { }

        abstract init(...args: any[]): IJsonForm;  // Initialization method for the extension.
    }

    // Factory function for creating instances of JsonForm.Engine.
    export function create(data: any, options?: any, target?: string | HTMLElement): IJsonForm {
        return new JsonForm.Engine(data, options, target);
    }

    // Utility methods.
    export class Utilities {

        public static uniqueID(prefix: string = '_'): string {

            // Generate a random decimal number between 0 and 1 using Math.random().
            const randomDecimal = Math.random();

            // Convert the random decimal number to a base-36 string (alphanumeric) using toString(36).
            // The base-36 representation includes digits 0-9 and lowercase letters a-z.
            const base36String = randomDecimal.toString(36);

            // Take a substring of the base-36 string to obtain a unique ID with a fixed length of 7 characters.
            // The substring starts at index 2 (to skip the "0." part) and includes the next 7 characters.
            // The final ID will have the format "_xxxxxxx", where "x" represents a random alphanumeric character.
            return prefix + base36String.substring(2, 9);

        }


        /**
         * Merges two objects into a new object by copying properties from both objects.
         *
         * @param {any} o1 - The first object to merge.
         * @param {any} o2 - The second object to merge.
         * @returns {any} - A new object containing properties from both input objects.
         * @static
         */
        public static merge(o1: any, o2: any): any {
            // Create a new object to store the merged properties.
            var r = {};

            // Iterate through the properties of o1.
            for (var a in o1) {
                // Copy each property from o1 to the new object r.
                r[a] = o1[a];
            }

            // Iterate through the properties of o2.
            for (var a in o2) {
                // Copy each property from o2 to the new object r.
                // If a property exists in both o1 and o2, the value from o2 will overwrite the value from o1 in the new object.
                r[a] = o2[a];
            }

            // Return the new object containing properties from both o1 and o2.
            return r;
        }

    }


    /**
     * The `Engine` class is the core implementation of the JsonForm library. It implements the `IJsonForm` interface,
     * providing a comprehensive set of methods and functionality to create, manage, and manipulate JSON-based forms.
     * Instances of the `Engine` class serve as the primary interface for interacting with JsonForm forms.
     *
     * @implements {IJsonForm} - Implements the IJsonForm interface, defining a contract for form-related operations.
     */
    export class Engine implements IJsonForm {


        /** 
         * This static variable contains an array of property names of the 'window' object.
         * In the _getObjectName method, the class iterates through the properties of the 
         * global window object and checks if the value of each property matches the provided data object. 
         * If a match is found, the method returns the name of the property as the object name. 
         * @private
         */
        private static readonly WIN_PROPS = Object.getOwnPropertyNames(window);


        /** 
         * This static variable determines the logging level for the class.
         * It is of type 'JsonForm.LogLevel', an enumeration representing different log levels.
         * The default value is 'None', indicating that logging is disabled by default.
         */
        static LOG_LEVEL: LogLevel = LogLevel.None;


        // This private instance variable holds a reference to the target element where the form data is updated.
        private _target: any;

        // This private instance variable stores the form data.
        private _d: any;

        // This private instance variable stores the initial form data.
        private _raw: any;

        // This private instance variable holds an options object used for configuring the form behavior.
        private _o: any;

        // This private instance variable contains an array of HTMLElements representing the dynamically generated nodes of the form.
        private _nodes: any[] = [];

        // This private instance variable holds an array of sections within the form.
        // Each section is represented by an HTMLElement.
        private _sections: any[] = [];



        /**
         * The `_extensions` property is an array that stores instances of extensions added to the JsonForm Engine.
         * Extensions enhance the functionality of the JsonForm Engine by providing additional features and behaviors.
         * Each element in the array is an object that contains information about the extension, including its constructor,
         * name, and the instance itself.
         *
         * @type {IExtensionInstance<Extension>[]} - An array of extension instances.
         * @private
         */
        private _extensions: IExtensionInstance<Extension>[] = new Array<any>();


        /**
         * Constructor for the Engine class.
         * @param {any} data The initial data to populate the form with. It can be an object or a JSON string.
         * @param {any} options (Optional) Configuration options for the form.
         * @param {string | HTMLElement} target (Optional) The target element or its ID where the updated data will be displayed.
         * @constructor
         */
        constructor(data: any, options: any = {}, target: string | HTMLElement = null) {
            // Default configuration options for the form.
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
                secure: false,
                events: {
                    "*": "keyup keypress focus blur change",
                    "*-number": "keyup keypress focus blur change mouseup"
                }
            };

            // If the provided data is a JSON string, parse it into an object.
            if (typeof data === "string") {
                let uid = JsonForm.Utilities.uniqueID();
                window[uid] = JSON.parse(data);
                data = window[uid];
            }


            // If a target element is provided, assign it to the _target property.
            if (target !== null) {
                if (typeof target === "string") {
                    this._target = <any>document.getElementById(target);
                } else if (target instanceof HTMLElement) {
                    this._target = target;
                } else if (this._mayLog(LogLevel.Errors)) {
                    this._log('Error', `Type of target is wrong!`);
                }
            }


            // Initialize the internal data (_d) with the provided data.
            this._d = data;

            // Store the raw data for later use (e.g., resetting the form).
            this._raw = data;

            // Merge the provided options with the default options to create the final options object (_o).
            this._o = this._extend(defaults, options);



            // Check if the type of this._o.body is 'string'
            if (typeof this._o.body === 'string') {
                // If it's a string, assume it contains an element ID in the document

                // Get the element from the DOM using the element ID
                // and replace the string value of this._o.body with the actual DOM element
                this._o.body = document.getElementById(this._o.body);
            }


            // Trigger the 'init' event asynchronously after a short delay to allow other parts of the application to attach event listeners.
            setTimeout(() => {

                 // Update the form with the initial data.
                this.update();


                setTimeout( () => {

                    // Dispatch the 'init' event to indicate that the form has been initialized.
                    this._dispatchEvent("init");

                } );


            }, JsonForm.STAGE_DELAY_INITIAL);

        }



        /**
         * Finds the name of the given object in the global window scope.
         * This method iterates through the properties of the window object
         * and compares each property value with the provided object.
         *
         * @param {any} o - The object for which the name needs to be found.
         * @returns {string} - The name of the object in the global window scope, if found; otherwise, it returns "undefined".
         * @private
         */
        private _getObjectName(o: any): string {
            // Iterate through the properties of the window object.
            for (let p in window) {
                // Skip properties listed in the WIN_PROPS array (constants or predefined properties).
                if (Engine.WIN_PROPS.indexOf(p) > -1) {
                    continue;
                }
                // Compare the value of each window property with the provided object (o).
                // If a match is found, return the name of the property (i.e., the object name).
                if (window[p] == o) {
                    return p;
                }
            }

            // If the object is not found in any of the window properties, return "undefined".
            return "undefined";
        }



        /**
         * Merges multiple objects into a single object by extending the target object with properties from source objects.
         *
         * @param {...any[]} args - The objects to merge. The first argument (args[0]) is the target object, and the rest are source objects.
         * @returns {any} - The target object after being extended with properties from source objects.
         * @private
         */
        private _extend(...args: any[]): any {
            // Start from the second argument (i=1) since the first argument (args[0]) is the target object.
            for (var i = 1; i < args.length; i++) {
                // Iterate through the keys (properties) of each source object.
                for (var key in args[i]) {
                    // Check if the key belongs to the source object itself (not inherited from the prototype chain).
                    if (args[i].hasOwnProperty(key)) {
                        // Add or update the property in the target object with the corresponding value from the source object.
                        args[0][key] = args[i][key];
                    }
                }
            }

            // Return the modified target object after extending it with properties from source objects.
            return args[0];
        }





        /**
         * Updates the target element with the JSON representation of the form data.
         * If no target element is defined, the method returns without taking further actions.
         * @private
         */
        private _updateTarget(): void {

            // Check if a target element is defined.
            if (typeof this._target === "undefined") {
                // If no target element is defined, return without further actions.
                return;
            }

            // Convert the form data (_d) to a JSON string representation.
            const jsondata = this.filterTargetValue(JSON.stringify(this._d));

            // Update the value property of the target element with the JSON data.
            this._target.value = jsondata;

            // Dispatch a custom event 'update.target' to notify listeners about the update.
            // The event includes an object with 'target' and 'data' properties.
            // 'target': Reference to the target element.
            // 'data': JSON data representing the current state of the form data.
            this._dispatchEvent('update.target', { target: this._target, data: jsondata });
        }



        /**
         * The `updateTarget` method is used to update the target element (if specified) with the current data in the JsonForm.
         * It triggers the internal `_updateTarget` method responsible for updating the target element's content.
         * This method is useful when you want to refresh the displayed data in the target element.
         *
         * @returns {void} - No return value.
         */
        public updateTarget(): void {
            this._updateTarget();
        }




        /**
         * Attaches event listeners to an HTML element for the specified event type(s).
         * @param {HTMLElement} e The target HTML element to which the event listener(s) will be attached.
         * @param {string | string[]} en The event type(s) or an array of event types to be listened to.
         * @param {EventListenerOrEventListenerObject} l The event listener function or object that will handle the events.
         * @param {boolean | AddEventListenerOptions} options (Optional) Additional event listener options.
         * @private
         */
        private _bindEvents(e: HTMLElement, en: string | string[], l: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void {

            // Check if the event types are provided as a single string or an array of strings.
            const events = typeof en === "string" ? en.split(' ') : en;

            // Iterate through each event type and attach the event listener to the element.
            for (var i = 0, iLen = events.length; i < iLen; i++) {
                e.addEventListener(events[i], l, options);
            }

        }




        /**
         * Creates an input element based on the provided template and appends it to the form.
         * @param {string} id The unique ID for the input element.
         * @param {string} path The path of the property associated with the input element.
         * @param {any} value The value of the input element.
         * @param {string} inputType The type of the input element.
         * @param {string} type The type of data for the input element.
         * @param {string} label The label for the input element.
         * @param {string} template The name of the template to be used for creating the input element.
         * @private
         */
        private _createFromTemplate(id: string, path: string, value: any, inputType:string, type:string, label: string, template:string): void {

            // Retrieve the template value from the options object using the template name.
            const templateVal = this._o.templates[template];

            // Get the document associated with the form's body.
            const doc = this._o.body.ownerDocument;

            // Find the template element using the template value as an ID.
            const temp = <any>doc.getElementById(templateVal);

            // Clone the template element to create a new instance of the input element.
            let clone = temp.cloneNode(true);

            // Create a dictionary to hold the values that will replace the template placeholders.
            var dict: object = {
                id,
                type,
                label,
                path,
                inputType,
                value,
                form: this
            }

            // Check if there are any custom metadata configurations for the input element type.
            const meta = this._pathIncludes(path, Object.keys(this._o.meta), inputType);

            // If there is custom metadata, merge it into the dictionary.
            if (meta) {
                dict = JsonForm.Utilities.merge(dict, this._o.meta[meta.match]);
            }

            // Iterate through the dictionary and replace the template placeholders with the actual values.
            Object.keys(dict).forEach(key => {

                const args = JsonForm.Utilities.merge(dict, { parsePath: this._parsePath });

                clone.innerHTML = clone.innerHTML.replace(/{{[^{}]+}}/g, function (key) {

                    const keySeq = key.replace(/[{}]+/g, "").split("|");

                    let result = dict[keySeq[0]] || "";

                    if (typeof result === "function") {
                        const userData = keySeq.length ? keySeq.slice(1, keySeq.length) : [];
                        result = result(JsonForm.Utilities.merge(args, { userData: userData }));
                    }

                    return result;

                }.bind(this));

            });

            // Create a fragment using the cloned template content.
            let fragment = document.importNode(clone.content, true);

            this._nodes.push(...fragment.childNodes);

            // Append the input element to the form or the appropriate section, if defined.
            this._appendInput(fragment, path);

        }



        /**
         * Creates and configures an input element for the form based on the provided data and options.
         * @param {any} value The value of the input element.
         * @param {string} inputType The type of the input element.
         * @param {string} path The path of the property associated with the input element.
         * @param {string} type The type of data for the input element.
         * @private
         */
        private _createInput(value: any, inputType: string, path: string, type) {

            // Generate a unique ID for the input element.
            let id = JsonForm.Utilities.uniqueID();

            let input: any;

            let inputName: string  = this.filterInputName(path);

            let inputLabel: string = this.getLabel(path);



            // Check if there is a template configuration for the input element type.
            const template = this._pathIncludes(path, Object.keys(this._o.templates), inputType);

            if (template) {

                // If there is a template, create the input element from the template.
                this._createFromTemplate(id, path, value, inputType, type, inputLabel, template.match);

                // Get the created input element based on the generated ID.
                input = document.getElementById(id);

                // If the input element is not found in the document, log an error (if log level allows) and return without further actions.
                if (typeof input === "undefined") {
                    if (this._mayLog(LogLevel.Errors)) {
                        this._log('Error', `Missing element for <${template.match}>`);
                    }
                    return;
                }
            } else {
                // If there is no template, create a new input element.
                input = document.createElement("input");

                input.setAttribute("id", id);
            }

            // Set the 'name' attribute of the input element.
            input.setAttribute("name", inputName);

            // Set the 'type' attribute of the input element to the specified type.
            if (input instanceof HTMLInputElement) {
                input.setAttribute("type", inputType);
            } else {
                this._setElementData(input, { jfInputType: inputType });
            }

            this._setElementData(input, { jfPath: path, jfType: type });

            // Set the value of the input element based on the provided data.
            input.value = value;

            // For checkbox inputs with boolean type, set the 'checked' attribute based on the value.
            if (inputType === "checkbox" && type === "boolean") {
                input.checked = value;
            }

            // Check if there are any custom attributes configured for the input element type.
            let attribute = this._pathIncludes(path, Object.keys(this._o.attributes), inputType);

            if (attribute) {
                // If there are custom attributes, set them on the input element.
                Object.keys(this._o.attributes[attribute.match]).forEach(attr => {
                    input.setAttribute(attr, this._o.attributes[attribute.match][attr]);
                });
            }

            if (!template) {
                // If there is no template, create a label element to wrap the input element.
                let label = document.createElement("label");
                label.setAttribute("for", id);

                if (inputType === "checkbox") {
                    // For checkboxes, add a <span> element to display the label text.
                    let span = document.createElement("span");
                    span.innerHTML = inputLabel;

                    // Append the input element and <span> element to the label.
                    label.appendChild(input);
                    label.appendChild(span);
                } else {
                    // For other input types, set the label text directly and append the input element.
                    label.innerHTML = inputLabel;
                    label.appendChild(input);
                }

                // Append the label to the form and update the nodes list.
                this._nodes.push(this._appendInput(label, path));
            }

            // Check if there are any custom events configured for the input element type.
            let events = this._o.events;
            let event = this._pathIncludes(path, Object.keys(this._o.events), inputType);
            if (event) {
                events = this._o.events[event.match];
            }


            // Bind the specified events to the input element, and call the _eventHandler function when the events are triggered.
            this._bindEvents(input, events, this._eventHandler.bind(this));

        }




        /**
         * Appends an input element to the form, either directly to the body or within a section.
         * @param {HTMLElement} element The input element to be appended to the form.
         * @param {string} path The path of the property associated with the input element.
         * @param {string} type Optional. The type of the input element (default: 'input').
         * @returns {HTMLElement} The input element that was appended to the form.
         * @private
         */
        private _appendInput(element: HTMLElement, path: string, type: string = 'input'): HTMLElement {

            // Extract the parent path (all but the last part) from the provided path.
            let parent = path.split('.').slice(0, -1).join('.');

            // Check if the input element belongs to a section by searching for a matching section key in the options.
            let skey = Object.keys(this._o.sections).filter(s => {
                let res = this._pathIncludes(path, this._o.sections[s].children, type);
                return res !== false;
            });

            // Check if the parent is an array (in case it is a nested element within an array).
            let isInArray = this._testArray(parent) !== false;

            if (skey.length) {
                // If the input element belongs to a section:

                let theKey = skey[0];

                // Get the section object from the options using the found section key.
                let section = this._o.sections[theKey];

                // Check if the current parent is already in the form (for cases when a section is within an array).
                if (this._sections.hasOwnProperty(parent) && isInArray) {
                    theKey = parent;
                }

                // Check if the section is already added to the form.
                if (this._sections.hasOwnProperty(theKey)) {
                    // If the section is already in the form, retrieve it.
                    section = this._sections[theKey];
                } else {
                    // Otherwise, create a new section and add it to the form.

                    // Create a new section element based on the section template (if provided) or default to "section".
                    let newSection = this._createElementFromHTML(section.template || "section");


                    if (section.repeat !== true) {
                        // If the section is not set to repeat, store it in the sections object for later use.
                        newSection.setAttribute("data-section", theKey);
                        this._sections[theKey] = newSection;
                    } else if (section.merge === true && isInArray) {
                        // If the section is set to merge and is within an array, use the parent path as the key.
                        newSection.setAttribute("data-section", parent);
                        this._sections[parent] = newSection;
                    }

                    // Append the new section to the form's body and update the nodes list.
                    this._o.body.appendChild(newSection);
                    section = newSection;
                    this._nodes.push(newSection);
                }

                // Append the input element to the section.
                section.appendChild(element);

                return element;

            }

            // If the input element does not belong to a section, append it directly to the form's body.
            this._o.body.appendChild(element);

            return element;
        }



        /**
         * This private method checks if the provided `path` is included in the `paths` array or matches any of the specified patterns.
         * It provides flexibility for path matching and can be used to determine if a given `path` exists in the `paths` array or matches any of the patterns.
         *
         * @param {string} path - The path to be checked for inclusion in the `paths` array.
         * @param {string[]} paths - An array of strings representing paths to be checked for matching with the `path`.
         * @param {string} [type='input'] - A string representing a type used for matching paths (optional, default is 'input').
         * @param {boolean} [checkAncestors=true] - A flag indicating whether to check for ancestor paths (optional, default is true).
         * @returns {object | false} - An object containing the matched path and mode if a match is found, or false if no match is found.
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

                // Loop through the paths array to find a regex match
                for (let p in paths) {

                    // Check if the path element in paths array is a regex pattern
                    if (/\/\S+\//.test(paths[p])) {

                        // Convert the regex pattern to a regular expression
                        let regex = Engine.stringToRegex(paths[p]);

                        // Test if the provided path matches the regex pattern
                        if (regex.test(path)) {

                            // Return the match details when a regex match is found
                            return {
                                path: path,
                                match: paths[p],
                                mode: "regex"
                            };
                        }
                    }
                }
            }

            // Check for type-based match
            if (paths.some(x => x === `*-${type}`)) {

                // Return the match details when a type-based match is found
                return {
                    path: path,
                    match: `*-${type}`,
                    mode: "type"
                };
            }

            // Check for wildcard in paths
            if (paths.some(x => x === "*" || x === '*.*')) {

                // Return the match details when a wildcard match is found
                return {
                    path: path,
                    match: '*',
                    mode: "wildcard"
                };
            }

            // Check if any of the parents are in paths
            if (checkAncestors) {

                // Create a copy of the path for checking ancestor paths
                var pathClone = path;

                // Loop through the ancestors of the provided path
                while (pathClone.length) {

                    // Get the ancestor path by removing the last segment of the path
                    let p = pathClone.split('.').slice(0, -1).join('.');

                    // Check if the ancestor path is in the paths array
                    if (paths.indexOf(p) >= 0) {

                        // Return the match details when an ancestor match is found
                        return {
                            path: path,
                            match: p,
                            mode: "ancestor"
                        };
                    }

                    // Continue checking the next ancestor level
                    pathClone = p;
                }
            }

            // Return false if no match is found
            return false;
        }





        /**
         * Converts a string representation of a regular expression into a RegExp object.
         * @param {string} s The string representation of the regular expression.
         * @param {RegExpMatchArray} m An optional RegExpMatchArray to store the result of the regular expression match.
         * @returns {RegExp} A regular expression object based on the input string.
         * @static
         */
        static stringToRegex(s: string, m: RegExpMatchArray = null): RegExp {
            // Use a regular expression to check if the input string matches the format for a valid regular expression.
            if (m = s.match(/^([\/~@;%#'])(.*?)\1([gimsuy]*)$/)) {
                // If the input string matches the format for a valid regular expression:

                // Extract the inner pattern of the regular expression (group 2).
                const innerPattern = m[2];

                // Extract the flags for the regular expression (group 3) and remove duplicates.
                const flags = m[3].split('').filter((i, p, s) => s.indexOf(i) === p).join('');

                // Create and return a new RegExp object using the inner pattern and flags.
                return new RegExp(innerPattern, flags);
            } else {
                // If the input string does not match the format for a valid regular expression:

                // Create and return a new RegExp object using the original input string.
                return new RegExp(s);
            }
        }




        /**
         * Event handler for form input changes.
         * This function is called when an input element within the form is modified.
         * It extracts the necessary information from the event and updates the corresponding form data.
         * It also triggers the 'change' event with relevant details to notify listeners about the change.
         * @param {Event} e The event object generated by the input element modification.
         * @private
         */
        private _eventHandler(e: Event) {

            // Get a reference to the target element (input element that triggered the event).
            const target = <any>e.target;

            const eventType = e.type;

            // Get the type attribute of the input element (i.e., the type of property).
            const t = target.getAttribute("type");


            const { jfType, jfPath } = this._getElementData(target, 'jfType', 'jfPath');


            // Get the value of the input element.
            let value: any = target.value;

            // For checkboxes, use the 'checked' property as the value.
            if (t === "checkbox") {
                value = target.checked;
            }

            // For number inputs, if the value is empty, set it to 0 to ensure consistent data type.
            if (jfType === "number" && value === "") {
                value = 0;
            }


            try {

                // Update the form data (_d) with the new value and type.
                this._updateData(jfPath, value, jfType);


            } catch (error) {

                // If there is an error during data update, log the error (if log level allows) and return without further actions.
                if (this._mayLog(LogLevel.Errors)) {
                    this._log('Error', `Unable to set value "${value}" for "${jfPath}".\n${error.message}`);
                }

                return;

            }

            // After updating the data, update the target element (if defined) with the updated data.
            this._updateTarget();


            // Dispatch a custom event 'change' to notify listeners about the data change.
            // The event includes an object with 'path', 'type', and 'event' properties.
            this._dispatchEvent('change', {
                path: jfPath,
                type: jfType,
                event: eventType
            });

        }




        /**
         * Retrieves stored data from an HTML element, either securely or from the dataset.
         * @param {HTMLElement} element The HTML element from which to retrieve data.
         * @param {...string} properties The property names to retrieve from the element.
         * @returns {any} An object containing the retrieved data.
         * @private
         */
        private _getElementData(element: any, ...properties: string[]): any {

            let props = {};

            if (!element) {
                element = this._o.body;
            } else {
                element = this._validateElement(element);
            }


            // Loop through each property to retrieve
            properties.forEach(property => {
                try {

                    if (this._o.secure === true && element.jf && element.jf[property] !== undefined) {

                        // If in "secure" mode and the property is stored in the 'jf' property of the element
                        props[property] = element.jf[property];

                    } else if (element.dataset[property] !== undefined) {

                        // Otherwise, retrieve the property from the element's dataset
                        props[property] = element.dataset[property];

                    } else {

                        props[property] = false;

                    }

                } catch (e) {

                    if (this._mayLog(LogLevel.Errors)) {
                        console.error(e);
                    }

                    props[property] = false;

                }
            });


            // If only one property was requested, return its value directly
            if (properties.length === 1) {
                return props[properties[0]];
            }


            return props;
        }



        /**
         * The `getElementData` method retrieves custom data associated with a given HTML element.
         * It allows you to fetch specific properties from an element's dataset or custom 'jf' property.
         *
         * @param {any} element - The HTML element from which to retrieve data.
         * @param {...string} properties - The properties to retrieve from the element.
         * @returns {any} - An object containing the retrieved data properties.
         */
        public getElementData(element: any, ...properties: string[]): any {
            return this._getElementData(element, ...properties);
        }



        /**
         * Sets or updates data within an HTML element, either in a secure manner or using the dataset.
         * @param {any} element The HTML element to store data within.
         * @param {Record<string, any>} data The data to be stored in the element.
         * @returns {void}
         * @private
         */
        private _setElementData(element: any, data: Record<string, any>): void {

            if (!element) {
                element = this._o.body;
            }

            // Loop through each property in the 'data' object
            for (const property in data) {
                if (data.hasOwnProperty(property)) {
                    if (this._o.secure === true) {
                        // If in "secure" mode, create or update the 'jf' property of the element to store the data
                        element.jf = element.jf || {};
                        element.jf[property] = data[property];
                    } else {
                        if (data[property]) {
                            // Otherwise, set or update the data property in the element's dataset
                            element.dataset[property] = typeof data[property] === 'string' ? data[property] : JSON.stringify(data[property]);
                        } else {
                            delete element.dataset[property];
                        }
                    }
                }
            }
        }



        /**
         * The `setElementData` method is used to set custom data on an HTML element.
         * It allows you to associate key-value pairs with an element, either by modifying its dataset or a custom 'jf' property.
         *
         * @param {any} element - The HTML element on which to set custom data.
         * @param {Record<string, any>} data - An object containing the data to be set as properties on the element.
         * @returns {void}
         */
        public setElementData(element: any, data: Record<string, any>): void {
            this._setElementData(element, data);
        }




        /**
         * Parses a given string path representing the property location within the 'window' object.
         * @param {string} p The path to be parsed.
         * @returns {object} An object with utility methods to get and set values based on the provided path.
         * @private
         */
        private _parsePath(p) {
            // Split the path into an array of segments using the '.' separator.
            const arr: string[] = p.split('.');
            // Initialize an empty object to store the reference to the 'window' object or its property.
            let obj = {};

            // Check if the path starts with 'window' and remove it from the path if present.
            if (arr[0] === 'window') {
                arr.shift();
            }

            // Pop the last element from the array, which represents the target property name.
            let param = arr.pop();

            // Check if the target property is an array using the '_testArray' method.
            let ta = this._testArray(param);

            // Check for array
            if (ta) {
                // If the target property is an array, modify the path accordingly.
                arr.push(ta.value);
                param = ta.matches[1];
            }

            // Reduce the array of segments to get the reference to the target object within the 'window'.
            obj = arr.reduce((a, b) => {
                let ta = this._testArray(b);
                if (ta) {
                    // If a segment is an array element, access the specific element of the array.
                    return a[ta.value][ta.matches[1]];
                }
                // Otherwise, access the property within the object.
                return a[b];
            }, window);

            // Return an object with utility methods 'get' and 'set' to access the property value.
            return {
                object: obj,                        // The reference to the target object.
                parameter: param,                   // The name of the target property.
                get: () => {
                    // Method to get the value of the target property.
                    return typeof param === "undefined" ? obj : obj[param];
                },
                set: (value) => {
                    // Method to set the value of the target property.
                    if (typeof param === "undefined") {
                        return;
                    }
                    obj[param] = value;
                }
            };
        }


        /**
         * Checks if the given text represents an array in the path notation (e.g., 'array[0].property').
         * @param {string} text The path to check.
         * @returns {boolean|object} False if the provided string is not an array, otherwise an object with array information.
         * @private
         */
        private _testArray(text: string): boolean | any {
            // Regular expression to match array notation in the path.
            const arrayRegex = /\[([^)]+)\]/;

            // Test if the provided text matches the array notation regex.
            if (arrayRegex.test(text)) {
                // If the provided text matches the array notation, extract the array index.
                const matches = arrayRegex.exec(text);
                // Get the modified string with the array index removed.
                const value = text.replace(arrayRegex, '');
                // Return an object containing the array index and the modified string.
                return {
                    matches: matches,
                    value: value
                };
            }

            // If the provided text does not match the array notation regex, return false.
            return false;
        }


        /**
         * Updates the data object with a new value for a specified path and type.
         * @param {string} p The path of the input property in the data object.
         * @param {any} v The new value of the input.
         * @param {string} t The type of the data property (e.g., "string", "number", "boolean").
         * @private
         */
        private _updateData(p, v, t) {
            // Prepare an arguments object containing the path, value, and type of the input.
            const args = { path: p, value: this._castToType(t, v), type: t };

            // Parse the path to obtain the object and parameter (property name) where the value needs to be updated.
            let data = this._parsePath(p);

            this._dispatchEvent('updating.data');

            // Update the value of the specified property in the data object with the new value.
            data.object[data.parameter] = this.filterData(args).value;

            // Dispatch an "updated.data" event, notifying any listeners about the data update.
            this._dispatchEvent('updated.data');
        }




        /**
         * Converts the input value to the specified type.
         * @param {string} type The type to cast the input to (e.g., "number", "boolean").
         * @param {any} input The input value to be casted.
         * @returns {any} The input value casted to the specified type.
         * @private
         */
        private _castToType(type, input) {
            switch (type) {
                case 'number':
                    return Number(input); // Convert to a number using the Number() function.
                case 'boolean':
                    return Boolean(input); // Convert to a boolean using the Boolean() function.
                default:
                    return input; // For other types, return the original input value.
            }
        }



        /**
         * Recursively checks the JSON data structure and generates input fields for each property.
         * @param {string} d The name of the property being checked (for labeling purposes).
         * @param {string} path The path of the current property within the JSON data structure.
         * @private
         */
        private _checkValues(d: string, path: string): void {
            // Get information about the property using the path.
            let pathInfo = this._parsePath(path);
            // Get the value of the property.
            let child = pathInfo.get();

            // Determine the type of the property.
            let type = typeof child;
            // Default input type to "text".
            let inputType = "text";

            // Depending on the type of the property, handle it differently.
            switch (type) {
                case "object":
                    if (Array.isArray(child)) {
                        // If the property is an array, traverse each element of the array recursively.
                        child.forEach((v, i, a) => {
                            let newPath = `${path}[${i}]`;
                            this._checkValues(v, newPath);
                        });
                    } else {
                        // If the property is an object, traverse each key-value pair of the object recursively.
                        Object.keys(child).forEach((e) => {
                            let newPath = `${path}.${e}`;
                            this._checkValues(e, newPath);
                        });
                    }
                    return;

                case "boolean":
                    // For boolean properties, set the input type to "checkbox".
                    inputType = "checkbox";
                    break;

                case "number":
                    // For number properties, set the input type to "number".
                    inputType = "number";
                    break;
            }

            // Check if there are specific types to be applied to the input fields using the '_o.types' option.
            const types = this._pathIncludes(path, Object.keys(this._o.types), inputType);
            if (types) {
                // If a specific type is defined for this property, use it as the input type.
                inputType = this._o.types[types.match];
            }

            // Check if the property is in the list of excluded properties using the '_o.exclude' option.
            const exclude = this._pathIncludes(path, this._o.exclude, inputType);
            if (exclude) {
                // If the property is excluded, do not create an input field for it.
                return;
            }

            // Create an input field for the property with the appropriate type and add it to the form.
            this._createInput(child, inputType, path, type);


            this._dispatchEvent('append', { path });

        }



        /**
        * Clears the form by removing all input fields and generated sections.
        * @param {boolean} dispatch If true, an event 'clear' will be dispatched after clearing the form.
        * @private
        */
        private _clearForm(dispatch: boolean = false): void {

            // Iterate over all the nodes (input elements and sections) generated by the form.
            this._nodes.forEach((node: HTMLElement) => {
                // Check if the node has a parent node (i.e., it is part of the DOM).
                if (node.parentNode !== null) {
                    // Remove the node from its parent, effectively deleting it from the form.
                    node.parentNode.removeChild(node);
                }
            });

            // Clear the '_nodes' array, as all nodes have been removed from the form.
            this._nodes = [];

            // Clear the '_sections' array, as all generated sections have been removed.
            this._sections = [];

            // If 'dispatch' parameter is true, trigger a custom 'clear' event to notify listeners that the form is cleared.
            if (dispatch) {
                this._dispatchEvent('clear');
            }
        }



        /**
         * Logs a message to the console if the log level is not set to 'None' and satisfies the minimum log level.
         * @param {JsonForm.LogLevel} level The log level to check.
         * @private
         */
        private _mayLog(level: JsonForm.LogLevel): boolean {
            return Engine.LOG_LEVEL !== LogLevel.None && (Engine.LOG_LEVEL === level || Engine.LOG_LEVEL == LogLevel.All);
        }




        /**
         * Logs a message to the console with the current timestamp and provided arguments.
         * @param {string[]} args The arguments to pass to the console.
         * @private
         */
        private _log(...args: string[]): void {
            const now = (new Date()).toISOString().slice(11, -1);
            console.log(now, ...args);
        }



        /**
         * Dispatches a custom event with the provided type and optional detail.
         * @param {string} type The type of event.
         * @param {any} detail The detail of the event.
         * @private
         */
        private _dispatchEvent(type: string, detail: any = null): void {

            // Construct the full event name by combining the namespace and the provided type.
            const evt = `${JsonForm.NS_EVENTS}.${type}`;


             // Check if logging for events is enabled by calling the '_mayLog' method with 'LogLevel.Events'.
             if (this._mayLog(LogLevel.Events)) {
                // If logging is enabled, log the event details to the console using the '_log' method.
                // Log the timestamp (current time) and the event name ('evt').
                // If 'detail' is truthy (i.e., provided), also log the JSON stringified version of the 'detail' data.
                this._log("Event", evt, JSON.stringify(detail) || "");
            }


            // Check if 'detail' is provided (truthy).
            if (detail) {
                // If 'detail' is truthy, create a new CustomEvent with the 'evt' name and 'detail' data.
                // CustomEvent allows passing custom data along with the event.
                this._o.body.dispatchEvent(new CustomEvent(evt, { detail: detail }));
            } else {
                // If 'detail' is falsy (not provided), create a regular Event with just the 'evt' name.
                // Regular Event is a simple event without custom data.
                this._o.body.dispatchEvent(new Event(evt));
            }


        }


        /**
         * Dispatches a custom event with the provided type and optional detail.
         * @param {string} type The type of event.
         * @param {any} detail The detail of the event.
         * @public
         */
        public dispatchEvent(type: string, detail: any = null): void {
            this._dispatchEvent(type, detail);
        }




        /**
         * Destroys the form by resetting data to default, removing generated nodes, and dispatching a 'destroy' event.
         * @public
         */
        public destroy(): void {

            // Reset data to default by calling the 'reset' method.
            // This method resets the form data to its initial/default state.
            this.reset();

            // Remove all of the generated nodes by calling the '_clearForm' method.
            // This method removes all the dynamically generated HTML nodes associated with the form.
            this._clearForm();

            // Dispatch the 'destroy' event by calling the '_dispatchEvent' method with 'destroy' as the event type.
            // The '_dispatchEvent' method is responsible for triggering custom events with optional event data.
            // In this case, it dispatches a 'destroy' event, indicating that the form has been destroyed.
            // Other parts of the application can listen for this event and perform necessary actions when the form is destroyed.
            this._dispatchEvent('destroy');
        }








        /**
         * Sets a property in the options object with the provided value (v).
         * @param {string} o The name of the property to be set.
         * @param {any} v The value to set for the property.
         * @public
         */
        public set(o: string, v: any): void {
            // Check if the provided property exists in the options object (_o).
            if (!this._o.hasOwnProperty(o)) {
                // If the property does not exist, log an error (if log level allows) and return without setting the value.
                if (this._mayLog(LogLevel.Errors)) {
                    this._log('Error', `"${o}" is not defined.`);
                }
                return;
            }

            // Retrieve the type of the existing property in the options object (_o).
            let type = typeof this._o[o];

            // Retrieve the type of the provided value (v).
            let valType = typeof v;

            // Check if the type of the provided value (v) matches the type of the existing property in the options object (_o).
            if (typeof v !== typeof this._o[o]) {
                // If there is a type mismatch, log an error (if log level allows) and return without setting the value.
                if (this._mayLog(LogLevel.Errors)) {
                    this._log('Error', `Type mismatch for "${o}" : "${type}". Current value is "${valType}".`);
                }
                return;
            }

            // If the provided value type matches the existing property type, set the value of the property in the options object (_o).
            this._o[o] = v;
        }



        /**
         * Removes all the input fields from the form.
         * This method calls the _clearForm function with the argument 'true',
         * which indicates that the function should dispatch the 'clear' event.
         * @public
         */
        public clear(): void {
            // Calls the _clearForm function with the argument 'true'.
            // The 'true' argument indicates that the function should dispatch the 'clear' event.
            this._clearForm(true);
        }



        /**
         * Regenerates the form using the current data.
         * This method rebuilds the form based on the current data model.
         * It clears any existing input fields, checks the values for the current model in the data object,
         * updates the form with the new input fields, and dispatches an 'updated' event to notify listeners.
         * @public
         */
        public update(): void {

            // Get the current model name from the data.
            const model = this._o.model;

            // Get the name of the object in the data.
            const objName = this._getObjectName(this._d);

            // Create the path for the current model in the data object.
            const path = this.hasModel() ? `${objName}.${model}` : objName;

            // Dispatch the 'updating' event.
            this._dispatchEvent('updating');

            // Remove all existing input fields from the form.
            this._clearForm();

            // Rebuild the form by checking the values for the current model in the data object.
            this._checkValues(model, path);

            // Update the form with the new input fields based on the current data.
            this._updateTarget();

            // Dispatch the 'updated' event to notify listeners that the form has been updated.
            this._dispatchEvent('updated');
        }



        /**
         * Checks if the form has a model defined.
         * @returns {boolean} True if a model is defined, false otherwise.
         * @public
         */
        public hasModel(): boolean {
            // The method checks if the length of the model name obtained from the 'model()' method is truthy.
            // If the model name is non-empty (truthy), it means the form has a model defined.
            // Otherwise, it means the form does not have a model defined.
            return !!this._o.model.length;
        }



        /**
         * Resets the form data to its initial state, optionally targeting a specific model.
         * @param {string} model - The optional model to reset. If provided, only the specified model's data will be reset.
         * @returns {any} The updated form data after resetting.
         * @public
         */
        public reset(model: string = ""): any {
            // Store the initial raw data in a variable called 'initData'.
            const initData = this._raw;

            // Get the current model name from the data.
            var _m = this._o.model;

            // If the 'model' parameter is provided, update the '_m' variable with its value.
            // This allows the method to reset data only for the specified model.
            if (model.length) {
                _m = model;
            }

            // Check if the '_m' variable holds a model name.
            if (_m.length) {
                // If '_m' is not empty (i.e., a model name is provided), reset the data for the specified model in the options object (_o).
                // This ensures that only the data corresponding to the provided model is reset to its initial state.
                this._o.data[model] = initData[model];
            } else {
                // If '_m' is empty (i.e., no model name is provided), reset the entire data object in the options (_o) to its initial state.
                this._o.data = initData;
            }

            // Return the updated form data after resetting.
            return this.data();
        }



        /**
          * [DEPRECATED] Resets the entire form data to its initial state.
          * @returns {any} The updated form data after resetting.
          * @deprecated Use reset() instead.
          * @public
          */
        public resetAll(): any {
            // Call the 'reset' method with an empty string as the parameter.
            // The empty string indicates that the method should reset the entire form data.
            return this.reset();
        }



        /**
         * Creates an HTML element from the provided HTML string.
         * If the input HTML string contains a complete HTML structure with tags, the method will parse it
         * using a temporary HTML document to extract the first child element.
         * If the input HTML string is a single tag (e.g., "<div>"), it directly creates the element using document.createElement().
         *
         * @param {string} htmlString The HTML string to create an element from.
         * @returns {HTMLElement} The newly created HTML element.
         * @private
         */
        private _createElementFromHTML(htmlString: string): HTMLElement {
            // Check if the HTML string contains any HTML tags using a simple regex test.
            if (/<\/?[a-z][\s\S]*>/i.test(htmlString)) {
                // If the HTML string contains HTML tags, create a temporary HTML document.
                const tmp = document.implementation.createHTMLDocument();
                // Set the HTML content of the temporary document's body to the input HTML string.
                tmp.body.innerHTML = htmlString;
                // Return the first child element of the temporary document's body, which is the parsed element.
                return tmp.body.firstChild as HTMLElement;
            } else {
                // If the input HTML string is a single tag (e.g., "<div>"), directly create the element using document.createElement().
                return document.createElement(htmlString);
            }
        }



        /**
         * Validates and converts an HTML element or element path to the corresponding HTMLElement.
         * @param {HTMLElement | string} element The HTML element or element path to validate and convert.
         * @returns {HTMLElement | undefined} The validated HTMLElement instance.
         * @private
         */
        private _validateElement<T extends HTMLElement | string>(element: T): T | undefined {

            // If 'element' is a string (element path), convert it to the corresponding HTML element using the 'find' method
            if (typeof element === 'string') {
                const search = this.find(element);

                if (search) {
                    element = <T>search[0];
                } else {
                    return undefined;
                }
            }

            // Return the validated HTML element instance
            return element;
        }




        /**
         * [DEPRECATED] Adds an event listener to the form's body element.
         * This method is a convenient wrapper for binding event listeners to the form's body element.
         *
         * @param {string} type The type of the event to listen for (e.g., "click", "change").
         * @param {EventListenerOrEventListenerObject} listener The event listener function or object to be called when the event is triggered.
         * @param {boolean | AddEventListenerOptions} [options] An optional parameter specifying options for the event listener.
         * @returns {void}
         * @deprecated Use on(type, listener, options) instead.
         * @public
         */
        public addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void {
            // Call the private _bindEvents method, passing the form's body element as the target element.
            // This method is responsible for actually binding the event listener to the target element.
            this._bindEvents(this._o.body, type, listener, options);
        }




        /**
         * Adds an event listener to the form's body element.
         * This method is a convenient wrapper for binding event listeners to the form's body element.
         *
         * @param {string} type The type of the event to listen for (e.g., "click", "change").
         * @param {EventListenerOrEventListenerObject} listener The event listener function or object to be called when the event is triggered.
         * @param {boolean | AddEventListenerOptions} [options] An optional parameter specifying options for the event listener.
         * @returns {void}
         * @public
         */
        public on(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void {
            // Call the private _bindEvents method, passing the form's body element as the target element.
            // This method is responsible for actually binding the event listener to the target element.
            this._bindEvents(this._o.body, type, listener, options);
        }




        /**
         * The `find` method is used to locate HTML input elements within the form body based on specified paths.
         * It queries the form's body for input elements and filters them based on whether their 'data-jf-path'
         * attribute matches any of the provided paths.
         *
         * @param {...string} paths - The paths to search for within the form's input elements.
         * @returns {HTMLElement[] | undefined} - An array of matching HTML input elements or undefined if none are found.
         */
        public find(...paths: string[]): HTMLElement[] | undefined {

            // Get all input elements within the form's body
            let inputs = [...this._o.body.querySelectorAll('input')];

            // If paths are provided, filter the input elements based on matching paths
            if (paths.length) {
                inputs = inputs.filter(x => this._pathIncludes(this._getElementData(x, 'jfPath'), paths));
            }

            // Return the array of matching input elements or undefined if none are found
            if (inputs.length) {
                return inputs;
            }

            return undefined;
        }






        /**
         * Retrieves the path associated with a specified HTML element in the form.
         * @param {HTMLElement | string} element The HTML element or element path to retrieve the path for.
         * @returns {string} The path associated with the specified HTML element.
         */
        public getPath(element?: HTMLElement | string): string {
            // Retrieve and return the path of the specified form element using the '_getElementData' method
            // First, ensure that 'element' is a valid HTML element
            return this._getElementData(this._validateElement(element), 'jfPath');
        }





        /**
         * Retrieves the type associated with a specified HTML element in the form.
         * @param {HTMLElement | string} element The HTML element or element path to retrieve the type for.
         * @returns {string} The type associated with the specified HTML element.
         */
        public getType(element?: HTMLElement | string): string {
            // Retrieve and return the type of the specified form element using the '_getElementData' method
            // First, ensure that 'element' is a valid HTML element
            return this._getElementData(this._validateElement(element), 'jfType');
        }



        /**
         * The `getLabel` method is used to retrieve a label associated with a specific form field path.
         * It looks for a label that matches the provided path in the form's configuration options and returns it.
         * If a matching label is not found, it falls back to using the parameter name from the path.
         *
         * @param {string} path - The path of the form field for which to retrieve the label.
         * @returns {string} - The label associated with the field, or the parameter name if no label is found.
         */
        public getLabel(path: string): string {

            // Check if a label matching the provided path exists in the form's configuration options
            const label = this._pathIncludes(path, Object.keys(this._o.labels));

            // Parse the path to extract parameter information
            const pathInfo = this._parsePath(path);

            let inputLabel: any;

            // If a matching label is found, look up the corresponding input label
            if (label) {
                inputLabel = this._o.labels[label.match];
            }

            // If the label is a function, call it with the name and path to get the final label
            if (typeof inputLabel === "function") {
                inputLabel = inputLabel(pathInfo.parameter, path);
            } else if (typeof inputLabel === "undefined") {
                // If no label is found, use the parameter name from the path as a fallback
                inputLabel = pathInfo.parameter;
            }

            // Return the determined label
            return inputLabel;
        }




        /**
         * This method is used to check if a given 'path' exists in the array of 'paths'.
         * @param {string} path - The path to be checked.
         * @param {string[]} paths - An array of paths to compare with the given 'path'.
         * @param {string} [type='input'] - An optional string to specify the type of path. Default is 'input'.
         * @param {boolean} [checkAncestors=true] - An optional boolean flag to determine whether to check for ancestor paths. Default is true.
         * @returns {any} - Returns an object with information about the matching path or false if no match is found.
         */
        public pathIncludes(path: string, paths: string[], type: string = 'input', checkAncestors: boolean = true): any {
            // Call the private '_pathIncludes' method with the provided parameters
            // and return its result.
            return this._pathIncludes(path, paths, type, checkAncestors);
        }




        /**
         * The `use` method is used to add and apply extensions to a `JsonForm` instance.
         * It is a generic method that takes two arguments:
         *
         * @param ext - A constructor function for the extension class that extends `JsonForm.Extension`.
         *              The generic type `T` is used to ensure that the provided extension is a valid subclass of `JsonForm.Extension`.
         *
         * @param args - An optional list of arguments that will be passed to the extension's `init` method.
         *              The `init` method is used to initialize and configure the extension when it's applied to the `JsonForm`.
         *              The `args` can be of any type depending on the specific requirements of the extension's `init` method.
         *
         * @returns {JsonForm} - Returns the `JsonForm` instance with the extension applied.
         * @public
         */
        public use<T extends Extension>(ext: ExtensionConstructor<T>, ...args: any[]): IJsonForm {
            // Check if the extension is already added to the form
            if (this.get(ext)) {
                // Log an error message if the extension is already added
                if (this._mayLog(LogLevel.Errors)) {
                    this._log('Extension is already added to the form!');
                }
                // Return the current `JsonForm` instance without applying the extension again
                return this;
            }

            // Create a new instance of the provided extension class using the constructor.
            const instance = new ext(this);

            // Call the `init` method of the extension, passing the current `JsonForm` instance and any additional arguments.
            instance.init(...args);

            // Store information about the added extension, including its constructor and instance.
            this._extensions.push({
                _constructor: ext,
                name: Engine._getExtName(ext),
                instance: instance
            });

            // Return the current `JsonForm` instance with the extension applied.
            return this;
        }





        /**
         * The `get` method is used to retrieve an instance of a specific extension that has been added to the `JsonForm`.
         * It takes the constructor function of the extension as an argument and returns the instance of that extension if it exists.
         *
         * @param ext - The constructor function of the extension class that extends `JsonForm.Extension`.
         * @returns {T | undefined} - Returns the instance of the specified extension if found, or `undefined` if not found.
         * @public
         */
        public get<T extends Extension>(ext: ExtensionConstructor<T>): T | undefined {
            // Get the name of the extension based on its constructor
            const name = Engine._getExtName(ext);

            let extension: IExtensionInstance<T> | undefined;

            // Iterate through the list of added extensions
            this._extensions.forEach((x: IExtensionInstance<T>) => {
                // Check if the name of the extension matches the specified name
                if (name === x.name) {
                    extension = x;
                }
            });

            // Return the instance of the specified extension if found, or `undefined` if not found
            return extension?.instance;
        }




        /**
         * The `_getExtName` method is a private static utility used to extract the name of an extension class from its constructor function.
         * It takes the constructor function of the extension class as an argument and returns the name of the class as a string.
         * This method is used internally to identify extensions by their names when adding or retrieving them.
         *
         * @param ext - The constructor function of the extension class.
         * @returns {string} - The name of the extension class.
         * @private
         */
        private static _getExtName<T extends Extension>(ext: ExtensionConstructor<T>): string {
            // Convert the constructor function to a string representation and extract the class name from it.
            // This is done by using regular expressions to match the class name within the function definition.
            return ext.toString().replace(/function\s+(\w+)\(\)\s*\{[\S\s]*\}\s*/, '$1');
        }




        /**
         * You can override this method to filter args used in the _updateData(p,v,t).
         * @param {any} args The arguments containing path, value, and type of the input.
         * @returns {any} The filtered or modified arguments object.
         * @public
         */
        public filterData(args: any): any {
            // By default, this method simply returns the input args as is.
            // You can override this method in a subclass to customize the behavior
            // and perform additional logic or validation on the args before updating the data.
            return args;
        }


        /**
         * Override this method to filter the value of the target element before updating it with new data.
         * @param {string} value The current value of the target element (as a string).
         * @returns {string} The modified or filtered value of the target element.
         * @public
         */
        public filterTargetValue(value: string): string {
            // By default, this method returns the value without any modification.
            // Subclasses can override this method to customize the behavior of updating the target element.
            return value;
        }


        public filterInputName(path: string): string {
            return path;
        }



        /**
         * The 'data' getter method returns the internal data stored in the class instance.
         * @returns {any} - The internal data object.
         * @public
         */
        get data(): any {
            return this._d;
        }

        /**
         * The 'json' getter method returns a JSON string representation of the internal data.
         * @returns {string} - A JSON string representing the internal data.
         * @public
         */
        get json(): string {
            return JSON.stringify(this._d);
        }

        /**
         * The 'value' getter method retrieves the value associated with the current model.
         * If no model is defined, it returns the entire data object.
         * @returns {any} - The value associated with the current model or the entire data object.
         * @public
         */
        get value(): any {
            // Get the current model name 
            const model = this._o.model;

            // Get the entire data object
            const data = this._d;

            // Check if a model is defined by evaluating the length of the model name.
            if (model.length) {

                // If a model is defined, return the value associated with that model in the data object.
                return data[model];

            } else {

                // If no model is defined (model name is an empty string or null),
                // return the entire data object.
                return data;

            }
        }

        /**
         * The 'model' getter method returns the current model name.
         * @returns {string} - The current model name.
         * @public
         */
        get model(): string {
            return this._o.model;
        }

        /**
         * The 'raw' getter method returns the raw data stored in the class instance.
         * @returns {any} - The raw data object.
         * @public
         */
        get raw(): any {
            return this._raw;
        }

        /**
         * The 'ownerDocument' getter method retrieves the document object associated with the owner of the form's body element.
         * @returns {Document} - The document object associated with the owner of the form's body element.
         * @public
         */
        get ownerDocument(): Document {
            return this._o.body.ownerDocument;
        }

        /**
         * The 'body' getter method returns the HTML body element associated with the form.
         * @returns {HTMLElement} - The HTML body element.
         * @public
         */
        get body(): HTMLElement {
            return this._o.body;
        }

    }

}



/**
 * The `IJsonForm` interface defines the methods available for interacting 
 * with a JsonForm instance.
 */
interface IJsonForm {

    /**
     * The 'value' getter retrieves the value associated with the current model.
     * If no model is defined, it returns the entire data object.
     * @returns {any} - The value associated with the current model or the entire data object.
     */
    get value(): any;

    /**
     * The 'body' getter returns the HTML body element associated with the form.
     * @returns {HTMLElement} - The HTML body element.
     */
    get body(): HTMLElement;

    /**
     * The 'model' getter returns the current model name.
     * @returns {string} - The current model name.
     */
    get model(): string;

    /**
     * The 'ownerDocument' getter retrieves the document object associated with the owner of the form's body element.
     * @returns {Document} - The document object associated with the owner of the form's body element.
     */
    get ownerDocument(): Document;

    /**
     * The 'data' getter returns the internal data stored in the class instance.
     * @returns {any} - The internal data object.
     */
    get data(): any;

    /**
     * The 'json' getter returns a JSON string representation of the internal data.
     * @returns {string} - A JSON string representing the internal data.
     */
    get json(): string;

    /**
     * The 'raw' getter returns the raw data stored in the class instance.
     * @returns {any} - The raw data object.
     */
    get raw(): any;


    /**
     * Finds HTML elements within the form based on provided paths.
     * @param paths An array of paths to search for within the form.
     * @returns An array of HTML elements that match the provided paths.
     */
    find(...paths: string[]): HTMLElement[] | undefined;

    /**
     * Retrieves the label associated with a form field based on its path.
     * @param path The path of the form field.
     * @returns The label associated with the specified form field.
     */
    getLabel(path: string): string;


    /**
     * Retrieves the type of a form element.
     * @param element The HTML element or path of the form element.
     * @returns The type of the specified form element.
     */
    getType(element?: HTMLElement | string): string;

    /**
     * Retrieves the path of a form element.
     * @param element The HTML element or path of the form element.
     * @returns The path of the specified form element.
     */
    getPath(element?: HTMLElement | string): string;

    /**
     * Destroys the JsonForm instance, cleaning up resources.
     */
    destroy(): void;

    /**
     * Registers an event listener for a specified event type.
     * @param type The type of event to listen for.
     * @param listener The event listener to execute when the event occurs.
     * @param options Optional settings for the event listener.
     */
    on(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void;

    /**
     * Dispatches a custom event with optional data.
     * @param type The type of the event to dispatch.
     * @param detail Optional data to include in the event.
     */
    dispatchEvent(type: string, detail?: any): void;

    /**
     * Sets a configuration option.
     * @param o The name of the option to set.
     * @param v The value to set for the option.
     */
    set(o: string, v: any): void;

    /**
     * Clears the form, resetting it to its initial state.
     */
    clear(): void;


     /**
     * Resets the form data to its initial state, optionally targeting a specific model.
     * @param {string} model - The optional model to reset. If provided, only the specified model's data will be reset.
     * @returns {any} The updated form data after resetting.
     */
    reset(model: string): any;


    /**
     * Checks if the form has a defined model.
     * @returns True if a model is defined, false otherwise.
     */
    hasModel(): boolean;


    /**
     * Updates the form with current data and triggers associated events.
     */
    update(): void;

    /**
     * Retrieves stored data from an HTML element based on specified properties.
     * @param element The HTML element from which to retrieve data.
     * @param properties The properties to retrieve from the element.
     * @returns An object containing the retrieved data.
     */
    getElementData(element: any, ...properties: string[]): any;

    /**
     * Stores data within an HTML element.
     * @param element The HTML element to store data in.
     * @param data The data to store in the element.
     */
    setElementData(element: any, data: Record<string, any>): void;


    /**
     * Filters and modifies the input name based on specified rules and options.
     * @param path The path used to determine the input name.
     * @returns The modified input name.
     */
    filterInputName(path: string): string;


    

    /**
     * Updates the target element with form data.
     */
    updateTarget(): void;

    /**
     * Filters the target value based on specified rules and options.
     * @param value The target value to filter.
     * @returns The filtered target value.
     */
    filterTargetValue(value: string): string;


    /**
     * Checks if a path is included in a list of paths, optionally considering ancestors.
     * @param path The path to check for inclusion.
     * @param paths The list of paths to compare against.
     * @param type (Optional) The type of path.
     * @param checkAncestors (Optional) Indicates whether to check ancestors.
     * @returns True if the path is included, false otherwise.
     */
    pathIncludes(path: string, paths: string[], type?: string, checkAncestors?: boolean): any;

    /**
     * Attaches and initializes a JsonForm extension.
     * @param ext The constructor of the extension to attach.
     * @param args Additional arguments to pass to the extension's initialization.
     * @returns The JsonForm instance with the extension attached and initialized.
     */
    use<T extends JsonForm.Extension>(ext: JsonForm.ExtensionConstructor<T>, ...args: any[]): IJsonForm;

    /**
     * Retrieves an attached extension.
     * @param ext The constructor of the extension to retrieve.
     * @returns The extension instance if attached, undefined otherwise.
     */
    get<T extends JsonForm.Extension>(ext: JsonForm.ExtensionConstructor<T>): T | undefined;

}