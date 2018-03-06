var hostname = window.location.hostname;
var port = window.location.port;
var cur_acc_list = {};
var cur_speech_recognize;
var cur_speech_sintez;
var ivona_sett;
var from_elem;
var isInIframe = (window.location != window.parent.location) ? true : false;

//nodewebkit huck
try {
    window.parent.location.host;
} catch (e) {
    isInIframe = false;
};
//

function init_master() {
    $("#header").css("display", "block");
    $("#content").css("display", "flex");
    $("footer").css("display", "flex");
    $("#finish_master_page").css("display", "none");
    $("#current_connections").css("display", "none");
    $("#provider_choose").css("display", "none");
    $("#enter_login_password").css("display", "none");
    $("#speech_recognize").css("display", "none");
    $("#voice_choose").css("display", "none");
    $("#next_button").css("display", "none");
    $("#prev_button").css("display", "none");
    $("footer > div.col.center-align.s6.pagination").removeClass("margin_right25");
    $("#work_mode").show();
    $("#done_button").css("display", "block");
    $("#page_1, #page_2, #page_3").hide();
    $("#header_title").text("Мастер настроек");
    if (isInIframe) {
        $("#header_top").hide();
    }
    $("#header > div.col.s12.header_bottom").hide();
    $("#header_top > div > h1").hide();
    $("#done_button > a").text("Закрыть");
    if (isInIframe) {
        $("#done_button").hide();
    }
    $("#sintez_fields").hide();
}

$(document).ready(function () {
    $(document).keypress(function (event) {
        if (event.which == 13) {
            if ($('#my_alert').is(":visible")) {
                $("#myAlertOkBtn").click();
            } else {
                if ($("#current_connections").is(":visible") || $("#voice_choose").is(":visible") || $("#enter_login_password").is(":visible")) {
                    $("#done_button").click();
                }
                if ($("#edit_connection").is(":visible")) {
                    $("#save_conn_btn").click();
                }
            }
        }
    });
    $('select').material_select();
    init_master();
    getProvidersList();
    getAccountsList();
    //---old for ws
    //var socket = new WebSocket("ws" + (window.location.protocol == "https:" ? "s" :"") + "://" + window.location.hostname + ":" + window.location.port);
    var socket = io("ws" + (window.location.protocol == "https:" ? "s" : "") + "://" + window.location.hostname + ":" + window.location.port);
    //---old for ws
    //socket.onmessage = function(event) {
    socket.on('message', function (event) {
        //---old for ws
        //if (JSON.parse(event.data).data.source == "statusUA"){
        if (JSON.parse(event).data.source == "statusUA") {
            //---old for ws
            //var data_arr = (JSON.parse(event.data).data.data[0]);
            var data_arr = (JSON.parse(event).data.data[0]);
            var size = 0;
            for (var i = 10; i < data_arr.length; i++) {
                if (data_arr[i] != null) {
                    size++
                }
            }

            for (var i = 0; i < size; i++) {
                if (data_arr[i] == 0) {
                    $("#conn_" + i + " > div > .indicator").css("color", "gray").text("Отключён");
                } else if (data_arr[i] == 3) {
                    $("#conn_" + i + " > div > .indicator").css("color", "#489FD1").text("Подключается...");
                } else if (data_arr[i] == 2) {
                    $("#conn_" + i + " > div > .indicator").css("color", "red").text("Ошибка регистрации");
                } else if (data_arr[i] == 1) {
                    $("#conn_" + i + " > div > .indicator").css("color", "green").text("Подключён");
                }
            }
        }
    })
});

function getUrlVars(){
    var vars = [], hash;
    var hashes = window.location.href.slice(window.location.href.indexOf('?') + 1).split('&');
    for (var i = 0; i < hashes.length; i++)
    {
        hash = hashes[i].split('=');
        vars.push(hash[0]);
        vars[hash[0]] = hash[1];
    }
    return vars;
}

var lang = getUrlVars()["lang"];
(lang == 'ru') ? docss("ru.css") : (lang == 'en') ? docss("en.css") : docss("ru.css");

function docss(name){
    var st = document.createElement("link");
    st.setAttribute("rel", "stylesheet");
    st.setAttribute("href", "css/" + name);
    document.getElementsByTagName("head")[0].appendChild(st)
}

function myAlert(header, text) {
    $("#my_alert > div.modal-content > h4").text(header);
    $("#my_alert > div.modal-content > p").text(text);
    if (!$('#my_alert').is(":visible")) {
        $('#my_alert').openModal();
    }
}

function getAccountsList() {
    $.get("//" + hostname + ":" + port + "/resourceData/settings", function (returnedData) {
        if (returnedData && returnedData.data && returnedData.data[0] && returnedData.data[0].value) {
            if (jQuery.parseJSON(returnedData.data[0].value).sipAccounts) {
                cur_acc_list = jQuery.parseJSON(returnedData.data[0].value).sipAccounts;
            } else {
                myAlert("Ошибка!", "В файле конфигурации отутствует поле sipAccounts!");
            }
            if (jQuery.parseJSON(returnedData.data[0].value).recognize) {
                cur_speech_recognize = jQuery.parseJSON(returnedData.data[0].value).recognize;
            } else {
                myAlert("Ошибка!", "В файле конфигурации отутствует поле recognize!");
            }
            if (jQuery.parseJSON(returnedData.data[0].value).def_tts) {
                cur_speech_sintez = jQuery.parseJSON(returnedData.data[0].value).def_tts;
            } else {
                myAlert("Ошибка!", "В файле конфигурации отутствует поле def_tts!");
            }
            if (jQuery.parseJSON(returnedData.data[0].value).ivona_speech) {
                ivona_sett = jQuery.parseJSON(returnedData.data[0].value).ivona_speech;
            } else {
                myAlert("Ошибка!", "В файле конфигурации отутствует поле ivona_speech!");
            }

            createConnections();
        }
    })
}

