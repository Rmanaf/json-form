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
    p.value = JSON.stringify(data.usage1);
}

function u1AddField() {
    data.usage1.e.n = "new";

    editors[0].set("onchange", {
        'data.usage1.a.b.c': u1Update,
        'data.usage1.e.f': u1Update,
        'data.usage1.e.n': u1Update
    })

    editors[0].update();
}

function u5update() {
    var p = document.getElementById("u5placeholder");
    p.value = JSON.stringify(data.usage5);
}