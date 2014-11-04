var socket = io.connect();

$(document).ready(function(){

  var chatApp = new Chat(socket);

  // display results of a name-change attempt
  socket.on('nameResult', function(result){ 

    var message;

    if (result.success) {
      message = 'You are now known as ' + result.name + '.';
    } else {
      message = result.message;
    }

    $('#messages').append(divSystemContentElement(message));

  });

  // display results on room change
  socket.on('joinResult', function(result){

    $('#room').text(result.room);
    $('#messages').append(divSystemContentElement('Room changed.'));

  });

  // display received messages
  socket.on('message', function(message){

    var newElement = $('<div></div>').text(message.text);
    $('#messages').append(newElement);

  });

  // display list of rooms available
  socket.on('rooms', function(rooms){
    $('#room-list').empty();

    for (var room in rooms) {
      room = room.substring(0, room.length);
      if (room != '') {
        $('#room-list').append(divEscapedContentElement(room));
      }
    }

    // allow click of a room name to change to that room
    $('#room-list div').click(function(){
      chatApp.processCommand('/join ' + $(this).text());
      $('#send-message').focus();
    });

  });

   // request list of rooms available intermittently
   
   
   setInterval(function(){
    socket.emit('rooms');
    }, 1000);
  

   $('#send-message').focus();

    // allow submitting the form to send a chat message
    $('#send-form').submit(function(e){
      e.preventDefault();
      processUserInput(chatApp, socket);
      return false;
    });

  });