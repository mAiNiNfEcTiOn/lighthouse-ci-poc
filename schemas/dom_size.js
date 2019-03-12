const logBasicInfo = require('debug')('dom_size:basic-info');
const logExtInfo = require('debug')('dom_size:extended-info');

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
    "name": "totalDOMNodes",
    "type": "INTEGER"
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
        "name": "metricElementType",
        "type": "STRING"
      },
      {
        "mode": "REQUIRED",
        "name": "metricElementValue",
        "type": "STRING"
      },
      {
        "mode": "REQUIRED",
        "name": "metricName",
        "type": "STRING"
      },
      {
        "mode": "REQUIRED",
        "name": "metricValue",
        "type": "INTEGER"
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
  return metricsList
    .filter(metric => (metric.statistic !== 'Total DOM Nodes'))
    .map((metric) => {
      const { element, statistic, value } = metric;
      const metricValue = parseInt(value.replace(',', ''), 10);

      return {
        metricElementType: element.type,
        metricElementValue: element.value,
        metricName: statistic,
        metricValue,
      };
    });
}

module.exports = function save(dataset, lighthouseRes) {
  logBasicInfo('Gathering DOM Size data from %s', lighthouseRes.requestedUrl);

  const timestamp = new Date(lighthouseRes.fetchTime).getTime();

  const { audits } = lighthouseRes;
  if (!audits) {
    return Promise.reject(new Error(`There were no "audits" in Lighthouse's response`));
  }

  const domSizeAudit = audits['dom-size'];

  const totalDOMNodes = domSizeAudit && domSizeAudit.rawValue ? domSizeAudit.rawValue : 0;

  const metrics = processMetricsList(domSizeAudit.details.items);

  const data = {
    build_id: process.env.BUILD_ID || 'none',
    build_system: process.env.BUILD_SYSTEM || 'none',
    metrics,
    timestamp,
    totalDOMNodes,
    website: lighthouseRes.requestedUrl,
  };

  logExtInfo(data);


  const returnData = { dom_size: data };
  if (dataset) {
    logBasicInfo('Saving DOM Size data from %s to BigQuery', lighthouseRes.requestedUrl);
    return dataset
      .table('dom_size')
      .insert(data)
      .then(() => returnData);
  }

  return Promise.resolve(returnData);
};
