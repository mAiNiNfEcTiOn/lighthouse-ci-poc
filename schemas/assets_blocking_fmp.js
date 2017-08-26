const path = require('path');
const URL = require('url');

const debug = require('debug')('assets_blocking_fmp');

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
    "name": "totalLinksKb",
    "type": "FLOAT"
  },
  {
    "mode": "REQUIRED",
    "name": "totalLinksMs",
    "type": "INTEGER"
  },
  {
    "mode": "REQUIRED",
    "name": "totalScriptsKb",
    "type": "FLOAT"
  },
  {
    "mode": "REQUIRED",
    "name": "totalScriptsMs",
    "type": "INTEGER"
  },
  {
    "mode": "REQUIRED",
    "name": "timestamp",
    "type": "INTEGER"
  },
  {
    "mode": "REPEATED",
    "name": "assets",
    "type": "RECORD",
    "fields": [
      {
        "mode": "REQUIRED",
        "name": "totalKb",
        "type": "FLOAT"
      },
      {
        "mode": "REQUIRED",
        "name": "totalMs",
        "type": "INTEGER"
      },
      {
        "mode": "REQUIRED",
        "name": "type",
        "type": "STRING"
      },
      {
        "mode": "REQUIRED",
        "name": "url",
        "type": "STRING"
      }
    ]
  }
];

function processAssetsList(assetsList) {
  return assetsList.map((asset) => {
    const { url } = asset;
    const totalKb = parseFloat(asset.totalKb);
    const totalMs = parseInt(asset.totalMs.replace(',', ''), 10);
    const type = path.extname(URL.parse(url).pathname).substr(1);

    return {
      totalKb,
      totalMs,
      type,
      url,
    };
  });
}

module.exports = function save(dataset, lighthouseRes) {
  const timestamp = new Date(lighthouseRes.generatedTime).getTime();
  
  const { audits } = lighthouseRes.reportCategories[0];
  const linksBlockingFirstPaint = audits.find(audit => audit.id === 'link-blocking-first-paint');
  const scriptsBlockingFirstPaint = audits.find(audit => audit.id === 'script-blocking-first-paint');

  const totalScriptsMs = scriptsBlockingFirstPaint.result.rawValue;
  const totalLinksMs = linksBlockingFirstPaint.result.rawValue;
  
  const totalLinksKb = linksBlockingFirstPaint.result.extendedInfo.value.results.reduce((result, item) => {
    return Math.max(result, parseFloat(item.totalKb));
  }, 0);

  const totalScriptsKb = scriptsBlockingFirstPaint.result.extendedInfo.value.results.reduce((result, item) => {
    return result + parseFloat(item.totalKb);
  }, 0);

  const assets = [linksBlockingFirstPaint, scriptsBlockingFirstPaint]
    .reduce((result, item) => result.concat(processAssetsList(item.result.extendedInfo.value.results)), []);

  const data = {
    assets,
    build_id: process.env.BUILD_ID || 'none',
    build_system: process.env.BUILD_SYSTEM || 'none',
    timestamp,
    totalScriptsKb,
    totalScriptsMs,
    totalLinksKb,
    totalLinksMs,
    website: lighthouseRes.url,
  };

  debug(data);

  return dataset
    .table('assets_blocking_fmp')
    .insert(data);
}