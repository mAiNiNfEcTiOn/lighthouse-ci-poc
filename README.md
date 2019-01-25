# lighthouse-ci-poc
[![Build Status](https://travis-ci.org/mAiNiNfEcTiOn/lighthouse-ci-poc.svg?branch=master)](https://travis-ci.org/mAiNiNfEcTiOn/lighthouse-ci-poc)
[![codecov](https://codecov.io/gh/mAiNiNfEcTiOn/lighthouse-ci-poc/branch/master/graph/badge.svg)](https://codecov.io/gh/mAiNiNfEcTiOn/lighthouse-ci-poc)


This tool makes use of [Lighthouse](https://github.com/GoogleChrome/lighthouse) to gather performance metrics of a specific URL.

## Supported Environment Variables:

* `BIGQUERY_PROJECT_ID` - When this variable is set it will enable the process of storing the data into [Google BigQuery](https://cloud.google.com/bigquery/what-is-bigquery). By doing so, it expects that a file `client_secret.json` exists in the root folder of the tool.

* `URL` - The URL to gather the metrics from. Default value: `https://www.google.com`

* `DEBUG` - This project uses the package [`debug`](https://github.com/visionmedia/debug), which allows you to visualize the data generated on several parts of the project. E.g.: `DEBUG=lighthouse-response URL=https://www.google.com npm start` will show the response provided by the [Lighthouse](https://github.com/GoogleChrome/lighthouse) tool.

## Usage:

### Basic mode:

In the basic mode it just gathers metrics without displaying them.

Syntax: `URL=<yourUrl> npm start`

E.g.: `URL=https://www.facebook.com npm start`

You can display them by doing: `DEBUG=lighthouse-response URL=https://www.facebook.com npm start`

### BigQuery mode:

In this mode, this tool will make use of the [schemas](https://github.com/mAiNiNfEcTiOn/lighthouse-ci-poc/tree/master/schemas) folder (and its files) and will store the data on specific tables of a specific dataset (`perfmatters`).

To enable the BigQuery Mode, you run the command with the environment variable `BIGQUERY_PROJECT_ID`:

`BIGQUERY_PROJECT_ID=<yourProjectOnGoogleCloud> URL=<yourUrl> npm start`

If you want to see what is being stored, while storing into BigQuery, just use the DEBUG environment variable:

`DEBUG=<schemaFile> BIGQUERY_PROJECT_ID=<yourProjectOnGoogleCloud> URL=<yourUrl> npm start`

E.g:

`DEBUG=filmstrip BIGQUERY_PROJECT_ID=myProject URL=http://localhost:3001 npm start`


### Running it locally, without Docker:

As you can see on our `.travis.yml` file, we rely on [justinribeiro's Docker image](https://hub.docker.com/r/justinribeiro/chrome-headless/) to get the Chrome headless exposed.

However if you want to run it locally and don't want to use Docker, that's fine you can do it. You just need to start your browser and expose the port 9222 as the remote-interface protocol's one.

You can check more info on this article from Eric Bidelman - [Getting Started with Headless Chrome](https://developers.google.com/web/updates/2017/04/headless-chrome#cli).

Being `headless` is optional, but I've been running Chrome Canary with these flags:

* --headless
* --disable-gpu
* --disable-translate
* --remote-debugging-port=9222
* --disable-extensions
* --disable-background-networking
* --safebrowsing-disable-auto-update
* --disable-sync
* --metrics-recording-only
* --disable-default-apps
* --mute-audio
* --no-first-run

## Issues

Well, use the _issues_ section!
