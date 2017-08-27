const BigQuery = require('@google-cloud/bigquery');
const lighthouse = require('lighthouse');
const path = require('path');
const perfConfig = require('lighthouse/lighthouse-core/config/perf.json');
const util = require('util');

const debug = require('debug')('lighthouse-response');

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

const targetURL = process.env.URL || 'https://www.google.com';

/**
 * @see {@link https://github.com/GoogleChrome/lighthouse/issues/73#issuecomment-309159928}
**/
self.setImmediate = function(callback, ...argsForCallback) {
  Promise.resolve().then(() => callback(...argsForCallback));
  return 0;
};

lighthouse(targetURL, lighthouseOptions, perfConfig)
  .then((res) => {
    debug(util.inspect(res, true, null, true));

    if (process.env.BIGQUERY_PROJECT_ID) {
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
      ]);
    }
  })
  .catch((err) => {
    console.error(util.inspect(err, true, null, true));
    process.exit(1);
  });