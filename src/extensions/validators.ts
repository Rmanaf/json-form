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


    /**
     * The `FormState` enum defines the different states that a `JsonForm` instance can be in.
     * It represents the possible states that can be associated with form validation or processing.
     * The enum provides three named constants: 'Valid', 'Invalid', and 'Busy'.
     */
    export enum FormState {
        /**
         * The 'Valid' state indicates that the form is currently in a valid state.
         * This state is typically associated with successful form validation or successful completion of a process.
         */
        Valid = 'valid',

        /**
         * The 'Invalid' state indicates that the form is currently in an invalid state.
         * This state is usually associated with failed form validation or some error condition.
         */
        Invalid = 'invalid',

        /**
         * The 'Busy' state indicates that the form is currently busy or in the process of being processed.
         * This state is often used to indicate that the form is waiting for an asynchronous operation to complete.
         */
        Busy = 'busy',


        /**
         * The 'Pristine' state indicates that the form element has not been interacted with or modified by the user.
         * It represents the initial state of the form element.
         */
        Pristine = 'pristine',

        /**
         * The 'Dirty' state indicates that the form element has been interacted with or modified by the user.
         * It represents a state where changes have been made to the form element's value.
         */
        Dirty = 'dirty',

        /**
         * The 'Touched' state indicates that the form element has been focused and then blurred, indicating user interaction.
         * It represents a state where the user has interacted with the form element.
         */
        Touched = 'touched',

        /**
         * The 'Untouched' state indicates that the form element has not been focused or blurred, indicating no user interaction.
         * It represents a state where the user has not yet interacted with the form element.
         */
        Untouched = 'untouched'
    }


    /**
     * The `IFormError` interface defines the structure of objects representing form validation errors.
     * It contains two properties:
     *   - `validator`: A string representing the type or name of the validator that generated the error.
     *   - `message` (optional): A string containing an error message or description associated with the validation error.
     */
    export interface IFormError {
        validator: string;
        message?: string;
    }



    export class StateChecker extends JsonForm.Extension {

        // Constants used for tags associated with errors and state
        public static readonly TAG_ERR = 'jfErrors';
        public static readonly TAG_STATE = 'jfState';


        // A private variable to track the current state of the form
        private _formCurrentState: FormState = FormState.Untouched;


        /**
         * The 'init' method initializes the StateChecker extension when applied to a JsonForm instance.
         * It sets up event listeners and state management for the form and its elements.
         *
         * @param args - An optional list of arguments that can be used to specify which form elements to track.
         * @returns {IJsonForm} - Returns the JsonForm instance with the StateChecker extension initialized.
         */
        init(...args: any[]): IJsonForm {


            // Initialize the StateChecker extension when applied to a JsonForm instance

            const callback = args.length && typeof args[0] === 'function' ?  args[0] : void(0);

            this.form.on('json-form.init', (e: any) => {
                // Set the form state to 'Untouched' once initialization is complete.
                this._setState(FormState.Untouched);
            });


            // Handle events related to form updating and updated states
            this.form.on('json-form.updating', (e: any) => {
                this._formCurrentState = this.getState();
                this._setState(FormState.Busy);
            });

            this.form.on('json-form.updated', (e: any) => {
                this._setState(this._formCurrentState);
            });

            this.form.on('json-form.append', (e: CustomEvent) => {
                const input = this.form.find(e.detail.path)[0];
                this._setState(FormState.Untouched, input);
            });


            // Handle form element changes and update the form's state accordingly
            setTimeout(() => {

                this.form.on('json-form.change', (e: CustomEvent) => {

                    const { path, event } = e.detail;

                    const input = this.form.find(path)[0];

                    const currentState = this.getState(path);

                    const isTouchEvent = ['blur', 'focus'].indexOf(event) >= 0;

                    const isTouchState = ['untouched', 'touched'].indexOf(currentState) >= 0;

                    const canDirty = ['busy', 'invalid'].indexOf(currentState) < 0;

                    // If it's a touch event and the state is 'Untouched' or 'Touched', update to 'Touched'
                    if (isTouchEvent && isTouchState) {
                        this._setState(FormState.Touched, input);
                        return;
                    }


                    // If it's not a touch event, update to 'Dirty'
                    if (!isTouchEvent && canDirty) {
                        this._setState(FormState.Dirty, input);
                    }

                });

                this.form.on('json-form.change.state', (e: any) => {

                    if (!e.detail.element) {
                        return;
                    }

                    let inputs = this.form.find('*');

                    if (!inputs) {
                        return;
                    }

                    let finalState = this.getState();

                    let touched = false;
                    let invalid = false;
                    let dirty = false;

                    if (finalState === FormState.Busy) {
                        return;
                    }

                    finalState = FormState.Valid;

                    if (inputs && !Array.isArray(inputs)) {
                        inputs = <HTMLElement[]>inputs;
                    }

                    inputs.forEach(element => {

                        const state = this.getState(element);

                        if (state === FormState.Dirty) {
                            dirty = true;
                        }

                        if (state === FormState.Touched) {
                            touched = true;
                        }

                        // Check if the element has validation errors
                        if (this.hasError(element)) {
                            invalid = true;
                        }

                    });



                    // If there are validation errors, set the form state to 'Invalid'
                    if (invalid) {

                        finalState = FormState.Invalid;

                    } else {


                        // Update the final form state based on individual elements
                        if (touched) {
                            finalState = FormState.Touched;
                        }


                        if (dirty) {
                            finalState = FormState.Dirty;
                        }

                    }


                    // Set the calculated final state for the form
                    this._setState(finalState);

                });

                this.form.on('json-form.change.state', (e: any) => {

                    if (!e.detail.element) {
                        return;
                    }

                    const element = e.detail.element;

                    const state = this._getState(element);

                    // Execute callback
                    callback(this, e.detail.element , state);

                });

            }, JsonForm.STAGE_DELAY_INITIAL);


            // Handle form state changes based on element states and validity
            setTimeout(() => {

                this.form.on('json-form.change', (e: CustomEvent) => {

                    const { path, event } = e.detail;

                    const input = this.form.find(path)[0];

                    const errors = this._getErrors(input);

                    const doc = this.form.ownerDocument;

                    const holder: HTMLElement = doc.querySelector(`[data-jf-errors="${path}"]`);

                    if (holder) {

                        const templateVal = holder.dataset.jfTemplate;

                        holder.innerHTML = "";

                        if (templateVal && errors.length) {

                            const template = <any>doc.getElementById(templateVal);

                            let clone = template.cloneNode(true);

                            // Replace placeholders in the template with error messages
                            errors.forEach(err => {
                                clone.innerHTML = clone.innerHTML.replace(/{{\s*error\.message\s*}}/g, err.message);
                            });

                            // Create a fragment using the cloned template content.
                            let fragment = document.importNode(clone.content, true);

                            holder.appendChild(fragment);

                        } else {

                            // Display error messages as plain text
                            holder.innerHTML = errors.map(e => e.message).join("<br/>");

                        }
                    }



                })

            }, JsonForm.STAGE_DELAY_FINAL);


            return this.form;

        }



        /**
         * This method, 'hasError', is used to check the validity of a given form input element based on the associated errors.
         *
         * @param input - The form input element to be checked for validity.
         * @returns - Returns 'true' if the input element is valid (no associated errors), otherwise 'false'.
         */
        public hasError(input: any): boolean {
            // Get the errors associated with the input element
            const errors = this._getErrors(input);

            // Check if there are no errors (valid input) and return 'true', otherwise return 'false'
            return errors.length > 0;
        }




        /**
         * This method, 'getErrors', is used to retrieve the errors associated with a given form input element.
         *
         * @param element - The form input element for which errors are to be retrieved.
         * @returns - An array of error objects associated with the input element. If there are no errors, an empty array is returned.
         */
        public getErrors(element: any) {
            // Call the private '_getErrors' method to retrieve the errors associated with the input element
            return this._getErrors(element);
        }



        /**
         * This private method, '_getErrors', is used internally to retrieve the errors associated with a given form input element.
         *
         * @param element - The form input element for which errors are to be retrieved.
         * @returns - An array of error objects associated with the input element. If there are no errors, an empty array is returned.
         * @private
         */
        private _getErrors(element: any): IFormError[] {
            // Retrieve the errors associated with the input element using the 'getElementData' method
            let errors = this.form.getElementData(element, StateChecker.TAG_ERR);

            // Check if the retrieved errors are in string format and parse them into an array if necessary
            if (typeof errors === 'string') {
                errors = <IFormError[]>JSON.parse(errors);
            }

            // If no errors are found or if the 'errors' variable is undefined, set it to an empty array
            if (!errors) {
                errors = [];
            }

            // Return the array of error objects associated with the input element
            return errors;
        }



        /**
         * This private method, '_updateError', is used internally to update the error state for a given form input element.
         *
         * @param element - The form input element for which the error state needs to be updated.
         * @param error - An error object containing information about the error, including its validator and an optional error message.
         * @returns - An updated array of error objects associated with the input element.
         * @private
         */
        private _updateError(element: any, error: IFormError) {
            // Retrieve the current errors associated with the input element and filter out any errors with the same validator
            let currentErrors = this._getErrors(element).filter(x => x.validator !== error?.validator);

            // If the error object contains an error message, add it to the current errors array
            if (error?.message) {
                currentErrors.push(error);
            }

            // Return the updated array of error objects associated with the input element
            return currentErrors;
        }






        /**
         * This private method, '_setState', is used to set the state for one or more form elements within a `JsonForm` instance.
         *
         * @param state - The new state to set for the form element(s).
         * @param element - (Optional) The form element(s) to update. If not provided, the entire form body will be updated.
         * @param error - (Optional) An error object associated with the state change, used for 'invalid' state with details.
         * @private
         */
        private _setState(state: FormState, element?: any, error?: IFormError): void {

            const currentState = this._getState(element);

            const currentErrors = this._getErrors(element);

            const errorExists = error && currentErrors.some(e => e.validator === error.validator && e.message === error.message);


            if (!errorExists) {

                // Update the array of errors for the specified element (or the entire form body if 'element' is not provided)
                const updatedErrors = this._updateError(element, error);

                // Set the 'data-jf-state' and 'data-jf-errors' attributes for the specified element (or the entire form body if 'element' is not provided)
                this.form.setElementData(element, { jfErrors: updatedErrors });

                // Trigger a 'state' event with details about the updated state
                this.form.dispatchEvent('change.errors');

            }


            if (currentState !== state) {

                // Set the 'data-jf-state' and 'data-jf-errors' attributes for the specified element (or the entire form body if 'element' is not provided)
                this.form.setElementData(element, { jfState: state });

                // Trigger a 'state' event with details about the updated state
                this.form.dispatchEvent('change.state', { element, state });

            }

        }



        /**
         * This public method, 'setState', is used to set the state for one or more form elements within a `JsonForm` instance.
         * It provides a convenient way to update the state of form elements, either the entire form body or specific elements.
         *
         * @param state - The new state to set for the form element(s).
         * @param element - (Optional) The form element(s) to update. If not provided, the entire form body will be updated.
         * @param error - (Optional) An error object associated with the state change, used for 'invalid' state with details.
         */
        public setState(state: FormState, element?: any, error?: IFormError): void {
            // Call the private '_setState' function to perform the actual state update
            this._setState(state, element, error);
        }





        /**
         * Retrieves the state of a specified HTML element or the entire form.
         * @param {HTMLElement | string} element The HTML element or element path to retrieve the state for. If not provided, the entire form's state is returned.
         * @returns {FormState} The state of the specified HTML element or the entire form.
         */
        private _getState(element?: HTMLElement | string): FormState {

            return this.form.getElementData(element, StateChecker.TAG_STATE) || FormState.Pristine;

        }



        public getState(element?: HTMLElement | string): FormState {
            return this._getState(element);
        }



    }

}

