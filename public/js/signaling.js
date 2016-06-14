
var WebRTCSignaling = function (socket) {
    this.socket_io = socket;
    this.connect = function (room, user) {
        this.socket_io.on('rtc-close', this.rtcClose);
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


//////////////////////////

signaling.rtccandidate = function (candidate) {
    webRTCClient.addIceCandidate(new RTCIceCandidate(candidate));
}

signaling.rtcclose = function (user) {
    onRTCClosed(user);
}

signaling.rtcoffer = function (offerSDP) {
    webRTCClient.createRTCConnection(servers);
    webRTCClient.addLocalStream(window.localStream);
    webRTCClient.createAnswer(offerSDP).then(function (answerSDP) {
        signaling.sendAnswer(answerSDP);
    });
}

signaling.rtcanswer = function (sdp) {
    webRTCClient.setRemoteDescription(new RTCSessionDescription(sdp));
}

signaling.onjoined = function (user, roomsize) {
    joinRoom(user, roomsize);
}

signaling.onleaved = function (user, roomsize) {
    leaveRoom(user, roomsize);
}