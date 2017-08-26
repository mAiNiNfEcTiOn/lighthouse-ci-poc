const path = require('path');
const URL = require('url');

const debug = require('debug')('offscreen_images');

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
  const timestamp = new Date(lighthouseRes.generatedTime).getTime();
  
  const offscreenImagesAudit = lighthouseRes.reportCategories[0].audits.find(audit => audit.id === 'offscreen-images');

  const potentialSavingsInKb = offscreenImagesAudit.result.extendedInfo.value.wastedKb;
  const potentialSavingsInMs = offscreenImagesAudit.result.extendedInfo.value.wastedMs;
  
  const images = processImagesList(offscreenImagesAudit.result.extendedInfo.value.results);

  const data = {
    build_id: process.env.BUILD_ID || 'none',
    build_system: process.env.BUILD_SYSTEM || 'none',
    images,
    potentialSavingsInKb,
    potentialSavingsInMs,
    timestamp,
    website: lighthouseRes.url,
  };

  debug(data);
  
  return dataset
    .table('offscreen_images')
    .insert(data);
}