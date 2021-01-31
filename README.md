# JSON Form Generator
A lightweight JavaScript library for generating forms from JSON/Object.

[![GitHub license](https://img.shields.io/github/license/Rmanaf/json-form)](https://github.com/Rmanaf/json-form/blob/master/LICENSE)
[![GitHub issues](https://img.shields.io/github/issues/Rmanaf/json-form)](https://github.com/Rmanaf/json-form/issues) 

## Demo
See demo [here](https://rmanaf.github.io/json-form/index.html)

## Installation
```bash
$ npm install @rmanaf/json-form
```
Or from the repository (Latest Version)

```html
<head>
    <script src="https://rmanaf.github.io/json-form/dist/json-form.min.js"></script>
</head>
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
