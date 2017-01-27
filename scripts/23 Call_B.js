exports.src = {
    mediaStream: true,
    play:  {audioBuffer: function(self){return self.session.params[0]}, streaming: true}
}
