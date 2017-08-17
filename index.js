const BigQuery = require('@google-cloud/bigquery');
const lighthouse = require('lighthouse');
const path = require('path');
const perfConfig = require('lighthouse/lighthouse-core/config/perf.json');
const util = require('util');

const saveMainMetrics = require('./schemas/main_metrics');
const saveFilmstrip = require('./schemas/filmstrip');
const saveAssetsBlockingFmp = require('./schemas/assets_blocking_fmp');

const lighthouseOptions = {
  loadPage: true,
  mobile: true,
  port: 9222,
};

const targetURL = process.env.URL || 'https://www.google.com';

// Hack?
self.setImmediate = function(callback, ...argsForCallback) {
  Promise.resolve().then(() => callback(...argsForCallback));
  return 0;
};

lighthouse(targetURL, lighthouseOptions, perfConfig)
  .then((res) => {
    if (process.env.BIGQUERY_PROJECT_ID) {
      const bigquery = new BigQuery({
        keyFilename: path.join(__dirname, 'client_secret.json'),
        projectId: process.env.BIGQUERY_PROJECT_ID,
      });
      const dataset = bigquery.dataset('perfmatters');

      return Promise.all([
        saveAssetsBlockingFmp(dataset, res),
        saveFilmstrip(dataset, res),
        saveMainMetrics(dataset, res),
      ]);
    }
  })
  .catch((err) => {
    console.error(util.inspect(err, true, null, true));
    process.exit(1);
  });