namespace JsonForm.Validators {


    /**
     * An interface representing a configuration bundle used by pattern validators within the JsonForm framework.
     * This bundle includes validation rules and error information specific to pattern validation.
     */
    export interface IPatternValidationConfig {
        /**
         * An optional error object describing the validation error associated with the configuration.
         * It conforms to the `JsonForm.IFormError` interface and includes details about the error, such as the error message and validator.
         */
        error?: JsonForm.IFormError;

        /**
         * A regular expression (`RegExp`) pattern that defines the validation rule to be applied by pattern validators.
         */
        pattern: RegExp;

        /**
         * An array of string paths representing the form elements to which this pattern validation configuration should be applied.
         */
        paths: string[];
    }




    /**
     * An interface representing the validation state of a form element within the JsonForm framework.
     */
    export interface IValidityState {
        /**
         * The current validation state of the form element, represented by a `JsonForm.FormState` value.
         */
        state: JsonForm.FormState;

        /**
         * An optional error object describing the validation error, conforming to the `JsonForm.IFormError` interface.
         */
        error: JsonForm.IFormError;

        /**
         * The form element to which this validation state is associated, represented as an `any` type.
         */
        element: any;
    }



    /**
     * Abstract base class for custom form validators within the JsonForm framework.
     * Validators extending this class can be applied to JsonForm instances to perform 
     * custom validation logic.
     */
    export abstract class ValidatorBaseClass extends JsonForm.Extension {

