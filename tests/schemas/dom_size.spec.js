/**
 * This file tests the schemas/dom_size.js
 */
const testSubject = require('../../schemas/dom_size');

describe('Schemas', () => {
  describe('DOM Size', () => {
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
            build_id: 'none',
            build_system: 'none',
            metrics: [],
            timestamp: lighthouseResMock.generatedTime.getTime(),
            totalDOMNodes: 0,
            website: lighthouseResMock.url,
          });
        });
    });

    it('attempts to insert a record on BigQuery with proper values extracted from the audits', () => {
      lighthouseResMock.reportCategories = [{
        audits: [
          {
            id: 'dom-size',
            result: {
              extendedInfo: {
                value: [
                  { snippet: 'fakeSnippet', target: '< 3,500', title: 'fakeTitle', value: '2,000 nodes' },
                  { snippet: 'fakeSnippet2', target: '< 3,500', title: 'fakeTitle2', value: '1,000 nodes' },
                ],
              },
              rawValue: 3000,
            },
          },
        ],
      }];

      return testSubject(mockDataset, lighthouseResMock)
        .then(() => {
          expect(mockDataset.table).toHaveBeenCalled();
          expect(mockTable.insert).toHaveBeenCalled();
          expect(mockTable.insert).toHaveBeenCalledWith({
            build_id: 'none',
            build_system: 'none',
            metrics: [
              {
                metricName: 'fakeTitle',
                metricSnippet: 'fakeSnippet',
                metricTarget: 3500,
                metricValue: 2000
              },
              {
                metricName: 'fakeTitle2',
                metricSnippet: 'fakeSnippet2',
                metricTarget: 3500,
                metricValue: 1000,
              },
            ],
            timestamp: lighthouseResMock.generatedTime.getTime(),
            totalDOMNodes: 3000,
            website: lighthouseResMock.url,
          });
      });
    });

    it('when the audits do not contain assets blocking the fmp it will return an empty array for the assets', () => {
      lighthouseResMock.reportCategories = [{
        audits: [
          {
            id: 'dom-size',
            result: {
              extendedInfo: {
                value: [],
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
            build_id: 'none',
            build_system: 'none',
            metrics: [],
            timestamp: lighthouseResMock.generatedTime.getTime(),
            totalDOMNodes: 0,
            website: lighthouseResMock.url,
          });
        });
    });
  });
});
