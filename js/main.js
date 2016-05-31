'use strict';

///////////////////////////////////////////

var displayMsg = document.querySelector('div#displayMsg');
var inputMsg = document.querySelector('textarea#inputMsg');
var localVideo = document.querySelector('video#localVideo');
var remoteVideo = document.querySelector('video#remoteVideo');
var sendMsgBtn = document.querySelector('button#sendMsg');
var videoCallBtn = document.querySelector('button#videoCall');

sendMsgBtn.onclick = sendMessage;
videoCallBtn.onclick = startVideoCall;

//////////////////// CHAT ROOM ///////////////////////

var socket = io.connect();

function openChatScreen(room, user, callback) {
  socket.on('message', function (message) {
    onMessage(message);
  });
  socket.on('created', function (user, socketId) {
    callback(user, null);
  });
  socket.on('joined', function (user, socketId) {
    callback(user, null);
  });
  socket.on('error', function (error) {
    callback(null, error);
  });
  socket.emit('create or join', room, user);
}

function sendMessage() {
  var data = inputMsg.value;
  socket.emit("message", data);
  displayMessage(data);
  inputMsg.value = "";
}

function onMessage(msg) {
  var span = document.createElement("span");
  var br = document.createElement("br");
  span.textContent = msg;
  displayMsg.appendChild(span);
  displayMsg.appendChild(br);
  span.scrollIntoView();
  trace('Received Data: ' + msg);
}

///////////////////////////////////////////

var isVideoCall = false;
var initiator = false;
var rtcPeerConnection;
var rtcPeerDataChannel;
var pcConstraint = { "optional": [] };
var dataConstraint;
var candidates = [];
var servers = { "iceServers": [{ "urls": ["stun:192.168.38.162:3478"] }], "certificates": [] };
var localStream;
var remoteStream;

///////////////////// SIGNALING //////////////////////

function openSignalConnect() {
  socket.on('signaling', processSignalingMessage);
}

function sendSignalMessage(message) {
  var msgString = JSON.stringify(message);
  signalingConnect.emit("signaling", msgString);
}

function processSignalMessage(message) {
  var msg = JSON.parse(message);
  if (msg.type === 'offer') {
    doAnswer(msg.sdp);
  } else if (msg.type === 'answer') {
    rtcPeerConnection.setRemoteDescription(new RTCSessionDescription(msg.sdp));
  } else if (msg.type === 'candidate') {
    var candidate = new RTCIceCandidate({ sdpMLineIndex: msg.label, candidate: msg.candidate });
    rtcPeerConnection.addIceCandidate(candidate);
  } else if (msg.type === 'bye') {
    onRemoteHangup();
  }
}

////////////////////////////////////////////

function startVideoCall() {
  if (!isVideoCall) {
    startMediaStream();
  } else {
    stopMediaStream();
  }
}

function stopMediaStream() {
  if (localStream.getVideoTracks()[0]) {
    localStream.getVideoTracks()[0].stop();
  }
  if (localStream.getAudioTracks()[0]) {
    localStream.getAudioTracks()[0].stop();
  }
  rtcPeerConnection.removeStream(localStream);
  rtcPeerConnection.createOffer().then(function (desc) {
    rtcPeerConnection.setLocalDescription(desc);
    sendSignalMessage({ "type": "offer", "sdp": desc });
    trace('Set local description ' + desc);
  });
  videoCallBtn.style["background-color"] = "#00FF3A";
  videoCallBtn.textContent = "Start Call";
  isVideoCall = false;
  trace("Remove localStream");
}

function startMediaStream() {
  trace('Requesting local stream');
  navigator.mediaDevices.getUserMedia({
    audio: true,
    video: true
  }).then(function (stream) {
    if (window.URL) {
      localVideo.src = window.URL.createObjectURL(stream);
      remoteVideo.src = window.URL.createObjectURL(stream);
    } else {
      localVideo.srcObject = stream;
    }
    window.localStream = localStream = stream;
    if (rtcPeerConnection) {
      rtcPeerConnection.addStream(localStream);
      rtcPeerConnection.createOffer().then(function (desc) {
        rtcPeerConnection.setLocalDescription(desc);
        sendSignalMessage({ "type": "offer", "sdp": desc });
        trace('Set local description ' + desc);
      });
      videoCallBtn.style["background-color"] = "red";
      videoCallBtn.textContent = "Stop Call";
      isVideoCall = true;
      trace("Add localStream");
    }
  }).catch(function (e) {
    alert('getUserMedia() error: ' + e.name);
  });
}

////////////////////////////////////////////

