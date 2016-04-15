var gcloud = require('gcloud');
var fs = require('fs');
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

    gvision.annotate(annotateImageReq, function(err, annotations, apiResponse) {
       console.log(annotations);
    });
});
