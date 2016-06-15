
var ChatRoom = function (socket) {
  this.socket_io = socket;
  this.connect = function (room, user) {
    this.socket_io.emit('create or join', room, user);
    this.socket_io.on('joined', this.onJoined);
    this.socket_io.on('leaved', this.onLeaved);
    this.socket_io.on('message', this.onMessage);
    this.socket_io.on('start video call', this.onStartVideoCall);
    this.socket_io.on('stop video call', this.onStopVideoCall);
  }
}

ChatRoom.prototype.eventHandler = function (event, callback) {
  this.socket_io.on(event, callback);
}

ChatRoom.prototype.onJoined = function (user, roomsize) {
  trace("joined: " + user);
}

ChatRoom.prototype.onLeaved = function (user, roomsize) {
  trace("leaved: " + user);
}

ChatRoom.prototype.onMessage = function (user, message) {
  trace("message: " + message);
}

ChatRoom.prototype.onStartVideoCall = function (user) {
  trace("message: " + user);
}

ChatRoom.prototype.onStopVideoCall = function (user) {
  trace("message: " + user);
}

ChatRoom.prototype.stopVideoCall = function () {
  this.socket_io.emit("stop video call");
}

ChatRoom.prototype.startVideoCall = function () {
  this.socket_io.emit("start video call");
}

ChatRoom.prototype.sendMessage = function (message) {
  this.socket_io.emit("message", message);
}

ChatRoom.prototype.emit = function (type, message) {
  this.socket_io.emit(type, message);
}

