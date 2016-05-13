var gcloud = require('gcloud');
var fs = require('fs');
var _ = require('lodash');
var express = require('express');
var app = express();
var http = require('http').Server(app);
var fs = require('fs');
var exec = require('child_process').exec;

app.use(express.static('static'));

var gvision = gcloud.vision({
    projectId: 'e96--1282',
    keyFilename: './key.json'
});

function uploadImageToGcloud() {
  fs.readFile("test003.jpg", function(err, data) {
      var imgb64 = data.toString('base64');
      var annotateImageReq = {
          "image": {
              "content": imgb64
          },
          "features": [
              {
                  "type": "LABEL_DETECTION"
              }
          ]
      };

      console.log("Polling Vision API...");

      gvision.annotate(annotateImageReq, function(err, annotations, apiResponse) {
        console.log("Done!\n");
        _.forEach(annotations[0] ,function(val) {
          _.forEach(val, function(v) {
            console.log(v.description);
          })
        });
      });
  });
}

function snap(res) {
  console.log("Snapping Pic...");
  exec("/home/root/bin/ffmpeg/ffmpeg -s 640x480 -f video4linux2 -i /dev/video0 -vframes 3 test%3d.jpg" , function(error, stdout, stderr) {
    //get file information for taken image
    var stats = fs.statSync("test003.jpg");
    console.log(stats["size"]);
    if(stats["size"] < 10000) {
      console.log("bad img");
      snap(res);
    } else {
      console.log("good img");
      res.json({
        img: "test003.jpg"
      });
    }

  });
}

app.get('/', function(req, res) {
  res.sendFile(__dirname + '/app/index.html');
});

//im lazy
app.get('/test003.jpg', function(req,res) {
  res.sendFile(__dirname + '/test003.jpg');
});

app.get('/api/snap', function(req,res) {
  snap(res);
});

app.get('/api/identify', function(req,res) {
  uploadImageToGcloud();
});

http.listen(3000, function() {
  console.log("Server running on port 3000");
});
