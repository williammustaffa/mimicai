$(function () {
  var socket = io();

  $('form').submit(function(e){
    e.preventDefault();
    var $messageInput = $('#message-input');
    var message = $messageInput.val();

    socket.emit('message', message);
    $messageInput.val('');

    return false;
  });

  socket.on('message', function(msg){
    var $messagesContainer = $('#messages-container');

    $messagesContainer.append($('<li>').text(msg));
  });
});