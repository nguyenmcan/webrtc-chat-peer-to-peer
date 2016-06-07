var WebRTCClient = function () {
    this.rtcConnection;
}

WebRTCClient.prototype.createRTCConnection = function (servers, constraints) {
    try {
        this.rtcConnection = new RTCPeerConnection(servers, constraints);
        this.rtcConnection.onicecandidate = this.onIceCandidate;
        this.rtcConnection.onremovestream = function (e) {
            trace("Remove stream!" + e.stream.id);
        };
        this.rtcConnection.onsignalingstatechange = function () {
            trace("Signaling state changed to: " + this.rtcConnection.signalingState);
        }.bind(this);
        this.rtcConnection.onaddstream = this.addRemoteStream;
        this.rtcConnection.oniceconnectionstatechange = function (event) {
            trace("iceconnectionstate: " + this.rtcConnection.iceConnectionState);
        }.bind(this);
        this.rtcConnection.onconnectionstatechange = function (event) {
            trace("connectionStateChange: " + this.rtcConnection.connectionState);
        }.bind(this);
    } catch (e) {
        trace("Failed to create PeerConnection, exception: " + e.message);
        return;
    }
}

WebRTCClient.prototype.createOffer = function () {
    return new Promise(function (resolve, error) {
        this.rtcConnection.createOffer().then(function (offerSDP) {
            this.rtcConnection.setLocalDescription(offerSDP);
            resolve(offerSDP);
        }.bind(this));
    }.bind(this));
}

WebRTCClient.prototype.createAnswer = function (offerSDP) {
    return new Promise(function (resolve, error) {
        this.rtcConnection.setRemoteDescription(new RTCSessionDescription(offerSDP));
        this.rtcConnection.createAnswer().then(function (answerSDP) {
            this.rtcConnection.setLocalDescription(answerSDP);
            resolve(answerSDP);
        }.bind(this));
    }.bind(this));

}

WebRTCClient.prototype.addRemoteStream = function (event) {
}

WebRTCClient.prototype.addLocalStream = function (stream) {
    this.rtcConnection.addStream(stream);
}

WebRTCClient.prototype.removeLocalStream = function (stream) {
    this.rtcConnection.removeStream(stream);
}

WebRTCClient.prototype.closeRTCConnection = function () {
    if (this.rtcConnection) {
        this.rtcConnection.close();
    }
}

WebRTCClient.prototype.addIceCandidate = function (cadidate) {
    this.rtcConnection.addIceCandidate(cadidate);
}

WebRTCClient.prototype.onIceCandidate = function (cadidate) {
}

WebRTCClient.prototype.setRemoteDescription = function (sdp) {
    this.rtcConnection.setRemoteDescription(sdp);
}
