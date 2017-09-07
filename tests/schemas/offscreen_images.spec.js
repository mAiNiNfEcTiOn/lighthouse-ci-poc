/**
 * This file tests the schemas/offscreen_images.js
 */
const testSubject = require('../../schemas/offscreen_images');

describe('Schemas', () => {
  describe('Offscreen Images', () => {
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
            images: [],
            potentialSavingsInKb: 0,
            potentialSavingsInMs: 0,
            timestamp: lighthouseResMock.generatedTime.getTime(),
            website: lighthouseResMock.url,
          });
        });
    });

    it('attempts to insert a record on BigQuery with proper values extracted from the audits', () => {
      lighthouseResMock.reportCategories = [{
        audits: [
          {
            id: 'offscreen-images',
            result: {
              extendedInfo: {
                value: {
                  results: [
                    {
                      requestStartTime: 1234,
                      totalBytes: 2345,
                      url: 'http://www.fake.dom/assets/images/fakeImage.jpg',
                      wastedBytes: 300.30,
                      wastedMs: '1,200 ms',
                    },
                    {
                      requestStartTime: 2346,
                      totalBytes: 34567,
                      url: 'http://www.fake.dom/assets/images/fakeImage.jpg',
                      wastedBytes: 100.30,
                      wastedMs: '2,200 ms',
                    },
                  ],
                  wastedKb: 400.60,
                  wastedMs: 3400
                },
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
            images: [
              {
                requestStartTime: 1234,
                totalBytes: 2345,
                url: 'http://www.fake.dom/assets/images/fakeImage.jpg',
                wastedBytes: 300.30,
                wastedMs: 1200,
              },
              {
                requestStartTime: 2346,
                totalBytes: 34567,
                url: 'http://www.fake.dom/assets/images/fakeImage.jpg',
                wastedBytes: 100.30,
                wastedMs: 2200,
              }
            ],
            potentialSavingsInKb: 400.60,
            potentialSavingsInMs: 3400,
            timestamp: lighthouseResMock.generatedTime.getTime(),
            website: lighthouseResMock.url,
          });
      });
    });

    it('when the audits do not contain assets blocking the fmp it will return an empty array for the assets', () => {
      lighthouseResMock.reportCategories = [{
        audits: [
          {
            id: 'offscreen-images',
            result: {
              extendedInfo: {
                value: {
                  results: [],
                },
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
            images: [],
            potentialSavingsInKb: 0,
            potentialSavingsInMs: 0,
            timestamp: lighthouseResMock.generatedTime.getTime(),
            website: lighthouseResMock.url,
          });
        });
    });
  });
});