function createConnections() {
    var img_src, img_alt;
    for (var i in cur_acc_list) {
        img_src = getImgSipConnection(cur_acc_list[i].host);
        img_alt = getNameProvConnection(cur_acc_list[i].host);
        if (!cur_acc_list[i].domain){ 
            cur_acc_list[i].domain = "";
        }
        if (cur_acc_list[i].disable == 1) {
            if (img_src && img_alt) {
                $("#current_connections > .collection").append(
                        '<li id="conn_' + i + '" class="collection-item with_del valign-wrapper">' +
                        '<div class="click_area valign-wrapper">' +
                        '<div class="povider_logo_cont">' +
                        '<img src="' + img_src + '" alt="' + img_alt + '" class="provider_logo">' +
                        '</div>' +
                        '<span class="title accaunt_uri valign" domain="' + cur_acc_list[i].domain + '" password="' + cur_acc_list[i].password + '">' + cur_acc_list[i].user + '</span>' +
                        '</div>' +
                        '<div class="right_cont valign-wrapper">' +
                        '<div class="switch">' +
                        '<label title="Подключить аккаунт"><input type="checkbox"><span class="lever"></span></label>' +
                        '</div>' +
                        '<div class="indicator">Отключён</div>' +
                        '<div class="edit_btn_cont click_area"><a href="javascript:void(0)" class="btn-flat grey-text">РЕДАКТИРОВАТЬ</a></div>' +
                        '</div>' +
                        '<a href="javascript:void(0)" class="del_btn">' +
                        '<img src="images/delete.png" alt="del" class="currents_icon del_icon">' +
                        '</a>' +
                        '</li>'
                        );
            } else {
                $("#current_connections > .collection").append(
                        '<li id="conn_' + i + '" class="collection-item with_del valign-wrapper">' +
                        '<div class="click_area valign-wrapper">' +
                        '<div class="povider_logo_cont">' +
                        '<img src="images/favicon.png" alt="provider" class="provider_logo">' +
                        '</div>' +
                        '<span class="title accaunt_uri valign" domain="' + cur_acc_list[i].domain + '" password="' + cur_acc_list[i].password + '">' + cur_acc_list[i].user + '</span>' +
                        '</div>' +
                        '<div class="right_cont valign-wrapper">' +
                        '<div class="switch">' +
                        '<label title="Подключить аккаунт"><input type="checkbox"><span class="lever"></span></label>' +
                        '</div>' +
                        '<div class="indicator">Отключён</div>' +
                        '<div class="edit_btn_cont click_area"><a href="javascript:void(0)" class="btn-flat grey-text">РЕДАКТИРОВАТЬ</a></div>' +
                        '</div>' +
                        '<a href="javascript:void(0)" class="del_btn">' +
                        '<img src="images/delete.png" alt="del" class="currents_icon del_icon">' +
                        '</a>' +
                        '</li>'
                        );
            }
        } else {
            if (img_src && img_alt) {
                $("#current_connections > .collection").append(
                        '<li id="conn_' + i + '" class="collection-item with_del valign-wrapper">' +
                        '<div class="click_area valign-wrapper">' +
                        '<div class="povider_logo_cont">' +
                        '<img src="' + img_src + '" alt="' + img_alt + '" class="provider_logo">' +
                        '</div>' +
                        '<span class="title accaunt_uri valign" domain="' + cur_acc_list[i].domain + '" password="' + cur_acc_list[i].password + '">' + cur_acc_list[i].user + '</span>' +
                        '</div>' +
                        '<div class="right_cont valign-wrapper">' +
                        '<div class="switch">' +
                        '<label title="Отключить аккаунт"><input type="checkbox" checked><span class="lever"></span></label>' +
                        '</div>' +
                        '<div class="indicator">Отключён</div>' +
                        '<div class="edit_btn_cont click_area"><a href="javascript:void(0)" class="btn-flat grey-text">РЕДАКТИРОВАТЬ</a></div>' +
                        '</div>' +
                        '<a href="javascript:void(0)" class="del_btn">' +
                        '<img src="images/delete.png" alt="del" class="currents_icon del_icon">' +
                        '</a>' +
                        '</li>'
                        );
            } else {
                $("#current_connections > .collection").append(
                        '<li id="conn_' + i + '" class="collection-item with_del valign-wrapper">' +
                        '<div class="click_area valign-wrapper">' +
                        '<div class="povider_logo_cont">' +
                        '<img src="images/favicon.png" alt="provider" class="provider_logo">' +
                        '</div>' +
                        '<span class="title accaunt_uri valign" domain="' + cur_acc_list[i].domain + '" password="' + cur_acc_list[i].password + '">' + cur_acc_list[i].user + '</span>' +
                        '</div>' +
                        '<div class="right_cont valign-wrapper">' +
                        '<div class="switch">' +
                        '<label title="Отключить аккаунт"><input type="checkbox" checked><span class="lever"></span></label>' +
                        '</div>' +
                        '<div class="indicator">Отключён</div>' +
                        '<div class="edit_btn_cont click_area"><a href="javascript:void(0)" class="btn-flat grey-text">РЕДАКТИРОВАТЬ</a></div>' +
                        '</div>' +
                        '<a href="javascript:void(0)" class="del_btn">' +
                        '<img src="images/delete.png" alt="del" class="currents_icon del_icon">' +
                        '</a>' +
                        '</li>'
                        );
            }
        }
    }

    $("#sip_sett").on('click', function () {
        $("#header > div.col.s12.header_bottom").show();
        $("#header_top > div > h1").show();
        $("#done_button > a").text("Готово");
        $("#work_mode").hide();
        $("#done_button").show();
        $("#prev_button").hide();
        $("#current_connections").show();
        $.ajax({
            url: '/statusUA',
            method: 'get',
            success: function (response) {
                var size = 0;
                for (var i = 10; i < response.data[0].length; i++) {
                    if (response.data[0][i] != null) {
                        size++
                    }
                }
                var data = response.data[0];
                for (var i = 0; i < size; i++) {
                    if (data[i] == 0) {
                        $("#conn_" + i + " > div > .indicator").css("color", "gray").text("Отключён");
                    } else if (data[i] == 3) {
                        $("#conn_" + i + " > div > .indicator").css("color", "#489FD1").text("Подключается...");
                    } else if (data[i] == 2) {
                        $("#conn_" + i + " > div > .indicator").css("color", "red").text("Ошибка регистрации");
                    } else if (data[i] == 1) {
                        $("#conn_" + i + " > div > .indicator").css("color", "green").text("Подключён");
                    }
                }
            }
        });
        $("#header_title").text("Ваши текущие SIP подключения");
        $("#header_decription").text("Вы можете отредактировать ваши SIP подключения или добавить новые");
        $("#page_1").show();
        if ($("#current_connections > ul li").size() == 0) {
            $("#add_conn_btn").click();
        }
    });

    $("#speech_sett").on('click', function () {
        $("#header > div.col.s12.header_bottom").show();
        $("#header_top > div > h1").show();
        $("#done_button > a").text("Готово");
        $("#work_mode").hide();
        $("#done_button").hide();
        $("#speech_recognize").show();
        $("#next_button").show();
        $("#prev_button").show();
        $("#header_title").html("Распознавание и синтез речи");
        $("#header_decription").text("Выберите предложенный сервис синтеза и распознавания речи");
        if ($("#speech_recognize > ul li").size() == 1) {
            $("#speech_recognize > ul li").addClass("active_item");
            $("#next_button").click();
            if (cur_speech_recognize) {
                $("#key + label").addClass("active");
                $("#key").val(cur_speech_recognize.options.developer_key);
            }
            if (cur_speech_sintez) {
                if (ivona_sett.accessKey) {
                    $("#access_key_sintez + label").addClass("active");
                    $("#access_key_sintez").val(ivona_sett.accessKey);
                }
                if (ivona_sett.secretKey) {
                    $("#secret_key_sintez + label").addClass("active");
                    $("#secret_key_sintez").val(ivona_sett.secretKey);
                }
                $("#def_tts").val(cur_speech_sintez);
                $("#def_tts").parent().children("input").val($('#def_tts option[value="' + cur_speech_sintez + '"]').text());
                if ($("#def_tts").val() == "ivona") {
                    $("#sintez_fields").show();
                } else {
                    $("#sintez_fields").hide();
                }
                ;
            }
        }
        $.ajax({
            url: "/keyCheck",
            data: {
                "type": "yandex",
                "key": $("#key").val()
            },
            beforeSend: function () {
                $("#done_button").unbind('click');
            },
            complete: function () {
                $("#done_button").on('click', done_handler);
            },
            success: function (res) {
                if (!res.checked) {
                    $("#key").removeClass("valid");
                    $("#key").addClass("invalid");
                } else {
                    $("#key").removeClass("invalid");
                    $("#key").addClass("valid");
                }
            },
            error: function (XMLHttpRequest, textStatus, errorThrown) {
                console.log("error");
            }
        });
        if ($("#access_key_sintez").val() != "" && $("#secret_key_sintez").val() != "") {
            $.ajax({
                url: "/keyCheck",
                data: {
                    "type": "ivona",
                    "accessKey": $("#access_key_sintez").val(),
                    "secretKey": $("#secret_key_sintez").val()
                },
                beforeSend: function () {
                    $("#done_button").unbind('click');
                },
                complete: function () {
                    $("#done_button").on('click', done_handler);
                },
                success: function (res) {
                    // console.log(res.data);
                    if (!res.checked) {
                        $("#access_key_sintez").removeClass("valid");
                        $("#access_key_sintez").addClass("invalid");
                        $("#secret_key_sintez").removeClass("valid");
                        $("#secret_key_sintez").addClass("invalid");
                    } else {
                        $("#access_key_sintez").removeClass("invalid");
                        $("#access_key_sintez").addClass("valid");
                        $("#secret_key_sintez").removeClass("invalid");
                        $("#secret_key_sintez").addClass("valid");
                    }
                },
                error: function (XMLHttpRequest, textStatus, errorThrown) {
                    console.log("error");
                }
            });
        } else {
            $("#access_key_sintez").removeClass("invalid");
            $("#access_key_sintez").removeClass("valid");
            $("#secret_key_sintez").removeClass("invalid");
            $("#secret_key_sintez").removeClass("valid");
        }
    });


    $("#next_button").on('click', function () {
        if ($("#speech_recognize").is(":visible")) {
            if ($("#speech_recognize > .collection > .collection-item").hasClass("active_item")) {
                $("#speech_recognize").hide();
                $("#next_button").hide();
                $("#done_button").show();
                $("#header_title").html("Настройки сервиса распознавания и синтеза речи");
                $("#header_decription").text("Введите ключ сервиса и выберите голос");
                $("#voice_choose").show();
            } else {
                myAlert("Внимание", "Вы не выбрали ни один из представленных сервисов");
            };
        }
    });

    $("#prev_button").on('click', function () {
        if ($("#current_connections").is(":visible")) {
            $("#header > div.col.s12.header_bottom").hide();
            $("#header_top > div > h1").hide();
            $("#done_button > a").text("Закрыть");
            $("#work_mode > .collection > .collection-item").removeClass("active_item");
            $("#current_connections").hide();
            $("footer > div.col.center-align.s6.pagination").removeClass("margin_right25");
            $("#next_button").hide();
            $("#prev_button").hide();
            $("#page_1").hide();
            $("#done_button").show();
            if (isInIframe) {
                $("#done_button").hide();
            }
            $("#work_mode").show();
            $("#header_title").text("Мастер настроек");
        } else if ($("#provider_choose").is(":visible")) {
            $("#provider_choose").hide();
            $("#next_button").hide();
            $("#done_button").show();
            $("#prev_button").hide();
            $("#provider_choose > ul > .active_item").removeClass("active_item");
            $("#current_connections").show();
            $("#page_2").hide();
            $("#header_title").text("Ваши текущие SIP подключения");
            $("#header_decription").text("Вы можете отредактировать ваши SIP подключения или добавить новые");
            $.ajax({
                url: '/statusUA',
                method: 'get',
                success: function (response) {
                    var size = 0;
                    for (var i = 10; i < response.data[0].length; i++) {
                        if (response.data[0][i] != null) {
                            size++
                        }
                    }
                    var data = response.data[0];
                    for (var i = 0; i < size; i++) {
                        if (data[i] == 0) {
                            $("#conn_" + i + " > div > .indicator").css("color", "gray").text("Отключён");
                        } else if (data[i] == 3) {
                            $("#conn_" + i + " > div > .indicator").css("color", "#489FD1").text("Подключается...");
                        } else if (data[i] == 2) {
                            $("#conn_" + i + " > div > .indicator").css("color", "red").text("Ошибка регистрации");
                        } else if (data[i] == 1) {
                            $("#conn_" + i + " > div > .indicator").css("color", "green").text("Подключён");
                        }
                    }
                },
                error: function (XMLHttpRequest, textStatus, errorThrown) {
                    myAlert(textStatus, errorThrown);
                }
            });
        } else if ($("#enter_login_password").is(":visible")) {
            $("#enter_login_password").hide();
            $("#next_button").show();
            $("#next_button > a").hide();
            $("#done_button").hide();
            $("#enter_login_password > div > form").trigger('reset');
            $("#provider_choose").show();
            $("#page_3").hide();
            $("#header_title").text("Выбор SIP провайдера");
            $("#header_decription").text("Выберите вашего SIP провайдера");
        } else if ($("#speech_recognize").is(":visible")) {
            $("#header > div.col.s12.header_bottom").hide();
            $("#header_top > div > h1").hide();
            $("#done_button > a").text("Закрыть");
            $("#work_mode > .collection > .collection-item").removeClass("active_item");
            $("#speech_recognize").hide();
            $("#next_button").hide();
            $("#prev_button").hide();
            $("#speech_recognize > ul > .active_item").removeClass("active_item");
            $("#done_button").show();
            if (isInIframe) {
                $("#done_button").hide();
            }
            $("#work_mode").show();
            $("#header_title").text("Мастер настроек");
        } else if ($("#voice_choose").is(":visible")) {
            $("#voice_choose").hide();
            $("#next_button").show();
            $("#next_button > a").show();
            $("#done_button").hide();
            $("#voice_choose > div > form").trigger('reset');
            $("#speech_recognize").show();
            $("#prev_button").click();
            $("#sintez_fields").hide();
            $("#header_title").html("Распознавание и синтез речи");
            $("#header_decription").text("Выберите предложенный сервис синтеза и распознавания речи");
        } else if ($("#edit_connection").is(":visible")) {
            $("#edit_connection").hide();
            $("#prev_button").hide();
            $("#done_button").show();
            $("#page_1").show();
            $("#header_title").text("Ваши текущие SIP подключения");
            $("#header_decription").text("Вы можете отредактировать ваши SIP подключения или добавить новые");
            from_elem.removeClass("active_item");
            from_elem.children(".right_cont").removeClass("active_item");
            $("#edit_connection > div >form").trigger('reset');
            $("#current_connections").show();
            $.ajax({
                url: '/statusUA',
                method: 'get',
                success: function (response) {
                    var size = 0;
                    for (var i = 10; i < response.data[0].length; i++) {
                        if (response.data[0][i] != null) {
                            size++
                        }
                    }
                    var data = response.data[0];
                    for (var i = 0; i < size; i++) {
                        if (data[i] == 0) {
                            $("#conn_" + i + " > div > .indicator").css("color", "gray").text("Отключён");
                        } else if (data[i] == 3) {
                            $("#conn_" + i + " > div > .indicator").css("color", "#489FD1").text("Подключается...");
                        } else if (data[i] == 2) {
                            $("#conn_" + i + " > div > .indicator").css("color", "red").text("Ошибка регистрации");
                        } else if (data[i] == 1) {
                            $("#conn_" + i + " > div > .indicator").css("color", "green").text("Подключён");
                        }
                    }
                },
                error: function (XMLHttpRequest, textStatus, errorThrown) {
                    myAlert(textStatus, errorThrown);
                }
            });
        }
    });

    $("#add_conn_btn").on('click', function () {
        $("#current_connections").hide();
        $("footer > div.col.center-align.s6.pagination").removeClass("margin_right25");
        $("#header_title").text("Выбор SIP провайдера");
        $("#header_decription").text("Выберите вашего SIP провайдера");
        $("#done_button").hide();
        $("#prev_button").show();
        $("#next_button").show();
        $("#next_button > a").hide();
        $("#provider_choose").show();
        $("#page_2").show();
    });

    $("#done_button").on('click', done_handler);

    $("#done_button a").on('click', function () {
        if ($("#work_mode").is(":visible") && $("#done_button > a").text() == "Закрыть") {
            window.location = '../../';
        }
    });

    $(".del_btn").on('click', function () {
        var tmp_id = $(this).parent().attr("id").substr(5);
        var del_index = tmp_id;
        $("#conn_" + del_index).remove();
        // if ($("#current_connections > ul").height() < document.documentElement.clientHeight/1.82) {
        //     $("#current_connections").css("overflow-y","hidden");
        // }else{
        //     $("#current_connections").css("overflow-y","scroll");
        // }
        delete cur_acc_list[del_index];
        $.ajax({
            url: '/resourceData/settings',
            method: 'get',
            success: function (response) {
                var data = jQuery.parseJSON(response.data[0].value);
                delete data.sipAccounts[del_index];
                response.data[0].create = false;
                response.data[0].name = 'config/config';
                response.data[0].value = JSON.stringify(data, null, 4);
                $.ajax({
                    url: "/resourceData/update",
                    method: 'put',
                    data: response.data[0],
                    success: function (response) {
                        // $.get("//" + hostname + ":" + port + "/resourceData/settings", function () {
                            // var next_ind = parseInt(del_index) + 1;
                            // var iterator = $("#conn_" + next_ind);
                            // while (tmp_id != cur_acc_list.length) {
                            //     iterator.attr("id", "conn_" + tmp_id);
                            //     iterator = iterator.next();
                            //     tmp_id++;
                            // }
                        // });
                    },
                    error: function (XMLHttpRequest, textStatus, errorThrown) {
                        myAlert(textStatus, errorThrown);
                    }
                });
            },
            error: function (XMLHttpRequest, textStatus, errorThrown) {
                myAlert(textStatus, errorThrown);
            }
        });

    });

    $("#key").on("change", function () {
        $.ajax({
            url: "/keyCheck",
            data: {
                "type": "yandex",
                "key": $("#key").val()
            },
            beforeSend: function () {
                $("#done_button").unbind('click');
            },
            complete: function () {
                $("#done_button").on('click', done_handler);
            },
            success: function (res) {
                if (!res.checked) {
                    $("#key").removeClass("valid");
                    $("#key").addClass("invalid");
                } else {
                    $("#key").removeClass("invalid");
                    $("#key").addClass("valid");
                }
            },
            error: function (XMLHttpRequest, textStatus, errorThrown) {
                console.log("error");
            }
        });
        // https://tts.voicetech.yandex.net/generate?text=test&key=83669aea-cb9b-40c8-8fd9-ed4cbf4cffa2
    });

    $("#access_key_sintez, #secret_key_sintez").on("change", function () {
        if ($("#access_key_sintez").val() != "" && $("#secret_key_sintez").val() != "") {
            $.ajax({
                url: "/keyCheck",
                data: {
                    "type": "ivona",
                    "accessKey": $("#access_key_sintez").val(),
                    "secretKey": $("#secret_key_sintez").val()
                },
                beforeSend: function () {
                    $("#done_button").unbind('click');
                },
                complete: function () {
                    $("#done_button").on('click', done_handler);
                },
                success: function (res) {
                    // console.log(res.data);
                    if (!res.checked) {
                        $("#access_key_sintez").removeClass("valid");
                        $("#access_key_sintez").addClass("invalid");
                        $("#secret_key_sintez").removeClass("valid");
                        $("#secret_key_sintez").addClass("invalid");
                    } else {
                        $("#access_key_sintez").removeClass("invalid");
                        $("#access_key_sintez").addClass("valid");
                        $("#secret_key_sintez").removeClass("invalid");
                        $("#secret_key_sintez").addClass("valid");
                    }
                },
                error: function (XMLHttpRequest, textStatus, errorThrown) {
                    console.log("error");
                }
            });
        } else {
            $("#access_key_sintez").removeClass("invalid");
            $("#access_key_sintez").removeClass("valid");
            $("#secret_key_sintez").removeClass("invalid");
            $("#secret_key_sintez").removeClass("valid");
        }
    });

    $('input[type="checkbox"]').on("change", function () {
        var tmp_id = $(this).parent().parent().parent().parent().attr("id").substr(5);
        if ($(this).prop('checked')) {
            cur_acc_list[tmp_id].disable = 0;
            $(this).parent().attr("title", "Отключить аккаунт");
        } else {
            cur_acc_list[tmp_id].disable = 1;
            $(this).parent().attr("title", "Подключить аккаунт");
        }
        $(this).prop('disabled', true);
        var checkbox = $(this);
        $.ajax({
            url: '/resourceData/settings',
            method: 'get',
            success: function (response) {
                var data = jQuery.parseJSON(response.data[0].value);
                data.sipAccounts[tmp_id].disable = cur_acc_list[tmp_id].disable;
                response.data[0].create = false;
                response.data[0].name = 'config/config';
                response.data[0].value = JSON.stringify(data, null, 4);
                $.ajax({
                    url: "/resourceData/update",
                    method: 'put',
                    data: response.data[0],
                    success: function () {
                        checkbox.prop('disabled', false);
                    },
                    error: function (XMLHttpRequest, textStatus, errorThrown) {
                        myAlert(textStatus, errorThrown);
                    }
                });
            },
            error: function (XMLHttpRequest, textStatus, errorThrown) {
                myAlert(textStatus, errorThrown);
            }
        });
        $.ajax({
            url: '/statusUA',
            method: 'get',
            success: function (res) {
                var size = 0;
                for (var i = 10; i < res.data[0].length; i++) {
                    if (res.data[0][i] != null) {
                        size++
                    }
                }
                var data = res.data[0];
                for (var i = 0; i < size; i++) {
                    if (data[i] == 0) {
                        $("#conn_" + i + " > div > .indicator").css("color", "gray").text("Отключён");
                    } else if (data[i] == 3) {
                        $("#conn_" + i + " > div > .indicator").css("color", "#489FD1").text("Подключается...");
                    } else if (data[i] == 2) {
                        $("#conn_" + i + " > div > .indicator").css("color", "red").text("Ошибка регистрации");
                    } else if (data[i] == 1) {
                        $("#conn_" + i + " > div > .indicator").css("color", "green").text("Подключён");
                    }
                }
            },
            error: function (XMLHttpRequest, textStatus, errorThrown) {
                myAlert(textStatus, errorThrown);
            }
        });
    });

    $("#provider_choose > .collection > .collection-item").on('click', function () {
        $(this).parent().children(".active_item").removeClass("active_item");
        if ($(this).hasClass("active_item")) {
            $(this).removeClass("active_item");
        } else {
            $(this).addClass("active_item");
            if ($(this).parent().parent().attr("id") == "provider_choose") {
                $("#next_button > a").show();
                $("#provider_choose").hide();
                $("#next_button").hide();
                $("#enter_domain").val("");
                $("#done_button").show();
                $("#header_title").html("Настройки SIP подключения");
                $(".img_provider > img").attr("src", $("#provider_choose .collection-item.active_item .provider_logo").attr('src'));
                $("#enter_login_password > div > form > span").show();
                $("#enter_login_password > div > form > span > a").attr("href", $("#provider_choose > .collection > .collection-item.active_item > div > img").attr("ref"));
                $("#header_decription").html("Введите данные вашего SIP аккаунта");
                $("#enter_login_password").show();
                $("#page_3").show();
                if ($("#provider_choose .collection-item.active_item .provider_logo").attr('alt') == "Манго Телеком") {
                    $("#enter_domain").parent().show();
                    $("#enter_domain + label").addClass("active");
                    $("#enter_domain").val(getDomainSipConnection("Манго Телеком"));
                } else {
                    $("#enter_domain + label").removeClass("active");
                    $("#enter_domain").parent().hide();

                }
            }
        }
    });
    $(".close_icon").on('click', function () {
        $("#prev_button").click();
    });
    $(".click_area").on('click', function () {
        $("#current_connections").hide();
        $("#page_1").hide();
        from_elem = $(this).parent();
        if (from_elem.hasClass('right_cont')) {
            from_elem = from_elem.parent();
            $(this).parent().removeClass("active_item");
        }
        $(this).parent().parent().children(".active_item").removeClass("active_item");
        if ($(this).parent().hasClass("active_item")) {
            $(this).parent().removeClass("active_item");
        } else {
            $(this).parent().addClass("active_item");
        }
        $("#domain").val("");
        var from_uri = from_elem.children(".click_area").children(".accaunt_uri").text();
        var from_pass = from_elem.children(".click_area").children(".accaunt_uri").attr("password");
        var from_domain = from_elem.children(".click_area").children(".accaunt_uri").attr("domain");
        $("#login + label").addClass("active");
        $("#login").val(from_uri);
        $("#password + label").addClass("active");
        $("#password").val(from_pass);
        $(".img_provider > img").attr("src", from_elem.children(".click_area").children(".povider_logo_cont").children().attr('src'));
        $("#header_title").html("Редактирование SIP подключения<br/>" + from_elem.children(".click_area").children(".accaunt_uri").text());
        $("#header_decription").text("Измените данные и нажмите сохранить");
        $("#prev_button").show();
        $("#done_button").hide();
        $("#edit_connection").show();
        if (from_elem.children(".click_area").children(".povider_logo_cont").children().attr('alt') == "Манго Телеком") {
            $("#domain + label").addClass("active");
            $("#domain").val(from_domain);
            $("#domain").parent().show();
        } else {
            $("#domain + label").removeClass("active");
            $("#domain").val("");
            $("#domain").parent().hide();
        }
    });

    $("#save_conn_btn").on('click', function () {
        if ($("#login").val() && $("#password").val()) {
            if ($("#domain").is(":visible") && $("#domain").val() == "") {
                myAlert("Внимание!", "Поле домен должно быть заполнено!");
            } else {
                $("#edit_connection").hide();
                $("#page_1").show();
                $("#prev_button").hide();
                $("#done_button").show();
                $("#current_connections").show();
                $("#prev_button").hide();
                $("#header_title").text("Ваши текущие SIP подключения");
                $("#header_decription").text("Вы можете отредактировать ваши SIP подключения или добавить новые");
                from_elem.removeClass("active_item");
                from_elem.children(".right_cont").removeClass("active_item");
                var from_uri = from_elem.children(".click_area").children(".accaunt_uri").text();

                $.ajax({
                    url: '/resourceData/settings',
                    method: 'get',
                    success: recordSipConnection
                });
                from_elem.children(".click_area").children(".accaunt_uri").text($("#login").val());
                from_elem.children(".click_area").children(".accaunt_uri").attr("password", $("#password").val());
                from_elem.children(".click_area").children(".accaunt_uri").attr("domain", $("#domain").val());
                $.ajax({
                    url: '/statusUA',
                    method: 'get',
                    success: function (res) {
                        var size = 0;

                        for (var i = 10; i < res.data[0].length; i++) {
                            if (res.data[0][i] != null) {
                                size++
                            }
                        }
                        var data = res.data[0];
                        for (var i = 0; i < size; i++) {
                            if (data[i] == 0) {
                                $("#conn_" + i + " > div > .indicator").css("color", "gray").text("Отключён");
                            } else if (data[i] == 3) {
                                $("#conn_" + i + " > div > .indicator").css("color", "#489FD1").text("Подключается...");
                            } else if (data[i] == 2) {
                                $("#conn_" + i + " > div > .indicator").css("color", "red").text("Ошибка регистрации");
                            } else if (data[i] == 1) {
                                $("#conn_" + i + " > div > .indicator").css("color", "green").text("Подключён");
                            }
                        }
                    },
                    error: function (XMLHttpRequest, textStatus, errorThrown) {
                        myAlert(textStatus, errorThrown);
                    }
                });
            }
        } else {
            myAlert("Внимание", "Поля логин и пароль должны быть заполнены!");
        }
    });

    $("#def_tts").on('change', function () {
        if ($("#def_tts").val() == "ivona") {
            $("#sintez_fields").show();
        } else {
            $("#sintez_fields").hide();
        };
    });

    $("#page_1").on('click', function () {
        if ($("#provider_choose").is(":visible")) {
            $("#prev_button").click();
        } else if ($("#enter_login_password").is(":visible")) {
            $("#prev_button").click();
            $("#prev_button").click();
        }
    });
    $("#page_2").on('click', function () {
        if ($("#enter_login_password").is(":visible")) {
            $("#prev_button").click();
        }
    });
    $("#del_connection_btn").on('click', function () {
        var result = confirm("Вы уверены что хотите удалить запись?")
        if (result) {
            from_elem.children('.del_btn').click();
            $("#prev_button").click();
        }
    });
    // $("#page_4").on('click', function() {
    //     if ($("#voice_choose").is(":visible")){
    //         $("#prev_button").click();
    //     }
    // });
    // $("#speech_play_btn").on('click', function() {
    //     if ($("#voice_choose > div > form > div > div.input-field.col.s10 > div > select").val()){
    //         new ya.speechkit.Tts({apikey: '069b6659-984b-4c5f-880e-aaedcfd84102', emotion: 'good',speaker: $("#voice_choose > div > form > div > div.input-field.col.s10 > div > select > option:selected").text()}).speak('Здравствуйте. Вас приветствует мультиканальная система распознавания Марс!');
    //     }else{
    //         myAlert("Внимание","Вы не выбрали голос для озвучивания!");
    //     }
    // });
}

