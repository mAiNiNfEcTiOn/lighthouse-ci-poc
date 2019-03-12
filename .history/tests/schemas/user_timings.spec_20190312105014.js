/**
 * This file tests the schemas/user_timings.js
 */
const testSubject = require('../../schemas/user_timings');

describe('Schemas', () => {
  describe('User Timings', () => {
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
            website: lighthouseResMock.url,
          });
        });
    });

    it('attempts to insert a record on BigQuery with proper values extracted from the audits', () => {
      lighthouseResMock.reportCategories = [{
        audits: [
          {
            id: 'user-timings',
            result: {
              extendedInfo: {
                value: [
                  {
                    duration: 5000,
                    endTime: 6000.30,
                    name: 'fakeName',
                    startTime: 1000.30,
                  },
                  {
                    duration: 2000,
                    endTime: 8500.22,
                    name: 'fakeName2',
                    startTime: 6500.22,
                  },
                ],
              },
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
                metricDuration: 5000,
                metricEndTime: 6000.30,
                metricName: 'fakeName',
                metricStartTime: 1000.30,
              },
              {
                metricDuration: 2000,
                metricEndTime: 8500.22,
                metricName: 'fakeName2',
                metricStartTime: 6500.22,
              },
            ],
            timestamp: lighthouseResMock.generatedTime.getTime(),
            website: lighthouseResMock.url,
          });
      });
    });

    it('when the audits do not contain assets blocking the fmp it will return an empty array for the assets', () => {
      lighthouseResMock.reportCategories = [{
        audits: [
          {
            id: 'user-timings',
            result: {
              extendedInfo: {
                value: [],
              },
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
            website: lighthouseResMock.url,
          });
        });
    });

    it('when the audits do not contain assets blocking the fmp it will return an empty array for the assets', () => {
      lighthouseResMock.reportCategories = [{
        audits: [
          {
            id: 'user-timings',
            result: {
              extendedInfo: {
                value: [],
              },
            },
          },
        ],
      }];

      return testSubject(mockDataset, lighthouseResMock)
        .then((result) => {
          expect(mockDataset.table).toHaveBeenCalled();
          expect(mockTable.insert).toHaveBeenCalled();
          expect(mockTable.insert).toHaveBeenCalledWith({
            build_id: 'none',
            build_system: 'none',
            metrics: [],
            timestamp: lighthouseResMock.generatedTime.getTime(),
            website: lighthouseResMock.url,
          });
          expect(result).toMatchObject({
            user_timings: {
              build_id: 'none',
              build_system: 'none',
              metrics: [],
              timestamp: lighthouseResMock.generatedTime.getTime(),
              website: lighthouseResMock.url,
            }
          });
        });
    });

    it('only returns the data without trying to store in the database when dataset is falsy', () => {
      lighthouseResMock.reportCategories = [{
        audits: [
          {
            id: 'user-timings',
            result: {
              extendedInfo: {
                value: [],
              },
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
            timestamp: lighthouseResMock.generatedTime.getTime(),
            website: lighthouseResMock.url,
          });
          expect(result).toMatchObject({
            user_timings: {
              build_id: 'none',
              build_system: 'none',
              metrics: [],
              timestamp: lighthouseResMock.generatedTime.getTime(),
              website: lighthouseResMock.url,
            }
          });
        });
    });
  });
});
