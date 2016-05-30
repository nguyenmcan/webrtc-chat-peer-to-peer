
function WebRTCSignaling(socket) {
    var iosocket = socket;
    iosocket.on('signaling', processSignalingMessage);

    function createRoom(room, user) {
        signalingConnect.emit('create or join', room, user);
    }

    function sendSignalMessage(message) {
        var msgString = JSON.stringify(message);
        signalingConnect.emit("signaling", msgString);
        trace('C->S: ' + msgString);
    }

    function processSignalingMessage(message) {
        var msg = JSON.parse(message);
        if (msg.type === 'offer') {
            doAnswer(msg.sdp);
        } else if (msg.type === 'answer' && started) {
            rtcPeerConnection.setRemoteDescription(new RTCSessionDescription(msg.sdp));
        } else if (msg.type === 'candidate' && started) {
            var candidate = new RTCIceCandidate({ sdpMLineIndex: msg.label, candidate: msg.candidate });
            rtcPeerConnection.addIceCandidate(candidate);
        } else if (msg.type === 'bye' && started) {
            onRemoteHangup();
        }
    }
}