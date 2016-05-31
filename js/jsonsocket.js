
function JSONSocket() {
    var socket;

    function connect() {
        socket = io.connect();
        socket.on('message', onmessage);
        socket.on('created', onsuccess);
        socket.on('joined', onsuccess);
        socket.on('error', onerror);
        // signaling
        socket.on("offer", onoffer);
        socket.on("answer", onanswer);
        socket.on("candidate", oncandidate);
    }

    function send(type, message) {
        var msgString = JSON.stringify(message);
        socket.emit(type, msgString);
    }

}

JSONSocket.prototype.onmessage = function () { }

JSONSocket.prototype.onsuccess = function () { }

JSONSocket.prototype.onerror = function () { }

JSONSocket.prototype.onoffer = function () { }

JSONSocket.prototype.onanswer = function () { }

JSONSocket.prototype.oncandidate = function () { }
