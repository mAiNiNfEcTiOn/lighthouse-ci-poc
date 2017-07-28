const lighthouse = require('lighthouse');
const metrics = require('pwmetrics/lib/metrics');
const perfConfig = require('lighthouse/lighthouse-core/config/perf.json');
const util = require('util');

const lighthouseOptions = {
  loadPage: true,
  mobile: true,
  port: 9222,
};

const targetURL = process.env.LAUNCH_URL || 'https://www.google.com';

lighthouse(targetURL, lighthouseOptions, perfConfig)
  .then((res) => {
    console.log(util.inspect(res, true, null, true));
    return res;
  })
  .then(res => metrics.prepareData(res))
  .then(metrics => console.log(util.inspect(metrics, true, null, true)))
  .then(() => console.log('DONE!'))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });