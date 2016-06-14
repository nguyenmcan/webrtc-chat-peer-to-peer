var WebRTCClient = function (signaling) {
    this.signaling = signaling;
    this.rtcConnection = undefined;
    this.sendDataChannel = undefined;
    this.receiveDataChannel = undefined;

    this.signaling.eventHandler('rtc-connect', this.rtcClose);
    this.signaling.eventHandler('rtc-close', this.rtcClose);
    this.signaling.eventHandler('rtc-offer', this.rtcOffer);
    this.signaling.eventHandler('rtc-answer', this.rtcAnswer);
    this.signaling.eventHandler('rtc-candidate', this.rtcCandidate);

    this.initRTCConnection = function (servers, constraints) {
        this.rtcConnection = new RTCPeerConnection(servers, constraints);
        this.rtcConnection.onicecandidate = this.onIceCandidate;
        this.rtcConnection.onaddstream = this.addRemoteStream;
        trace('Init RTC connection!');
    }
}

WebRTCClient.prototype.createOffer = function () {
    this.rtcConnection.createOffer().then(function (offerSDP) {
        this.rtcConnection.setLocalDescription(offerSDP);
        var msgString = JSON.stringify({ "sdp": offerSDP });
        this.signaling.emit("rtc-offer", msgString);
    }.bind(this));
}

WebRTCClient.prototype.createAnswer = function (offerSDP) {
    this.rtcConnection.setRemoteDescription(new RTCSessionDescription(offerSDP));
    this.rtcConnection.createAnswer().then(function (answerSDP) {
        this.rtcConnection.setLocalDescription(answerSDP);
        var msgString = JSON.stringify({ "sdp": answerSDP });
        this.signaling.emit("rtc-answer", msgString);
    }.bind(this));
}

WebRTCClient.prototype.addStream = function (stream) {
    this.rtcConnection.addStream(stream);
}

WebRTCClient.prototype.removeStream = function (stream) {
    this.rtcConnection.removeStream(stream);
}

WebRTCClient.prototype.closeRTCConnection = function () {
    if (this.rtcConnection) {
        this.rtcConnection.close();
        this.signaling.emit("rtc-close");
    }
}

WebRTCClient.prototype.addIceCandidate = function (cadidate) {
    this.rtcConnection.addIceCandidate(cadidate);
}

WebRTCClient.prototype.onIceCandidate = function (event) {
    if (event.candidate) {
        var msgString = JSON.stringify({
            sdpMLineIndex: event.candidate.sdpMLineIndex,
            sdpMid: event.candidate.sdpMid,
            candidate: event.candidate.candidate
        });
        this.signaling.emit("rtc-candidate", msgString);
        trace("onIceCandidate: " + event.candidate.candidate);
    } else {
        trace("End of candidates." + event);
    }
}

WebRTCClient.prototype.rtcConnect = function (user) {
}

WebRTCClient.prototype.rtcClose = function (user) {
}

WebRTCClient.prototype.addRemoteStream = function (event) {
}

WebRTCClient.prototype.rtcOffer = function (message) {
}

WebRTCClient.prototype.rtcAnswer = function (message) {
}

WebRTCClient.prototype.rtcCandidate = function (message) {
}

// RTCDataChannel

WebRTCClient.prototype.createDataChannel = function (event) {
    this.sendDataChannel = this.rtcConnection.createDataChannel("sendDataChannel", { reliable: true });
    this.sendDataChannel.binaryType = 'arraybuffer';
    this.sendDataChannel.onopen = onDataChannelChangeState;
    this.sendDataChannel.onclose = onDataChannelChangeState;
    var onDataChannelChangeState = function (event) {
        var readyState = this.sendDataChannel.readyState;
        trace('Receive channel state is: ' + readyState);
    }
    trace("Create rtc data channel!");
}

WebRTCClient.prototype.onDataChannel = function (event) {
    this.receiveDataChannel = event.channel;
    this.receiveDataChannel.binaryType = 'arraybuffer';
    this.receiveDataChannel.onmessage = this.onReceiveMessageCallback;
    this.receiveDataChannel.onopen = onDataChannelChangeState;
    this.receiveDataChannel.onclose = onDataChannelChangeState;
    var onDataChannelChangeState = function (event) {
        var readyState = this.receiveDataChannel.readyState;
        trace('Receive channel state is: ' + readyState);
    }
}

WebRTCClient.prototype.setRemoteDescription = function (sdp) {
    this.rtcConnection.setRemoteDescription(sdp);
}

WebRTCClient.prototype.sendData = function (data) {
    this.sendDataChannel.send(data);
}

WebRTCClient.prototype.onReceiveMessageCallback = function (event) {
}

/////////////////////////////
var servers = { "iceServers": [{ "urls": ["stun:192.168.38.162:3478", "turn:192.168.38.162:3478"] }], "certificates": [] };
var webRTCClient = new WebRTCClient(chatRoom);

webRTCClient.addRemoteStream = function (event) {
    remoteStream = event.stream;
    remoteVideo.src = window.URL.createObjectURL(remoteStream);
    miniVideo.src = window.URL.createObjectURL(new MediaStream(localStream.getVideoTracks()));
    localVideo.pause();
    remoteVideo.classList.add("active");
    miniVideo.classList.add("active");
    trace("Add remoteStream " + event.stream.id);
}

chatRoom.eventHandler("joined", function (user, roomsize) {
    if (user == userId && roomsize == 2) {
        webRTCClient.createOffer();
        trace("Create offer!");
    }
})

webRTCClient.rtcClose = function (user) {
    trace("RTC close connection!");
}

webRTCClient.addRemoteStream = function (event) {
    trace("Add remote stream!");
}

webRTCClient.rtcOffer = function (message) {
    trace("RTC offer!");
    var object = JSON.parse(message);
    webRTCClient.initRTCConnection(servers, {});
    if (localStream) {
        webRTCClient.addStream(localStream);
    }
    webRTCClient.createAnswer(object.sdp);
}

webRTCClient.rtcAnswer = function (message) {
    trace("RTC answer!");
    var object = JSON.parse(message);
    webRTCClient.setRemoteDescription(new RTCSessionDescription(object.sdp));
}

webRTCClient.rtcCandidate = function (message) {
    var candidate = JSON.parse(message);
    webRTCClient.addIceCandidate(new RTCIceCandidate(candidate));
}

