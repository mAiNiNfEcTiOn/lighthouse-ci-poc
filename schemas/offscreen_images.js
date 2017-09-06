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
    "name": "potentialSavingsInKb",
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
function processImagesList(imagesList) {
  return imagesList.map((image) => {
    const { requestStartTime, totalBytes, url, wastedBytes, wastedMs } = image;
    return {
      requestStartTime,
      totalBytes,
      url,
      wastedBytes,
      wastedMs: parseInt(wastedMs.replace(',', ''), 10),
    };
  });
}

module.exports = function save(dataset, lighthouseRes) {
  logBasicInfo('Gathering offscreen-images %s', lighthouseRes.url);

  const timestamp = new Date(lighthouseRes.generatedTime).getTime();

  const { audits } = lighthouseRes.reportCategories[0];
  if (!(audits && audits.length)) {
    return Promise.reject(new Error(`There were no "audits" in Lighthouse's reportCategories[0]`));
  }

  const offscreenImagesAudit = audits.find(audit => (audit.id === 'offscreen-images'));
  const offscreenImagesValue = (
    offscreenImagesAudit &&
    offscreenImagesAudit.result &&
    offscreenImagesAudit.result.extendedInfo &&
    offscreenImagesAudit.result.extendedInfo.value
  );
  const offscreenImagesResults = offscreenImagesValue && offscreenImagesValue.results;

  const potentialSavingsInKb = offscreenImagesValue && offscreenImagesValue.wastedKb
    ? offscreenImagesValue.wastedKb
    : 0;
  const potentialSavingsInMs = offscreenImagesValue && offscreenImagesValue.wastedMs
    ? offscreenImagesValue.wastedMs
    : 0;

  const images = offscreenImagesResults && offscreenImagesResults.length
    ? processImagesList(offscreenImagesResults)
    : [];

  const data = {
    build_id: process.env.BUILD_ID || 'none',
    build_system: process.env.BUILD_SYSTEM || 'none',
    images,
    potentialSavingsInKb,
    potentialSavingsInMs,
    timestamp,
    website: lighthouseRes.url,
  };

  logExtInfo(data);

  logBasicInfo('Saving offscreen-images data from %s to BigQuery', lighthouseRes.url);
  return dataset
    .table('offscreen_images')
    .insert(data);
};