function newSipConnection(response) {
    var data = jQuery.parseJSON(response.data[0].value);
    var login = $("#enter_login").val();
    var pass = $("#enter_password").val();
    var host = $("#provider_choose > ul > li.collection-item.active_item > div > img").attr("url");
    var domain = getDomainSipConnection($("#provider_choose > ul > li.collection-item.active_item > div > img").attr("alt"));
    if ($("#enter_domain").val() != "") {
        domain = $("#enter_domain").val();
    }
    var sipAccount = {
        host: host,
        expires: 60,
        user: login,
        password: pass,
        disable: 1
    };
    if (domain) {
        sipAccount['domain'] = domain;
    };
    cur_acc_list[Object.keys(cur_acc_list).length] = sipAccount;
    var idSipRecord = Object.keys(cur_acc_list).length - 1;
    data.sipAccounts[idSipRecord] = sipAccount;
    response.data[0].create = false;
    response.data[0].name = 'config/config';
    //save in the proper format
    response.data[0].value = JSON.stringify(data, null, 4);

    $.ajax({
        url: "/resourceData/update",
        method: 'put',
        data: response.data[0],
        success: function (response) {
            $.get("//" + hostname + ":" + port + "/resourceData/settings", function () {
                $("#provider_choose > ul > .active_item").removeClass("active_item");
                $("#enter_login_password > div > form").trigger('reset');
            });
        },
        error: function (XMLHttpRequest, textStatus, errorThrown) {
            myAlert(textStatus, errorThrown);
        }
    });
}

