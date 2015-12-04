function getParsedScript(str) {
    str = String(str);
    document.getElementById("script1").value = str;
    if (str.length < 8) {
        console.log('The length of the line is too short');
        return false;
    }
    var cursorPos = 0;
    var arrayStr = [];
    var editFields = [];
    var infoFields = [];
    var strLength = str.length;
    var isCorrect = true;

    do {
        var posFirstComment = getIndexEndComment(str, cursorPos);
        if (posFirstComment) {
            //Запись символов включая /**/
            arrayStr.push( str.substring(cursorPos, posFirstComment) );
            cursorPos = posFirstComment;

            var posBeginSecondComment = getIndexBeginInfo(str, cursorPos);
            if (posBeginSecondComment > -1) {
                //Запись значения для редактирования
                editFields.push(arrayStr.length);
                arrayStr.push( str.substring(cursorPos, posBeginSecondComment) );
                cursorPos = posBeginSecondComment;

                var posEndSecondComment = getIndexEndInfo(str, cursorPos);
                if (posEndSecondComment) {
                    //Запись служебной информации
                    var infoStr = str.substring(cursorPos, posEndSecondComment);
                    if ( createInfoObject(infoStr) ) {
                        infoFields.push(arrayStr.length);
                        arrayStr.push(infoStr);
                        cursorPos = posEndSecondComment;
                    } else {
                        cursorPos = strLength;
                        isCorrect = false;
                    }
                } else {
                    cursorPos = strLength;
                    isCorrect = false;
                }
            } else {
                cursorPos = strLength;
                isCorrect = false;
            }
        } else {
            //Запись остатка строки
            arrayStr.push( str.substring(cursorPos) );
            cursorPos = strLength;
        }
    } while (cursorPos < strLength)

    if (isCorrect) {
        var result = {
            arrayStr:   arrayStr,
            infoFields: infoFields,
            editFields: editFields
        };
        return result;
    } else {
        console.log('Incorrect description');
        return false;
    }
}

function getIndexBeginComment(str, cursorPos) {
    var text = str.substring(cursorPos);
    return text.indexOf("/**/");
}

function getIndexEndComment(str, cursorPos) {
    var position = getIndexBeginComment(str, cursorPos);
    if (position > -1) {
        return position + cursorPos + 4;
    }
    return 0;
}

function getIndexBeginInfo(str, cursorPos) {
    var text = str.substring(cursorPos);
    return text.indexOf("/*") + cursorPos;
}

function getIndexEndInfo(str, cursorPos) {
    var text = str.substring(cursorPos);
    var position = text.indexOf("*/");
    if (position > -1) {
        return position + cursorPos + 2;
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
        console.log('Cannot create info object');
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
    console.log('All right');

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
                    switch (type) {
                      case "string":
                        arrStr[index] =  "\"" + text + "\"";
                        break;

                      case "number":
                        if ( Number(text) ) {
                            arrStr[index] =  text;
                        } else {
                            throw "Not a Number";
                        }
                        break;

                      case "boolean":
                        if (text == "true" || text == "false") {
                            arrStr[index] =  text;
                        } else {
                            throw "Not a Boolean";
                        }
                        break;

                      default:
                        throw "Unknow type";
                        break;
                    };
                } catch (err) {
                    console.log(err);
                    isCorrect = false;
                    return;
                }
            }
        });

        if (isCorrect) {
            var script = arrStr.join('');
            script = "exports.src = " + script;
            //Преобразование перевода строки в уникальную комбинацию
            script = script.replace(/\n/g, '@@@');
            sendData(script);
            document.getElementById("status").innerHTML = "Успешно сохранено.";
        } else {
            document.getElementById("status").innerHTML = "Ошибка! Не Сохранено.";
        }
    }
}

function createHtml(modelHtml, arrStr) {
    if (modelHtml.length > 0) {
        createViewHtml(modelHtml, arrStr);
        return true;
    } else {
        console.log('No models elements');
        return false;
    }
}

function sendData(str) {
    var xhr = new XMLHttpRequest();
    xhr.open("PUT", '/resourceData/update?create=false&name=scripts/data&value=' + str, true);
    xhr.onreadystatechange = function(data) {
        xhr.onreadystatechange = null;
        if (data && data.target && data.target.response) {
            //console.log('response = ' + data.target.response);
        }
    };
    xhr.send();
}

function getScriptsListData() {
    var idScript = 7;
    var xhr = new XMLHttpRequest();
    xhr.open("GET", '/scriptsListData', true);
    xhr.onreadystatechange = function(data) {
        if (data && data.target && data.target.response) {
            xhr.onreadystatechange = null;
            var response;
            try {
                response = JSON.parse(data.target.response);
            } catch (err) {
                console.log('Cannot JSON.parse response');
                return;
            }

            try {
                response = response.data[idScript].value;
            } catch (err) {
                console.log('Cannot read script');
                return;
            }

            var script = getParsedScript(response);
            if (script && script.arrayStr && script.infoFields && script.editFields) {
                var modelHtml = createModelHtml(script.arrayStr, script.infoFields, script.editFields);
                createHtml(modelHtml, script.arrayStr);
            }
        }
    };
    xhr.send();
}

getScriptsListData();