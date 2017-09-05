const BigQuery = require('@google-cloud/bigquery');
const lighthouse = require('lighthouse');
const path = require('path');
const perfConfig = require('lighthouse/lighthouse-core/config/perf.json');
const util = require('util');
const URL = require('url');

/** Create/Set debug methods */
const logBasicInfo = require('debug')('index:basic-info');
const logExtInfo = require('debug')('index:extended-info');

/** Load schemas */
const saveAssetsBlockingFmp = require('./schemas/assets_blocking_fmp');
const saveDomSize = require('./schemas/dom_size');
const saveFilmstrip = require('./schemas/filmstrip');
const saveMainMetrics = require('./schemas/main_metrics');
const saveOffscreenImagesMetrics = require('./schemas/offscreen_images');
const saveUserTimings = require('./schemas/user_timings');

/** @type {String} CLIENT_SECRET_FILEPATH Filepath for the credentials to access Google Cloud/BigQuery */
const CLIENT_SECRET_FILEPATH = path.join(__dirname, 'client_secret.json');

/**
 * @type {String} BIGQUERY_DATASET Dataset that holds the tables where to store the data. Default: 'perfmatters'
 * @type {String} BIGQUERY_PROJECT_ID Project on Google Cloud that has the BigQuery instance
 */
const {
  BIGQUERY_DATASET = 'perfmatters',
  BIGQUERY_PROJECT_ID,
} = process.env;

/** @type {String} TARGET_URLS URLs to gather metrics from. Multiple URLs are supported when separated by ';' */
const TARGET_URLS = process.env.URL || 'https://www.google.com';

/** Main lighthouseOptions */
const lighthouseOptions = {
  loadPage: true,
  mobile: true,
  port: 9222,
};

/** @type {BigQuery} bigquery Connection to BigQuery */
const bigquery = BIGQUERY_PROJECT_ID && new BigQuery({
  keyFilename: CLIENT_SECRET_FILEPATH,
  projectId: BIGQUERY_PROJECT_ID,
});

/** @type {Object} dataset BigQuery dataset. Passed to the schemas so that they can store data in BigQuery */
const dataset = bigquery && bigquery.dataset(BIGQUERY_DATASET);

/**
 * @see {@link https://github.com/GoogleChrome/lighthouse/issues/73#issuecomment-309159928}
 */
self.setImmediate = (callback, ...argsForCallback) => {
  Promise.resolve().then(() => callback(...argsForCallback));
  return 0;
};

/**
 * Triggers the schemas' functions to save the metrics on BigQuery.
 *
 * @function storeMetrics
 * @param {Object} lighthouseRes Lighthouse's response object containing all metrics.
 * @return {Promise} Returns a Promise after all schemas' functions finish processing.
 */
function storeMetrics(lighthouseRes) {
  if (!BIGQUERY_PROJECT_ID) {
    return Promise.resolve();
  }

  if (!(('generatedTime' in lighthouseRes) && lighthouseRes.generatedTime)) {
    return Promise.reject(new Error(`There was no "generatedTime" in Lighthouse's response`));
  }

  if (!(('reportCategories' in lighthouseRes) && lighthouseRes.reportCategories.length)) {
    return Promise.reject(new Error(`There were no "reportCategories" in Lighthouse's response`));
  }


  logBasicInfo('Now storing %s data in BigQuery', lighthouseRes.url);

  return Promise.all([
    saveAssetsBlockingFmp(dataset, lighthouseRes),
    saveDomSize(dataset, lighthouseRes),
    saveFilmstrip(dataset, lighthouseRes),
    saveMainMetrics(dataset, lighthouseRes),
    saveOffscreenImagesMetrics(dataset, lighthouseRes),
    saveUserTimings(dataset, lighthouseRes),
  ]).then(() => logBasicInfo('Finished storing %s data in BigQuery', lighthouseRes.url));
}


/** @type {Number} exitCode Variable used to define the exit code of the process at the end */
let exitCode = 0;

/**
 * Triggers the Lighthouse measurement and storage in BigQuery
 *
 * @function measureURL
 * @param {String} url URL to gather the metrics from
 * @return {Promise}
 */
function measureURL(url) {
  logBasicInfo('Starting to measure %s', url);

  return lighthouse(url, lighthouseOptions, perfConfig)
    .then((lighthouseRes) => {
      logBasicInfo('Finished measuring %s.', lighthouseRes.url);
      logExtInfo(util.inspect(lighthouseRes, true, null, true));
      return lighthouseRes;
    })
    .then(storeMetrics)
    .catch((err) => {
      console.error(`${url} - `, util.inspect(err, true, null, true));
      exitCode = 1;
    });
}

logBasicInfo('Starting to parse all URLs');
TARGET_URLS
  .split(';')
  .filter(url => URL.parse(url).protocol !== null)
  .reduce((promise, url) => promise.then(() => measureURL(url)), Promise.resolve())
  .then(() => {
    logBasicInfo('Finished parsing all URLs. Exiting with code %d', exitCode);
    process.exit(exitCode);
  });
