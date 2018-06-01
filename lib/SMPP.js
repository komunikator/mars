function init() { 
    var bus = require('./system/bus'),     
        config = bus.config;      
    
    var smpp = require('smpp'),     
        gsm = require('gsm');
        
    var logCategory = 'SMPP',
        smpp_conf = config.get("SMPP"),
        smpp_connect = config.get("SMPP_connections");        
    var session = {},
        sms = {};
    var smsc_logger = bus.getLogger('smsc');
        sms.logger = bus.getLogger('sms');
        pdu_logger = bus.getLogger('smpp');
    
    var input_msg_buffer = {};
    
    for(var server_name in smpp_conf) {
            session[server_name] = {};
            session[server_name].config = smpp_conf[server_name];
            session[server_name].connects = [];
            session[server_name].status = 'disable';
    }
    
    for(var key in smpp_connect) {
        if ( !smpp_connect[key].disable ) {
            let server = smpp_connect[key].smpp_out;            
            if ( session[server]) {
                session[server].connects.push(key);
                input_msg_buffer[smpp_connect[key].input] = {};                
            } else
                smsc_logger.error( 'Parametrs to connect [' + key + '] is incorrect ( ' + server + ' not found in config )');            
        }        
    }
    console.log(JSON.stringify(input_msg_buffer));    
    console.log(JSON.stringify(session));


    function createSMPP(server_name) {
        session[server_name].data = smpp.connect({  
                host: session[server_name].config.host,  
                port: session[server_name].config.port                
        });
        
        session[server_name].data.on('error', function(err) {
            smsc_logger.error(server_name + ' connect ' + err );
        });
        
        session[server_name].data.on('connect', function() {
            smsc_logger.debug(server_name + ' open connect');
            openSMPP(server_name);
        });

        session[server_name].data.on('close', function() {
            smsc_logger.warn(server_name + ' connect closed');
        });

        session[server_name].data.on('pause', function() {
            smsc_logger.warn(server_name + ' connect paused');
        });

        session[server_name].data.on('pdu', onData.bind({server_name:server_name}));
    }

    function openSMPP(server_name) {
        session[server_name].data.bind_transceiver({
            system_id: session[server_name].config.System_ID,
            password: session[server_name].config.password
        });        
    }

    
    function message_handler(pdu) {
       //console.log('Rcv ' + pdu.server_name + ' from  connection ' + JSON.stringify(session[pdu.server_name].connects));

       let from = pdu.source_addr.toString(),
            to = pdu.destination_addr.toString();
        
       switch (pdu.esm_class) {
            case 0:
                msgToScript();
                break;
            case 4:
                //console.log(pdu.server_name + ' rcv deliver_sm: ' + pdu.receipted_message_id);
                smsc_logger.debug( pdu.server_name + ' rcv deliver_sm: ' + pdu.receipted_message_id);
                break;
            case 64:
                udhMsg();
                break;
            default:
                smsc_logger.warn(this.server_name + ' unknow msg ems_class [' + pdu.ems_class + ']');
                break;
       }
   
        function udhMsg() {
            let seq_num = pdu.short_message.udh[3],
                part_num = pdu.short_message.udh[5];
            
            // let part = {};
            // part[part_num] = pdu.short_message.message;
            
            //console.log(JSON.stringify(parts));
            //console.log(typeof input_msg_buffer[to]);
           
            if ( typeof input_msg_buffer[to] == "object" ) {
                if ( typeof input_msg_buffer[to][from] == "undefined" ) { 
                    input_msg_buffer[to][from] = {};
                }
                if ( typeof input_msg_buffer[to][from][seq_num] == "undefined" ) { 
                    pdu.count = 0;
                    pdu.total = pdu.short_message.udh[4];                    
                    pdu.parts = new Array(pdu.total+1);                    
                    //pdu.message = new Buffer();
                    input_msg_buffer[to][from][seq_num] = {};
                    input_msg_buffer[to][from][seq_num] = pdu;
                }
                
                input_msg_buffer[to][from][seq_num].parts[part_num] = pdu.short_message.message;
                if ( ++input_msg_buffer[to][from][seq_num].count == input_msg_buffer[to][from][seq_num].total ) {
                    pdu.short_message.message =  input_msg_buffer[to][from][seq_num].parts.join('');
                    delete input_msg_buffer[to][from][seq_num];
                    msgToScript();
                    if (Object.keys(input_msg_buffer[to][from]).length == 0)
                        delete input_msg_buffer[to][from];
                }

            } else 
                smsc_logger.warn('Unknow recipent number [' + to + '] from server ' + pdu.server_name);
            

            //console.log(JSON.stringify(input_msg_buffer));                        
        }

        function msgToScript() { 
            let connects = [];
            for (var connect_name of session[pdu.server_name].connects) {
                if ( smpp_connect[connect_name].input == pdu.destination_addr.toString() ) {
                    connects.push(connect_name);
                }
            }

            if (connects.length > 0) {
                //console.log(JSON.stringify(connects));
                for (var connect_name of connects) {                    
                    let connect = `on_sms[` + connect_name + `]`;                    
                    bus.request('onEvent', { id: connect }, (err, data) => {
                        let req = {};
                        req.from = pdu.source_addr.toString();
                        req.to = pdu.destination_addr.toString();
                        req.content = pdu.short_message.message;
                        req.nameScript = data;
                        req.type = "sms";
                        req.server_name = pdu.server_name;
                        req.SMPP_connectionsID = connect_name;             
                        //console.log("input PDU: " + JSON.stringify(req));
                        bus.emit('on_message_add', req);
                    });
                }
            } else
                smsc_logger.warn('Msg from unknow SMPP handler from ' + pdu.destination_addr.toString() + ' to ' + pdu.destination_addr.toString());
        }
    }

    function onData(pdu) {
        //pdu_logger.debug(JSON.stringify(pdu));        
        switch (pdu.command) {
            case "enquire_link":
                session[this.server_name].data.send(pdu.response());
                smsc_logger.trace(this.server_name + ' enquire link');                
                break;
            case "enquire_link_resp":               
                smsc_logger.trace(this.server_name + ' enquire link resp');                
                break;
            case "deliver_sm":                
                session[this.server_name].data.deliver_sm_resp({ sequence_number: pdu.sequence_number });
                pdu.server_name = this.server_name;
                message_handler(pdu);                
                //smsc_logger.debug(this.server_name + ' rcv msg');
                break;
            case "submit_sm_resp":
                smsc_logger.debug(this.server_name + ' msg send');
                break;
            case "bind_transceiver_resp":
                if (pdu.command_status == 0) {
                    smsc_logger.info(this.server_name + ' connected to SMSC server');
                } else {
                    let time_to_reconect = 5000;
                    smsc_logger.error(this.server_name + ' not connected to SMSC server: ' + lookupPDUStatus(pdu.command_status));                 
                    setTimeout (openSMPP, time_to_reconect, this.server_name);
                }
                break;
            case "unbind":
                session[this.server_name].data.send(pdu.response());
                smsc_logger.warn(this.server_name + ' link to SMSC closed from Server');                
                break;
            case "unbind_resp":                
                smsc_logger.info(this.server_name + ' link to SMSC closed');                
                break;
            case "bind_transmitter_resp":
                if (pdu.command_status == 0) {
                    smsc_logger.info(this.server_name + ' tx connected to SMSC server');
                } else {
                    let time_to_reconect = 5000;
                    smsc_logger.error(this.server_name + ' not connected tx to SMSC server: ' + lookupPDUStatus(pdu.command_status));                 
                    setTimeout (openSMPP, time_to_reconect, this.server_name);
                }
                break;
            case "bind_receiver_resp":
                if (pdu.command_status == 0) {
                    smsc_logger.info(this.server_name + ' rx connected to SMSC server');
                } else {
                    let time_to_reconect = 5000;
                    smsc_logger.error(this.server_name + ' not connected rx to SMSC server: ' + lookupPDUStatus(pdu.command_status));                 
                    setTimeout (openSMPP, time_to_reconect, this.server_name);
                }
                break;
            case "alert_notification":
                smsc_logger.warn(this.server_name + ' msg alert ');
                break;
            case "cancel_sm_resp":alert_notification
                smsc_logger.warn(this.server_name + ' SMS send canceled');
                break;
            case "data_sm":
                smsc_logger.debug(this.server_name + ' data rcv');
                break;  
            case "data_sm_resp":
                smsc_logger.debug(this.server_name + ' data send');
                break;
            case "replace_sm_resp":
                smsc_logger.debug(this.server_name + ' SMS replaced');
                break;
            default:
                smsc_logger.warn(this.server_name + ' rcv unknow msg: ' + pdu.command);
                break;
        }
    }

    function lookupPDUStatus(pduCommandStatus) {
        for (var k in smpp.errors) {
          if (smpp.errors[k] == pduCommandStatus) {
            return k
          }
        }
    }

    function refreshconfigData() { 
        if (ChangeSMPP()) { 
            let smpp_conf = config.get("SMPP");  
            if (smpp_conf) {  
            } 
            for (var key in session.param) { 
                createSMPP(key);
            }
        } 
    
        function ChangeSMPP() { 
            try { 
                bus.emit('message', { type: 'info', msg: 'ChangeSMPP '}); 
                return true; 
            } catch (err) { 
                bus.emit('message', { type: 'error', msg: 'ChangeSMPP: '}); 
                return true; 
            } 
        } 
    }

    function chekData (data, cb) {
        //console.log(JSON.stringify(data));                        

        let conId = data.connect;

        data.server_name = smpp_connect[conId].smpp_out;        
        data.pdu = {
            source_addr: smpp_connect[conId].output,
            destination_addr: data.to,
            dest_addr_ton: 1,
            dest_addr_npi: 1,            
            registered_delivery:1
        };

        if (typeof data.pdu.source_addr == "number") {
            data.pdu.source_addr_npi = 1;
            if (data.pdu.source_addr == 11)
                data.pdu.source_addr_ton = 1;
            else
                data.pdu.source_addr_ton = 0;
        } else {
            data.pdu.source_addr_ton = 5;
            data.pdu.source_addr_npi = 0;
        }
        
        data.msg = gsm(data.message);
        switch (data.msg.char_set) {
            case 'GSM 03.38':
                data.pdu.data_coding = 0;
                break;
            case 'Unicode':
                data.pdu.data_coding = 8;
                break;
            default:
                bus.emit('message', { type: 'error', msg: 'Unknow message to SMS EnCoding: ' + data.message}); 
                return;
        }

        cb(data);
    }
    
    function send_queue(param) {        
        //console.log('Send SMS ' + JSON.stringify(param));
       if ( param.msg.sms_count > 1 ) {
            let concat_ref = 1,                     //add chek to message parts from SMPP
                part_id = 1,
                udh = new Buffer(6);
            
            udh.write(String.fromCharCode(0x5), 0);
            udh.write(String.fromCharCode(0x0), 1);
            udh.write(String.fromCharCode(0x3), 2);
            udh.write(String.fromCharCode(concat_ref), 3);
            udh.write(String.fromCharCode(param.msg.sms_count), 4);

            param.msg.parts.forEach(function(msg_part) {
                udh.write(String.fromCharCode(part_id++), 5);
                param.pdu.short_message = { udh:udh, message:msg_part };
                session[param.server_name].data.submit_sm(param.pdu);                
            });            
       } else {
            param.pdu.short_message = param.message;
            session[param.server_name].data.submit_sm(param.pdu);
       }
    }


    //sendSMS - работает??? через SIP
    bus.on('send_message', (req) => {
        chekData(req, send_queue);
    });

    
    // инверсная кривая логика!!!!!!!!!!!!!!!!!!!!!!!!!!!! (чисто для того чтобы было)
    bus.on('on_answer_message', (req) => {
        req.message = req.answer;
        req.to = req.from;
        req.connect = req.SMPP_connectionsID;
        
        chekData(req, send_queue);
    });

    bus.on('refresh', function(type) {     
        if (type === 'configData') 
               refreshconfigData(); 
    }); 
}

module.exports = init(); 