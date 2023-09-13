/**
 * This code performs a series of asynchronous operations in sequence to prepare the final output of the JsonForm library.
 * 
 * The code involves three main functions:
 * 
 * 1. `minify`: This function is used to minify the input file using the specified compressor. It takes the input file path (`file`),
 *    the output file path for the minified code (`out`), the path for the sourcemap (`map`), and an optional `compressor` parameter
 *    to specify the compressor (default is 'gcc'). The function returns a Promise that resolves when the minification is completed successfully.
 * 
 * 2. `addHeader`: This function adds a header to the specified file by replacing placeholders with corresponding package properties.
 *    It takes the input file path (`input`), the header template (`header`), and an array of package properties to be replaced in the header template (`props`).
 *    The function returns a Promise that resolves to a success message when the header is added.
 * 
 * 3. `generateSRI`: This function generates the Subresource Integrity (SRI) hash for a given file. It takes the file path (`file`) and a callback function (`callback`).
 *    The SRI hash is generated using the `exec` function from the `child_process` module to execute a shell command. The command reads the file contents, computes the SHA-384 hash,
 *    and encodes it in Base64 format. Once the SRI hash is generated, the callback function is invoked with the hash as an argument.
 * 
 * The code block also defines the necessary variables, including the header template, the array of package properties (`props`),
 * and the paths to the input file (`inputFile`), minified file (`minFile`), and sourcemap file (`mapFile`).
 * 
 * The entire code block is wrapped in a Promise chain to ensure that each operation is performed sequentially. If any of the Promises are rejected with an error,
 * the chain will be broken, and the error will be caught and logged to the console.
 * 
 * Overall, the code provides a convenient way to generate the final output of the JsonForm library, including minified and non-minified files with headers and SRI hashes.
 */


// ******************************* Import necessary modules ******************************* //


/** 
 * Import the Node.js 'fs' module, which provides functions for working with the file system. 
 */
const fs = require('fs');


/**
 * Import the 'node-minify' module, which provides tools for minifying JavaScript code using 
 * different compressors. 
 */
const compressor = require('node-minify');


/**
 * Import the 'decomment' module, which is used to remove comments from the JavaScript code. 
 * Although we did not use the 'removeComments' option in the 'compilerOptions' of TypeScript 
 * configuration, the 'decomment' module allows us to programmatically remove comments from 
 * the output JavaScript file. We use this module to ensure that the final minified JavaScript 
 * file does not contain any comments, which can reduce the file size and improve loading 
 * performance. 
 */
const decomment = require('decomment');


/** 
 * Load the content of the 'package.json' file from the current directory and store it in 
 * the 'packageJson' variable.
 */ 
const packageJson = require('./package.json');


/** 
 * Import the 'exec' function from the 'child_process' module. The 'child_process' module 
 * provides functions for spawning child processes and executing shell commands.
 */ 
const { exec } = require('child_process');


// **************************** Define constants and variables **************************** //


/** 
 * The 'template' is a template string that defines the header content to be added to the 
 * JavaScript files. It contains placeholders (%description%, %version%, %homepage%, %license%, 
 * %licenseUrl%) that will be replaced with the actual values from the 'package.json' file 
 * and other sources.
 */
const template = `/** \n * JsonForm | %description% v%version% (%homepage%) \n * Licensed under %license% (%licenseUrl%) \n */`;


/** 
 * The 'props' is an array that contains the property names from the 'package.json' file and 
 * other sources. These properties will be used to replace the corresponding placeholders in 
 * the 'template' to create the final header content.
 */
const props = ["description", "version", "homepage", "license", "licenseUrl"];


/**
 * The 'inputFile' is the path to the original JavaScript file that needs to have the header 
 * added and comments removed.
 */ 
const inputFile = 'dist/json-form.js';


/**
 * The 'minFile' is the path where the minified version of the JavaScript file with the header 
 * will be saved.
 */
const minFile = 'dist/json-form.min.js';


/** 
 * The 'mapFile' is the path where the sourcemap file for the minified JavaScript file will be 
 * saved.
 */ 
const mapFile = 'dist/json-form.min.js.map';


// ************************************** Functions ************************************** //


