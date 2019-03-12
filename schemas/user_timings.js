const logBasicInfo = require('debug')('user_timings:basic-info');
const logExtInfo = require('debug')('user_timings:extended-info');

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

/**
 * From the metrics' list it generates an array of normalized objects to be stored in BigQuery
 *
 * @function processMetricsList
 * @param {Array} metricsList
 * @returns {Array}
 */
function processMetricsList(metricsList) {
  if (metricsList && metricsList.length) {
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

  return [];
}

module.exports = function save(dataset, lighthouseRes) {
  logBasicInfo('Gathering User Timing metrics from %s', lighthouseRes.requestedUrl);

  const timestamp = new Date(lighthouseRes.fetchTime).getTime();

  const { audits } = lighthouseRes;
  if (!audits) {
    return Promise.reject(new Error(`There were no "audits" in Lighthouse's response`));
  }

  const userTimingsAudit = audits['user-timings'];
  const metrics = processMetricsList(userTimingsAudit.details.items);

  const data = {
    build_id: process.env.BUILD_ID || 'none',
    build_system: process.env.BUILD_SYSTEM || 'none',
    metrics,
    timestamp,
    website: lighthouseRes.requestedUrl,
  };

  logExtInfo(data);

  const returnData = { user_timings: data };
  if (dataset) {
    logBasicInfo('Saving User Timing metrics from %s to BigQuery', lighthouseRes.requestedUrl);
    return dataset
      .table('user_timings')
      .insert(data)
      .then(() => returnData);
  }

  return Promise.resolve(returnData);
};
