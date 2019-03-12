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
  logBasicInfo('Gathering the filmstrip of %s loading process', lighthouseRes.requestedUrl);

  const timestamp = new Date(lighthouseRes.fetchTime).getTime();

  const { audits } = lighthouseRes;
  if (!audits) {
    return Promise.reject(new Error(`There were no "audits" in Lighthouse's response`));
  }

  const filmstripAudit = lighthouseRes.audits['screenshot-thumbnails'];

  const screenshots = filmstripAudit.details.items.map(({ data, timing }) => ({ data, timestamp, timing }));

  const dataObj = {
    build_id: process.env.BUILD_ID || 'none',
    build_system: process.env.BUILD_SYSTEM || 'none',
    screenshots,
    timestamp,
    website: lighthouseRes.requestedUrl,
  };

  logExtInfo(dataObj);


  const returnData = { filmstrip: dataObj };
  if (dataset) {
    logBasicInfo('Saving the filmstrip of %s loading process to BigQuery', lighthouseRes.requestedUrl);
    return dataset
      .table('filmstrip')
      .insert(dataObj)
      .then(() => returnData);
  }

  return Promise.resolve(returnData);
};
