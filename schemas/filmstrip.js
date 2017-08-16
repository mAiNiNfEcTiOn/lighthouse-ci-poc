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
  const timestamp = new Date(lighthouseRes.generatedTime).getTime();

  const data = {
    build_id: process.env.BUILD_ID || 'none',
    build_system: process.env.BUILD_SYSTEM || 'none',
    screenshots: lighthouseRes.reportCategories[0].audits
      .find(item => (item.id === 'screenshot-thumbnails'))
      .result.details.items.map(({ data, timing }) => ({ data, timestamp, timing })),
    timestamp,
    website: lighthouseRes.url,
  };

  return dataset
    .table('filmstrip')
    .insert(data);
}