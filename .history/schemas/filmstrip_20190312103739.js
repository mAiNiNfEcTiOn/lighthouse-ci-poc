const logBasicInfo = require('debug')('filmstrip:basic-info');
const logExtInfo = require('debug')('filmstrip:extended-info');

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
    "name": "screenshots",
    "type": "RECORD",
    "fields": [
      {
        "mode": "REQUIRED",
        "name": "data",
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
  logBasicInfo('Gathering the filmstrip of %s loading process', lighthouseRes.url);

  const timestamp = new Date(lighthouseRes.generatedTime).getTime();

  const { audits } = lighthouseRes.reportCategories[0];
  if (!(audits && audits.length)) {
    return Promise.reject(new Error(`There were no "audits" in Lighthouse's reportCategories[0]`));
  }

  const filmstripAudit = lighthouseRes.reportCategories[0].audits.find(item => (item.id === 'screenshot-thumbnails'));
  const filmstripItems = (
    filmstripAudit &&
    filmstripAudit.result &&
    filmstripAudit.result.details &&
    filmstripAudit.result.details.items
  );

  const screenshots = filmstripItems && filmstripItems.length
    ? filmstripItems.map(({ data, timing }) => ({ data, timestamp, timing }))
    : [];


  const dataObj = {
    build_id: process.env.BUILD_ID || 'none',
    build_system: process.env.BUILD_SYSTEM || 'none',
    screenshots,
    timestamp,
    website: lighthouseRes.url,
  };

  logExtInfo(dataObj);

  logBasicInfo('Saving the filmstrip of %s loading process to BigQuery', lighthouseRes.url);

  const returnData = { filmstrip: dataObj };
  if (dataset) {
    return dataset
      .table('filmstrip')
      .insert(dataObj)
      .then(() => returnData);
  }

  return returnData;
};
