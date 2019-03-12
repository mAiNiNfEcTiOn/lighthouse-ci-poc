/**
 * This file tests the schemas/dom_size.js
 */
const testSubject = require('../../schemas/dom_size');

describe('Schemas', () => {
  describe('DOM Size', () => {
    const mockTable = {};
    const mockDataset = {};
    const lighthouseResMock = {
      fetchTime: new Date(2010, 0, 1, 0, 0 ,0),
      reportCategories: [{}],
      requestedUrl: 'http://www.fake.dom',
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
          expect(err.message).toBe(`There were no "audits" in Lighthouse's response`);
          expect(mockDataset.table).not.toHaveBeenCalled();
        });
    });

    it('attempts to insert a record on BigQuery with values of 0 and an empty array when the right audits are not there', () => {
      lighthouseResMock.audits = {
        'dom-size': {
          details: {
            items: [],
          }
        }
      };

      return testSubject(mockDataset, lighthouseResMock)
        .then(() => {
          expect(mockDataset.table).toHaveBeenCalled();
          expect(mockTable.insert).toHaveBeenCalled();
          expect(mockTable.insert).toHaveBeenCalledWith({
            build_id: 'none',
            build_system: 'none',
            metrics: [],
            timestamp: lighthouseResMock.fetchTime.getTime(),
            totalDOMNodes: 0,
            website: lighthouseResMock.requestedUrl,
          });
        });
    });

    it('attempts to insert a record on BigQuery with proper values extracted from the audits', () => {
      lighthouseResMock.audits = {
        'dom-size': {
          details: {
            items: [
              {
                element: {
                  type: 'code',
                  value: 'fakeSnippet',
               },
               statistic: 'fakeTitle',
               value: '2000',
              },
              {

                element: {
                  type: 'code',
                  value: 'fakeSnippet2',
               },
               statistic: 'fakeTitle2',
               value: '1000',
              },
            ],
          },
          rawValue: 3000,
        }
      };

      return testSubject(mockDataset, lighthouseResMock)
        .then(() => {
          expect(mockDataset.table).toHaveBeenCalled();
          expect(mockTable.insert).toHaveBeenCalled();
          expect(mockTable.insert).toHaveBeenCalledWith({
            build_id: 'none',
            build_system: 'none',
            metrics: [
              {
                metricElementType: 'code',
                metricElementValue: 'fakeSnippet',
                metricName: 'fakeTitle',
                metricValue: 2000
              },
              {
                metricElementType: 'code',
                metricElementValue: 'fakeSnippet2',
                metricName: 'fakeTitle2',
                metricValue: 1000,
              },
            ],
            timestamp: lighthouseResMock.fetchTime.getTime(),
            totalDOMNodes: 3000,
            website: lighthouseResMock.requestedUrl,
          });
      });
    });

    it('when the audits do not contain assets blocking the fmp it will return an empty array for the assets', () => {
      lighthouseResMock.audits = {
        'dom-size': {
          details: {
            items: [],
          },
          rawValue: 0,
        }
      };

      return testSubject(mockDataset, lighthouseResMock)
        .then((result) => {
          expect(mockDataset.table).toHaveBeenCalled();
          expect(mockTable.insert).toHaveBeenCalled();
          expect(mockTable.insert).toHaveBeenCalledWith({
            build_id: 'none',
            build_system: 'none',
            metrics: [],
            timestamp: lighthouseResMock.fetchTime.getTime(),
            totalDOMNodes: 0,
            website: lighthouseResMock.requestedUrl,
          });

          expect(result).toMatchObject({
            dom_size: {
              build_id: 'none',
              build_system: 'none',
              metrics: [],
              timestamp: lighthouseResMock.fetchTime.getTime(),
              totalDOMNodes: 0,
              website: lighthouseResMock.requestedUrl,
            }
          })
        });
    });

    it('only returns the data without trying to store in the database when dataset is falsy', () => {
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

      return testSubject(false, lighthouseResMock)
        .then((result) => {
          expect(mockTable.insert).not.toHaveBeenCalled();
          expect(mockTable.insert).not.toHaveBeenCalledWith({
            build_id: 'none',
            build_system: 'none',
            metrics: [],
            timestamp: lighthouseResMock.fetchTime.getTime(),
            totalDOMNodes: 0,
            website: lighthouseResMock.requestedUrl,
          });

          expect(result).toMatchObject({
            dom_size: {
              build_id: 'none',
              build_system: 'none',
              metrics: [],
              timestamp: lighthouseResMock.fetchTime.getTime(),
              totalDOMNodes: 0,
              website: lighthouseResMock.requestedUrl,
            }
          })
        });
    });
  });
});