function recordSipConnection(response) {
    var data = jQuery.parseJSON(response.data[0].value);
    var login = $("#login").val();
    var pass = $("#password").val();
    var host = getHostSipConnection(from_elem.children(".click_area").children().children().attr("alt"));
    var domain = getDomainSipConnection(from_elem.children(".click_area").children().children().attr("alt"));
    if ($("#domain").val() != "") {
        domain = $("#domain").val();
    }
    var idSipRecord = from_elem.attr('id').substr(5);
    var sipAccount = {
        host: host,
        expires: 60,
        user: login,
        password: pass,
    };
    if (!host) {
        if (data && data.sipAccounts &&
                data.sipAccounts[idSipRecord] &&
                data.sipAccounts[idSipRecord].host) {
            sipAccount['host'] = data.sipAccounts[idSipRecord].host;
        }
    }
    if (domain) {
        sipAccount['domain'] = domain;
    } else {
        if (data && data.sipAccounts &&
                data.sipAccounts[idSipRecord] &&
                data.sipAccounts[idSipRecord].domain) {
            sipAccount['domain'] = data.sipAccounts[idSipRecord].domain;
        }
    }

    sipAccount['disable'] = data.sipAccounts[idSipRecord].disable;

    //     sipAccount['disable'] = 1;
    // }

    //choose add or edit
    (idSipRecord === null) ?
            data.sipAccounts[data.sipAccounts.length] = sipAccount :
            data.sipAccounts[idSipRecord] = sipAccount;

    response.data[0].create = false;
    response.data[0].name = 'config/config';
    //save in the proper format
    response.data[0].value = JSON.stringify(data, null, 4);
    $.ajax({
        url: "/resourceData/update",
        method: 'put',
        data: response.data[0],
        success: function (response) {
            from_elem.removeClass("active_item");
            $("#edit_connection > div >form").trigger('reset');
        },
        error: function (XMLHttpRequest, textStatus, errorThrown) {
            myAlert(textStatus, errorThrown);
        }
    });
}


