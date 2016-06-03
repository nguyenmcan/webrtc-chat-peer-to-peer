
var WebRTCSignaling = function (socket) {
    this.socket_io = socket;
}

WebRTCSignaling.prototype.connect = function (room, user) {
    var o = this;
    this.socket_io.on('offer', function (message) {
        var msg = JSON.parse(message);
        o.onoffer(msg.sdp);
    });
    this.socket_io.on('answer', function (message) {
        var msg = JSON.parse(message);
        o.onanswer(msg.sdp);
    });
    this.socket_io.on('candidate', function (message) {
        var msg = JSON.parse(message);
        o.oncandidate(msg);
    });
    this.socket_io.on('joined', function (user) {
        o.onjoined(user);
    });    
    this.socket_io.on('closed', function (user) {
        o.onclose();
    });
    this.socket_io.emit('create or join', room, user);
}

WebRTCSignaling.prototype.onoffer = function (description) { }

WebRTCSignaling.prototype.onjoined = function (user) { }

WebRTCSignaling.prototype.onclose = function () { }

WebRTCSignaling.prototype.onanswer = function (description) { }

WebRTCSignaling.prototype.oncandidate = function (candidate) { }

WebRTCSignaling.prototype.sendOffer = function (description) {
    var msgString = JSON.stringify({ "sdp": description });
    this.socket_io.emit("offer", msgString);
}

WebRTCSignaling.prototype.sendAnswer = function (description) {
    var msgString = JSON.stringify({ "sdp": description });
    this.socket_io.emit("answer", msgString);
}

WebRTCSignaling.prototype.closeConnect = function () {
    this.socket_io.emit("rtc-close");
}

WebRTCSignaling.prototype.sendCandidate = function (candidate) {
    var msgString = JSON.stringify({
        sdpMLineIndex: candidate.sdpMLineIndex,
        sdpMid: candidate.sdpMid,
        candidate: candidate.candidate
    });
    this.socket_io.emit("candidate", msgString);
}