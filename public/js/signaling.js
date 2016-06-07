
var WebRTCSignaling = function (socket) {
    this.socket_io = socket;
}

WebRTCSignaling.prototype.connect = function (room, user) {
    var o = this;
    this.socket_io.on('rtc-close', function (user) {
        o.rtcclose(user);
    });
    this.socket_io.on('rtc-offer', function (message) {
        var msg = JSON.parse(message);
        o.rtcoffer(msg.sdp);
    });
    this.socket_io.on('rtc-answer', function (message) {
        var msg = JSON.parse(message);
        o.rtcanswer(msg.sdp);
    });
    this.socket_io.on('rtc-candidate', function (message) {
        var msg = JSON.parse(message);
        o.rtccandidate(msg);
    });
    this.socket_io.on('joined', function (user, roomsize) {
        o.onjoined(user, roomsize);
    });
    this.socket_io.on('leaved', function (user, roomsize) {
        o.onleaved(user, roomsize);
    });
    this.socket_io.emit('create or join', room, user);
}

WebRTCSignaling.prototype.rtcclose = function (description) { }

WebRTCSignaling.prototype.rtcoffer = function (description) { }

WebRTCSignaling.prototype.rtcanswer = function (description) { }

WebRTCSignaling.prototype.rtccandidate = function (candidate) { }

WebRTCSignaling.prototype.onjoined = function (user, roomsize) { }

WebRTCSignaling.prototype.onleaved = function (user, roomsize) { }

WebRTCSignaling.prototype.closeRTC = function () {
    this.socket_io.emit("rtc-close");
}

WebRTCSignaling.prototype.sendOffer = function (description) {
    var msgString = JSON.stringify({ "sdp": description });
    this.socket_io.emit("rtc-offer", msgString);
}

WebRTCSignaling.prototype.sendAnswer = function (description) {
    var msgString = JSON.stringify({ "sdp": description });
    this.socket_io.emit("rtc-answer", msgString);
}

WebRTCSignaling.prototype.sendCandidate = function (candidate) {
    var msgString = JSON.stringify({
        sdpMLineIndex: candidate.sdpMLineIndex,
        sdpMid: candidate.sdpMid,
        candidate: candidate.candidate
    });
    this.socket_io.emit("rtc-candidate", msgString);
}