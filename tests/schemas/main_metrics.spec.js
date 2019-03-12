/**
 * This file tests the schemas/main_metrics.js
 */
jest.mock('pwmetrics/lib/metrics/metrics-adapter', () => ({
  adaptMetricsData: jest.fn(),
}));
const { adaptMetricsData } = require('pwmetrics/lib/metrics/metrics-adapter');

const testSubject = require('../../schemas/main_metrics');

describe('Schemas', () => {
  describe('Main Metrics', () => {
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
      adaptMetricsData.mockReturnValue({});
    });

    it('rejects when audits are not provided', () => {
      return testSubject(mockDataset, lighthouseResMock)
        .catch((err) => {
          expect(err).toBeInstanceOf(Error);
          expect(err.message).toBe(`There were no "audits" in Lighthouse's response`);
          expect(mockDataset.table).not.toHaveBeenCalled();
        });
    });

    it('attempts to insert a record on BigQuery with an empty array of metrics when the timings are not there', () => {
      lighthouseResMock.audits = {}
      adaptMetricsData.mockReturnValue({});
      return testSubject(mockDataset, lighthouseResMock)
        .then(() => {
          expect(adaptMetricsData).toHaveBeenCalledWith(lighthouseResMock);
          expect(mockDataset.table).toHaveBeenCalled();
          expect(mockTable.insert).toHaveBeenCalled();
          expect(mockTable.insert).toHaveBeenCalledWith({
            build_id: 'none',
            build_system: 'none',
            metrics: [],
            timestamp: lighthouseResMock.fetchTime.getTime(),
            website: lighthouseResMock.requestedUrl,
          });
        });
    });

    it('attempts to insert a record on BigQuery with an array of metrics provided by pwmetrics that contain timestamps', () => {
      lighthouseResMock.reportCategories = [{
        audits: [{ id: 'fakeAudit' }],
      }];
      adaptMetricsData.mockReturnValue({ timings: [
        { 'id': 'first-meaningful-fake', timing: 123123123, timestamp: 123123213213, title: 'First Meaningful Fake' },
        { 'id': 'first-contentful-fake', timing: 222222222, title: 'First Contentful Fake' },
        { 'id': 'time-to-first-fake', timing: 999999999, timestamp: 444444444444, title: 'Time to First Fake' },
      ]});
      return testSubject(mockDataset, lighthouseResMock)
        .then((result) => {
          expect(adaptMetricsData).toHaveBeenCalledWith(lighthouseResMock);
          expect(mockDataset.table).toHaveBeenCalled();
          expect(mockTable.insert).toHaveBeenCalled();
          expect(mockTable.insert).toHaveBeenCalledWith({
            build_id: 'none',
            build_system: 'none',
            metrics: [
              { 'id': 'first-meaningful-fake', timing: 123123123, timestamp: lighthouseResMock.fetchTime.getTime(), title: 'First Meaningful Fake' },
              { 'id': 'time-to-first-fake', timing: 999999999, timestamp: lighthouseResMock.fetchTime.getTime(), title: 'Time to First Fake' },
            ],
            timestamp: lighthouseResMock.fetchTime.getTime(),
            website: lighthouseResMock.requestedUrl,
          });
          expect(result).toMatchObject({
            main_metrics: {
              build_id: 'none',
              build_system: 'none',
              metrics: [
                { 'id': 'first-meaningful-fake', timing: 123123123, timestamp: lighthouseResMock.fetchTime.getTime(), title: 'First Meaningful Fake' },
                { 'id': 'time-to-first-fake', timing: 999999999, timestamp: lighthouseResMock.fetchTime.getTime(), title: 'Time to First Fake' },
              ],
              timestamp: lighthouseResMock.fetchTime.getTime(),
              website: lighthouseResMock.requestedUrl,
            }
          });
        });
    });

    it('only returns the data without trying to store in the database when dataset is falsy', () => {
      lighthouseResMock.reportCategories = [{
        audits: [{ id: 'fakeAudit' }],
      }];
      adaptMetricsData.mockReturnValue({ timings: [
        { 'id': 'first-meaningful-fake', timing: 123123123, timestamp: 123123213213, title: 'First Meaningful Fake' },
        { 'id': 'first-contentful-fake', timing: 222222222, title: 'First Contentful Fake' },
        { 'id': 'time-to-first-fake', timing: 999999999, timestamp: 444444444444, title: 'Time to First Fake' },
      ]});
      return testSubject(false, lighthouseResMock)
        .then((result) => {
          expect(mockTable.insert).not.toHaveBeenCalled();
          expect(mockTable.insert).not.toHaveBeenCalledWith({
            build_id: 'none',
            build_system: 'none',
            metrics: [
              { 'id': 'first-meaningful-fake', timing: 123123123, timestamp: lighthouseResMock.fetchTime.getTime(), title: 'First Meaningful Fake' },
              { 'id': 'time-to-first-fake', timing: 999999999, timestamp: lighthouseResMock.fetchTime.getTime(), title: 'Time to First Fake' },
            ],
            timestamp: lighthouseResMock.fetchTime.getTime(),
            website: lighthouseResMock.requestedUrl,
          });
          expect(result).toMatchObject({
            main_metrics: {
              build_id: 'none',
              build_system: 'none',
              metrics: [
                { 'id': 'first-meaningful-fake', timing: 123123123, timestamp: lighthouseResMock.fetchTime.getTime(), title: 'First Meaningful Fake' },
                { 'id': 'time-to-first-fake', timing: 999999999, timestamp: lighthouseResMock.fetchTime.getTime(), title: 'Time to First Fake' },
              ],
              timestamp: lighthouseResMock.fetchTime.getTime(),
              website: lighthouseResMock.requestedUrl,
            }
          });
        });
    });
  });
});
