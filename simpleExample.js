/**
 * Get Teachable API Key
 */
const TEACHABLE_API_KEY = ScriptProperties.getProperty('teachableKey');

/**
 * call Teachable API
 */
function callTeachableApi() {

  // teachable endpoint
  const url = 'https://developers.teachable.com/v1/courses';

  // set parameters for call
  const params = {
    headers: {
      Accept: 'application/json',
      apiKey: TEACHABLE_API_KEY
    }
  }

  // call API
  const response = UrlFetchApp.fetch(url, params);

  // parse returned data
  const jsonData = JSON.parse(response);

  // view data
  console.log(jsonData);
}
