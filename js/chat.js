
var ChatRoom = function (socket) {
    this.socket_io = socket;

    function oncreated(user, socketId) {

    }

    function onjoined(user, socketId) {

    }

    this.socket_io.on('message', function (message) {
        onmessage(message);
    });

    this.socket_io.on('created', oncreated);

    this.socket_io.on('joined', function (user, socketId) {
        onjoined(user, socketId);
    });

    this.socket_io.on('error', function (error) {
        onerror(error);
    });

}

// ChatRoom.prototype.onmessage = function (message) {
//     trace(arguments);
// }

// ChatRoom.prototype.oncreated = function (user, socketId) {
//     trace(arguments);
// }

// ChatRoom.prototype.onjoined = function (user, socketId) {
//     trace(arguments);
// }

// ChatRoom.prototype.onerror = function (error) {
//     trace(arguments);
// }

ChatRoom.prototype.send = function (message) {
    this.socket_io.emit("message", message);
}

ChatRoom.prototype.connect = function (room, user) {
    this.socket_io.emit('create or join', room, user);
}

