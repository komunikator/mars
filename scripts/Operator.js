exports.src = function(self){
    self.session.rec({media_stream: true});
    var obj = {
        model: 'general', 
        to_sessionId: self.session.params[0]
    };
    if (self.session.params[1]) obj.developer_key = self.session.params[1]
    self.session.dialogOn({opt: obj});
    self.session.start_play({audioBuffer: self.session.params[0], streaming: true})
}