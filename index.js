'use strict';

var os = require('os');
var nodeStatic = require('node-static');
var http = require('http');
var socketIO = require('socket.io');

var fileServer = new (nodeStatic.Server)();
var app = http.createServer(function (req, res) {
  fileServer.serve(req, res);
}).listen(8080);

var io = socketIO.listen(app);

io.sockets.on('connection', function (socket) {
  function log(msg) {
    //var array = ['Message from server:'];
    //array.push.apply(array, arguments);
    //socket.emit('log', array);
    console.log(msg);
  }

  socket.on('candidate', function (message) {
    socket.broadcast.to(socket.room).emit('candidate', message);
  });

  socket.on('answer', function (message) {
    socket.broadcast.to(socket.room).emit('answer', message);
  });

  socket.on('offer', function (message) {
    socket.broadcast.to(socket.room).emit('offer', message);
  });

  socket.on('close', function (user) {
    socket.broadcast.to(socket.room).emit('close');
  });

  socket.on('message', function (message) {
    log(socket.user + ' said: ' + message);
    socket.broadcast.to(socket.room).emit('message', socket.user, message);
  });

  socket.on('broadcast', function (message) {
    log(socket.user + ' said: ' + message);
    io.sockets.to(socket.room).emit('message', "system", message);
  });

  socket.on('disconnect', function () {
    if (socket.user) {
      io.sockets.to(socket.room).emit('leaved', "system", socket.user + " leaved room!");
    }
  });

  socket.on('create or join', function (room, user) {
    log('Request to create or join room ' + room + ' from ' + user);

    var roomSize = 0;
    if (io.sockets.adapter.rooms[room]) {
      roomSize = Object.keys(io.sockets.adapter.rooms[room]).length;
    }

    if (roomSize === 0) {
      socket.join(room);
      socket.room = room;
      socket.user = user;
      roomSize++;
      socket.emit("created", user, socket.id);
      log('User ' + user + ' created room ' + room);
    } else if (roomSize === 1) {
      socket.join(room);
      socket.room = room;
      socket.user = user;
      roomSize++;
      socket.emit("joined", user, socket.id);
      log('User ' + user + ' joined room ' + room);
    } else {
      socket.emit('error', "Full room. Please select other room!");
    }

    log('Room ' + room + ' now has ' + roomSize + ' client(s)');

  });

  socket.on('ipaddr', function () {
    var ifaces = os.networkInterfaces();
    for (var dev in ifaces) {
      ifaces[dev].forEach(function (details) {
        if (details.family === 'IPv4' && details.address !== '127.0.0.1') {
          socket.emit('ipaddr', details.address);
        }
      });
    }
  });

});
