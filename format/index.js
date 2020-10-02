const Storage = require('@google-cloud/storage');
const prettyMilliseconds = require('pretty-ms');
const {SecretManagerServiceClient} = require('@google-cloud/secret-manager');

/**
 * Background Cloud Function to be triggered by Pub/Sub.
 * This function is exported by index.js, and executed when
 * the trigger topic receives a message.
 *
 * @param {object} message The Pub/Sub message.
 * @param {object} context The event metadata.
 */
exports.helloPubSub = async (message, context) => {

  const srcFileName = message.data
    ? Buffer.from(message.data, 'base64').toString()
    : '';

  console.log(srcFileName);

  const secretManagerServiceClient = new SecretManagerServiceClient();
  const [version] = await secretManagerServiceClient.accessSecretVersion({
    name: 'projects/1032947163287/secrets/yasutomog_podcast/versions/latest',
  });
  const payload = version.payload.data.toString();
  const secretJson = JSON.parse(payload);

  const
    storage = new Storage();
    srcBucket = storage.bucket(secretJson.jsonBucketName),
    srcFile = srcBucket.file(srcFileName),
    distBucket = storage.bucket(secretJson.textBucketName),
    distFileName = srcFileName.replace('json', 'txt'),
    distFile = distBucket.file(distFileName);

  srcFile.download().then(function(data) {

    const
      contents = data[0],
      json = JSON.parse(contents);

    let outputText = '';
    json.results.forEach((result) => {

      const
        alternatives = result.alternatives[0],
        transcript = alternatives.transcript;

      let startTime = alternatives.words[0].startTime.seconds;
      if (!startTime) {
        startTime = 0;
      } else {
        startTime = startTime * 1000;
      }

      const formatStartTime = prettyMilliseconds(startTime, {colonNotation: true});
      const talk = '[' + formatStartTime + '] \n' + transcript + '\n\n';

      outputText += talk;
    });

    distFile.save(outputText, function(err) {
      if (!err) {
        // File written successfully.
      }
    });

  });
};
