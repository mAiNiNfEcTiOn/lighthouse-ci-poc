const BigQuery = require('@google-cloud/bigquery');
const lighthouse = require('lighthouse');
const metrics = require('pwmetrics/lib/metrics');
const path = require('path');
const perfConfig = require('lighthouse/lighthouse-core/config/perf.json');
const util = require('util');

const saveMainMetrics = require('./schemas/main_metrics');

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
  .then(res => metrics.prepareData(res))
  .then((metrics) => {
    const metricTimestamp = new Date(metrics.generatedTime).getTime();
    
    return {
      website: targetURL,
      build_id: process.env.BUILD_ID || 'none',
      build_system: process.env.BUILD_SYSTEM || 'none',
      timestamp: metricTimestamp,
      metrics: metrics.timings
        .filter(({ timestamp }) => Boolean(timestamp))
        .map(({ id, title, timing }) => ({ id, title, timing, timestamp: metricTimestamp })),
    };
  })
  .then(mainMetrics => {
    if (process.env.BIGQUERY_PROJECT_ID) {
      const bigquery = new BigQuery({
        keyFilename: path.join(__dirname, 'client_secret.json'),
        projectId: process.env.BIGQUERY_PROJECT_ID,
      });

      return saveMainMetrics(bigquery.dataset('perfmatters'), mainMetrics);
    }
  })
  .catch((err) => {
    console.error(util.inspect(err, true, null, true));
    process.exit(1);
  });