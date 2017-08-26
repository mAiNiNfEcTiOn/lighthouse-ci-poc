const path = require('path');
const URL = require('url');

const debug = require('debug')('user_timings');

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

  debug(data);
  
  return dataset
    .table('user_timings')
    .insert(data);
}