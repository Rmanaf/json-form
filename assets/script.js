var newelemnum = 0;
var editors = [];
var data = {
    usage1: {
        a: {
            b: {
                c: "d"
            }
        },
        e: {
            f: 0
        }
    },
    usage2: {
        a: {
            b: {
                c: "d"
            }
        },
        e: {
            f: 0
        }
    },
    usage3: {
        a: {
            b: {
                c: "d"
            }
        },
        e: {
            f: 0
        }
    },
    usage4: {
        a: {
            b: {
                c: "d"
            }
        },
        e: {
            f: 0
        }
    },
    usage5: {
        product_0: {
            name: "Name",
            available: true,
            count: 10
        }
    },
    login : {
        name: "",
        pass: ""
    }
}

hljs.initHighlightingOnLoad();

hljs.initLineNumbersOnLoad();

function addNewEllement() {

    newelemnum++;

    data.usage5["product_" + newelemnum] = {
        name: "Name",
        available: true,
        count: 10
    }

    editors[4].update();

}

function u1Update(element, value, path, type) {
    var p = document.getElementById("u1placeholder");
    var value = JSON.stringify(data.usage1, null, "\t");
    p.value = value;
}

function u5update() {
    var p = document.getElementById("u5placeholder");
    var value = JSON.stringify(data.usage5, null, "\t");
    p.value = value;
}

function u6update(){
    var p = document.getElementById("u6placeholder");
    var value = JSON.stringify(data.login, null, "\t");
    p.value = value;
}


document.addEventListener("DOMContentLoaded", function (event) {

    [...document.querySelectorAll("[data-model-editor]")].forEach((e, i) => {

        var options = {
            body: e,
            model: e.dataset.model,
            labels: {
                'data.usage2.a.b.c': "Custom Label 1",
                'data.usage2.e.f': "Custom Label 2",
                "data.login.name" : "Username:",
                "data.login.pass" : "Password:"
            },
            exclude: [
                'data.usage3.e'
            ],
            templates: {
                '*': "inputTemplate",
                '*-checkbox': "checkboxTemplate",
                'data.register.role': 'selectTemplate'
            },
            attributes: {
                'data.usage4.e.f': {
                    "min": 0,
                    "max": 10,
                    "class": 'form-control is-invalid'
                },
                "data.login.name" : {
                    "type" : "text",
                    "minlength" : 4
                },
                "data.login.pass" : {
                    "type" : "password",
                    "minlength" : 8
                }
            },
            onchange: {
                'data.usage1.a.b.c': u1Update,
                'data.usage1.e.f': u1Update,
                "data.login.name" : function(target, value, path, type){
                    const regex = /^[A-Za-zñÑáéíóúÁÉÍÓÚ][a-zA-ZñÑáéíóúÁÉÍÓÚ0-9_]+$/;
                    const valid = value.match(regex);
                    if(valid == null){
                        target.classList.add("is-invalid");
                    }else{
                        target.classList.remove("is-invalid");
                    }
               },
               "data.login.pass" : function(target, value, path, type){
                    const regex = /(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[_$@$!%*?&]).+$/;
                    const valid = value.match(regex);
                    if(valid == null){
                        target.classList.add("is-invalid");
                    }else{
                        target.classList.remove("is-invalid");
                    }
                }
            }
        }

        var placeholder = e.dataset.placeholder;

        editors.push(new JsonForm(data, options, placeholder));

    });

    editors[0].addEventListener("json-form.init", u1Update);

    editors[4].addEventListener("json-form.init", u5update);

    editors[4].addEventListener("json-form.update", u5update);

    editors[4].addEventListener("json-form.update.value", u5update);

    editors[5].addEventListener("json-form.init", u6update);

    editors[5].addEventListener("json-form.update", u6update);

    editors[5].addEventListener("json-form.update.value", u6update);

});