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

/**
 * @function processAssetsList
 * @param {Array} assetsList List of assets to extract the metrics from
 * @return {Array} An array with the metrics in the proper structure to be stored
 */
function processAssetsList(assetsList) {
  return (assetsList && assetsList.length)
    ? assetsList.map((asset) => {
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
    })
    : [];
}

module.exports = function save(dataset, lighthouseRes) {
  logBasicInfo('Gathering assets blocking First Meaningful Paint from %s', lighthouseRes.url);

  const timestamp = new Date(lighthouseRes.generatedTime).getTime();

  const { audits } = lighthouseRes.reportCategories[0];
  if (!(audits && audits.length)) {
    return Promise.reject(new Error(`There were no "audits" in Lighthouse's reportCategories[0]`));
  }

  const links = audits.find(audit => audit.id === 'link-blocking-first-paint');
  const scripts = audits.find(audit => audit.id === 'script-blocking-first-paint');

  const totalLinksMs = (links && links.result && links.result.rawValue) || 0;

  const totalScriptsMs = (scripts && scripts.result && scripts.result.rawValue) || 0;

  const linksResults = (
    links &&
    links.result &&
    links.result.extendedInfo &&
    links.result.extendedInfo.value &&
    links.result.extendedInfo.value.results
  );
  const totalLinksKb = linksResults && linksResults.length
    ? linksResults.reduce((result, item) => Math.max(result, parseFloat(item.totalKb)), 0)
    : 0;

  const scriptsResults = (
    scripts &&
    scripts.result &&
    scripts.result.extendedInfo &&
    scripts.result.extendedInfo.value &&
    scripts.result.extendedInfo.value.results
  );
  const totalScriptsKb = scriptsResults && scriptsResults.length
    ? scriptsResults.reduce((result, item) => (result + parseFloat(item.totalKb)), 0)
    : 0;

  const assets = [linksResults, scriptsResults]
    .filter(Boolean)
    .reduce((result, item) => result.concat(processAssetsList(item)), []);

  const data = {
    assets,
    build_id: BUILD_ID,
    build_system: BUILD_SYSTEM,
    timestamp,
    totalScriptsKb,
    totalScriptsMs,
    totalLinksKb,
    totalLinksMs,
    website: lighthouseRes.url,
  };

  /** Logs the metrics being stored */
  logExtInfo(data);

  logBasicInfo('Saving assets blocking First Meaningful Paint from %s to BigQuery', lighthouseRes.url);
  return dataset
    .table('assets_blocking_fmp')
    .insert(data);
};
