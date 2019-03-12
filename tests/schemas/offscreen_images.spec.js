/**
 * This file tests the schemas/offscreen_images.js
 */
const testSubject = require('../../schemas/offscreen_images');

describe('Schemas', () => {
  describe('Offscreen Images', () => {
    const mockTable = {};
    const mockDataset = {};
    const lighthouseResMock = {
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
      return testSubject(mockDataset, lighthouseResMock)
        .catch((err) => {
          expect(err).toBeInstanceOf(Error);
          expect(err.message).toBe(`There were no "audits" in Lighthouse's response`);
          expect(mockDataset.table).not.toHaveBeenCalled();
        });
    });

    it('attempts to insert a record on BigQuery with values of 0 and an empty array when the right audits are not there', () => {
      lighthouseResMock.audits = {
        'offscreen-images': {
          details: {
            items: [],
            overallSavingsMs: 0,
            overallSavingsBytes: 0
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
            images: [],
            potentialSavingsInBytes: 0,
            potentialSavingsInMs: 0,
            timestamp: lighthouseResMock.fetchTime.getTime(),
            website: lighthouseResMock.requestedUrl,
          });
        });
    });

    it('attempts to insert a record on BigQuery with proper values extracted from the audits', () => {
      lighthouseResMock.audits = {
        'offscreen-images': {
          details: {
            type: "opportunity",
            items: [
              {
                "url": "http://www.fake.dom/assets/images/fakeImage.jpg",
                "requestStartTime": 1234,
                "totalBytes": 2345,
                "wastedBytes": 300.30,
                "wastedPercent": 100
              },
              {
                "url": "http://www.fake.dom/assets/images/fakeImage.jpg",
                "requestStartTime": 2346,
                "totalBytes": 34567,
                "wastedBytes": 100.30,
                "wastedPercent": 100
              },
            ],
            "overallSavingsMs": 2550,
            "overallSavingsBytes": 463325
          },
        }
      };

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
                wastedPercent: 100,
              },
              {
                requestStartTime: 2346,
                totalBytes: 34567,
                url: 'http://www.fake.dom/assets/images/fakeImage.jpg',
                wastedBytes: 100.30,
                wastedPercent: 100,
              }
            ],
            potentialSavingsInBytes: 463325,
            potentialSavingsInMs: 2550,
            timestamp: lighthouseResMock.fetchTime.getTime(),
            website: lighthouseResMock.requestedUrl,
          });
      });
    });

    it('only returns the data without trying to store in the database when dataset is falsy', () => {
      lighthouseResMock.audits = {
        'offscreen-images': {
          details: {
            type: "opportunity",
            items: [],
            "overallSavingsMs": 0,
            "overallSavingsBytes": 0
          },
        }
      };

      return testSubject(false, lighthouseResMock)
        .then((result) => {
          expect(mockTable.insert).not.toHaveBeenCalled();
          expect(mockTable.insert).not.toHaveBeenCalledWith({
            build_id: 'none',
            build_system: 'none',
            images: [],
            potentialSavingsInKb: 0,
            potentialSavingsInMs: 0,
            timestamp: lighthouseResMock.fetchTime.getTime(),
            website: lighthouseResMock.requestedUrl,
          });
          expect(result).toMatchObject({
            offscreen_images: {
              build_id: 'none',
              build_system: 'none',
              images: [],
              potentialSavingsInBytes: 0,
              potentialSavingsInMs: 0,
              timestamp: lighthouseResMock.fetchTime.getTime(),
              website: lighthouseResMock.requestedUrl,
            }
          });
        });
    });
  });
});