        // Private property to hold the StateChecker instance
        private _stateChecker: JsonForm.StateChecker;

        /**
         * Initializes the validator when applied to a JsonForm instance.
         * Sets up event listeners to trigger validation based on form changes.
         *
         * @param args 
         * @returns The JsonForm instance with the validator applied, or undefined if the StateChecker is not available.
         */
        init(...args: any[]): IJsonForm {

            // Set up an event listener for form changes
            setTimeout(() => {

                this.form.on("json-form.change", (e: CustomEvent) => {

                    const { path, type, event } = e.detail;


                    // Check if the StateChecker is available
                    if (!this.hasStateChecker()) {
                        return;
                    }


                    // Check if the element's path matches any paths specified as the function arguments, considering the input type.
                    const inList = this.form.pathIncludes(path, args, type);

                    // If the element's path is not in the specified list, skip validation.
                    if (!inList) {
                        return;
                    }


                    const element = this.form.find(path)[0];


                    // Validate the form element
                    const validationResult: any = this.validate(element, event, ...args);


                    // If the validation result is an object, update the element's state
                    if (typeof validationResult === 'object') {
                        this.getStateChecker().setState(validationResult.state, validationResult.element, validationResult.error);
                    }

                });

            }, JsonForm.STAGE_DELAY_INTERMEDIATE);

            return this.form;
        }

