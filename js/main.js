'use strict';

///////////////////////////////////////////

var displayMsg = document.querySelector('div#displayMsg');
var videoDisplay = document.querySelector('div#videoDisplay');
var inputMsg = document.querySelector('textarea#inputMsg');
var localVideo = document.querySelector('video#localVideo');
var remoteVideo = document.querySelector('video#remoteVideo');
var sendMsgBtn = document.querySelector('button#sendMsg');
var videoCallBtn = document.querySelector('button#videoCall');

var isVideoCall = false;
var initiator = false;
var rtcConnection;
var pcConstraint = { "optional": [] };
var dataConstraint;
var servers = { "iceServers": [{ "urls": ["stun:192.168.38.162:3478"] }], "certificates": [] };
var localStream;
var remoteStream;

//////////////// SIGNALING ////////////////
var socket = io.connect();
var signalService = new WebRTCSignaling(socket);

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

signalService.onjoined = function (user) {
  createRTCConnection();
  createOffer();
  trace("signalService.onjoined");
}

////////////////////////////////////////////

function startVideoCall(room, user, callback) {
  startMediaStream(function (stream) {
    window.localStream = localStream = stream;
    localVideo.src = window.URL.createObjectURL(new MediaStream(localStream.getVideoTracks()));
    signalService.connect(room, user);
    trace("startVideoCall!");
    callback("OK", null);
  });
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
    localVideo.src = window.URL.createObjectURL(new MediaStream(localStream.getVideoTracks()));
    createRTCConnection();
    rtcConnection.setRemoteDescription(new RTCSessionDescription(offerSDP));
    rtcConnection.createAnswer().then(function (answerSDP) {
      rtcConnection.setLocalDescription(answerSDP);
      signalService.sendAnswer(answerSDP);
    });
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
