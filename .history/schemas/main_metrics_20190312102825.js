const pwmetrics = require('pwmetrics/lib/metrics');

const logBasicInfo = require('debug')('main_metrics:basic-info');
const logExtInfo = require('debug')('main_metrics:extended-info');

const schema = [ // eslint-disable-line
  {
    "mode": "REQUIRED",
    "name": "website",
    "type": "STRING"
  },
  {
    "mode": "REQUIRED",
    "name": "build_id",
    "type": "STRING"
  },
  {
    "mode": "REQUIRED",
    "name": "build_system",
    "type": "STRING"
  },
  {
    "mode": "REQUIRED",
    "name": "timestamp",
    "type": "INTEGER"
  },
  {
    "mode": "REPEATED",
    "name": "metrics",
    "type": "RECORD",
    "fields": [
      {
        "mode": "REQUIRED",
        "name": "id",
        "type": "STRING"
      },
      {
        "mode": "REQUIRED",
        "name": "title",
        "type": "STRING"
      },
      {
        "mode": "REQUIRED",
        "name": "timing",
        "type": "FLOAT"
      },
      {
        "mode": "REQUIRED",
        "name": "timestamp",
        "type": "INTEGER"
      }
    ]
  }
];

/**
 * From the timings' list it generates an array of normalized objects to be stored in BigQuery
 *
 * @function processTimings
 * @param {Array} timings
 * @returns {Array}
 */
function processTimings(timings, lighthouseTimestamp) {
  if (timings && timings.length) {
    return timings
      .filter(({ timestamp }) => Boolean(timestamp))
      .map(({ id, timing, title }) => ({ id, timestamp: lighthouseTimestamp, timing, title }))
  }

  return [];
}

module.exports = function save(dataset, lighthouseRes) {
  logBasicInfo('Gathering main metrics from %s', lighthouseRes.url);

  const { audits } = lighthouseRes.reportCategories[0];
  if (!(audits && audits.length)) {
    return Promise.reject(new Error(`There were no "audits" in Lighthouse's reportCategories[0]`));
  }

  const { timings } = pwmetrics.prepareData(lighthouseRes);
  const lighthouseTimestamp = new Date(lighthouseRes.generatedTime).getTime();

  const metrics = processTimings(timings, lighthouseTimestamp);

  const data = {
    build_id: process.env.BUILD_ID || 'none',
    build_system: process.env.BUILD_SYSTEM || 'none',
    metrics,
    timestamp: lighthouseTimestamp,
    website: lighthouseRes.url,
  };

  logExtInfo(data);

  logBasicInfo('Saving main metrics from %s to BigQuery', lighthouseRes.url);
  return dataset
    .table('main_metrics')
    .insert(data);
};