        /**
         * Abstract method to perform custom validation logic.
         *
         * @param element - The form element to validate.
         * @param event - The triggering event.
         * @param args - Additional arguments specific to the validation logic.
         * @returns An IValidityState object if validation is performed, or a boolean if no validation has been performed.
         */
        public abstract validate(element: any, event: string, ...args: any[]): IValidityState | boolean;

        /**
         * Method to get the StateChecker instance.
         * @returns {JsonForm.StateChecker | undefined} The StateChecker instance, or undefined if it's not available.
         */
        protected getStateChecker(): JsonForm.StateChecker | undefined {
            if (!this._stateChecker) {
                this._stateChecker = this.form.get(JsonForm.StateChecker);
            }
            return this._stateChecker;
        }

        /**
         * Checks if the StateChecker is available for use.
         * @returns {boolean} True if the StateChecker is available, otherwise false.
         */
        protected hasStateChecker(): boolean {
            return !!this.getStateChecker();
        }
    }



    /**
     * An abstract base class for form validators within the JsonForm framework that rely on patterns.
     * Validators extending this class can be applied to JsonForm instances to perform validation based on patterns.
     * It extends the ValidatorBaseClass and provides access to a pattern validator.
     */
    export abstract class PatternValidatorBaseClass extends ValidatorBaseClass {

