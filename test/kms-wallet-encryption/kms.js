const AWS = require('aws-sdk');

const {
  KMS_KEY_ARN,
  KMS_ACCESS_KEY,
  KMS_SECRET_KEY,
  KMS_ENCRYPTION_KEY,
  KMS_REGION,
} = process.env;

const kms = new AWS.KMS({
  accessKeyId: KMS_ACCESS_KEY,
  secretAccessKey: KMS_SECRET_KEY,
  region: KMS_REGION,
});

function encrypt(text, secretKey = KMS_ENCRYPTION_KEY) {
  return kms.encrypt({
    KeyId: KMS_KEY_ARN,
    Plaintext: text,
    EncryptionContext: { secretKey },
  }).promise().then((data) => data.CiphertextBlob.toString('base64'));
}

function decrypt(encryptedText, secretKey = KMS_ENCRYPTION_KEY) {
  return kms.decrypt({
    CiphertextBlob: Buffer.from(encryptedText, 'base64'),
    EncryptionContext: { secretKey },
  }).promise().then((data) => data.Plaintext.toString());
}

module.exports = {
  encrypt,
  decrypt,
};
