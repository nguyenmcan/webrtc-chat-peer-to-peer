
function ChatRoom(roomName, userName) {
    var room = roomName;
    var user = userName;
    var roomOwner = false;
    var socket;
    var onaddmember = function () { }

    function startChat() {
        socket = io.connect();
        socket.on("created", createRoom);
        socket.on("joined", joinRoom);
    }

    function createRoom(params) {
        roomOwner = true;
    }

    function joinRoom(user) {
        if (this.user != user) {
            // friend join room
            onaddmember(user);
        }
    }


}