        // A protected property to hold the pattern validator instance.
        protected patternValidator: Pattern;


        /**
         * Retrieves the pattern validator instance for this validator.
         * If the pattern validator is not initialized, it creates a new instance.
         *
         * @returns The pattern validator instance associated with this validator.
         */
        protected getPatternValidator(): Pattern {

            // Check if the pattern validator is not already initialized.
            if (!this.patternValidator) {
                // Create a new pattern validator instance associated with the JsonForm.
                this.patternValidator = new Pattern(this.form);
            }

            return this.patternValidator;
        }
    }



    /**
     * A class that implements a pattern-based form validator within the JsonForm framework.
     * Validators of this type can be applied to JsonForm instances to check if the input matches a specific pattern.
     * It extends the `ValidatorBaseClass` and defines the `validate` method for pattern-based validation.
     */
    export class Pattern extends ValidatorBaseClass {


        public static VALIDATION_EVENTS = [ 'blur' ];
        public static VALIDATION_EXEMPTED_STATES = ['busy', 'untouched', 'touched', 'pristine'];


        protected canValidate(element , event): boolean{

            // Only perform validation on the 'blur' event.
            if (Pattern.VALIDATION_EVENTS.indexOf(event) < 0) {
                return false; // No validation is performed.
            }

            const path = this.form.getPath(element);

            const type = this.form.getType(element);

            const currentState = this.getStateChecker().getState(path);


            if(type !== 'string' || !element.value.length){
                return false;
            }


            return Pattern.VALIDATION_EXEMPTED_STATES.indexOf(currentState) < 0;

        }


        /**
         * Validates a form element's input based on a specified pattern.
         *
         * @param element - The form element to validate.
         * @param event - The triggering event.
         * @param config - An object containing pattern information, including pattern (RegExp) and error details.
         * @returns An `IValidityState` object indicating the validation result or `false` if no validation is performed.
         */
        public validate(element: any, event: string, config: IPatternValidationConfig): IValidityState | boolean {

            // Retrieve the current value of the form element.
            const value = element.value;

            if(!this.canValidate(element, event)){
                return false;
            }

            // Initialize an error object with the default validator name.
            let error: IFormError = {
                validator: config.error?.validator || 'pattern',
            };

            // Use the provided pattern to check if the entered value matches the required pattern.
            if (value.match(config.pattern) == null) {
                // If it doesn't match, set a custom error message or use the default one.
                error.message = config.error?.message || 'The entered value does not match the required pattern.';
            }

            // Determine the form element's state based on the presence of an error message.
            return {
                state: error.message?.length ? FormState.Invalid : FormState.Valid,
                element,
                error
            };
        }
    }



    /**
     * A specialized class for validating email addresses within the JsonForm framework.
     * This class extends the `PatternValidatorBaseClass` and uses the `Pattern` validator to validate email addresses.
     */
    export class Email extends PatternValidatorBaseClass {

        /**
         * Validates an email address based on a predefined regex pattern.
         *
         * @param element - The form element containing the email address.
         * @param event - The triggering event (e.g., 'blur').
         * @param args - Additional arguments (optional) used for specifying paths to validate.
         * @returns An `IValidityState` object indicating the validation result or `false` if no validation is performed.
         */
        public validate(element: any, event: string, ...args: any[]): IValidityState | boolean {

            // Use the `Pattern` validator to validate the input against a predefined email regex pattern.
            return this.getPatternValidator().validate(element, event, {
                error: {
                    validator: 'email',
                    message: 'Invalid email address',
                },
                pattern: /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/, // Email regex pattern.
                paths: args, // Optional list of paths to validate.
            });
        }
    }



