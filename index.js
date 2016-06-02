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
var isProcessing = false;

function formTextforSynthesis(annObj) {
  var outputString = "";

  if(annObj.hasOwnProperty("faceAnnotations")) {
    if(annObj.faceAnnotations.length == 1)
      outputString += "There is one person in front of you. ";
    else
      outputString += "There are " + annObj.faceAnnotations.length + " people in front of you. ";

    var numAnger = 0, numJoy = 0, numSurprise = 0, numSorrow = 0;
    _.forEach(annObj.faceAnnotations, function(i) {
      _.forEach(i, function(value, key) {
        var isLikely = false;
        switch (value) {
          case "VERY_LIKELY":
          case "LIKELY":
          case "POSSIBLE":
            isLikely = true;
            break;
        }

        if(isLikely) {
          switch (key) {
            case "angerLikelihood":
              numAnger++;
              break;
            case "joyLikelihood":
              numJoy++;
              break;
            case "surpriseLikelihood":
              numSurprise++;
              break;
            case "sorrowLikelihood":
              numSorrow++;
              break;
          }
        }
      });

    });

    if(numAnger > 0)
      outputString += numAnger + " of them is possibly angry. ";
    if(numJoy > 0)
      outputString += numJoy + " of them is possibly happy. "
    if(numSorrow > 0)
      outputString += numSorrow + " of them is possibly sad. "
    if(numSurprise > 0)
      outputString += numSurprise + " of them is possibly surprised. "

  }

  if(annObj.hasOwnProperty("labelAnnotations")) {
    outputString += "Here are some possible descriptions of the scene. "
    var count = 0;
    _.forEach(annObj.labelAnnotations, function(value) {
      if(value.score > 0.7) { //arbitrary
        count++;
        outputString += count + " : " + value.description + ". ";
      }
    })
  }

  console.log(outputString);

  io.emit("status", "Converting text to speech:" + outputString);

  var wavFileStream = fs.createWriteStream('output.wav');
  var transcript = textToSpeech.synthesize({text:outputString, accept:"audio/wav"});

  transcript.on('response', function() {
    io.emit("status", "Done converting to sound, now writing to disk and playing...");
  });

  transcript.pipe(wavFileStream);

  wavFileStream.on('close', function() {
    var stats = fs.statSync("output.wav");
    console.log(stats["size"]);
    exec("playSpeech output.wav", function(err,stdout,stderr) {
      if(err) {
        io.emit("status", "Failed to play sound :(");
      } else {
        io.emit("status", "Played speech!");
      }
      isProcessing = false;
    });
  });
}

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
      formTextforSynthesis(annotations[0]);
      isIdentifying = false;
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
        io.emit('status',"Polling Vision API...");

        gvision.annotate(annotateImageReq, function(err, annotations, apiResponse) {
          console.log("Done!\n");
          console.log(err);
          console.log(annotations);

          res.json({annotate:annotations});
          formTextforSynthesis(annotations[0]);
          isIdentifying = false;
          isProcessing = false;

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
            isProcessing = false;
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
  var val = buttonPin.read(); //read the digital value of the pin
  if(val && isNotRecentlyPressed) {
    io.emit('snap_trig', "true");
    isNotRecentlyPressed = false;
    if(!isProcessing) {
      isProcessing = true;
      snap(null);
    } else {
      io.emit("status", "The previous image is still being processed!");
    }
    setTimeout(function(){
      isNotRecentlyPressed = true
    }, 2000);
  }
  setTimeout(periodicActivity, 100);
}
