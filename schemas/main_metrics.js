const pwmetrics = require('pwmetrics/lib/metrics');

const debug = require('debug')('main_metrics');

const schema = [
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
  const metrics = pwmetrics.prepareData(lighthouseRes);
  const timestamp = new Date(lighthouseRes.generatedTime).getTime();

  const data = {
    build_id: process.env.BUILD_ID || 'none',
    build_system: process.env.BUILD_SYSTEM || 'none',
    metrics: metrics.timings
      .filter(({ timestamp }) => Boolean(timestamp))
      .map(({ id, timing, title }) => ({ id, timestamp, timing, title })),
    timestamp,
    website: lighthouseRes.url,
  };

  debug(data);

  return dataset
    .table('main_metrics')
    .insert(data);
}