function done_handler() {
    if ($("#voice_choose").is(":visible")) {
        if ($("#def_tts").val() == "ivona" && !$("#secret_key_sintez").val() && !$("#access_key_sintez").val()) {
            myAlert("Внимание", "Поля ключей синтеза Ivona должны быть заполнены");
        } else {
            if ($("#key, #access_key_sintez, #secret_key_sintez").hasClass("invalid")) {
                myAlert("Внимание!", "Вы сохранили не валидный ключ!");
            }
            $("#header > div.col.s12.header_bottom").hide();
            $("#header_top > div > h1").hide();

            $("#work_mode > .collection > .collection-item").removeClass("active_item");
            $("#voice_choose").hide();
            $("#prev_button").hide();
            $("#sintez_fields").hide();
            $.ajax({
                url: '/resourceData/settings',
                method: 'get',
                success: function (response) {
                    var data = jQuery.parseJSON(response.data[0].value);
                    data.recognize.options.developer_key = $("#key").val();
                    cur_speech_recognize.options.developer_key = $("#key").val();
                    if ($("#def_tts").val() == "ivona") {
                        data.def_tts = "ivona";
                        cur_speech_sintez = "ivona";
                        data.ivona_speech.accessKey = $("#access_key_sintez").val();
                        data.ivona_speech.secretKey = $("#secret_key_sintez").val();
                        ivona_sett.accessKey = $("#access_key_sintez").val();
                        ivona_sett.secretKey = $("#secret_key_sintez").val();
                    } else {
                        data.def_tts = "yandex";
                        cur_speech_sintez = "yandex";
                    }
                    response.data[0].create = false;
                    response.data[0].name = 'config/config';
                    response.data[0].value = JSON.stringify(data, null, 4);
                    $.ajax({
                        url: "/resourceData/update",
                        method: 'put',
                        data: response.data[0],
                        success: function (response) {
                            $.get("//" + hostname + ":" + port + "/resourceData/settings", function () {
                                $("#speech_recognize > ul > .active_item").removeClass("active_item");
                                $("#voice_choose > div > form").trigger('reset');
                            });
                        },
                        error: function (XMLHttpRequest, textStatus, errorThrown) {
                            myAlert(textStatus, errorThrown);
                        }
                    });
                },
                error: function (XMLHttpRequest, textStatus, errorThrown) {
                    myAlert(textStatus, errorThrown);
                }
            });
            $("#work_mode").show();
            $("#header_title").text("Мастер настроек");
            $("#done_button > a").text("Закрыть");
            if (isInIframe) {
                $("#done_button").hide();
            }
        }
    } else if ($("#enter_login_password").is(":visible")) {
        if ($("#enter_login").val() && $("#enter_password").val()) {
            if ($("#enter_domain").is(":visible") && $("#enter_domain").val() == "") {
                myAlert("Внимание!", "Поле Домен должно быть заполнено!");
            } else {
                $("#header > div.col.s12.header_bottom").hide();
                $("#header_top > div > h1").hide();
                $("#done_button > a").text("Закрыть");
                if (isInIframe) {
                    $("#done_button").hide();
                }
                $("#work_mode > .collection > .collection-item").removeClass("active_item");
                $("#enter_login_password").hide();
                $("#prev_button").hide();
                $("#page_1, #page_2, #page_3").hide();
                var prov_name = $("#provider_choose > ul > li.collection-item.active_item > div > img").attr("alt");
                var prov_img = $("#provider_choose > ul > li.collection-item.active_item > div > img").attr("src");
                var prov_url = $("#provider_choose > ul > li.collection-item.active_item > div > img").attr("url");
                $("#current_connections > .collection").append(
                        '<li id="conn_' + Object.keys(cur_acc_list).length + '" class="collection-item with_del valign-wrapper">' +
                        '<div class="click_area valign-wrapper">' +
                        '<div class="povider_logo_cont">' +
                        '<img src="' + prov_img + '" alt="' + prov_name + '" class="provider_logo">' +
                        '</div>' +
                        '<span class="title accaunt_uri valign" domain="' + $("#enter_domain").val() + '" password="' + $("#enter_password").val() + '">' + $("#enter_login").val() + '</span>' +
                        '</div>' +
                        '<div class="right_cont valign-wrapper">' +
                        '<div class="switch">' +
                        '<label title="Подключить аккаунт"><input type="checkbox"><span class="lever"></span></label>' +
                        '</div>' +
                        '<div class="indicator">Отключён</div>' +
                        '<div class="edit_btn_cont click_area"><a href="javascript:void(0)" class="btn-flat grey-text">РЕДАКТИРОВАТЬ</a></div>' +
                        '</div>' +
                        '<a href="javascript:void(0)" class="del_btn">' +
                        '<img src="images/delete.png" alt="del" class="currents_icon del_icon">' +
                        '</a>' +
                        '</li>'
                        );

                $("#current_connections > .collection > .collection-item:last-child > .del_btn").on('click', function () {
                    var tmp_id = $(this).parent().attr("id").substr(5);
                    var del_index = tmp_id;
                    $("#conn_" + del_index).remove();
                    delete cur_acc_list[del_index];
                    // cur_acc_list.splice(del_index, 1);
                    $.ajax({
                        url: '/resourceData/settings',
                        method: 'get',
                        success: function (response) {
                            var data = jQuery.parseJSON(response.data[0].value);
                            // data.sipAccounts.splice(del_index, 1);
                            delete data.sipAccounts[del_index];
                            response.data[0].create = false;
                            response.data[0].name = 'config/config';
                            response.data[0].value = JSON.stringify(data, null, 4);
                            $.ajax({
                                url: "/resourceData/update",
                                method: 'put',
                                data: response.data[0],
                                success: function (response) {
                                    // $.get("//" + hostname + ":" + port + "/resourceData/settings", function () {
                                    //     // var next_ind = parseInt(del_index) + 1;
                                    //     // var iterator = $("#conn_" + next_ind);
                                    //     // while (tmp_id != cur_acc_list.length) {
                                    //     //     // console.log(iterator.next().attr("id"));
                                    //     //     iterator.attr("id", "conn_" + tmp_id);
                                    //     //     iterator = iterator.next();
                                    //     //     tmp_id++;
                                    //     // }

                                    // });
                                },
                                error: function (XMLHttpRequest, textStatus, errorThrown) {
                                    myAlert(textStatus, errorThrown);
                                }
                            });
                        },
                        error: function (XMLHttpRequest, textStatus, errorThrown) {
                            myAlert(textStatus, errorThrown);
                        }
                    });

                });

                $('#current_connections > .collection > .collection-item:last-child input[type="checkbox"]').on("change", function () {
                    var tmp_id = $(this).parent().parent().parent().parent().attr("id").substr(5);
                    if ($(this).prop('checked')) {
                        cur_acc_list[tmp_id].disable = 0;
                        $(this).parent().attr("title", "Отключить аккаунт");
                    } else {
                        cur_acc_list[tmp_id].disable = 1;
                        $(this).parent().attr("title", "Подключить аккаунт");
                    }
                    $(this).prop('disabled', true);
                    var checkbox = $(this);
                    $.ajax({
                        url: '/resourceData/settings',
                        method: 'get',
                        success: function (response) {
                            var data = jQuery.parseJSON(response.data[0].value);
                            data.sipAccounts[tmp_id].disable = cur_acc_list[tmp_id].disable;
                            response.data[0].create = false;
                            response.data[0].name = 'config/config';
                            response.data[0].value = JSON.stringify(data, null, 4);
                            $.ajax({
                                url: "/resourceData/update",
                                method: 'put',
                                data: response.data[0],
                                success: function () {
                                    checkbox.prop('disabled', false);
                                },
                                error: function (XMLHttpRequest, textStatus, errorThrown) {
                                    myAlert(textStatus, errorThrown);
                                }
                            });
                        },
                        error: function (XMLHttpRequest, textStatus, errorThrown) {
                            myAlert(textStatus, errorThrown);
                        }
                    });
                    $.ajax({
                        url: '/statusUA',
                        method: 'get',
                        success: function (response) {
                            var size = 0;
                            for (var i = 10; i < response.data[0].length; i++) {
                                if (response.data[0][i] != null) {
                                    size++
                                }
                            }
                            var data = response.data[0];
                            for (var i = 0; i < size; i++) {
                                if (data[i] == 0) {
                                    $("#conn_" + i + " > div > .indicator").css("color", "gray").text("Отключён");
                                } else if (data[i] == 3) {
                                    $("#conn_" + i + " > div > .indicator").css("color", "#489FD1").text("Подключается...");
                                } else if (data[i] == 2) {
                                    $("#conn_" + i + " > div > .indicator").css("color", "red").text("Ошибка регистрации");
                                } else if (data[i] == 1) {
                                    $("#conn_" + i + " > div > .indicator").css("color", "green").text("Подключён");
                                }
                            }
                        },
                        error: function (XMLHttpRequest, textStatus, errorThrown) {
                            myAlert(textStatus, errorThrown);
                        }
                    });
                });
                $("#current_connections > .collection > .collection-item:last-child .click_area").on('click', function () {
                    from_elem = $(this).parent();
                    if (from_elem.hasClass('right_cont')) {
                        from_elem = from_elem.parent();
                        $(this).parent().removeClass("active_item");
                    }
                    $(this).parent().parent().children(".active_item").removeClass("active_item");
                    if ($(this).parent().hasClass("active_item")) {
                        $(this).parent().removeClass("active_item");
                    } else {
                        $(this).parent().addClass("active_item");
                    }
                    $("#current_connections").hide();
                    $("#page_1").hide();
                    $("#domain").val("");
                    var from_uri = from_elem.children(".click_area").children(".accaunt_uri").text();
                    var from_pass = from_elem.children(".click_area").children(".accaunt_uri").attr("password");
                    var from_domain = from_elem.children(".click_area").children(".accaunt_uri").attr("domain");
                    $("#login + label").addClass("active");
                    $("#login").val(from_uri);
                    $("#password + label").addClass("active");
                    $("#password").val(from_pass);
                    $(".img_provider > img").attr("src", from_elem.children(".click_area").children(".povider_logo_cont").children().attr('src'));
                    $("#header_title").html("Редактирование SIP подключения<br/>" + from_elem.children(".click_area").children(".accaunt_uri").text());
                    $("#header_decription").text("Измените данные и нажмите сохранить");
                    $("#prev_button").show();
                    $("#done_button").hide();
                    $("#edit_connection").show();
                    if (from_elem.children(".click_area").children(".povider_logo_cont").children().attr('alt') == "Манго Телеком") {
                        $("#domain + label").addClass("active");
                        $("#domain").val(from_domain);
                        $("#domain").parent().show();
                    } else {
                        $("#domain + label").removeClass("active");
                        $("#domain").val("");
                        $("#domain").parent().hide();
                    }
                });
                $.ajax({
                    url: '/resourceData/settings',
                    method: 'get',
                    success: newSipConnection
                });
                $("#work_mode").show();
                $("#header_title").text("Мастер настроек");
                $("#sip_sett").click();
            }
        } else {
            myAlert("Внимание", "Поля логин и пароль должны быть заполнены!");
        }
    } else if ($("#current_connections").is(":visible")) {
        $("#header > div.col.s12.header_bottom").hide();
        $("#header_top > div > h1").hide();
        $("#done_button > a").text("Закрыть");
        $("#work_mode > .collection > .collection-item").removeClass("active_item");
        $("#current_connections").hide();
        $("footer > div.col.center-align.s6.pagination").removeClass("margin_right25");
        $("#next_button").hide();
        $("#prev_button").hide();
        $("#page_1").hide();
        $("#done_button").show();
        if (isInIframe) {
            $("#done_button").hide();
        }
        $("#work_mode").show();
        $("#header_title").text("Мастер настроек");

    }
}