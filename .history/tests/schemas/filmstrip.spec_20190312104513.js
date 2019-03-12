/**
 * This file tests the schemas/filmstrip.js
 */
const testSubject = require('../../schemas/filmstrip');

describe('Schemas', () => {
  describe('Filmstrip', () => {
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
            screenshots: [],
            timestamp: lighthouseResMock.generatedTime.getTime(),
            website: lighthouseResMock.url,
          });
        });
    });

    it('attempts to insert a record on BigQuery with proper values extracted from the audits', () => {
      lighthouseResMock.reportCategories = [{
        audits: [
          {
            id: 'screenshot-thumbnails',
            result: {
              details: {
                items: [
                  { data: 'fakeBase64Image', timing: 123123213 },
                  { data: 'fakeBase64Image2', timing: 123123214 },
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
            screenshots: [
              {
                data: 'fakeBase64Image',
                timing: 123123213,
                timestamp: lighthouseResMock.generatedTime.getTime(),
              },
              {
                data: 'fakeBase64Image2',
                timing: 123123214,
                timestamp: lighthouseResMock.generatedTime.getTime(),
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
            id: 'screenshot-thumbnails',
            result: {
              details: {
                items: [],
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
            screenshots: [],
            timestamp: lighthouseResMock.generatedTime.getTime(),
            website: lighthouseResMock.url,
          });
          expect(result).toMatchObject({
            filmstrip: {
              build_id: 'none',
              build_system: 'none',
              screenshots: [],
              timestamp: lighthouseResMock.generatedTime.getTime(),
              website: lighthouseResMock.url,
            }
          });
        });
    });
  });
});
