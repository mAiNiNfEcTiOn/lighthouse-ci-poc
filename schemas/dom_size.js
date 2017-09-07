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
        "name": "metricName",
        "type": "STRING"
      },
      {
        "mode": "REQUIRED",
        "name": "metricSnippet",
        "type": "STRING"
      },
      {
        "mode": "REQUIRED",
        "name": "metricTarget",
        "type": "INTEGER"
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
  if (metricsList && metricsList.length) {
    return metricsList
      .filter(metric => (metric.title !== 'Total DOM Nodes'))
      .map((metric) => {
        const { snippet, target, title, value } = metric;
        const metricValue = parseInt(value.replace(',', ''), 10);
        const metricTarget = parseInt(target.substr(2).replace(',', ''), 10);

        return {
          metricName: title,
          metricSnippet: snippet,
          metricTarget,
          metricValue,
        };
      });
  }

  return [];
}

module.exports = function save(dataset, lighthouseRes) {
  logBasicInfo('Gathering DOM Size data from %s', lighthouseRes.url);

  const timestamp = new Date(lighthouseRes.generatedTime).getTime();

  const { audits } = lighthouseRes.reportCategories[0];
  if (!(audits && audits.length)) {
    return Promise.reject(new Error(`There were no "audits" in Lighthouse's reportCategories[0]`));
  }

  const domSizeAudit = audits.find(audit => (audit.id === 'dom-size'));
  const domSizeResult = domSizeAudit && domSizeAudit.result;
  const domSizeExtInfoValue = (
    domSizeResult &&
    domSizeResult.extendedInfo &&
    domSizeResult.extendedInfo.value
  );

  const totalDOMNodes = domSizeResult && domSizeResult.rawValue ? domSizeResult.rawValue : 0;

  const metrics = processMetricsList(domSizeExtInfoValue);

  const data = {
    build_id: process.env.BUILD_ID || 'none',
    build_system: process.env.BUILD_SYSTEM || 'none',
    metrics,
    timestamp,
    totalDOMNodes,
    website: lighthouseRes.url,
  };

  logExtInfo(data);

  logBasicInfo('Saving DOM Size data from %s to BigQuery', lighthouseRes.url);
  return dataset
    .table('dom_size')
    .insert(data);
};
