'use strict';

///////////////////////////////////////////

var displayMsg = document.querySelector('div#displayMsg');
var inputMsg = document.querySelector('textarea#inputMsg');
var sendMsg = document.querySelector('button#sendMsg');
var connectBtn = document.querySelector('button#connectBtn');
var localVideo = document.querySelector('video#localVideo');
var remoteVideo = document.querySelector('video#remoteVideo');
var startVideoCall = document.querySelector('button#startVideoCall');

connectBtn.onclick = createPeerConnection;
sendMsg.onclick = sendMessage;
startVideoCall.onclick = startMediaStream;

function sendMessage() {
  var data = inputMsg.value;
  rtcPeerDataChannel.send(data);
  displayMessage(data);
  trace('Sent Data: ' + data);
}

function displayMessage(msg) {
  var span = document.createElement("span");
  var br = document.createElement("br");
  span.textContent = msg;
  displayMsg.appendChild(span);
  displayMsg.appendChild(br);
  span.scrollIntoView();
  trace('Received Data: ' + msg);
}

////////////////////////////////////////////

var caller = false;
var rtcPeerConnection;
var rtcPeerDataChannel;
var pcConstraint = { "optional": [] };
var dataConstraint;
var signalingConnect;
var candidates = [];
var started = false;
var servers = { "iceServers": [{ "urls": ["stun:192.168.38.162:3478"] }], "certificates": [] };
var localStream;
var remoteStream;

////////////////////////////////////////////

function createSignalingConnection() {
  signalingConnect = io.connect();
  signalingConnect.on('signaling', processSignalingMessage);
  signalingConnect.on('message', onMessage);
  signalingConnect.on('log', onLog);
  
  signalingConnect.on('created', function () {
    caller = true;
    createPeerConnection();
  });
  
  signalingConnect.on('joined', function () {
  });
}

function createOrJoinRoom(room, user) {
  signalingConnect.emit('create or join', room, user);
}

function sendSignalMessage(message) {
  var msgString = JSON.stringify(message);
  signalingConnect.emit("signaling", msgString);
  trace('C->S: ' + msgString);
}

function onLog(message) {
  trace("Server Log: " + message);
}

function onMessage(message) {
  trace("Server Msg: " + message);
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

////////////////////////////////////////////

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
      remoteVideo.srcObject = stream;
    }
    window.localStream = localStream = stream;
    trace("Add localStream");
  }).catch(function (e) {
    alert('getUserMedia() error: ' + e.name);
  });
}

////////////////////////////////////////////

// establish connection
function createPeerConnection() {
  try {
    // For SCTP, reliable and ordered delivery is true by default.
    trace('Created local peer connection object rtcPeerConnection');
    rtcPeerConnection = new RTCPeerConnection(servers, pcConstraint);
    rtcPeerConnection.onicecandidate = onIceCandidate;
    rtcPeerConnection.onaddstream = function () { trace("add stream") };
    rtcPeerConnection.onremovestream = function () { trace("reove stream") };
    rtcPeerConnection.onsignalingstatechange = function () {
      trace("Signaling state changed to: " + rtcPeerConnection.signalingState);
    };
    rtcPeerConnection.oniceconnectionstatechange = function () { trace("change state") };
    rtcPeerConnection.onaddstream = function (e) {
      remoteStream = localVideo.srcObject = e.stream;
    }
    if (localStream) {
      rtcPeerConnection.addStream(localStream);
    }

    // create data channel
    rtcPeerDataChannel = rtcPeerConnection.createDataChannel('sendDataChannel', { "reliable": true });
    rtcPeerDataChannel.binaryType = "arraybuffer";
    rtcPeerDataChannel.onopen = onrtcPeerDataChannelStateChange;
    rtcPeerDataChannel.onclose = onrtcPeerDataChannelStateChange;
    rtcPeerDataChannel.onmessage = onReceiveData;
    rtcPeerDataChannel.onerror = function (error) {
      trace("Data channel error: " + error);
    }
    rtcPeerDataChannel.onconnecting = function () { trace("onSessionConnecting") };
    rtcPeerDataChannel.onaddstream = function () { trace("onRemoteStreamAdded") };
    rtcPeerDataChannel.onremovestream = function () { trace("onRemoteStreamRemoved") };
    rtcPeerDataChannel.ondatachannel = function () { trace("ondatachannel") };

    // 
    rtcPeerConnection.createOffer().then(gotDescription);

  } catch (e) {
    trace("Failed to create PeerConnection, exception: " + e.message);
    return;
  }

  connectBtn.disabled = true;
  caller = true;
  started = true;
  trace("End of create connection");
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
    // send cadidate info
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
    // For SCTP, reliable and ordered delivery is true by default.
    trace('Created local peer connection object rtcPeerConnection');
    rtcPeerConnection = new RTCPeerConnection(servers, pcConstraint);
    rtcPeerConnection.onicecandidate = onIceCandidate;
    rtcPeerConnection.onaddstream = function () { trace("add stream") };
    rtcPeerConnection.onremovestream = function () { trace("reove stream") };
    rtcPeerConnection.onsignalingstatechange = function () {
      trace("Signaling state changed to: " + rtcPeerConnection.signalingState);
    };
    rtcPeerConnection.oniceconnectionstatechange = function () { trace("change state") };
    rtcPeerConnection.onaddstream = function (e) {
      remoteStream = localVideo.srcObject = e.stream;
    }
    if (localStream) {
      rtcPeerConnection.addStream(localStream);
    }

    // create data channel
    rtcPeerConnection.ondatachannel = function (event) {
      rtcPeerDataChannel = event.channel;
      rtcPeerDataChannel.binaryType = "arraybuffer";
      rtcPeerDataChannel.onopen = onrtcPeerDataChannelStateChange;
      rtcPeerDataChannel.onclose = onrtcPeerDataChannelStateChange;
      rtcPeerDataChannel.onmessage = onReceiveData;
      rtcPeerDataChannel.onerror = function (error) {
        trace("Data channel error: " + error);
      }
      rtcPeerDataChannel.onconnecting = function () { trace("onSessionConnecting") };
      rtcPeerDataChannel.onaddstream = function () { trace("onRemoteStreamAdded") };
      rtcPeerDataChannel.onremovestream = function () { trace("onRemoteStreamRemoved") };
      trace("Add channel event!");
    };

    //
    rtcPeerConnection.setRemoteDescription(new RTCSessionDescription(offerSDP));
    rtcPeerConnection.createAnswer().then(setLocalAndSendMessage);

  } catch (e) {
    trace("Failed to create PeerConnection, exception: " + e.message);
    return;
  }
  trace("Sending answer to peer.");
}

function setLocalAndSendMessage(answerSDP) {
  // Set Opus as the preferred codec in SDP if Opus is present.
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
