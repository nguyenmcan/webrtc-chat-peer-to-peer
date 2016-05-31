
function WebRTCSignaling(socket) {
    var socket_io = socket;

    socket_io.on('offer', function (message) {
        var msg = JSON.parse(message);
        onoffer(msg);
    });

    socket_io.on('answer', function (message) {
        var msg = JSON.parse(message);
        onanswer(msg);
    });

    socket_io.on('cadidate', function (message) {
        var msg = JSON.parse(message);
        oncadidate(msg);
    });

    function offer(description) {
        var msgString = JSON.stringify({ "sdp": description });
        socket_io.emit("offer", msgString);
    }

    function answer(description) {
        var msgString = JSON.stringify({ "sdp": description });
        socket_io.emit("answer", msgString);
    }

    function cadidate(cadidate) {
        var msgString = JSON.stringify({
            label: candidate.sdpMLineIndex,
            id: candidate.sdpMid,
            candidate: candidate.candidate
        });
        socket_io.emit("candidate", msgString);
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

WebRTCSignaling.prototype.onoffer = function (msg) {

}

WebRTCSignaling.prototype.onanswer = function (msg) {

}

WebRTCSignaling.prototype.oncadidate = function (msg) {

}