const path = require('path');
const express = require('express');
const AI = require('./core/AI');

const app = express();

const http = require('http').createServer(app);
const io = require('socket.io')(http);

const port = process.env.PORT || 3000;

app.use('/', express.static(path.join(__dirname, '../public/')));
app.use('/scripts', express.static(path.join(__dirname, '/node_modules/')));

io.on('connection', function(socket){
  const ai = new AI();

  socket.on('message', async function(msg){
    socket.emit('message', msg);

    const answer = await ai.process(msg);

    socket.emit('message', answer);
  });

  socket.on('disconnect', function(){
    console.log('user disconnected');
  });
});

http.listen(port, function(){
  console.log(`running on port ${port}`);
});