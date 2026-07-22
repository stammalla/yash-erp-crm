import { parsePagination } from './pagination';

test('defaults to page 1, limit 10', () => {
  expect(parsePagination({})).toEqual({ page: 1, limit: 10, skip: 0 });
});

test('clamps limit to 100 and computes skip', () => {
  expect(parsePagination({ page: '3', limit: '500' })).toEqual({ page: 3, limit: 100, skip: 200 });
});
