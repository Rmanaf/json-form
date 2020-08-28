# JSON Form Generator
A lightweight JavaScript library for generating forms from JSON/Object.

## Demo
See demo [here](https://rmanaf.github.io/json-form/index.html)

## Installation
```bash
$ npm install @rmanaf/json-form
```

## Usage
```js
var data = {...} // object or json string
var myForm = new JsonForm(data);
```

Constructor :
```js        
new JsonForm(data: string | object, options?: object , target?: string);
```
