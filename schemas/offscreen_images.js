const logBasicInfo = require('debug')('offscreen_images:basic-info');
const logExtInfo = require('debug')('offscreen_images:extended-info');

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
    "name": "potentialSavingsInBytes",
    "type": "FLOAT"
  },
  {
    "mode": "REQUIRED",
    "name": "potentialSavingsInMs",
    "type": "INTEGER"
  },
  {
    "mode": "REQUIRED",
    "name": "timestamp",
    "type": "INTEGER"
  },
  {
    "mode": "REPEATED",
    "name": "images",
    "type": "RECORD",
    "fields": [
      {
        "mode": "REQUIRED",
        "name": "url",
        "type": "STRING"
      },
      {
        "mode": "REQUIRED",
        "name": "totalBytes",
        "type": "INTEGER"
      },
      {
        "mode": "REQUIRED",
        "name": "wastedBytes",
        "type": "INTEGER"
      },
      {
        "mode": "REQUIRED",
        "name": "wastedMs",
        "type": "INTEGER"
      },
      {
        "mode": "REQUIRED",
        "name": "wastedPercent",
        "type": "INTEGER"
      },
      {
        "mode": "REQUIRED",
        "name": "requestStartTime",
        "type": "FLOAT"
      }
    ]
  }
];

/**
 * From the images' list it generates an array of normalized objects to be stored in BigQuery
 *
 * @function processImagesList
 * @param {Array} imagesList
 * @returns {Array}
 */
function processImagesList(imagesList = []) {
  return imagesList.map((image) => {
    const { requestStartTime, totalBytes, url, wastedBytes, wastedMs, wastedPercent } = image;
    return {
      requestStartTime,
      totalBytes,
      url,
      wastedBytes,
      wastedMs,
      wastedPercent,
    };
  });
}

module.exports = function save(dataset, lighthouseRes) {
  logBasicInfo('Gathering offscreen-images %s', lighthouseRes.requestedUrl);

  const timestamp = new Date(lighthouseRes.fetchTime).getTime();

  const { audits } = lighthouseRes;
  if (!audits) {
    return Promise.reject(new Error(`There were no "audits" in Lighthouse's response`));
  }

  const offscreenImagesAudit = audits['offscreen-images'];

  const potentialSavingsInBytes = offscreenImagesAudit.details.overallSavingsBytes;
  const potentialSavingsInMs = offscreenImagesAudit.details.overallSavingsMs;

  const images = processImagesList(offscreenImagesAudit.details.items);

  const data = {
    build_id: process.env.BUILD_ID || 'none',
    build_system: process.env.BUILD_SYSTEM || 'none',
    images,
    potentialSavingsInBytes,
    potentialSavingsInMs,
    timestamp,
    website: lighthouseRes.requestedUrl,
  };

  logExtInfo(data);

  const returnData = { offscreen_images: data };
  if (dataset) {
    logBasicInfo('Saving offscreen-images data from %s to BigQuery', lighthouseRes.requestedUrl);
    return dataset
      .table('offscreen_images')
      .insert(data)
      .then(() => returnData);
  }

  return Promise.resolve(returnData);
};
