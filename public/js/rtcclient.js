var WebRTCClient = function () {
    this.rtcConnection;
    this.sendDataChannel;
    this.receiveDataChannel;
    this.registSignaling = function (signaling) {
        this.signaling = signaling;
        this.signaling.eventHandler('rtc-request', this.rtcRequest);
        this.signaling.eventHandler('rtc-close', this.rtcClose);
        this.signaling.eventHandler('rtc-offer', this.rtcOffer);
        this.signaling.eventHandler('rtc-answer', this.rtcAnswer);
        this.signaling.eventHandler('rtc-candidate', this.rtcCandidate);
        trace("Regist signaling!");
    }
    this.initRTCConnection = function (servers, constraints) {
        try {
            this.rtcConnection = new RTCPeerConnection(servers);
            this.rtcConnection.onicecandidate = this.onIceCandidate.bind(this);
            this.rtcConnection.onaddstream = this.addRemoteStream.bind(this);
            this.rtcConnection.onsignalingstatechange = function () {
                trace(">>> Signaling state changed to: " + this.rtcConnection.signalingState);
            }.bind(this);
            this.rtcConnection.oniceconnectionstatechange = function (event) {
                trace(">>> iceconnectionstate: " + this.rtcConnection.iceConnectionState);
            }.bind(this);
            this.rtcConnection.onconnectionstatechange = function (event) {
                trace(">>> connectionStateChange: " + this.rtcConnection.connectionState);
            }.bind(this);
            this.sendDataChannel = this.rtcConnection.createDataChannel("sendDataChannel");
            this.sendDataChannel.binaryType = 'arraybuffer';
            this.sendDataChannel.onopen = function (event) {
                var readyState = this.sendDataChannel.readyState;
                trace('>>> Receive local channel state is: ' + readyState);
            }.bind(this);
            this.sendDataChannel.onclose = function (event) {
                var readyState = this.sendDataChannel.readyState;
                trace('>>> Receive local channel state is: ' + readyState);
            }.bind(this);
            this.sendDataChannel.onerror = function (event) {
                trace("ERROR: " + event.message);
            }
            this.rtcConnection.ondatachannel = function (event) {
                this.receiveDataChannel = event.channel;
                this.receiveDataChannel.binaryType = 'arraybuffer';
                this.receiveDataChannel.onmessage = this.onReceiveMessage;
                this.receiveDataChannel.onopen = function (event) {
                    var readyState = this.receiveDataChannel.readyState;
                    trace('Receive remote channel state is: ' + readyState);
                }.bind(this);
                this.receiveDataChannel.onclose = function (event) {
                    var readyState = this.receiveDataChannel.readyState;
                    trace('Receive remote channel state is: ' + readyState);
                }.bind(this);
                this.receiveDataChannel.onerror = function (event) {
                    trace("ERROR: " + event.message);
                }
                trace(">>> Receive remote data channel!" + event.channel);
            }.bind(this);
            trace('Init RTC connection!');
        } catch (e) {
            trace("Failed to create PeerConnection, exception: " + e.message);
            return;
        }
    }
}

WebRTCClient.prototype.requestConnect = function () {
    if (this.signaling) {
        this.signaling.emit("rtc-request");
    }
    trace("Request connection!");
}

WebRTCClient.prototype.createOffer = function () {
    this.rtcConnection.createOffer().then(function (offerSDP) {
        this.rtcConnection.setLocalDescription(offerSDP);
        var msgString = JSON.stringify({ "sdp": offerSDP });
        if (this.signaling) {
            this.signaling.emit("rtc-offer", msgString);
        }
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
        if (this.signaling) {
            this.signaling.emit("rtc-close");
        }
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

WebRTCClient.prototype.rtcRequest = function (user) {
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
    trace(message);
}

WebRTCClient.prototype.setRemoteDescription = function (sdp) {
    this.rtcConnection.setRemoteDescription(sdp);
}

WebRTCClient.prototype.sendData = function (data) {
    this.sendDataChannel.send(data);
}

WebRTCClient.prototype.onReceiveMessage = function (event) {
    trace("data.....");
}

