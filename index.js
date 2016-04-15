var gcloud = require('gcloud');
var fs = require('fs');
var _ = require('lodash');

var gvision = gcloud.vision({
    projectId: 'e96--1282',
    keyFilename: './key.json'
});

var img = fs.readFile("./img.jpg", function(err, data) {
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
