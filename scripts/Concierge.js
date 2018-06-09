exports.src = function(self) {
    self.bus.on('playBuffer', (data) => {
        console.log(data);
    });
    self.session.rec({media_stream: true});
}