const path = require('path');
const URL = require('url');

const logBasicInfo = require('debug')('user_timings:basic-info');
const logExtInfo = require('debug')('user_timings:extended-info');

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
        "name": "metricDuration",
        "type": "FLOAT"
      },
      {
        "mode": "REQUIRED",
        "name": "metricEndTime",
        "type": "FLOAT"
      },
      {
        "mode": "REQUIRED",
        "name": "metricName",
        "type": "STRING"
      },
      {
        "mode": "REQUIRED",
        "name": "metricStartTime",
        "type": "FLOAT"
      }
    ]
  }
];

function processMetricsList(metricsList) {
  return metricsList
    .filter(metric => !metric.isMark)
    .map((metric) => {
      return {
        metricDuration: metric.duration,
        metricEndTime: metric.endTime,
        metricName: metric.name,
        metricStartTime: metric.startTime,
      };
    });
}

module.exports = function save(dataset, lighthouseRes) {
  logBasicInfo('Gathering User Timing metrics from %s', lighthouseRes.url);

  const timestamp = new Date(lighthouseRes.generatedTime).getTime();
  
  const userTimingsAudit = lighthouseRes.reportCategories[0].audits.find(audit => audit.id === 'user-timings');

  const metrics = processMetricsList(userTimingsAudit.result.extendedInfo.value);

  const data = {
    build_id: process.env.BUILD_ID || 'none',
    build_system: process.env.BUILD_SYSTEM || 'none',
    metrics,
    timestamp,
    website: lighthouseRes.url,
  };

  logExtInfo(data);
  
  logBasicInfo('Saving User Timing metrics from %s to BigQuery', lighthouseRes.url);
  return dataset
    .table('user_timings')
    .insert(data);
}