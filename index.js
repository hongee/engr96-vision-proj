var gcloud = require('gcloud');
var fs = require('fs');
var _ = require('lodash');

var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var ibm = require('watson-developer-cloud');

var fs = require('fs');
var exec = require('child_process').exec;
var mraa = require('mraa');

var buttonPin = new mraa.Gpio(8);
buttonPin.dir(mraa.DIR_IN);

app.use(express.static('static'));

var gvision = gcloud.vision({
    projectId: 'e96--1282',
    keyFilename: './key.json'
});

var textToSpeech = ibm.text_to_speech({
  version: 'v1',
  username: '696b478e-4276-45b9-bed2-3b7a6c0056f3',
  password: 'P5H3iN8zg8Pj'
});

//state trackers
var isIdentifying = false;
var isSnapping = false;
var isNotRecentlyPressed = true;

function uploadImageToGcloud(res,img) {
  if(res == null) {
    var annotateImageReq = {
        "image": {
            "content": img
        },
        "features": [
            {
                "type": "LABEL_DETECTION"
            },
      {
        "type": "FACE_DETECTION"
      },
      {
        "type": "LANDMARK_DETECTION"
      }
        ]
    };

    console.log("Polling Vision API...");

    gvision.annotate(annotateImageReq, function(err, annotations, apiResponse) {
      console.log("Done!\n");

      io.emit('snap_res', {annotate:annotations});
      isIdentifying = false;
      /*
      _.forEach(annotations[0] ,function(val) {
        _.forEach(val, function(v) {
          console.log(v.description);
        })
      });
      */
    });
  } else {
    fs.readFile("test002.jpg", function(err, data) {
        var imgb64 = data.toString('base64');
        var annotateImageReq = {
            "image": {
                "content": imgb64
            },
            "features": [
                {
                    "type": "LABEL_DETECTION"
                },
          {
            "type": "FACE_DETECTION"
          },
          {
            "type": "LANDMARK_DETECTION"
          }
            ]
        };

        console.log("Polling Vision API...");

        gvision.annotate(annotateImageReq, function(err, annotations, apiResponse) {
          console.log("Done!\n");
          console.log(err);
          console.log(annotations);

          res.json({annotate:annotations});

          isIdentifying = false;
          /*
          _.forEach(annotations[0] ,function(val) {
            _.forEach(val, function(v) {
              console.log(v.description);
            })
          });
          */
        });
    });
  }
}

function snap(res) {
  console.log("Snapping Pic...");
  exec("/home/root/bin/ffmpeg/ffmpeg -s 1280x720 -f video4linux2 -i /dev/video0 -vframes 2 test%3d.jpg" , function(error, stdout, stderr) {
    //get file information for taken image
    var stats = fs.statSync("test002.jpg");
    console.log(stats["size"]);
    if(stats["size"] < 10000) {
      console.log("bad img");
      snap(res);
    } else {
      fs.readFile("test002.jpg", function(err, data) {
          var imgb64 = data.toString('base64');
          if(res) {
            res.json({
              img: imgb64
            });
          } else {
            io.emit('snap', imgb64);
            uploadImageToGcloud(null, imgb64);
          }
          isSnapping = false;
      });
    }

  });
}

io.on('connection', function(socket) {
  console.log("A user connected!");

  socket.on('disconnect', function() {
    console.log("A user disconnected");
  });
});

app.get('/', function(req, res) {
  res.sendFile(__dirname + '/app/index.html');
});

app.get('/api/snap', function(req,res) {
  if(!isSnapping) {
    isSnapping = true;
    snap(res);
  }
});

app.get('/api/identify', function(req,res) {
  if(!isSnapping) {
    isIdentifying = true;
    uploadImageToGcloud(res);
  }
});

http.listen(3000, function() {
  console.log("Server running on port 3000");
});

periodicActivity();

function periodicActivity()
{
  var val =  buttonPin.read(); //read the digital value of the pin
  if(val && isNotRecentlyPressed) {
    isNotRecentlyPressed = false;
    snap(null);
    setTimeout(function(){
      isNotRecentlyPressed = true
    }, 2000);
  }
  setTimeout(periodicActivity, 100); //call the indicated function after 1 second (1000 milliseconds)
}
