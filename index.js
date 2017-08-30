const BigQuery = require('@google-cloud/bigquery');
const lighthouse = require('lighthouse');
const path = require('path');
const perfConfig = require('lighthouse/lighthouse-core/config/perf.json');
const util = require('util');
const URL = require('url');

const logBasicInfo = require('debug')('index:basic-info');
const logExtInfo = require('debug')('index:extended-info');

const saveAssetsBlockingFmp = require('./schemas/assets_blocking_fmp');
const saveDomSize = require('./schemas/dom_size');
const saveFilmstrip = require('./schemas/filmstrip');
const saveMainMetrics = require('./schemas/main_metrics');
const saveOffscreenImagesMetrics = require('./schemas/offscreen_images');
const saveUserTimings = require('./schemas/user_timings');

const lighthouseOptions = {
  loadPage: true,
  mobile: true,
  port: 9222,
};

const targetURLS = process.env.URL || 'https://www.google.com';

/**
 * @see {@link https://github.com/GoogleChrome/lighthouse/issues/73#issuecomment-309159928}
**/
self.setImmediate = function(callback, ...argsForCallback) {
  Promise.resolve().then(() => callback(...argsForCallback));
  return 0;
};

let exitCode = 0;

function measureURL(url) {
  logBasicInfo('Starting to measure %s', url);

  return lighthouse(url, lighthouseOptions, perfConfig)
    .then((res) => {
      logBasicInfo('Finished measuring %s.', url);
      logExtInfo(util.inspect(res, true, null, true));
      
      if (process.env.BIGQUERY_PROJECT_ID) {
        logBasicInfo('Now storing %s data in BigQuery', url);
        const bigquery = new BigQuery({
          keyFilename: path.join(__dirname, 'client_secret.json'),
          projectId: process.env.BIGQUERY_PROJECT_ID,
        });
        const dataset = bigquery.dataset('perfmatters');

        return Promise.all([
          saveAssetsBlockingFmp(dataset, res),
          saveDomSize(dataset, res),
          saveFilmstrip(dataset, res),
          saveMainMetrics(dataset, res),
          saveOffscreenImagesMetrics(dataset, res),
          saveUserTimings(dataset, res),
        ]).then(() => logBasicInfo('Finished storing %s data in BigQuery', url));
      }
    }).catch((err) => {
      console.error(`${url} - `, util.inspect(err, true, null, true));
      exitCode = 1;
    });   
}

logBasicInfo('Starting to parse all URLs');
targetURLS
  .split(';')
  .filter(url => URL.parse(url).protocol !== null)
  .reduce((promise, url) => promise.then(() => measureURL(url)), Promise.resolve())
  .then(() => {
    logBasicInfo('Finished parsing all URLs. Exiting with code %d', exitCode);
    process.exit(exitCode);
  });
