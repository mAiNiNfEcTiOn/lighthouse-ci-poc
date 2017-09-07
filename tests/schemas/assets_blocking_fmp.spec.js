/**
 * This file tests the schemas/assets_blocking_fmp.js
 */
const testSubject = require('../../schemas/assets_blocking_fmp');

describe('Schemas', () => {
  describe('Assets Blocking First Meaningful Paint', () => {
    const mockTable = {};
    const mockDataset = {};
    const lighthouseResMock = {
      generatedTime: new Date(2010, 0, 1, 0, 0 ,0),
      reportCategories: [{}],
      url: 'http://www.fake.dom',
    };

    beforeEach(() => {
      delete process.env.BUILD_ID;
      delete process.env.BUILD_SYSTEM;
      mockTable.insert = jest.fn().mockReturnValue(Promise.resolve());
      mockDataset.table = jest.fn().mockReturnValue(mockTable);
    });

    it('rejects when audits are not provided', () => {
      return testSubject(mockDataset, lighthouseResMock)
        .catch((err) => {
          expect(err).toBeInstanceOf(Error);
          expect(err.message).toBe(`There were no "audits" in Lighthouse's reportCategories[0]`);
          expect(mockDataset.table).not.toHaveBeenCalled();
        });
    });

    it('attempts to insert a record on BigQuery with values of 0 and an empty array when the right audits are not there', () => {
      lighthouseResMock.reportCategories = [{
        audits: [{ id: 'fakeAudit' }],
      }];

      return testSubject(mockDataset, lighthouseResMock)
        .then(() => {
          expect(mockDataset.table).toHaveBeenCalled();
          expect(mockTable.insert).toHaveBeenCalled();
          expect(mockTable.insert).toHaveBeenCalledWith({
            assets: [],
            build_id: 'none',
            build_system: 'none',
            timestamp: lighthouseResMock.generatedTime.getTime(),
            totalScriptsKb: 0,
            totalScriptsMs: 0,
            totalLinksKb: 0,
            totalLinksMs: 0,
            website: lighthouseResMock.url,
          });
        });
    });

    it('attempts to insert a record on BigQuery with proper values extracted from the audits', () => {
      lighthouseResMock.reportCategories = [{
        audits: [
          {
            id: 'link-blocking-first-paint',
            result: {
              extendedInfo: {
                value: {
                  results: [
                    { url: 'http://www.fake.dom/assets/fake.css?v=123', totalKb: '300.30 Kb', totalMs: '6,497ms', },
                    { url: 'http://www.fake.dom/assets/fake2.css', totalKb: '100.20 Kb', totalMs: '3,503ms', },
                  ]
                }
              },
              rawValue: 1000,
            },
          },
          {
            id: 'script-blocking-first-paint',
            result: {
              extendedInfo: {
                value: {
                  results: [
                    { url: 'http://www.fake.dom/assets/fake.js?v=6666', totalKb: '500.20 Kb', totalMs: '2,000ms', },
                  ]
                }
              },
              rawValue: 2000,
            },
          },
        ],
      }];

      return testSubject(mockDataset, lighthouseResMock)
        .then(() => {
          expect(mockDataset.table).toHaveBeenCalled();
          expect(mockTable.insert).toHaveBeenCalled();
          expect(mockTable.insert).toHaveBeenCalledWith({
            assets: [
              { url: 'http://www.fake.dom/assets/fake.css?v=123', totalKb: 300.30, totalMs: 6497, type: 'css' },
              { url: 'http://www.fake.dom/assets/fake2.css', totalKb: 100.20, totalMs: 3503, type: 'css' },
              { url: 'http://www.fake.dom/assets/fake.js?v=6666', totalKb: 500.20, totalMs: 2000, type: 'js' },
            ],
            build_id: 'none',
            build_system: 'none',
            timestamp: lighthouseResMock.generatedTime.getTime(),
            totalScriptsKb: 500.20,
            totalScriptsMs: 2000,
            totalLinksKb: 300.30,
            totalLinksMs: 1000,
            website: lighthouseResMock.url,
          });
        });
    });

    it('when the audits do not contain assets blocking the fmp it will return an empty array for the assets', () => {
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

      return testSubject(mockDataset, lighthouseResMock)
        .then(() => {
          expect(mockDataset.table).toHaveBeenCalled();
          expect(mockTable.insert).toHaveBeenCalled();
          expect(mockTable.insert).toHaveBeenCalledWith({
            assets: [],
            build_id: 'none',
            build_system: 'none',
            timestamp: lighthouseResMock.generatedTime.getTime(),
            totalScriptsKb: 0,
            totalScriptsMs: 0,
            totalLinksKb: 0,
            totalLinksMs: 0,
            website: lighthouseResMock.url,
          });
        });
    });
  });
});
