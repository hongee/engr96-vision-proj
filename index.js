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

var isIdentifying = true;
var isSnapping = true;

function uploadImageToGcloud(res) {
  fs.readFile("test003.jpg", function(err, data) {
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

function snap(res) {
  console.log("Snapping Pic...");
  exec("/home/root/bin/ffmpeg/ffmpeg -s 1280x720 -f video4linux2 -i /dev/video0 -vframes 2 test%3d.jpg" , function(error, stdout, stderr) {
    //get file information for taken image
    var stats = fs.statSync("test003.jpg");
    console.log(stats["size"]);
    if(stats["size"] < 10000) {
      console.log("bad img");
      snap(res);
    } else {
      fs.readFile("test003.jpg", function(err, data) {
          var imgb64 = data.toString('base64');
          res.json({
            img: imgb64
          });
          isSnapping = false;
      });
    }

  });
}

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
