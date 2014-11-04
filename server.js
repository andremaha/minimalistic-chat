var http  = require('http');
var fs    = require('fs');
var path  = require('path');
var mime  = require('mime');

/////////////////////////////// STATIC SEVER /////////////////////////////////////

var cache = {};

// handling 404
function send404(response)
{
  response.writeHeader(404, {'Content-Type': 'text/plain'});
  response.write('404: Not Found');
  response.end();
}

// serve file contents
function sendFile(response, filePath, fileContents)
{
  response.writeHead(200, {'Content-Type': mime.lookup(filePath)});
  response.end(fileContents);
}

// ram is faster then file system - write to cache - and read from it
function serveStatic(response, cache, absPath)
{
  // file contents exists in the cache - serve it right away
  if (cache[absPath]) {

    console.log('serving from cache');
    sendFile(response, absPath, cache[absPath]);

  } else { // no file in the cache 

    // does the file exist in the first place?
    fs.exists(absPath, function(exists) {

      // file does not exist - 404
      if (!exists) {

        send404(response);

      } else { // file exists - handle it

        fs.readFile(absPath, function(err, data){

          // error occured while reading - 404
          if (err) {

            send404();

          } else { // all is fine 

            console.log('serving from filesystem');

            // write file contents in cache
            cache[absPath] = data;

            // and serve it
            sendFile(response, absPath, data);

          }
        });
      }
    });
  }
}

/////////////////////////////// END STATIC SEVER  ////////////////////////////////

/////////////////////////////// HTTP SEVER /////////////////////////////////////

var server = http.createServer(function(request, response){

  var filePath = false;

  // index default
  if (request.url == '/') {

    filePath = 'public/index.html';

  } else { // translate url into file system path

    filePath = 'public' + request.url; 

  }

  var absPath = './' + filePath;
  serveStatic(response, cache, absPath);

});

server.listen(8080, function(){
  console.log('Server listeting to port 8080...');
});

server.on('request', function(request){
  console.log('Client connected...');
});

/////////////////////////////// END HTTP SEVER /////////////////////////////////////

///////////////////////////////  CHAT SEVER /////////////////////////////////////

var chatServer = require('./lib/chat_server')
chatServer.listen(server);