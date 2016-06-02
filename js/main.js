'use strict';

///////////////////////////////////////////

var displayMsg = document.querySelector('div#displayMsg');
var videoDisplay = document.querySelector('div#videoDisplay');
var inputMsg = document.querySelector('textarea#inputMsg');
var localVideo = document.querySelector('video#localVideo');
var remoteVideo = document.querySelector('video#remoteVideo');
var sendMsgBtn = document.querySelector('button#sendMsg');
var videoCallBtn = document.querySelector('button#videoCall');

sendMsgBtn.onclick = sendMessage;
videoCallBtn.onclick = startVideoCall;

//////////////////// CHAT ROOM ///////////////////////

var socket = io.connect();
var chatRoom = new ChatRoom(socket);

function openChatScreen(room, user, callback) {
  chatRoom.oncreated = function (user, socketId) {
    callback(user, null);
  }
  chatRoom.onjoined = function (user, socketId) {
    callback(user, null);
  }
  chatRoom.onleaved = function (user, message) {
    displayMessage("[" + user + "]: " + message);
  }
  chatRoom.onerror = function (error) {
    callback(null, error);
  }
  chatRoom.onmessage = function (user, message) {
    displayMessage("[" + user + "]: " + message);
  }
  chatRoom.createOrJoin(room, user);
}

function sendMessage() {
  var message = inputMsg.value;
  if (message) {
    chatRoom.send(message);
    displayMessage("[" + chatRoom.user + "]: " + inputMsg.value);
    inputMsg.value = "";
  }
}

function displayMessage(message) {
  var span = document.createElement("span");
  var br = document.createElement("br");
  span.textContent = "> " + message;
  displayMsg.appendChild(span);
  displayMsg.appendChild(br);
  span.scrollIntoView();
}

function addVideoElement() {
  var video = document.createElement("video");
  var br = document.createElement("br");
  video.style = "margin-left: 5px; width:200px; height: 150px; object-fit: cover";
  video.autoplay = true;
  videoDisplay.appendChild(video);
  videoDisplay.appendChild(br);
  return video;
}

///////////////////////////////////////////

var isVideoCall = false;
var initiator = false;
var rtcConnection;
var pcConstraint = { "optional": [] };
var dataConstraint;
var servers = { "iceServers": [{ "urls": ["stun:192.168.38.162:3478"] }], "certificates": [] };
var localStream;
var remoteStream;
var signalService = new WebRTCSignaling(socket);

//////////////// SIGNALING ////////////////

signalService.onoffer = function (sdp) {
  createAnswer(sdp);
}

signalService.onanswer = function (sdp) {
  rtcConnection.setRemoteDescription(new RTCSessionDescription(sdp));
}

signalService.oncandidate = function (candidate) {
  rtcConnection.addIceCandidate(new RTCIceCandidate(candidate));
}

signalService.onclose = function () {
  stopMediaStream();
}

signalService.connect();

////////////////////////////////////////////

function startVideoCall() {
  if (!isVideoCall) {
    startMediaStream(function (stream) {
      window.localStream = localStream = stream;
      localVideo = addVideoElement();
      localVideo.src = window.URL.createObjectURL(new MediaStream(localStream.getVideoTracks()));
      createRTCConnection();
      createOffer();
      videoCallBtn.style["background-color"] = "red";
      videoCallBtn.textContent = "Stop Call";
      isVideoCall = true;
      trace("Add localStream");
    });
    chatRoom.broadcast("Start video call.");
  } else {
    stopMediaStream();
    chatRoom.broadcast("Stop video call.");
  }
}

function startMediaStream(callback) {
  navigator.mediaDevices.getUserMedia({
    audio: true,
    video: {
      mandatory: {
        minWidth: 640,
        minHeight: 480,
        maxWidth: 640,
        maxHeight: 480
      },
      facingMode: "user"
    }
  }).then(callback);
}

function stopMediaStream() {
  if (localStream) {
    if (localStream.getVideoTracks()[0]) {
      localStream.getVideoTracks()[0].stop();
    }
    if (localStream.getAudioTracks()[0]) {
      localStream.getAudioTracks()[0].stop();
    }
  }

  closeRTCConnection();
  signalService.closeConnect();

  videoCallBtn.disabled = false;
  videoCallBtn.style["background-color"] = "#00FF3A";
  videoCallBtn.textContent = "Start Call";
  isVideoCall = false;
  videoDisplay.innerHTML = null;
  trace("Remove localStream");
}

////////////////////////////////////////////

function createRTCConnection() {
  try {
    rtcConnection = new RTCPeerConnection(servers, pcConstraint);
    rtcConnection.onicecandidate = onIceCandidate;
    rtcConnection.onremovestream = function () {
      trace("Remove stream!");
    };
    rtcConnection.onsignalingstatechange = function () {
      trace("Signaling state changed to: " + rtcConnection.signalingState);
    };
    rtcConnection.onaddstream = function (event) {
      window.remoteStream = remoteStream = event.stream;
      remoteVideo = addVideoElement();
      remoteVideo.src = window.URL.createObjectURL(remoteStream);
      trace("Add remoteStream");
    };
    if (localStream) {
      rtcConnection.addStream(localStream);
    }
    trace('Created local peer connection object RTCPeerConnection');
  } catch (e) {
    trace("Failed to create PeerConnection, exception: " + e.message);
    return;
  }
}

function closeRTCConnection() {
  rtcConnection.close();
}

function createOffer() {
  rtcConnection.createOffer().then(function (desc) {
    rtcConnection.setLocalDescription(desc);
    signalService.sendOffer(desc);
  });
}

function createAnswer(offerSDP) {
  startMediaStream(function (stream) {
    window.localStream = localStream = stream;
    localVideo = addVideoElement();
    localVideo.src = window.URL.createObjectURL(new MediaStream(localStream.getVideoTracks()));
    createRTCConnection();
    rtcConnection.setRemoteDescription(new RTCSessionDescription(offerSDP));
    rtcConnection.createAnswer().then(function (answerSDP) {
      rtcConnection.setLocalDescription(answerSDP);
      signalService.sendAnswer(answerSDP);
    });
    videoCallBtn.style["background-color"] = "red";
    videoCallBtn.textContent = "Stop Call";
    isVideoCall = true;
    trace("Add localStream");
  });
  trace(">>>> Create answer!");
}

function onIceCandidate(event) {
  if (event.candidate) {
    signalService.sendCandidate(event.candidate);
    trace("onIceCandidate: " + event.candidate.candidate);
  } else {
    trace("End of candidates." + event);
  }
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
