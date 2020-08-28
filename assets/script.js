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


document.addEventListener("DOMContentLoaded", function (event) {

    [...document.querySelectorAll("[data-model-editor]")].forEach((e, i) => {

        var options = {
            body: e,
            model: e.dataset.model,
            labels: {
                'data.usage2.a.b.c': "Custom Label 1",
                'data.usage2.e.f': "Custom Label 2",
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
                }
            },
            onchange: {
                'data.usage1.a.b.c': u1Update,
                'data.usage1.e.f': u1Update
            }
        }

        var placeholder = e.dataset.placeholder;

        editors.push(new JsonForm(data, options, placeholder));

    });

    editors[0].addEventListener("json-form.init", u1Update);

    editors[4].addEventListener("json-form.init", u5update);

    editors[4].addEventListener("json-form.update", u5update);

    editors[4].addEventListener("json-form.update.value", u5update);

});