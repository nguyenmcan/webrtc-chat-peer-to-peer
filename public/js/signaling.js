
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
    this.socket_io.on('created', function (user) {
        o.oncreated(user);
    });
    this.socket_io.on('joined', function (user) {
        o.onjoined(user);
    });
    this.socket_io.on('closed', function (user) {
        o.onclosed();
    });
    this.socket_io.emit('create or join', room, user);
}

WebRTCSignaling.prototype.onoffer = function (description) { }

WebRTCSignaling.prototype.onanswer = function (description) { }

WebRTCSignaling.prototype.oncandidate = function (candidate) { }

WebRTCSignaling.prototype.onjoined = function (user) { }

WebRTCSignaling.prototype.oncreated = function (user) { }

WebRTCSignaling.prototype.onclosed = function (user) { }

WebRTCSignaling.prototype.closeRTC = function () {
    this.socket_io.emit("close");
}

WebRTCSignaling.prototype.sendOffer = function (description) {
    var msgString = JSON.stringify({ "sdp": description });
    this.socket_io.emit("offer", msgString);
}

WebRTCSignaling.prototype.sendAnswer = function (description) {
    var msgString = JSON.stringify({ "sdp": description });
    this.socket_io.emit("answer", msgString);
}

WebRTCSignaling.prototype.sendCandidate = function (candidate) {
    var msgString = JSON.stringify({
        sdpMLineIndex: candidate.sdpMLineIndex,
        sdpMid: candidate.sdpMid,
        candidate: candidate.candidate
    });
    this.socket_io.emit("candidate", msgString);
}