/**
 * Minifies the specified input file using the specified compressor.
 * @param {string} file - The path to the input file to be minified.
 * @param {string} out - The path to the output file where the minified code will be written.
 * @param {string} map - The path to the sourcemap file to be generated during minification.
 * @param {string} [comp='gcc'] - The name of the compressor to be used (optional, default is 'gcc').
 * @returns {Promise<void>} - A Promise that resolves when the minification is completed successfully.
 */
async function minify(file, out, map, comp = 'gcc') {
  return new Promise((resolve, reject) => {
    // Minify the file using the specified compressor.
    compressor.minify({
      compressor: comp,
      input: file,
      output: out,
      map: map,
      callback: async (err) => {
        if (err) {
          console.error(err);
          return reject(err);
        }

        // Resolve the Promise when the minification is completed successfully.
        return resolve();
      },
    });
  });
}


/**
 * Adds a header to the specified file by replacing placeholders with corresponding package properties.
 * @param {string} input - The path to the file to which the header should be added.
 * @param {string} header - The header template containing placeholders (%description%, %version%, %homepage%).
 * @param {string[]} props - An array of package properties to be replaced in the header template.
 * @returns {Promise<string>} - A Promise that resolves to a success message when the header is added.
 */
async function addHeader(input, header, props) {
  return new Promise((resolve, reject) => {
    // Read the content of the input file.
    fs.readFile(input, 'utf8', (err, data) => {
      if (err) {
        console.error(err);
        return reject(err);
      }

      // Replace the placeholders in the header with the corresponding package properties.
      props.forEach((k) => {
        if (packageJson.hasOwnProperty(k)) {
          header = header.replace(`%${k}%`, packageJson[k]);
        }
      });

      // Concatenate the updated header with the existing content of the file.
      const updatedContent = header + decomment(data);

      // Write the updated content back to the input file.
      fs.writeFile(input, updatedContent, 'utf8', (err) => {
        if (err) {
          console.error(err);
          return reject(err);
        }

        // Resolve the Promise with a success message and the path to the modified file.
        return resolve('Header added to the output file:', input);
      });
    });
  });
}


/**
 * Generates the Subresource Integrity (SRI) hash for a given file.
 * @param {string} file - The path to the file for which the SRI hash needs to be generated.
 * @param {function} callback - A callback function that will be invoked once the SRI hash is generated.
 * @returns {void}
 */
function generateSRI(file, callback) {
  // Use the `exec` function from the `child_process` module to execute a shell command.
  // The command reads the file contents, computes the SHA-384 hash, and encodes it in Base64 format.
  exec(`cat ${file} | openssl dgst -sha384 -binary | openssl base64 -A`, callback);
}


// ******************************** Main code starts here ******************************** //


/**
 * This code block performs a series of asynchronous operations in sequence.
 * 
 * 1. The `addHeader` function is called with the `inputFile`, `headerTemplate`, and `props` parameters.
 *    This function reads the content of the `inputFile`, adds the specified header using the `headerTemplate`,
 *    and writes the updated content back to the `inputFile`. It returns a Promise that resolves when this operation is completed.
 * 
 * 2. After the header is added to the input file, the `minify` function is called with the `inputFile`, `minFile`, and `mapFile` parameters.
 *    The `minify` function uses the 'gcc' compressor to minify the input file and generate a sourcemap file. It returns a Promise that resolves when the minification is completed.
 * 
 * 3. Once the minification is done, the `addHeader` function is called again, but this time with the `minFile`, `headerTemplate`, and `props` parameters.
 *    This function adds the header to the minified file, similar to the first `addHeader` call.
 * 
 * 4. After the header is added to the minified file, the `generateSRI` function is called twice.
 *    This function generates a Subresource Integrity (SRI) hash for both the input file and the minified file using the `openssl` command-line utility.
 *    The SRI hash is then printed to the console using `console.log`.
 * 
 * The entire code block is wrapped in a Promise chain, ensuring that each operation is performed sequentially.
 * If any of the Promises are rejected with an error, the chain will be broken, and the error will be caught and logged to the console.
 */

addHeader(inputFile, template, props)
  .then(() => {
    minify(inputFile, minFile, mapFile)
      .then(() => {
        addHeader(minFile, template, props)
          .then(() => {
            generateSRI(inputFile, console.log);
            generateSRI(minFile, console.log);
          })
      })
  })
