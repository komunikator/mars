function parseScript(str) {
    str = String(str);
    if (str.length < 8) {
        return;
    }

    var cursorPosition = 0;
    var arrayStr = [];
    var editFields = [];
    var infoFields = [];
    var strLength = str.length;

    function createArray() {
        var positionFirstComment = getIndexEndComment(str, cursorPosition);
        if (positionFirstComment) {
            //Запись символов включая /**/
            arrayStr.push( str.substring(cursorPosition, positionFirstComment) );
            cursorPosition = positionFirstComment;

            var positionBeginSecondComment = getIndexBeginInfo(str, cursorPosition);
            if (positionBeginSecondComment > -1) {
                //Запись значения для редактирования
                editFields.push(arrayStr.length);
                arrayStr.push( str.substring(cursorPosition, positionBeginSecondComment) );
                cursorPosition = positionBeginSecondComment;

                var positionEndSecondComment = getIndexEndInfo(str, cursorPosition);
                if (positionEndSecondComment) {
                    //Запись служебной информации
                    var infoStr = str.substring(cursorPosition, positionEndSecondComment);
                    if ( createInfoObject(infoStr) ) {
                        infoFields.push(arrayStr.length);
                        arrayStr.push(infoStr);
                        cursorPosition = positionEndSecondComment;
                    } else {
                        cursorPosition = strLength;
                    }
                } else {
                    cursorPosition = strLength;
                }
            } else {
                cursorPosition = strLength;
            }
        } else {
            //Запись остатка строки
            arrayStr.push( str.substring(cursorPosition) );
            cursorPosition = strLength;
        }
    }

    do {
        createArray();
    } while (cursorPosition < strLength)

    if ( createHtml(arrayStr, infoFields, editFields) ) {
        console.log('Create html objects');
    } else {
        console.log('Error to create html objects');
    }
}

function getIndexBeginComment(str, cursorPosition) {
    var text = str.substring(cursorPosition);
    return text.indexOf("/**/");
}

function getIndexEndComment(str, cursorPosition) {
    var position = getIndexBeginComment(str, cursorPosition);
    if (position > -1) {
        return position + cursorPosition + 4;
    }
    return 0;
}

function getIndexBeginInfo(str, cursorPosition) {
    var text = str.substring(cursorPosition);
    return text.indexOf("/*") + cursorPosition;
}

function getIndexEndInfo(str, cursorPosition) {
    var text = str.substring(cursorPosition);
    var position = text.indexOf("*/");
    if (position > -1) {
        return position + cursorPosition + 2;
    }
    return 0;
}

function isCorrectObject(obj) {
    var result = true;
    if (obj && obj.description && obj.typeField) {
        switch (obj.description) {
          case "1":
            break;
          case "2":
            break;
          case "3":
            break;
          default:
            result = false;
            break;
        };

        switch (obj.typeField) {
          case "string":
            break;
          case "number":
            break;
          case "boolean":
            break;
          default:
            result = false;
            break;
        };
    } else {
        result = false;
    }

    return result;
}

function createInfoObject(str) {
    var result;
    try {
        result = JSON.parse( str.slice(2,-2) );
        if ( !isCorrectObject(result) ) {
            result = false;
        }
    } catch (err) {
        result = false;
    }
    return result;
}

function createModelHtml(arrStr, arrInfo, arrEdit) {
    var modelHtml = [];

    if (arrInfo.length > 0 && arrInfo.length == arrEdit.length) {
        for (var i = 0, len = arrInfo.length; i < len; i++) {
            var item = arrInfo[i];
            var infoObj = createInfoObject(arrStr[item]);
            if (infoObj) {
                modelHtml.push(infoObj);

                var indexEdit = arrEdit[i];
                modelHtml[modelHtml.length - 1].label = indexEdit;

                var text = arrStr[indexEdit].trim();
                text = text.replace(/'|"/g,'')
                modelHtml[modelHtml.length - 1].value = text;
            } else {
                return [];
            }
        };
    }
    return modelHtml;
}

function createViewHtml(modelHtml, arrStr) {
    var div = document.createElement("div");
    div.id = 'fields';

    modelHtml.forEach(function(item, i) {
        var p = document.createElement("p");
        var input = document.createElement("input");

        p.id = 'p' + item.label;
        input.id = item.label;
        p.innerHTML = 'Введите данные ' + item.description + ': ';
        input.type = 'text';
        input.value = modelHtml[i].value;

        document.getElementById('editor').appendChild(div);
        document.getElementById('fields').appendChild(p);
        document.getElementById('p' + item.label).appendChild(input);
    });

    var btn = document.createElement("button");
    btn.id = 'button_send';
    btn.innerHTML = 'Отправить';
    btn.addEventListener('click', saveData);
    document.getElementById('fields').appendChild(btn);

    function saveData() {
        var isCorrect = true;
        modelHtml.forEach(function(item, i) {
            if (isCorrect) {
                var index = item.label;
                var type = item.typeField;
                var text = document.getElementById(index).value;
                text = text.replace(/'|"/g,'');
                text = text.trim();

                try {
                    if (type == "string") {
                        arrStr[index] = JSON.stringify(text);
                    } else if (type == "number") {
                        if ( Number(text) ) {
                            arrStr[index] =  text;
                        } else {
                            throw "Not a Number";
                        }
                    } else if (type == "boolean") {
                        if (text == "true" || text == "false") {
                            arrStr[index] =  text;
                        } else {
                            throw "Not a Boolean";
                        }
                    } else {
                        throw "No type";
                    }
                } catch (err) {
                    console.log(err);
                    isCorrect = false;
                    return;
                }
            }
            sendData(arrStr);
        });

        if (isCorrect) {
            var script = arrStr.join('');
            //ws.send( JSON.stringify(script) );
            document.getElementById("status").innerHTML = "Успешно сохранено.";
        } else {
            document.getElementById("status").innerHTML = "Ошибка! Не Сохранено.";
        }
    }
}

function createHtml(arrStr, arrInfo, arrEdit) {
    var modelHtml = createModelHtml(arrStr, arrInfo, arrEdit);
    if (modelHtml.length > 0) {
        console.log('Create html model');
        createViewHtml(modelHtml, arrStr);
        return true;
    } else {
        console.log('Error to create model html');
        return false;
    }
}

function getScriptsListData() {
    var idScript = 7;
    var xhr = new XMLHttpRequest();
    xhr.open("GET", '/scriptsListData', true);
    xhr.onreadystatechange = function(data) {
        if (data && data.target && data.target.response) {
            try {
                var response = JSON.parse(data.target.response);
                response = response.data[idScript].value;
                document.getElementById("script1").value = response;
                parseScript(response);
                xhr.onreadystatechange = null;
            } catch (err) {
                console.log(err);
            }
        }
    };
    xhr.send();
}

getScriptsListData();

function sendData(str) {
    var xhr = new XMLHttpRequest();
    xhr.open("PUT", '/resourceData/update?create=false&name=script/data&value=' + str, true);
    xhr.onreadystatechange = function(data) {
        if (data && data.target && data.target.response) {
            console.log('response = ' + data.target.response);
        }
    };
    xhr.send();
}