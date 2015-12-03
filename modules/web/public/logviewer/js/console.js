var logList = document.getElementById('log-list')
var logText = document.getElementById('log-text')
var logWindow = document.getElementById('log-window')
var pinForm = document.getElementById('pin-form')
var pinHeader = document.getElementById('pin-header')
var inputPin = document.getElementById('inputPin')

var sockjs,toDo;
function newConn() {    
    sockjs = new SockJS('/logs');  
    sockjs.onopen = function (){
        console.log('[*] open');
        if (toDo)
            toDo();
    };
    sockjs.onclose = function() {
        console.log('[*] close');
    };
    
    sockjs.onmessage = function(e) {
        addItemToLog(e.data);
        //div.append($("<span>").text(e.data));
        //div.append($("<br>"));
        //div.scrollTop(div.scrollTop()+10000);
    };
}

newConn();

//var div  = $('#first div');
//var inp  = $('#first input');
//var form = $('#first form');

//inp.focus();

var print = function(m, p) {
    //p = (p === undefined) ? '' : JSON.stringify(p);
    div.append($("<span>").text(m + ' ' + p));
    div.append($("<br>"));
    div.scrollTop(div.scrollTop()+10000);
};

var submit = function(){
    toDo = function() {
        var code = inputPin.value;
        pinHeader.innerHTML = "И все это в реальном времени!<br>" + "Ваш PIN-код: " + code
        sockjs.send(code);
        inputPin.value = '';
        toDo = null;
        //return false;
    }
    if (sockjs.readyState!=1) 
        newConn();
    else
        toDo();
    return false;
}

function showLog(){
    logWindow.style.display = "block"
    pinForm.style.display = "none"
    console.dir(inputPin.value)
    submit()
}

function addItemToLog(text){
    /*
    var screenWidth = document.body.clientWidth - 15
    switch (true){
        case screenWidth >= 1700:
          var maxLength = 70
          break
        case screenWidth >=1400 && screenWidth < 1700:
          var maxLength = 60
          break
        case screenWidth >= 500 && screenWidth <1400:
          var maxLength = 40
          break
        case screenWidth < 500:
          var maxLength = 15
          break
        default:
          var maxLength = 40
    }
    console.log(screenWidth, maxLength, text.length)
    if (text.length > maxLength){
        t = text.split(' ')
        for (i = 0, n = 0, s = ''; i < t.length; i++){
            s += ' ' + t[i]
            if(s.length - n >= maxLength){
                n = s.length
                s += '<br>'
            }
        }
    } else{ s = text }
    */
    s = text
    var li = document.createElement('li')
    li.className = "log-list-item light white-text responsive-text"
    var liText = document.createElement('div')
    liText.innerHTML = '> ' + s
    li.appendChild(liText)
    logList.appendChild(li);
    logText.scrollTop = logList.scrollHeight
}


var i = 0;
var a3 = $('#a3');
var a4 = $('#a4');
  
for (i = 1; i < 11; i++) {      
    a3.append('<span class=a3'+i+'></span>');
    $('.a3'+i+'').css({
      '-webkit-animation' : 'a3 1s '+(Math.random()*2)+'s  infinite',
      '-moz-animation' : 'a3 1s '+(Math.random()*2)+'s  infinite'
    }); 
}
setInterval(function() {
    $('#a3 span').each(function() {
        $(this).text(Math.ceil(Math.random()*999));;
    });
}, 100); 
  
for (i = 1; i < 31; i++) {      
    a4.append('<span class=a3'+i+'></span>');
    setInterval(function() {
      $('#a4 span').each(function() {
        $(this).width((Math.random()*15));
      });
    }, 500);    
}