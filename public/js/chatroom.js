
var ChatRoom = function (socket) {
    this.socket_io = socket;
}

ChatRoom.prototype.connect = function (room, user) {
    var o = this;
    this.socket_io.emit('create-or-join', room, user);

    this.socket_io.on('joined', o.onjoined);

    this.socket_io.on('leaved', o.onleaved);

    this.socket_io.on('message', o.onmessage);

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
}

ChatRoom.prototype.onjoined = function (user, roomsize) { }

ChatRoom.prototype.onleaved = function (user, roomsize) { }

ChatRoom.prototype.onmessage = function (user, message) { }

ChatRoom.prototype.rtcclose = function (description) { }

ChatRoom.prototype.rtcoffer = function (description) { }

ChatRoom.prototype.rtcanswer = function (description) { }

ChatRoom.prototype.rtccandidate = function (candidate) { }

ChatRoom.prototype.closeRTC = function () {
    this.socket_io.emit("rtc-close");
}

ChatRoom.prototype.sendOffer = function (description) {
    var msgString = JSON.stringify({ "sdp": description });
    this.socket_io.emit("rtc-offer", msgString);
}

ChatRoom.prototype.sendAnswer = function (description) {
    var msgString = JSON.stringify({ "sdp": description });
    this.socket_io.emit("rtc-answer", msgString);
}

ChatRoom.prototype.sendCandidate = function (candidate) {
    var msgString = JSON.stringify({
        sdpMLineIndex: candidate.sdpMLineIndex,
        sdpMid: candidate.sdpMid,
        candidate: candidate.candidate
    });
    this.socket_io.emit("rtc-candidate", msgString);
}