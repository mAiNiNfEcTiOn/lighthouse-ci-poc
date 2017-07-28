const path = require('path');

module.exports = {
  clientSecret: {
    installed: {
      auth_provider_x509_cert_url: process.env.CLIENT_SECRET_INSTALLED_AUTH_PROVIDER_X509_CERT_URL,
      auth_uri: process.env.CLIENT_SECRET_INSTALLED_AUTH_URI,
      client_id: process.env.CLIENT_SECRET_INSTALLED_CLIENT_ID,
      client_secret: process.env.CLIENT_SECRET_INSTALLED_CLIENT_SECRET,
      project_id: process.env.CLIENT_SECRET_INSTALLED_PROJECT_ID,
      redirect_uris: [
        'urn:ietf:wg:oauth:2.0:oob',
        process.env.CLIENT_SECRET_INSTALLED_REDIRECT_URIS_CUSTOM_1,
      ],
      token_uri: process.env.CLIENT_SECRET_INSTALLED_TOKEN_URI,
    },
  },

  // AKA feature flags
  flags: {
    chromeFlags: [], // custom flags to pass to Chrome. For a full list of flags, see http://peter.sh/experiments/chromium-command-line-switches/.
    expectations: (process.env.FLAGS_EXPECTATIONS === 'true'), // turn on assertation metrics results against provides values
    output: 'json',
    outputPath: path.join(__dirname, 'results.json'),
    perf: true,
    port: process.env.FLAGS_PORT || 9222,
    runs: process.env.FLAGS_RUNS || '1', // number or runs
    submit: (process.env.FLAGS_SUBMIT === 'true'), // turn on submitting to Google Sheets
    upload: (process.env.FLAGS_UPLOAD === 'true'), // turn on uploading to Google Drive
    view: (process.env.FLAGS_VIEW === 'true'), // open uploaded traces to Google Drive in DevTools
    // Note: pwmetrics supports all flags from Lighthouse
  },
  //   expectations: {
  //     // these expectations values are examples, for your cases set your own
  //     // it's not required to use all metrics, you can use just a few of them
  //     // Read _Available metrics_ where all keys are defined
  //     ttfcp: {
  //       warn: '>=1500',
  //       error: '>=2000'
  //     },
  //     ttfmp: {
  //       warn: '>=2000',
  //       error: '>=3000'
  //     },
  //     // fv: {
  //     //   ...
  //     // },
  //     // psi: {
  //     //   ...
  //     // },
  //     // vc85: {
  //     //   ...
  //     // },
  //     // vs100: {
  //     //   ...
  //     // },
  //     // ttfi: {
  //     //   ...
  //     // },
  //     // ttci: {
  //     //   ...
  //     // }
  //   },
  sheets: {
    options: {
      spreadsheetId: process.env.SHEETS_OPTIONS_SPREADSHEET_ID,
      tableName: process.env.SHEETS_OPTIONS_TABLE_NAME || 'data',
    },
    type: 'GOOGLE_SHEETS', // sheets service type. Available types: GOOGLE_SHEETS
  },
  url: process.env.URL || 'https://www.google.pt',
}