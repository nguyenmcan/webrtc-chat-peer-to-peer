'use strict';

var fs = require('fs');
var os = require('os');
var nodeStatic = require('node-static');
var https = require('https');
var http = require('http');
var socketIO = require('socket.io');
var express = require('express');

var options = {
  key: fs.readFileSync('ssl/key.pem'),
  cert: fs.readFileSync('ssl/cert.pem')
};

var router = express();
router.set('views', './views');
router.use(express.static(__dirname + '/public'));

var appServer = http.createServer(router).listen(8080);

router.get("/", function (req, res) {
  log(JSON.stringify(req.query));
})

router.get("/index(.html)?", function (req, res) {
  var content = fs.readFileSync('./views/index.html', "utf8");
  res.send(content);
})

router.get("/chatroom", function (req, res) {
  log(JSON.stringify(req.query));
})

function log(msg) {
  console.log(msg);
}

/////////////////////////////////////////////

var io = socketIO.listen(appServer);

io.sockets.on('connection', function (socket) {
  socket.on('candidate', function (message) {
    socket.broadcast.to(socket.room).emit('candidate', message);
  });

  socket.on('answer', function (message) {
    socket.broadcast.to(socket.room).emit('answer', message);
  });

  socket.on('offer', function (message) {
    socket.broadcast.to(socket.room).emit('offer', message);
  });

  socket.on('close', function () {
    socket.broadcast.to(socket.room).emit('closed', socket.user);
  });

  socket.on('message', function (message) {
    log(socket.user + ' said: ' + message);
    socket.broadcast.to(socket.room).emit('message', socket.user, message);
  });

  socket.on('broadcast', function (message) {
    log(socket.user + ' said: ' + message);
    io.sockets.to(socket.room).emit('broadcast', message);
  });

  socket.on('disconnect', function () {
    if (socket.user) {
      socket.broadcast.to(socket.room).emit('closed', socket.user);
      log("Close connection! " + socket.user);
    }
  });

  socket.on('create or join', function (room, user) {
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
