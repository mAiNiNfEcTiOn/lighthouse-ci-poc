const clientSecret = require('./client_secret.json');

module.exports = {
  url: process.env.LAUNCH_URL || 'https://www.google.pt',
  flags: { // AKA feature flags
    runs: '1', // number or runs
    submit: (process.env.SHOULD_SUBMIT === 'true'), // turn on submitting to Google Sheets
    upload: (process.env.SHOULD_UPLOAD === 'true'), // turn on uploading to Google Drive
    view: (process.env.SHOULD_VIEW_TRACES === 'true'), // open uploaded traces to Google Drive in DevTools
    expectations: (process.env.SHOULD_ENABLE_EXPECTATIONS === 'true'), // turn on assertation metrics results against provides values
    chromeFlags: [
        '--headless',
    ], // custom flags to pass to Chrome. For a full list of flags, see http://peter.sh/experiments/chromium-command-line-switches/.
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
    type: 'GOOGLE_SHEETS', // sheets service type. Available types: GOOGLE_SHEETS
    options: {
      spreadsheetId: '1h08km23-lPU_szJARrLBIw9VvstWhp-tHW3ZwMLrn4Q',
      tableName: 'data'
    }
  },
  clientSecret
}