// establish connection
function createPeerConnection() {
  try {
    // For SCTP, reliable and ordered delivery is true by default.
    rtcPeerConnection = new RTCPeerConnection(servers, pcConstraint);
    rtcPeerConnection.onicecandidate = onIceCandidate;
    rtcPeerConnection.onremovestream = function () {
      startVideoCall.disabled = false;
      stopVideoCall.disabled = true;
      trace("Remove stream!");
    };
    rtcPeerConnection.onsignalingstatechange = function () {
      trace("Signaling state changed to: " + rtcPeerConnection.signalingState);
    };
    rtcPeerConnection.oniceconnectionstatechange = function () { trace("change state") };
    rtcPeerConnection.onaddstream = function (e) {
      if (window.URL) {
        remoteVideo.src = window.URL.createObjectURL(e.stream);
      } else {
        remoteVideo.srcObject = e.stream;
      }
      window.remoteStream = remoteStream = e.stream;
      startVideoCall.disabled = true;
      stopVideoCall.disabled = true;
      trace("Add remote stream!");
    }
    rtcPeerConnection.ondatachannel = function (event) {
      rtcPeerDataChannel = event.channel;
      setEventDataChannel(rtcPeerDataChannel);
    };

    // create data channel
    rtcPeerDataChannel = rtcPeerConnection.createDataChannel('sendDataChannel', { "reliable": false });
    setEventDataChannel(rtcPeerDataChannel);

    rtcPeerConnection.createOffer().then(function (desc) {
      rtcPeerConnection.setLocalDescription(desc);
      sendSignalMessage({ "type": "offer", "sdp": desc });
      trace('Set local description ' + desc);
    });
    trace('Created local peer connection object RTCPeerConnection');
  } catch (e) {
    trace("Failed to create PeerConnection, exception: " + e.message);
    return;
  }
}

function setEventDataChannel(dataChannel) {
  dataChannel.binaryType = "arraybuffer";
  dataChannel.onopen = onrtcPeerDataChannelStateChange;
  dataChannel.onclose = onrtcPeerDataChannelStateChange;
  dataChannel.onmessage = onReceiveData;
  dataChannel.onerror = function (error) {
    trace("Data channel error: " + error);
  }
  dataChannel.onconnecting = function () { trace("onSessionConnecting") };
  dataChannel.onaddstream = function () { trace("onRemoteStreamAdded") };
  dataChannel.onremovestream = function () { trace("onRemoteStreamRemoved") };
  trace("Add channel event!");
}

function onReceiveData(data) {
  displayMessage(data.data);
  trace("Received data from remote: " + data.data);
}

function gotDescription(desc) {
  rtcPeerConnection.setLocalDescription(desc);
  // send local description
  sendSignalMessage({ "type": "offer", "sdp": desc });
  trace('Set local description ' + desc);
}

function onIceCandidate(event) {
  if (event.candidate) {
    sendSignalMessage({
      type: 'candidate',
      label: event.candidate.sdpMLineIndex,
      id: event.candidate.sdpMid,
      candidate: event.candidate.candidate
    });
    trace("onIceCandidate: " + event.candidate.candidate);
  } else {
    trace("End of candidates." + event);
  }
}

/////////////////////////////////////////////

function doAnswer(offerSDP) {
  try {
    if (rtcPeerConnection && rtcPeerConnection.iceConnectionState == "connected") {
      rtcPeerConnection.setRemoteDescription(new RTCSessionDescription(offerSDP));
      rtcPeerConnection.createAnswer().then(setLocalAndSendMessage);
    } else {
      rtcPeerConnection = new RTCPeerConnection(servers, pcConstraint);
      rtcPeerConnection.onicecandidate = onIceCandidate;
      rtcPeerConnection.onremovestream = function () {
        startVideoCall.disabled = false;
        stopVideoCall.disabled = true;
        trace("Remove stream!");
      };
      rtcPeerConnection.onsignalingstatechange = function () {
        trace("Signaling state changed to: " + rtcPeerConnection.signalingState);
      };
      rtcPeerConnection.oniceconnectionstatechange = function (e) { trace("change state " + e) };

      rtcPeerConnection.onaddstream = function (e) {
        if (window.URL) {
          remoteVideo.src = window.URL.createObjectURL(e.stream);
        } else {
          remoteVideo.srcObject = e.stream;
        }
        window.remoteStream = remoteStream = e.stream;
        startVideoCall.disabled = true;
        stopVideoCall.disabled = true;
        trace("Add remote stream!");
      }

      rtcPeerConnection.ondatachannel = function (event) {
        rtcPeerDataChannel = event.channel;
        setEventDataChannel(rtcPeerDataChannel);
      };

      rtcPeerConnection.setRemoteDescription(new RTCSessionDescription(offerSDP));
      rtcPeerConnection.createAnswer().then(setLocalAndSendMessage);
    }
  } catch (e) {
    trace("Failed to create PeerConnection, exception: " + e.message);
    return;
  }
  trace('Created local peer connection object rtcPeerConnection');
}

function setLocalAndSendMessage(answerSDP) {
  rtcPeerConnection.setLocalDescription(answerSDP);
  sendSignalMessage({ "type": "answer", "sdp": answerSDP });
}

function onrtcPeerDataChannelStateChange() {
  var readyState = rtcPeerDataChannel.readyState;
  trace('Send channel state is: ' + readyState);
}

function trace(text) {
  if (text[text.length - 1] === '\n') {
    text = text.substring(0, text.length - 1);
  }
  if (window.performance) {
    var now = (window.performance.now() / 1000).toFixed(3);
    console.log(now + ': ' + text);
  } else {
    console.log(text);
  }
}
