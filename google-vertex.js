require('dotenv').config();

const {GoogleAuth} = require('google-auth-library');

async function getAccessToken() {
  // Get the authorization token
  const auth = new GoogleAuth({
    scopes: 'https://www.googleapis.com/auth/cloud-platform',
  });
  const client = await auth.getClient();
  const accessToken = await client.getAccessToken();

  return accessToken;
}

module.exports = {
    getAccessToken,
}