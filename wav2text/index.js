const Storage = require('@google-cloud/storage');
const Speech = require('@google-cloud/speech');
const {PubSub} = require('@google-cloud/pubsub');
const {SecretManagerServiceClient} = require('@google-cloud/secret-manager');

/**
 * Generic background Cloud Function to be triggered by Cloud Storage.
 *
 * @param {object} file The Cloud Storage file metadata.
 * @param {object} context The event metadata.
 * @param {function} callback The callback function.
 */
exports.helloGCS = (file, context, callback) => {

  const storage = new Storage();
  const client = new Speech.SpeechClient();
  const pubSubClient = new PubSub();
  const secretManagerServiceClient = new SecretManagerServiceClient();

  async function wav2text() {

    const [version] = await secretManagerServiceClient.accessSecretVersion({
      name: 'projects/1032947163287/secrets/yasutomog_podcast/versions/latest',
    });
    const payload = version.payload.data.toString();
    const secretJson = JSON.parse(payload);

    const
      srcBucket = file.bucket,
      srcFile = file.name,
      distBucket = storage.bucket(secretJson.jsonBucketName),
      distFileName = srcFile.replace('wav', 'json'),
      distFile = distBucket.file(distFileName),
      gcsUri = `gs://${srcBucket}/${srcFile}`,
      languageCode = 'ja-JP',
      config = {
        enableAutomaticPunctuation: true,
        enableWordTimeOffsets: true,
        languageCode: languageCode,
      },
      audio = {
        uri: gcsUri,
      },
      request = {
        config: config,
        audio: audio,
      };

    console.log('speech2text api call start.');
    const [operation] = await client.longRunningRecognize(request);
    const [response] = await operation.promise();
    console.log('speech2text api call end.');

    console.log('write speech2text api call response.');
    await distFile.save(JSON.stringify(response, null, '    '), function(err) {});

    const dataBuffer = Buffer.from(distFileName);
    const messageId = await pubSubClient.topic('yasutomog').publish(dataBuffer);
    console.log(`Message ${messageId} published.`);

  }

  wav2text().catch(console.error);

  callback();

};
