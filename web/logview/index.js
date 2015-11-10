module.exports = function (server, events) {
    var sockjs = require('sockjs');

// 1. Echo sockjs server
    var sockjs_opts = {/*sockjs_url: "http://cdn.jsdelivr.net/sockjs/1.0.1/sockjs.min.js"*/};
    function logger(severity, message) {
        if (severity == "error")
            console.log(message);
    }
    sockjs_opts.log = logger;
    var sockjs_server = sockjs.createServer(sockjs_opts);

    sockjs_server.on('connection', function (conn) {
        var filter;

        function format(str) {
            var match_;
            var regex_ = new RegExp('^(\\d.+\\d) Start script');
            match_ = str.match(regex_);
            if (match_)
                conn.write(match_[1] + ' Начало звонка');


            var regex_ = new RegExp('^(\\d.+\\d) Start play file "(.+)"');
            match_ = str.match(regex_);
            if (match_) {
                var list = match_[2].split(';');
                list.forEach(function (file) {
                    file = file.split('/');
                    conn.write(match_[1] + ' ' + file[file.length - 1].replace(/\_/g, ' ').replace('.wav', ''));
                })
            }

            var regex_ = new RegExp('^(\\d.+\\d) dtmf_key "(\\d)"');
            match_ = str.match(regex_);
            if (match_)
                conn.write(match_[1] + ' Вы нажали клавишу "' + match_[2] + '"');

            var regex_ = new RegExp('^(\\d.+\\d) dtmf_seq "(.+)"');
            match_ = str.match(regex_);
            if (match_)
                conn.write(match_[1] + ' Последовательность "' + match_[2] + '"');

            var regex_ = new RegExp('^(\\d.+\\d) stt_text "(.+)"');
            match_ = str.match(regex_);
            if (match_)
                conn.write(match_[1] + ' Вы произнесли текст "' + match_[2] + '"');

            var regex_ = new RegExp('^(\\d.+\\d) stt_seq "(.+)"');
            match_ = str.match(regex_);
            if (match_)
                conn.write(match_[1] + ' Фраза "' + match_[2] + '"');

            var regex_ = new RegExp('^(\\d.+\\d) Called send BYE');
            match_ = str.match(regex_);
            if (match_)
                conn.write(match_[1] + ' Вы завершили звонок');

        }
        ;
        conn.on('data', function (message) {

             var gdateS = require('dateformat')((function () {
                 var d = new Date();
                 d.setDate(d.getDate() - 30);//- 30 days 
                 return d;
             })(), "yyyy.mm.dd") + ' 00:00';
             var gdateE = require('dateformat')((function () {
                 var d = new Date();
                 d.setDate(d.getDate() + 1); 
                 return d;
             })(), "yyyy.mm.dd") + ' 00:00';


            events.getData({source: 'reportData',
                query: {search: JSON.stringify({gdate: gdateS+'|'+gdateE, pin: message}),
                    //start: 0, 
                    //limit: 1, 
                    //page: 1, 
                    sort: JSON.stringify([{property: 'gdate', direction: 'ASC'}])}
            },
            function (obj) {
                if (obj.data && obj.data.items)
                    obj.data.items.forEach(function (item_) {
                        var logs = item_ && item_.log && item_.log.split("\n") || [];
                        logs.forEach(function (str) {
                            format(str);
                        });
                    });
                events.getData({source: 'dialogData'}, function (obj) {
                if (obj.data)
                    for (var key in obj.data)
                        if (obj.data[key] && obj.data[key].meta && obj.data[key].meta.pin == message){
                            filter = key; 
                            obj.data[key].log && obj.data[key].log.forEach(function (str) {
                                    format(str);
                    	    });
                    	}
                });
              
	        events.on('message', onData);
            });
        });
        //console.log('sockJS user connection');
        function onData(data) {
            //conn.write(JSON.stringify(msg));
            if (filter && data.sessionID && data.sessionID == filter)
                //conn.write(require('dateformat')(Date.now(), 'yyyy.mm.dd HH:MM:ss.l') + data.msg.replace(/^\d+ \:/,''));
                format(require('dateformat')(Date.now(), 'yyyy.mm.dd HH:MM:ss.l') + data.msg.replace(/^\d+ \:/, ''));
        }
        conn.on('close', function (message) {
            //console.log('sockJS user close connection');
            events.removeListener('message', onData);
        });
    });

    sockjs_server.installHandlers(server, {prefix: '/logs'});

};