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

namespace JsonForm.Modifiers {


    /**
     * Enum to define different strategies for modifying input element names.
     * These strategies determine how the path to the input element is transformed into its name.
     */
    export enum InputNameStructure {
        PropertyName = 'property-name',  // Use the last property name in the path as the name
        InputPath = 'input-path',        // Use the full input path as the name
        Random = 'random',              // Generate a random name
        NoDots = 'no-dots',            // Replace dots in the path with underscores
        NoBrackets = 'no-brackets',    // Replace array brackets with underscores
        NoModel = 'no-model',          // Remove the model part from the path
        NoIndex = 'no-index'           // Remove array indices from the path
    }



    export class TargetPrettifier extends JsonForm.Extension {

        init(...args: any[]): IJsonForm {

            // The `updateTarget` function is overridden to provide a prettified output of the form data.
            this.form.filterTargetValue = (value) => {
                return JSON.stringify(this.form.data , null, "\t");
            };

            this.form.updateTarget();
            
            // Return the modified `JsonForm` instance with the prettified output.
            return this.form;

        }

    }




    /**
     * Extension class to modify input element names in a JsonForm instance.
     * The modification is based on the specified name structure strategies.
     */
    export class NameModifier extends JsonForm.Extension {

        init(...args: any[]): IJsonForm {

            // Check if 'Random' strategy is specified, and if so, set it as the only strategy
            if (args.indexOf(InputNameStructure.Random) >= 0) {
                args = [InputNameStructure.Random];
            }

            // Define a custom function to filter input element names based on the specified strategies
            this.form.filterInputName = (path: string) => {

                let name = path;

                // Loop through each specified strategy and apply the corresponding modification
                args.forEach((structure) => {

                    switch (structure) {

                        case InputNameStructure.NoModel:
                            if (this.form.hasModel()) {

                                const model = this.form.model;
                                const modelIndex = name.indexOf(model);
                                const start = modelIndex + model.length + 1;

                                name = name.slice(start, name.length);

                            }
                            break;

                        case InputNameStructure.NoBrackets:
                            name = name.replace(/\[(\d+)\]/g, '_$1');
                            break;

                        case InputNameStructure.NoIndex:
                            name = name.replace(/\[(\d+)\]/g, '[]');
                            break;

                        case InputNameStructure.NoDots:
                            name = name.replace(/\./g, '_');
                            break;

                        case InputNameStructure.PropertyName:
                            name = name.split('.').pop();
                            break;

                        case InputNameStructure.Random:
                            name = JsonForm.Utilities.uniqueID();
                            break;

                    }

                })

                return name;

            }


            // Trigger an update to apply the modified input element names
            this.form.update();


            return this.form;

        }

    }

}