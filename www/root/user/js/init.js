var hostname = window.location.hostname;
var port = window.location.port;
var cur_acc_list=[];
var cur_speech_recognize;
var cur_speech_sintez;
var ivona_sett;
var from_elem;
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
    $("#next_button").css("display","none");
    $("#prev_button").css("display","none");
    $("footer > div.col.center-align.s6.pagination").removeClass("margin_right25");
    $("#work_mode").show();
    $("#done_button").css("display","block");
    $("#page_1, #page_2, #page_3").hide();
    $("#header_title").text("Мастер настройки");
    // $("#header_decription").text("Выберите режим работы мастера настройки");
    $("#header > div.col.s12.header_bottom").hide();
    $("#header_top > div > h1").hide();
    $("#done_button > a").text("Закрыть");
    $("#sintez_fields").hide();
}

$(document).ready(function() {
    //$("#page_4:before").hide();
    $('select').material_select();
    init_master();
    getProvidersList();
    getAccountsList();
    
});

function getUrlVars()
{
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

function docss(name)
{
    var st = document.createElement("link");
    st.setAttribute("rel", "stylesheet");
    st.setAttribute("href", "css/" + name);
    document.getElementsByTagName("head")[0].appendChild(st)
}

function myAlert(header,text) {
    $("#my_alert > div.modal-content > h4").text(header);
    $("#my_alert > div.modal-content > p").text(text);
    $('#my_alert').openModal();
}

function getAccountsList() {
    $.get("http://" + hostname + ":" + port + "/resourceData/settings", function(returnedData) {
        if (returnedData && returnedData.data && returnedData.data[0] && returnedData.data[0].value) {
            cur_acc_list = jQuery.parseJSON(returnedData.data[0].value).sipAccounts;
            cur_speech_recognize = jQuery.parseJSON(returnedData.data[0].value).recognize;
            cur_speech_sintez = jQuery.parseJSON(returnedData.data[0].value).def_tts;
            ivona_sett = jQuery.parseJSON(returnedData.data[0].value).ivona_speech;
            createConnections();
        }
    });
}

function createConnections() {
    
    var img_src, img_alt;
    for (var i=0; i < cur_acc_list.length; i++){
        img_src = getImgSipConnection(cur_acc_list[i].host);
        img_alt = getNameProvConnection(cur_acc_list[i].host);
        if (img_src && img_alt) {
            $("#current_connections > .collection").append(
                '<li id="conn_'+i+'" class="collection-item with_del">'+
                    '<div class="left povider_logo_cont">'+
                        '<img src="'+img_src+'" alt="'+img_alt+'" class="provider_logo">'+
                    '</div>'+
                    '<span class="title accaunt_uri" password="'+cur_acc_list[i].password+'">'+cur_acc_list[i].user+'</span>'+
                    '<a href="javascript:void(0)" class="">'+
                        '<img src="images/pencil.png" alt="edit" class="currents_icon edit_icon">'+
                    '</a>'+
                    '<a href="javascript:void(0)" class="del_btn">'+
                        '<img src="images/delete.png" alt="del" class="currents_icon del_icon">'+
                    '</a>'+
                '</li>'
            );
        }else{
            $("#current_connections > .collection").append(
                '<li id="conn_'+i+'" class="collection-item with_del">'+
                    '<div class="left povider_logo_cont">'+
                        '<img src="images/favicon.png" alt="provider" class="provider_logo">'+
                    '</div>'+
                    '<span class="title accaunt_uri" password="'+cur_acc_list[i].password+'">'+cur_acc_list[i].user+'</span>'+
                    '<a href="javascript:void(0)" class="">'+
                        '<img src="images/pencil.png" alt="edit" class="currents_icon edit_icon">'+
                    '</a>'+
                    '<a href="javascript:void(0)" class="del_btn">'+
                        '<img src="images/delete.png" alt="del" class="currents_icon del_icon">'+
                    '</a>'+
                '</li>'
            );
        }
    }

    $("#sip_sett").on('click',function() {
        $("#header > div.col.s12.header_bottom").show();
        $("#header_top > div > h1").show();
        $("#done_button > a").text("Готово");
        $("#work_mode").hide();
        $("#done_button").show();
        $("#prev_button").hide();
        $("#current_connections").show();
        //$("footer > div.col.center-align.s6.pagination").addClass("margin_right25");
        // $("#prev_button").show();
        $("#header_title").text("Ваши текущие Sip подключения");
        $("#header_decription").text("Вы можете отредактировать ваши Sip подключения, или добавить новые");
        $("#page_1").show();
        if ($("#current_connections > ul li").size() == 0){
            $("#add_conn_btn").click();
        }
    });

    $("#speech_sett").on('click',function() {
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
        //$("#page_4").show();
        if ($("#speech_recognize > ul li").size() == 1){
            $("#speech_recognize > ul li").addClass("active_item");
            $("#next_button").click();
            if (cur_speech_recognize){
                $("#key + label").addClass("active");
                $("#key").val(cur_speech_recognize.options.developer_key);
            }
            if (cur_speech_sintez){
                $("#voice_choose > div > form > div > div:nth-child(2) > div > select").val(cur_speech_sintez);
                $("#voice_choose > div > form > div > div:nth-child(2) > div > input").val($('#voice_choose > div > form > div > div:nth-child(2) > div > select option[value="'+cur_speech_sintez+'"]').text());
                if ($("#voice_choose > div > form > div > div.input-field.col.s12 > div > select").val() == "ivona"){
                    $("#sintez_fields").show();
                    if (ivona_sett.accessKey){
                        $("#access_key_sintez + label").addClass("active");
                        $("#access_key_sintez").val(ivona_sett.accessKey);
                    }
                    if (ivona_sett.secretKey){
                        $("#secret_key_sintez + label").addClass("active");
                        $("#secret_key_sintez").val(ivona_sett.secretKey);
                    }
                }else{
                    $("#sintez_fields").hide();
                };
            }
        }
    });


    $("#next_button").on('click', function() {
        if ($("#provider_choose").is(":visible")){
            if ($("#provider_choose > .collection > .collection-item").hasClass("active_item")){
                $("#provider_choose").hide();
                $("#next_button").hide();
                $("#done_button").show();
                $("#header_title").html("Настройки Sip подключения<br/>"+$("#provider_choose > .collection > .collection-item.active_item > span.title").text());
                if ($("#provider_choose > .collection > .collection-item.active_item > span.title").text() == "Мегафон"){
                    $("#enter_login_password > div > form > span").hide();
                }else {
                    $("#enter_login_password > div > form > span").show();
                }
                $("#header_decription").html("Введите данные вашего Sip аккаунта");
                $("#enter_login_password").show();
                $("#page_3").show();
            } else {
                myAlert("Внимание","Вы не выбрали ни один из представленных провайдеров");
            }
        // } else if ($("#enter_login_password").is(":visible")){
        //     $("#enter_login_password").hide();
        //     $("#header_title").html("Распознавание и синтез речи");
        //     $("#header_decription").text("Выберите предложенный сервис синтеза и распознавания речи");
        //     $("#speech_recognize").show();
        //     $("#page_4").show();
        } else if ($("#speech_recognize").is(":visible")){
            if ($("#speech_recognize > .collection > .collection-item").hasClass("active_item")){
                $("#speech_recognize").hide();
                $("#next_button").hide();
                $("#done_button").show();
                $("#header_title").html("Настройки сервиса распознавания и синтез речи");
                $("#header_decription").text("Введите ключ сервиса и выберите голос");
                $("#voice_choose").show();
                //$("#page_5").show();
            } else {
                myAlert("Внимание","Вы не выбрали ни один из представленных сервисов");
            };
        } 
    });

    $("#prev_button").on('click', function() {
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
            $("#work_mode").show();
            $("#header_title").text("Мастер настройки");
            // $("#header_decription").text("Выберите режим работы мастера настройки");
        } else if ($("#provider_choose").is(":visible")){
            $("#provider_choose").hide();
            $("#next_button").hide();
            $("#done_button").show();
            $("#prev_button").hide();
            $("#provider_choose > ul > .active_item").removeClass("active_item");
            //$("footer > div.col.center-align.s6.pagination").addClass("margin_right25");
            $("#current_connections").show();
            $("#page_2").hide();
            $("#header_title").text("Ваши текущие Sip подключения");
            $("#header_decription").text("Вы можете отредактировать ваши Sip подключения, или добавить новые");
        } else if ($("#enter_login_password").is(":visible")){
            $("#enter_login_password").hide();
            $("#next_button").show();
            $("#done_button").hide();
            $("#enter_login_password > div > form").trigger('reset');
            $("#provider_choose").show();
            $("#page_3").hide();
            $("#header_title").text("Выбор Sip провайдера");
            $("#header_decription").text("Выберите вашего Sip провайдера");
        } else if ($("#speech_recognize").is(":visible")){
            $("#header > div.col.s12.header_bottom").hide();
            $("#header_top > div > h1").hide();
            $("#done_button > a").text("Закрыть");
            $("#work_mode > .collection > .collection-item").removeClass("active_item");
            $("#speech_recognize").hide();
            $("#next_button").hide();
            $("#prev_button").hide();
            //$("#page_4").hide();
            $("#speech_recognize > ul > .active_item").removeClass("active_item");
            $("#done_button").show();
            $("#work_mode").show();
            $("#header_title").text("Мастер настройки");
            // $("#header_decription").text("Выберите режим работы мастера настройки");
        } else if ($("#voice_choose").is(":visible")){
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
        } else if ($("#edit_connection").is(":visible")){
            $("#edit_connection").hide();
            $("#page_1").show();
            $("#header_title").text("Ваши текущие Sip подключения");
            $("#header_decription").text("Вы можете отредактировать ваши Sip подключения, или добавить новые");
            from_elem.removeClass("active_item");
            $("#edit_connection > div >form").trigger( 'reset' );
            $("#current_connections").show();
        }
    });

    $("#add_conn_btn").on('click', function() {
        $("#current_connections").hide();
        $("footer > div.col.center-align.s6.pagination").removeClass("margin_right25");
        $("#header_title").text("Выбор Sip провайдера");
        $("#header_decription").text("Выберите вашего Sip провайдера");
        $("#done_button").hide();
        $("#prev_button").show();
        $("#next_button").show();
        $("#next_button > a").hide();
        $("#provider_choose").show();
        $("#page_2").show();
    });

    $("#done_button").on('click', function() {
        if ($("#voice_choose").is(":visible")){
            if ($("#voice_choose > div > form > div > div.input-field.col.s12 > div > select").val() == "ivona" && !$("#secret_key_sintez").val() && !$("#access_key_sintez").val()){
                myAlert("Внимание","Поля ключей синтеза Ivona должны быть заполнены");
            }else{
                $("#header > div.col.s12.header_bottom").hide();
                $("#header_top > div > h1").hide();
                $("#done_button > a").text("Закрыть");
                $("#work_mode > .collection > .collection-item").removeClass("active_item");
                $("#voice_choose").hide();
                $("#prev_button").hide();
                //$("#page_4").hide();
                // $("#speech_recognize > ul > .active_item").removeClass("active_item");
                // $("#voice_choose > div > form").trigger('reset');
                $("#sintez_fields").hide();
                $("#work_mode").show();
                $("#header_title").text("Мастер настройки");

                $.ajax({
                url: '/resourceData/settings',
                method: 'get',
                success: function (response) {
                    var data = jQuery.parseJSON(response.data[0].value);
                    data.recognize.options.developer_key = $("#key").val();
                    cur_speech_recognize.options.developer_key = $("#key").val();
                    if ($("#voice_choose > div > form > div > div.input-field.col.s12 > div > select").val() == "ivona"){
                        data.def_tts = "ivona";
                        cur_speech_sintez = "ivona";
                        data.ivona_speech.accessKey = $("#access_key_sintez").val();
                        data.ivona_speech.secretKey = $("#secret_key_sintez").val();
                        ivona_sett.accessKey = $("#access_key_sintez").val();
                        ivona_sett.secretKey = $("#secret_key_sintez").val();
                    }else{
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
                            $.get("http://" + hostname + ":" + port + "/resourceData/settings", function() {
                                $("#speech_recognize > ul > .active_item").removeClass("active_item");
                                $("#voice_choose > div > form").trigger('reset');
                            });
                        }
                    });
                }
            }); 

            };
                
                // $("#header_decription").text("Выберите режим работы мастера настройки");
            // } else {
            //     myAlert("Внимание","Поле ключ должно быть заполнено и голос должен быть выбран");
            // };   
        } else
        if ($("#enter_login_password").is(":visible")){
            if ($("#enter_login").val() && $("#enter_password").val()){
                $("#header > div.col.s12.header_bottom").hide();
                $("#header_top > div > h1").hide();
                $("#done_button > a").text("Закрыть");
                $("#work_mode > .collection > .collection-item").removeClass("active_item");
                $("#enter_login_password").hide();
                $("#prev_button").hide();
                $("#page_1, #page_2, #page_3").hide();
                var prov_name = $("#provider_choose > ul > li.collection-item.active_item > div > img").attr("alt");
                var prov_img = $("#provider_choose > ul > li.collection-item.active_item > div > img").attr("src");
                var prov_url = $("#provider_choose > ul > li.collection-item.active_item > div > img").attr("url");
                $("#current_connections > .collection").append(
                    '<li id="conn_'+cur_acc_list.length+'" class="collection-item with_del">'+
                        '<div class="left povider_logo_cont">'+
                            '<img src="'+prov_img+'" alt="'+prov_name+'" class="provider_logo">'+
                        '</div>'+
                        '<span class="title accaunt_uri" password="'+$("#enter_password").val()+'">'+$("#enter_login").val()+'</span>'+
                        '<a href="javascript:void(0)" class="">'+
                            '<img src="images/pencil.png" alt="edit" class="currents_icon edit_icon">'+
                        '</a>'+
                        '<a href="javascript:void(0)" class="del_btn">'+
                            '<img src="images/delete.png" alt="del" class="currents_icon del_icon">'+
                        '</a>'+
                    '</li>'
                );
                $("#current_connections > .collection > .collection-item:last-child > .del_btn").on('click', function() {
                    var tmp_id = $(this).parent().attr("id").substr(5);
                   
                    var del_index = tmp_id; 
                    $("#conn_"+del_index).remove();
                    cur_acc_list.splice(del_index,1);
                    $.ajax({
                        url: '/resourceData/settings',
                        method: 'get',
                        success: function (response) {
                            var data = jQuery.parseJSON(response.data[0].value);
                            data.sipAccounts.splice(del_index, 1);
                            response.data[0].create = false;
                            response.data[0].name = 'config/config';
                            response.data[0].value = JSON.stringify(data, null, 4);
                            $.ajax({
                                url: "/resourceData/update",
                                method: 'put',
                                data: response.data[0],
                                success: function (response) {
                                    $.get("http://" + hostname + ":" + port + "/resourceData/settings", function() {
                                        var next_ind = parseInt(del_index)+1;
                                        var iterator = $("#conn_"+next_ind);
                                        while (tmp_id != cur_acc_list.length){
                                            console.log(iterator.next().attr("id"));
                                            iterator.attr("id", "conn_"+tmp_id);
                                            iterator = iterator.next();
                                            tmp_id++;
                                        }
                                        
                                    });
                                }
                            });
                        }
                    });   
                });
                $("#current_connections >.collection > .collection-item:last-child").on('click',function() {
                    $(this).parent().children(".active_item").removeClass("active_item");
                    if ($(this).hasClass("active_item")){
                        $(this).removeClass("active_item");
                    }else{
                        $(this).addClass("active_item");
                    }
                    $("#current_connections").hide();
                    $("#page_1").hide();
                    from_elem = $(this);
                    var from_uri = from_elem.children(".accaunt_uri").text();
                    var from_pass = from_elem.children(".accaunt_uri").attr("password");
                    $("#login + label").addClass("active");
                    $("#login").val(from_uri);
                    $("#password + label").addClass("active");
                    $("#password").val(from_pass);
                    $("#header_title").html("Редактирование Sip подключения<br/>"+from_elem.children(".accaunt_uri").text());
                    $("#header_decription").text("Измените данные и нажмите сохранить");
                    $("#done_button").hide();
                    $("#edit_connection").show();
                });
                $.ajax({
                    url: '/resourceData/settings',
                    method: 'get',
                    success: newSipConnection
                });
                
                //$("#enter_login_password > div > form").trigger('reset');
                $("#work_mode").show();
                $("#header_title").text("Мастер настройки");
                // $("#header_decription").text("Выберите режим работы мастера настройки");
                $("#sip_sett").click();
            } else {
                myAlert("Внимание","Поля логин и пароль должны быть заполнены!");
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
            $("#work_mode").show();
            $("#header_title").text("Мастер настройки");
            // $("#header_decription").text("Выберите режим работы мастера настройки");
        } else if ($("#work_mode").is(":visible")) {
            window.location = '../../';
        }
    });

    $(".del_btn").on('click',function() {
        var tmp_id = $(this).parent().attr("id").substr(5);
        var del_index = tmp_id;
        $("#conn_"+del_index).remove();
        cur_acc_list.splice(del_index,1);
        $.ajax({
            url: '/resourceData/settings',
            method: 'get',
            success: function (response) {
                var data = jQuery.parseJSON(response.data[0].value);
                data.sipAccounts.splice(del_index, 1);
                response.data[0].create = false;
                response.data[0].name = 'config/config';
                response.data[0].value = JSON.stringify(data, null, 4);
                $.ajax({
                    url: "/resourceData/update",
                    method: 'put',
                    data: response.data[0],
                    success: function (response) {
                        $.get("http://" + hostname + ":" + port + "/resourceData/settings", function() {
                            var next_ind = parseInt(del_index)+1;
                            var iterator = $("#conn_"+next_ind);
                            console.log(iterator);
                            while (tmp_id != cur_acc_list.length){
                                iterator.attr("id", "conn_"+tmp_id);
                                iterator = iterator.next();
                                tmp_id++;
                            } 
                        });
                    }
                });
            }
        }); 
    });

    $(".collection > .collection-item").on('click',function() {
        $(this).parent().children(".active_item").removeClass("active_item");
        if ($(this).hasClass("active_item")){
            $(this).removeClass("active_item");
        }else{
            $(this).addClass("active_item");
            if ($(this).parent().parent().attr("id") == "provider_choose"){
                $("#next_button > a").show();
            }
        }
    });
    $("#current_connections > .collection > .collection-item").on('click',function() {
        $("#current_connections").hide();
        $("#page_1").hide();
        from_elem = $(this);
        var from_uri = from_elem.children(".accaunt_uri").text();
        var from_pass = from_elem.children(".accaunt_uri").attr("password");
        $("#login + label").addClass("active");
        $("#login").val(from_uri);
        $("#password + label").addClass("active");
        $("#password").val(from_pass);
        $("#header_title").html("Редактирование Sip подключения<br/>"+from_elem.children(".accaunt_uri").text());
        $("#header_decription").text("Измените данные и нажмите сохранить");
        $("#done_button").hide();
        $("#edit_connection").show();
    });

    $("#save_conn_btn").on('click', function() {
        if ($("#login").val() && $("#password").val()){
            $("#edit_connection").hide();
            $("#page_1").show();
            $("#prev_button").hide();
            $("#done_button").show();
            $("#header_title").text("Ваши текущие Sip подключения");
            $("#header_decription").text("Вы можете отредактировать ваши Sip подключения, или добавить новые");
            var from_uri = from_elem.children(".accaunt_uri").text();

            $.ajax({
                url: '/resourceData/settings',
                method: 'get',
                success: recordSipConnection
            });
            from_elem.children(".accaunt_uri").text($("#login").val());
            from_elem.children(".accaunt_uri").attr("password",$("#password").val());
            
            $("#current_connections").show();
        } else {
            myAlert("Внимание","Поля логин и пароль должны быть заполнены!");
        }
    });

    $("#voice_choose > div > form > div > div.input-field.col.s12 > div > select").on('change',function() {
        if ($("#voice_choose > div > form > div > div.input-field.col.s12 > div > select").val() == "ivona"){
            $("#sintez_fields").show();
        }else{
            $("#sintez_fields").hide();
        };
    });

    $("#page_1").on('click', function() {
        if ($("#provider_choose").is(":visible")){
            $("#prev_button").click();
        } else if ($("#enter_login_password").is(":visible")){
            $("#prev_button").click();
            $("#prev_button").click();
        }
    });
    $("#page_2").on('click', function() {
        if ($("#enter_login_password").is(":visible")){
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
    cur_acc_list[cur_acc_list.length] = sipAccount;
    var idSipRecord = cur_acc_list.length-1;
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
            $.get("http://" + hostname + ":" + port + "/resourceData/settings", function() {
                $("#provider_choose > ul > .active_item").removeClass("active_item");
                $("#enter_login_password > div > form").trigger('reset');
            });
        }
    });
}

