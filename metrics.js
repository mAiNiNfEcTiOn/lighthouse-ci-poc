// Copyright 2016 Google Inc. All Rights Reserved.
// Licensed under the Apache License, Version 2.0. See LICENSE
'use strict';

module.exports = {
  prepareData
};

function prepareData(res) {
  const audits = res.audits;

  const resSW = audits['service-worker'];

  const resFMP = audits['first-meaningful-paint'];
  const resFMPext = resFMP.extendedInfo;

  const resTTI = audits['time-to-interactive'];
  const resTTIext = resTTI && resTTI.extendedInfo;

  const preparedResults = [
    {
      title: 'Service Worker',
      name: 'sw',
      value: resSW && resSW.rawValue
    },
    {
      title: 'First Contentful Paint',
      name: 'ttfcp',
      value: resFMPext && resFMPext.value.timings.fCP
    },
    {
      title: 'First Meaningful Paint',
      name: 'ttfmp',
      value: resFMP && resFMP.rawValue
    },
    {
      title: 'Time to Interactive',
      name: 'tti',
      value: resTTI && resTTI.rawValue
    },
    {
      title: 'Visually Complete 85%',
      name: 'vc85',
      value: resTTIext && parseFloat(resTTIext.value.timings.visuallyReady)
    }
  ];

  return {
    preparedResults,
    generatedTime: res.generatedTime,
    lighthouseVersion: res.lighthouseVersion,
    initialUrl: res.initialUrl,
    url: res.url
  };
}