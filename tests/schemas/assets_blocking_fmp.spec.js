/**
 * This file tests the schemas/assets_blocking_fmp.js
 */
const testSubject = require('../../schemas/assets_blocking_fmp');

describe('Schemas', () => {
  describe('Assets Blocking First Meaningful Paint', () => {
    const mockTable = {};
    const mockDataset = {};
    const lighthouseResMock = {
      audits: {},
      fetchTime: new Date(2010, 0, 1, 0, 0 ,0),
      requestedUrl: 'http://www.fake.dom',
    };

    beforeEach(() => {
      delete process.env.BUILD_ID;
      delete process.env.BUILD_SYSTEM;
      mockTable.insert = jest.fn().mockReturnValue(Promise.resolve());
      mockDataset.table = jest.fn().mockReturnValue(mockTable);
    });

    it('rejects when audits are not provided', () => {
      return testSubject(mockDataset, Object.assign({}, lighthouseResMock, { audits: null }))
        .catch((err) => {
          expect(err).toBeInstanceOf(Error);
          expect(err.message).toBe(`There were no "audits" in Lighthouse's response`);
          expect(mockDataset.table).not.toHaveBeenCalled();
        });
    });

    it('attempts to insert a record on BigQuery with values of 0 and an empty array when the right audits are not there', () => {
      lighthouseResMock.audits = {
        'render-blocking-resources': {
          details: {
            items: [],
          },
        },
      };

      return testSubject(mockDataset, lighthouseResMock)
        .then(() => {
          expect(mockDataset.table).toHaveBeenCalled();
          expect(mockTable.insert).toHaveBeenCalled();
          expect(mockTable.insert).toHaveBeenCalledWith({
            assets: [],
            build_id: 'none',
            build_system: 'none',
            timestamp: lighthouseResMock.fetchTime.getTime(),
            totalScriptsBytes: 0,
            totalScriptsMs: 0,
            totalLinksBytes: 0,
            totalLinksMs: 0,
            website: lighthouseResMock.requestedUrl,
          });
        });
    });

    it('attempts to insert a record on BigQuery with proper values extracted from the audits', () => {
      lighthouseResMock.audits = {
        'render-blocking-resources': {
          details: {
            items: [
              { url: 'http://www.fake.dom/css/bundle?v=124', totalBytes: 32030, wastedMs: 6497, },
              { url: 'http://www.fake.dom/assets/fake.css?v=123', totalBytes: 30030, wastedMs: 6497, },
              { url: 'http://www.fake.dom/assets/fake2.css', totalBytes: 10020, wastedMs: 3503, },
              { url: 'http://www.fake.dom/assets/fake.js?v=6666', totalBytes: 50020, wastedMs: 2000, },
            ]
          },
        },
      };

      return testSubject(mockDataset, lighthouseResMock)
        .then(() => {
          expect(mockDataset.table).toHaveBeenCalled();
          expect(mockTable.insert).toHaveBeenCalled();
          expect(mockTable.insert).toHaveBeenCalledWith({
            assets: [
              { url: 'http://www.fake.dom/css/bundle?v=124', totalBytes: 32030, totalMs: 6497, type: '' },
              { url: 'http://www.fake.dom/assets/fake.css?v=123', totalBytes: 30030, totalMs: 6497, type: 'css' },
              { url: 'http://www.fake.dom/assets/fake2.css', totalBytes: 10020, totalMs: 3503, type: 'css' },
              { url: 'http://www.fake.dom/assets/fake.js?v=6666', totalBytes: 50020, totalMs: 2000, type: 'js' },
            ],
            build_id: 'none',
            build_system: 'none',
            timestamp: lighthouseResMock.fetchTime.getTime(),
            totalScriptsBytes: 50020,
            totalScriptsMs: 2000,
            totalLinksBytes: 72080,
            totalLinksMs: 16497,
            website: lighthouseResMock.requestedUrl,
          });
        });
    });

    it('when the audits do not contain assets blocking the fmp it will return an empty array for the assets', () => {
      lighthouseResMock.audits = {
        'render-blocking-resources': {
          details: {
            items: []
          },
        },
      };

      return testSubject(mockDataset, lighthouseResMock)
        .then((result) => {
          expect(mockDataset.table).toHaveBeenCalled();
          expect(mockTable.insert).toHaveBeenCalled();
          expect(mockTable.insert).toHaveBeenCalledWith({
            assets: [],
            build_id: 'none',
            build_system: 'none',
            timestamp: lighthouseResMock.fetchTime.getTime(),
            totalScriptsBytes: 0,
            totalScriptsMs: 0,
            totalLinksBytes: 0,
            totalLinksMs: 0,
            website: lighthouseResMock.requestedUrl,
          });

          expect(result).toMatchObject({
            assets_blocking_fmp: {
              assets: [],
              build_id: 'none',
              build_system: 'none',
              timestamp: lighthouseResMock.fetchTime.getTime(),
              totalScriptsBytes: 0,
              totalScriptsMs: 0,
              totalLinksBytes: 0,
              totalLinksMs: 0,
              website: lighthouseResMock.requestedUrl,
            }
          });
        });
    });

    it('only returns the data without trying to store in the database when dataset is falsy', () => {
      lighthouseResMock.reportCategories = [{
        audits: [
          {
            id: 'link-blocking-first-paint',
            result: {
              extendedInfo: {
                value: {
                  results: []
                }
              },
              rawValue: 0,
            },
          },
          {
            id: 'script-blocking-first-paint',
            result: {
              extendedInfo: {
                value: {
                  results: []
                }
              },
              rawValue: 0,
            },
          },
        ],
      }];

      return testSubject(false, lighthouseResMock)
        .then((result) => {
          expect(mockTable.insert).not.toHaveBeenCalled();
          expect(mockTable.insert).not.toHaveBeenCalledWith({
            assets: [],
            build_id: 'none',
            build_system: 'none',
            timestamp: lighthouseResMock.fetchTime.getTime(),
            totalScriptsBytes: 0,
            totalScriptsMs: 0,
            totalLinksBytes: 0,
            totalLinksMs: 0,
            website: lighthouseResMock.requestedUrl,
          });

          expect(result).toMatchObject({
            assets_blocking_fmp: {
              assets: [],
              build_id: 'none',
              build_system: 'none',
              timestamp: lighthouseResMock.fetchTime.getTime(),
              totalScriptsBytes: 0,
              totalScriptsMs: 0,
              totalLinksBytes: 0,
              totalLinksMs: 0,
              website: lighthouseResMock.requestedUrl,
            }
          });
        });
    });
  });
});
