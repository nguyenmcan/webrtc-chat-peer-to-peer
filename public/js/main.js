
var servers = { "iceServers": [{ "urls": ["stun:192.168.38.162:3478"] }], "certificates": [] };
var socket = io.connect("localhost:8080");
var signaling = new WebRTCSignaling(socket);
var webRTCClient = new WebRTCClient();

signaling.oncandidate = function (candidate) {
  webRTCClient.addIceCandidate(new RTCIceCandidate(candidate));
}

signaling.onclosed = function (user) {
  onRTCClosed(user);
}

signaling.onoffer = function (sdp) {
  webRTCClient.createRTCConnection(servers);
  webRTCClient.createAnswer(sdp).then(function (sdp) {
    signaling.sendAnswer(sdp);
  });
}

signaling.onanswer = function (sdp) {
  webRTCClient.setRemoteDescription(new RTCSessionDescription(sdp));
}

signaling.oncreated = function (user) {
  onJoinRoom(user, true);
}

signaling.onjoined = function (user) {
  onJoinRoom(user, false);
}

webRTCClient.onIceCandidate = function (event) {
  if (event.candidate) {
    signaling.sendCandidate(event.candidate);
    trace("onIceCandidate: " + event.candidate.candidate);
  } else {
    trace("End of candidates." + event);
  }
}

webRTCClient.addRemoteStream = function (event) {
  addRemoteStream(event.stream);
}

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

