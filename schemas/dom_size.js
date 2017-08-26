const path = require('path');
const URL = require('url');

const debug = require('debug')('dom_size');

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

function processMetricsList(metricsList) {
  return metricsList
    .filter((metric) => metric.title !== 'Total DOM Nodes')
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

module.exports = function save(dataset, lighthouseRes) {
  const timestamp = new Date(lighthouseRes.generatedTime).getTime();
  
  const domSizeAudit = lighthouseRes.reportCategories[0].audits.find(audit => audit.id === 'dom-size');

  const totalDOMNodes = domSizeAudit.result.rawValue;
  
  const metrics = processMetricsList(domSizeAudit.result.extendedInfo.value);

  const data = {
    build_id: process.env.BUILD_ID || 'none',
    build_system: process.env.BUILD_SYSTEM || 'none',
    metrics,
    timestamp,
    totalDOMNodes,
    website: lighthouseRes.url,
  };

  debug(data);
  
  return dataset
    .table('dom_size')
    .insert(data);
}