    /**
     * A specialized class for validating passwords within the JsonForm framework.
     * This class extends the `PatternValidatorBaseClass` and uses the `Pattern` validator to validate passwords.
     */
    export class Password extends PatternValidatorBaseClass {

        /**
         * Validates a password based on a predefined regex pattern.
         *
         * @param element - The form element containing the password.
         * @param event - The triggering event (e.g., 'blur').
         * @param args - Additional arguments (optional) used for specifying paths to validate.
         * @returns A boolean value or an `IValidityState` object indicating the validation result.
         */
        public validate(element: any, event: string, ...args: any[]): boolean | IValidityState {

            // Use the `Pattern` validator to validate the input against a predefined password regex pattern.
            return this.getPatternValidator().validate(element, event, {
                error: {
                    validator: 'password',
                    message: 'Invalid password. Use at least 8 characters with lowercase, uppercase, number, and special symbol.'
                },
                pattern: /(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[_$@$!%*?&]).{8,}$/, // Password regex pattern.
                paths: args, // Optional list of paths to validate.
            });
        }
    }




    /**
     * A class for validating required form fields within the JsonForm framework.
     * This class extends the `ValidatorBaseClass` and enforces that specified form fields are required.
     */
    export class Required extends ValidatorBaseClass {

        /**
         * Validates whether a form field is required based on the field type and user interaction.
         *
         * @param element - The form element to validate.
         * @param event - The triggering event (e.g., 'blur').
         * @param args - Additional arguments specifying which fields are required.
         * @returns An `IValidityState` object or a boolean value indicating the validation result.
         */
        public validate(element: any, event: string, ...args: any[]): IValidityState | boolean {

            // Get the current value of the element.
            const value = element.value;

            // Get the type of input (e.g., 'string', 'boolean').
            const type = this.form.getType(element);

            // Check whether the element is required based on the user interaction and field type.
            if (event !== 'blur' && type !== 'boolean') {
                return false; // Field is not required.
            }

            // Initialize the state and error message.
            let state: JsonForm.FormState = JsonForm.FormState.Valid;
            let error: JsonForm.IFormError = { validator: 'required' };

            // Validate based on the field type and value.
            if ((type === 'string' && value.match(/\S+/) == null) || (type === 'boolean' && !element.checked)) {
                state = JsonForm.FormState.Invalid;
                error.message = 'This field is required.';
            }

            // Return the validation state and associated error message.
            return { state, element, error };
        }
    }



    /**
     * A class for comparing form field values within the JsonForm framework.
     * This class extends the `ValidatorBaseClass` and validates whether specified form fields have matching values.
     */
    export class Compare extends ValidatorBaseClass {

        /**
         * Validates whether specified form fields have matching values based on user interaction.
         *
         * @param element - The form element to validate.
         * @param event - The triggering event (e.g., 'blur').
         * @param args - Additional arguments specifying which fields to compare.
         * @returns An `IValidityState` object or a boolean value indicating the validation result.
         */
        public validate(element: any, event: string, ...args: any[]): boolean | IValidityState {

            // Initialize the state and error message.
            let state = this.getStateChecker().getState(element);
            let error: IFormError = { validator: 'compare' };

            // Iterate over the fields to compare starting from the second one.
            for (let i = 1; i < args.length; i++) {

                const targetPath = args[i];

                // Find the form element to compare with.
                const target: any = this.form.find(targetPath)[0];

                // Get the label associated with the target field.
                const label: string = this.form.getLabel(targetPath);

                // Compare the values of the current element and the target element.
                if (element.value !== target.value) {
                    state = FormState.Invalid;
                    error.message = `The entered value does not match the ${label}.`;
                    break;
                }
            }

            // Return the validation state and associated error message.
            return { state, element, error };
        }
    }


}
