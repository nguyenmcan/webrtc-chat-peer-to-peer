'use strict';

///////////////////////////////////////////

var displayMsg = document.querySelector('div#displayMsg');
var inputMsg = document.querySelector('textarea#inputMsg');
var sendMsg = document.querySelector('button#sendMsg');
var connectBtn = document.querySelector('button#connectBtn');

connectBtn.onclick = createConnection;
sendMsg.onclick = sendMessage;

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
var pcConstraint;
var dataConstraint;
var signalingConnect;

////////////////////////////////////////////

function createSignallingConnection() {
  signalingConnect = io.connect();
  signalingConnect.on('signaling', processSignalingMessage);
  signalingConnect.on('message', onMessage);
  signalingConnect.on('log', onLog);
}

function createRoom(room) {
  signalingConnect.emit('create or join', room);
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
    // Callee creates PeerConnection
    if (!initiator && !started) {
      maybeStart();
    }
    rtcPeerConnection.setRemoteDescription(new RTCSessionDescription(msg));
    doAnswer();
  }else if (msg.type === 'sdp' && started) {
    rtcPeerConnection.setRemoteDescription(new RTCSessionDescription(signal.sdp));	
  } else if (msg.type === 'answer' && started) {
    doAnswer();
    rtcPeerConnection.setRemoteDescription(new RTCSessionDescription(msg));
  } else if (msg.type === 'candidate' && started) {
    var candidate = new RTCIceCandidate({sdpMLineIndex:msg.label, candidate:msg.candidate});
    rtcPeerConnection.addIceCandidate(candidate);
  } else if (msg.type === 'bye' && started) {
    onRemoteHangup();
  }
}

////////////////////////////////////////////

// establish connection
function createConnection() {
  var servers = {"iceServers":[{"urls":["turn:192.168.38.162:3478"]}],"certificates":[]};
  pcConstraint = {"optional":[]};
  dataConstraint = null;

  try {
	  // createSignallingConnection
	  trace('Created signaling connection');
          createSignallingConnection();
	  createRoom("room");

	  // For SCTP, reliable and ordered delivery is true by default.
	  trace('Created local peer connection object rtcPeerConnection');
          window.rtcPeerConnection = rtcPeerConnection = new RTCPeerConnection(servers, pcConstraint);
	  rtcPeerConnection.onicecandidate = onIceCandidate;
	  rtcPeerConnection.onaddstream = function () {trace("add stream")};
	  rtcPeerConnection.onremovestream = function () {trace("reove stream")};
	  rtcPeerConnection.onsignalingstatechange = function () {
		  trace("Signaling state changed to: " + rtcPeerConnection.signalingState);
	  };
	  rtcPeerConnection.oniceconnectionstatechange = function () {trace("change state")};

	  // create data channel
	  rtcPeerDataChannel = rtcPeerConnection.createDataChannel('sendDataChannel', dataConstraint);
	  rtcPeerDataChannel.onopen = onrtcPeerDataChannelStateChange;
	  rtcPeerDataChannel.onclose = onrtcPeerDataChannelStateChange;
	  rtcPeerDataChannel.onmessage = onReceiveData;
	  rtcPeerDataChannel.onconnecting = function () {trace("onSessionConnecting")};
	  rtcPeerDataChannel.onaddstream = function () {trace("onRemoteStreamAdded")};
	  rtcPeerDataChannel.onremovestream = function () {trace("onRemoteStreamRemoved")};

	  // 
	  rtcPeerConnection.createOffer().then(gotDescription);

  } catch (e) {
	  trace("Failed to create PeerConnection, exception: " + e.message);
	  return;
  }

  caller = true;
  connectBtn.disable = true;
  trace("End of create connection");
}

function gotDescription(desc) {
    if(caller) {
	    rtcPeerConnection.setLocalDescription(desc);
	    sendSignalMessage(JSON.stringify({ "type": "sdp", "sdp": desc }));
	    trace('Offer from rtcPeerConnection');
    }
}

function onReceiveData(data) {
  displayMessage(data);
  trace("Received data from remote: " + data);
}

function onIceCandidate(event) {
    if (event.candidate) {
	if(caller) {
		sendSignalMessage({type: 'candidate',
		label: event.candidate.sdpMLineIndex,
		id: event.candidate.sdpMid,
		candidate: event.candidate.candidate});
	}
    	trace("onIceCandidate: " + event.candidate.candidate);
    } else {
	trace("End of candidates." + event);
    }
}

/////////////////////////////////////////////

function doAnswer(sessionDescription) {
  rtcPeerConnection.createAnswer(setLocalAndSendMessage(sessionDescription), null, mediaConstraints);
  trace("Sending answer to peer.");
}

function setLocalAndSendMessage(sessionDescription) {
  // Set Opus as the preferred codec in SDP if Opus is present.
  sessionDescription.sdp = preferOpus(sessionDescription.sdp);
  rtcPeerConnection.setLocalDescription(sessionDescription);
  sendSignalMessage(sessionDescription);
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
