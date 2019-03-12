const path = require('path');
const URL = require('url');

const {
  BUILD_ID = 'none',
  BUILD_SYSTEM = 'none',
} = process.env;

const logBasicInfo = require('debug')('assets_blocking_fmp:basic-info');
const logExtInfo = require('debug')('assets_blocking_fmp:extended-info');

/** @type {Object} schema Defines the table's structure to store the metrics */
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
    "name": "totalLinksBytes",
    "type": "FLOAT"
  },
  {
    "mode": "REQUIRED",
    "name": "totalLinksMs",
    "type": "INTEGER"
  },
  {
    "mode": "REQUIRED",
    "name": "totalScriptsBytes",
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
        "name": "totalBytes",
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

/**
 * @function processAssetsListMapper
 * @param {Array} assetsList List of assets to extract the metrics from
 * @return {Array} An array with the metrics in the proper structure to be stored
 */
function processAssetsListMapper(asset) {
  const { url } = asset;
  const totalBytes = asset.totalBytes;
  const totalMs = asset.wastedMs;
  const type = path.extname(URL.parse(url).pathname).substr(1);

  return {
    totalBytes,
    totalMs,
    type,
    url,
  };
}

module.exports = function save(dataset, lighthouseRes) {
  logBasicInfo('Gathering assets blocking First Meaningful Paint from %s', lighthouseRes.requestedUrl);

  const timestamp = new Date(lighthouseRes.fetchTime).getTime();

  const { audits } = lighthouseRes;
  if (!audits) {
    return Promise.reject(new Error(`There were no "audits" in Lighthouse's response`));
  }

  const renderBlockingResources = audits['render-blocking-resources'];

  const totalLinksBytes = renderBlockingResources.details.items
    .filter((item) => item.url.includes('/css/') || (path.extname(URL.parse(item.url).pathname) === '.css'))
    .reduce((acc, item) => (acc + item.totalBytes), 0);

  const totalScriptsBytes = renderBlockingResources.details.items
    .filter((item) => path.extname(URL.parse(item.url).pathname) === '.js')
    .reduce((acc, item) => (acc + item.totalBytes), 0);

  const totalLinksMs = renderBlockingResources.details.items
    .filter((item) => item.url.includes('/css/') || (path.extname(URL.parse(item.url).pathname) === '.css'))
    .reduce((acc, item) => (acc + item.wastedMs), 0);

  const totalScriptsMs = renderBlockingResources.details.items
    .filter((item) => path.extname(URL.parse(item.url).pathname) === '.js')
    .reduce((acc, item) => (acc + item.wastedMs), 0);

  const assets = renderBlockingResources.details.items.map(processAssetsListMapper);

  const data = {
    assets,
    build_id: BUILD_ID,
    build_system: BUILD_SYSTEM,
    timestamp,
    totalScriptsBytes,
    totalScriptsMs,
    totalLinksBytes,
    totalLinksMs,
    website: lighthouseRes.requestedUrl,
  };

  /** Logs the metrics being stored */
  logExtInfo(data);

  logBasicInfo('Saving assets blocking First Meaningful Paint from %s to BigQuery', lighthouseRes.requestedUrl);

  const returnData = { assets_blocking_fmp: data };

  if (dataset) {
    return dataset
      .table('assets_blocking_fmp')
      .insert(data)
      .then(() => returnData);
  }

  return Promise.resolve(returnData);
};
