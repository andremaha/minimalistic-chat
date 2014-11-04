var socketio = require('socket.io');
var io;
var guestNumber = 1;
var nickNames = {};
var namesUsed = [];
var currentRoom = {};

exports.listen = function(server) 
{

  // start Socket.IO - allowing it to piggyback on existing HTTP server
  io = socketio.listen(server);

  // define how each user connection will be handled
  io.sockets.on('connection', function(socket){

    // assign user a guest name when they connect
    guestNumber = assignGuestName(socket, guestNumber, nickNames, namesUsed);

    // place user in Lobby room when they connect
    joinRoom(socket, 'Lobby');

    // handle user messages, name-change attempts, and chat creation/changes
    handleMessageBroadcasting(socket, nickNames);

    handleNameChangeAttempts(socket, nickNames, namesUsed);

    handleRoomJoining(socket);

    // provide user with list of occumied rooms on request
    socket.on('rooms', function(){
      
      var rawRooms = io.sockets.adapter.rooms;
      for (var nick in nickNames) {
        delete rawRooms[nick];
      }
      
      socket.emit('rooms', rawRooms);
    });

    

    // define cleanup logic when user disconnects
    handleClientDisconnection(socket, nickNames, namesUsed);
  });
}

function assignGuestName(socket, guestNumber, nickNames, namesUsed) 
{
  // generate new guest name
  var name = 'Guest' + guestNumber;

  // associate guest name with client connection ID
  nickNames[socket.id] = name;

  // let user know their guest name
  socket.emit('nameResult', {
    success: true,
    name: name
  });

  // note that guest name is now used
  namesUsed.push(name);

  return guestNumber + 1;

}

function joinRoom(socket, room)
{
  // make user join room
  socket.join(room);

  // note that user is now in that room
  currentRoom[socket.id] = room;

  // let user know they're now in a new room
  socket.emit('joinResult', {room: room});

  // let others now the user has joined
  socket.broadcast.to(room).emit('message', {
    text: nickNames[socket.id] + ' has joined ' + room + '.'
  });

  var clients = io.sockets.adapter.rooms[room];   

  var usersInRoom = (typeof clients !== 'undefined') ? Object.keys(clients).length : 0;

  // if others in the room,, summarize who they are
  if (usersInRoom > 1) {
    var usersInRoomSummary = 'Users currently in ' + room + ': ';
    for (var index in clients) {
      var userSocketId = index;
      if (userSocketId != socket.id) {
        usersInRoomSummary += nickNames[userSocketId] + ' ' ;
      }
    }

    // send the users' summary to the newly joined usera
    socket.emit('message', {text: usersInRoomSummary});
  }

}

function handleNameChangeAttempts(socket, nickNames, namesUsed)
{
  // add listener for name attempt events
  socket.on('nameAttempt', function(name){


    // don't allow nicknames to begin with Guest
    if (name.indexOf('Guest') == 0) {

      socket.emit('nameResult', {
        success: false,
        message: 'Names cannot begin with "Guest".'
      });

    } else {

      // if name is not registered yet - go ahead and register
      if (namesUsed.indexOf(name) == -1) {

        var previousName = nickNames[socket.id];
        var previousNameIndex = namesUsed.indexOf(previousName);
        namesUsed.push(name);
        nickNames[socket.id] = name;

        // remove previous name to make available for the clients
        delete namesUsed[previousNameIndex];
        
        socket.emit('nameResult', {
          success: true,
          name: name
        });

        socket.broadcast.to(currentRoom[socket.id]).emit('message', {
          text: previousName + ' is now known as ' + name + '.'
        });

      } else {

        socket.emit('nameResult', {
          success: false,
          message: 'That name is already in use.'
        });
      }
    }
  });
}

function handleMessageBroadcasting(socket) 
{

  socket.on('message', function(message) {
    socket.broadcast.to(message.room).emit('message', {
      text: nickNames[socket.id] + ': ' + message.text
    });
  });

}

function handleRoomJoining(socket) 
{
  socket.on('join', function(room) {
    socket.leave(currentRoom[socket.id]);
    joinRoom(socket, room.newRoom);
  });
}

function handleClientDisconnection(socket)
{
  socket.on('disconnect', function(){
    console.log('diconnect');
    var nameIndex = namesUsed.indexOf(nickNames[socket.id]);
    delete namesUsed[nameIndex];
    delete nickNames[socket.id];
  })
}
