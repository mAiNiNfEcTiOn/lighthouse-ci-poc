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

module.exports = function save(dataset, lighthouseRes) {
  logBasicInfo('Gathering main metrics from %s', lighthouseRes.url);

  const metrics = pwmetrics.prepareData(lighthouseRes);
  const lighthouseTimestamp = new Date(lighthouseRes.generatedTime).getTime();

  const data = {
    build_id: process.env.BUILD_ID || 'none',
    build_system: process.env.BUILD_SYSTEM || 'none',
    metrics: metrics.timings
      .filter(({ timestamp }) => Boolean(timestamp))
      .map(({ id, timing, title }) => ({ id, timestamp: lighthouseTimestamp, timing, title })),
    timestamp: lighthouseTimestamp,
    website: lighthouseRes.url,
  };

  logExtInfo(data);

  logBasicInfo('Saving main metrics from %s to BigQuery', lighthouseRes.url);
  return dataset
    .table('main_metrics')
    .insert(data);
};
