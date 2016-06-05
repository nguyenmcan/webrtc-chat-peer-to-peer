'use strict';

var displayMsg = document.querySelector('div#displayMsg');
var videoDisplay = document.querySelector('div#videoDisplay');
var inputMsg = document.querySelector('textarea#inputMsg');
var localVideo = document.querySelector('video#local-video');
var remoteVideo = document.querySelector('video#remote-video');
var miniVideo = document.querySelector('video#mini-video');
var videoCallBtn = document.querySelector('button#videoCall');

var incallButtonBar = document.querySelector('div#in-call-buttons');
var hangupButtonBar = document.querySelector('div#hangup-buttons');

var muteVideoBtn = document.querySelector('button#mute-video');
var muteAudioBtn = document.querySelector('button#mute-audio');
var hangupBtn = document.querySelector('button#hangup');

var newRoomBtn = document.querySelector('button#new-room');
var rejoinBtn = document.querySelector('button#rejoin');

var isVideoCall = false;
var initiator = false;
var rtcConnection;
var pcConstraint = { "optional": [] };
var mediaConstraints = { "audio": true, "video": { "optional": [{ "minWidth": "1280" }, { "minHeight": "720" }], "mandatory": {} } }
var servers = { "iceServers": [{ "urls": ["stun:192.168.38.162:3478"] }], "certificates": [] };
var localStream;
var remoteStream;

//////////////// Event Handler ////////////////

muteVideoBtn.onclick = function (event) {
  onMuteVideo().then(function (enabled) {
    if (enabled) {
      muteVideoBtn.classList.remove("inactive");
    } else {
      muteVideoBtn.classList.add("inactive");
    }
  });
}

muteAudioBtn.onclick = function (event) {
  onMuteAudio().then(function (enabled) {
    if (enabled) {
      muteAudioBtn.classList.remove("inactive");
    } else {
      muteAudioBtn.classList.add("inactive");
    }
  });
}

hangupBtn.onclick = function (event) {
  signalService.close();
  stopVideoCall();
  incallButtonBar.classList.remove("active");
  hangupButtonBar.classList.add("active");
}

newRoomBtn.onclick = function (event) {

}

rejoin.onclick = function (event) {
  createRTCConnection();
  startVideoCall();
}

//////////////// SIGNALING ////////////////

var signalService = new WebRTCSignaling(io.connect());

signalService.oncandidate = function (candidate) {
  rtcConnection.addIceCandidate(new RTCIceCandidate(candidate));
}

signalService.onclosed = function (user) {
  stopVideoCall();
}

signalService.onoffer = function (sdp) {
  createRTCConnection();
  createAnswer(sdp);
}

signalService.onanswer = function (sdp) {
  rtcConnection.setRemoteDescription(new RTCSessionDescription(sdp));
}

signalService.oncreated = function (user) {
  trace(user + " create room!");
}

signalService.onjoined = function (user) {
  startVideoCall();
  trace(user + " joind room!");
}

////////////////////////////////////////////

function onMuteAudio() {
  var audioTracks = localStream.getAudioTracks();
  if (audioTracks.length === 0) {
    trace("No local audio available.");
    return;
  }
  for (var i = 0; i < audioTracks.length; ++i) {
    audioTracks[i].enabled = !audioTracks[i].enabled;
  }
  trace("Audio " + (audioTracks[0].enabled ? "unmuted." : "muted."));
  return Promise.resolve(audioTracks[0].enabled);
}

function onMuteVideo() {
  var videoTracks = localStream.getVideoTracks();
  if (videoTracks.length === 0) {
    trace("No local video available.");
    return;
  }
  for (var i = 0; i < videoTracks.length; ++i) {
    videoTracks[i].enabled = !videoTracks[i].enabled;
  }
  trace("Video " + (videoTracks[0].enabled ? "unmuted." : "muted."));
  return Promise.resolve(videoTracks[0].enabled);
}

function startRTCSession(room, user) {
  return startMediaStream().then(function () {
    signalService.connect(room, user);
    createRTCConnection();
  });
}

function startVideoCall() {
  rtcConnection.addStream(localStream);
  createOffer();
  trace("Start video call!");
}

function stopVideoCall() {
  localVideo.src = window.URL.createObjectURL(new MediaStream(localStream.getVideoTracks()));
  localVideo.play();
  remoteVideo.classList.remove("active");
  remoteVideo.pause();
  miniVideo.classList.remove("active");
  miniVideo.pause();
  rtcConnection.close();
  incallButtonBar.classList.remove("active");
  trace("Stop video call!");
}

function startMediaStream() {
  return new Promise(function (resolve, reject) {
    navigator.mediaDevices.getUserMedia(mediaConstraints).then(function (stream) {
      localStream = stream;
      localVideo.src = window.URL.createObjectURL(new MediaStream(localStream.getVideoTracks()));
      trace("Start media stream!");
      resolve();
    });
  });
}

function stopMediaStream() {

}

////////////////////////////////////////////

function createRTCConnection() {
  try {
    rtcConnection = new RTCPeerConnection(servers, pcConstraint);
    rtcConnection.onicecandidate = onIceCandidate;
    rtcConnection.onremovestream = function (e) {
      trace("Remove stream!" + e.stream.id);
    };
    rtcConnection.onsignalingstatechange = function () {
      trace("Signaling state changed to: " + rtcConnection.signalingState);
    };
    rtcConnection.onaddstream = addRemoteStream;
    rtcConnection.oniceconnectionstatechange = iceConnectionStateChange;
    rtcConnection.onconnectionstatechange = connectionStateChange;
    trace('Created local peer connection object RTCPeerConnection');
  } catch (e) {
    trace("Failed to create PeerConnection, exception: " + e.message);
    return;
  }
}

function iceConnectionStateChange(event) {
  trace("iceconnectionstate: " + rtcConnection.iceConnectionState);
};

function connectionStateChange(event) {
  trace("connectionStateChange: " + rtcConnection.connectionState);
}

function addRemoteStream(event) {
  remoteStream = event.stream;
  remoteVideo.classList.add("active");
  remoteVideo.src = window.URL.createObjectURL(remoteStream);
  miniVideo.classList.add("active");
  miniVideo.src = window.URL.createObjectURL(new MediaStream(localStream.getVideoTracks()));
  localVideo.pause();
  incallButtonBar.classList.add("active");
  trace("Add remoteStream " + event.stream.id);
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
  rtcConnection.addStream(localStream);
  rtcConnection.setRemoteDescription(new RTCSessionDescription(offerSDP));
  rtcConnection.createAnswer().then(function (answerSDP) {
    rtcConnection.setLocalDescription(answerSDP);
    signalService.sendAnswer(answerSDP);
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
