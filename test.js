var ibm = require('watson-developer-cloud');
var fs = require('fs');
var gcloud = require('gcloud');
var _ = require('lodash');

var textToSpeech = ibm.text_to_speech({
  version: 'v1',
  username: '696b478e-4276-45b9-bed2-3b7a6c0056f3',
  password: 'P5H3iN8zg8Pj'
});

var gvision = gcloud.vision({
    projectId: 'e96--1282',
    keyFilename: './key.json'
});

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
      if(err)
        console.log(err);
      console.log(annotations);
      formTextforSynthesis(annotations[0]);
      //res.json({annotate:annotations});
    });
});

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
  var transcript = textToSpeech.synthesize({text:outputString, accept:"audio/wav"}).pipe(fs.createWriteStream('output.wav'));
}
