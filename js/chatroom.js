var ChatRoom = function (socket) {
    this.socket_io = socket;
}

ChatRoom.prototype.createOrJoin = function (room, user) {
    if (this.socket_io) {
        this.room = room;
        this.user = user;
        this.socket_io.on('message', this.onmessage);
        this.socket_io.on('error', this.onerror);
        this.socket_io.on('created', this.oncreated);
        this.socket_io.on('joined', this.onjoined);
        this.socket_io.on('leaved', this.onleaved);
        this.socket_io.emit('create or join', room, user);
    }
}

ChatRoom.prototype.onmessage = function (user, message) { }

ChatRoom.prototype.oncreated = function (user, socketId) { }

ChatRoom.prototype.onjoined = function (user, socketId) { }

ChatRoom.prototype.onerror = function (error) { }

ChatRoom.prototype.onleaved = function (user) { }

ChatRoom.prototype.send = function (message) {
    if (this.socket_io) {
        this.socket_io.emit("message", message);
    }
}