function recordSipConnection(response) {
    var data = jQuery.parseJSON(response.data[0].value);
    var login = $("#login").val();
    var pass = $("#password").val();
    var host = getHostSipConnection(from_elem.children().children().attr("alt"));
    var domain = getDomainSipConnection(from_elem.children().children().attr("alt"));
    var idSipRecord = from_elem.attr('id').substr(5);
    var sipAccount = {
        host: host,
        expires: 60,
        user: login,
        password: pass,
        disable: 1
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
            $.get("http://" + hostname + ":" + port + "/resourceData/settings", function() {
                from_elem.removeClass("active_item");
                $("#edit_connection > div >form").trigger( 'reset' );
            });
        }
    });
}

// getProvidersList();
//             $("#accordion").accordion();
//             var availableTags = [
//                 "ActionScript",
//                 "AppleScript",
//                 "Asp",
//                 "BASIC",
//                 "C",
//                 "C++",
//                 "Clojure",
//                 "COBOL",
//                 "ColdFusion",
//                 "Erlang",
//                 "Fortran",
//                 "Groovy",
//                 "Haskell",
//                 "Java",
//                 "JavaScript",
//                 "Lisp",
//                 "Perl",
//                 "PHP",
//                 "Python",
//                 "Ruby",
//                 "Scala",
//                 "Scheme"
//             ];
//             $("#autocomplete").autocomplete({
//                 source: availableTags
//             });
//             $("#button").button();
//             $("#button-login-ok").button();
//             $("#radioset").buttonset();
//             $("#tabs").tabs();
//             $("#user-master-form").dialog({
//                 autoOpen: false,
//                 width: 450,
//                 modal: true, //inactive background
//                 buttons: [
//                     {
//                         id: "next_button",
//                         class: "next_text",
//                         click: function () {
//                             if ($('#choice-page').is(":visible")) {
//                                 var elements = document.getElementsByName("provider");
//                                 var check = false;
//                                 for (var i = 0; i < elements.length; i++) {
//                                     if (elements[i].checked) {
//                                         check = true;
//                                         idProvider = elements[i].id;
//                                         break;
//                                     }
//                                 }
//                                 if (check) {
//                                     $("#choice-page").hide();
//                                     $("#next_button").removeClass("next_text");
//                                     $("#next_button").addClass("ready_text");
//                                     $("#enterData-page").show();
//                                 } else
//                                 {
//                                     alert("Choice something");
//                                 }
//                             }
//                             else if ($('#enterData-page').is(":visible")) {
//                                 var sipLogin = $("#userSipName").val();
//                                 var sipPass = $("#userSipPassword").val();
//                                 if (sipLogin == "" || sipPass == "") {
//                                     alert("Check whether all the fields are filled");
//                                 }
//                                 else {
//                                     actionSipConnection();
//                                     $(this).dialog("close");
//                                     $("#choice-page").show();
//                                     $("#enterData-page").hide();
//                                     $("#next_button").removeClass("ready_text");
//                                     $("#next_button").addClass("next_text");
//                                 }
//                             }
//                         }
//                     },
//                     {
//                         class: "cancel_text",
//                         click: function () {
//                             idSipRecord = null;
//                             idProvider = null;
//                             $("#userSipName").val('');
//                             $("#userSipPassword").val('');
//                             $(this).dialog("close");
//                             $("#choice-page").show();
//                             $("#enterData-page").hide();
//                         }
//                     }
//                 ]
//             });
//             $("#question-shour-form").dialog({
//                 autoOpen: false,
//                 width: 350,
//                 modal: true, //inactive background
//                 buttons: [
//                     {
//                         id: "yes_button",
//                         class: "yes_text",
//                         click: function () {
//                             $.ajax({
//                                 url: '/resourceData/settings',
//                                 method: 'get',
//                                 success: function (response) {
//                                     var data = jQuery.parseJSON(response.data[0].value);
//                                     data.sipAccounts.splice(idSipRecord, 1);
//                                     response.data[0].create = false;
//                                     response.data[0].name = 'config/config';
//                                     response.data[0].value = JSON.stringify(data, null, 4);
//                                     $.ajax({
//                                         url: "/resourceData/update",
//                                         method: 'put',
//                                         data: response.data[0],
//                                         success: function (response) {
//                                             $.get("http://" + hostname + ":" + port + "/resourceData/settings", displaySipTable);
//                                         }
//                                     });
//                                     idSipRecord = null;
//                                     idProvider = null;
//                                 }
//                             });
//                             $(this).dialog("close");
//                         }
//                     },
//                     {
//                         class: "no_text",
//                         click: function () {
//                             idSipRecord = null;
//                             idProvider = null;
//                             $(this).dialog("close");
//                         }
//                     }
//                 ]
//             });
// // Link to open the dialog
//             $("#add-sipconnect").click(function (event) {
//                 idSipRecord = null;
//                 $("#user-master-form").dialog("open");
//                 event.preventDefault();
//             });
//             $("#datepicker").datepicker({
//                 inline: true
//             });
//             $("#slider").slider({
//                 range: true,
//                 values: [17, 67]
//             });
//             $("#progressbar").progressbar({
//                 value: 20
//             });
//             $("#spinner").spinner();
//             $("#menu").menu();
//             $("#tooltip").tooltip();
//             $("#selectmenu").selectmenu();
//             $("#add-sipconnect, #icons li").hover(
//                     function () {
//                         $(this).addClass("ui-state-hover");
//                     },
//                     function () {
//                         $(this).removeClass("ui-state-hover");
//                     }
//             );