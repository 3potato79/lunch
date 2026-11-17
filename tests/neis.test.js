import assert from 'node:assert/strict';
import test from 'node:test';
import { getWeeklyMealInfo, searchSchools } from '../src/neis.js';

function jsonResponse(payload) {
  return { ok: true, status: 200, json: async () => payload };
}

test('school search parses schoolInfo[1].row and keeps the selected school code', async () => {
  let requestedUrl;
  const fetchMock = async (url) => {
    requestedUrl = new URL(url);
    return jsonResponse({
      schoolInfo: [
        { head: [{ list_total_count: 1 }] },
        { row: [{ ATPT_OFCDC_SC_CODE: 'B10', SD_SCHUL_CODE: '7130197', SCHUL_NM: '오금중학교' }] },
      ],
    });
  };

  const schools = await searchSchools('B10', '오금중학교', fetchMock);
  assert.ok(schools.some((school) => school.code === '7130197' && school.name === '오금중학교'));
  assert.equal(requestedUrl.searchParams.get('resource'), 'schoolInfo');
  assert.equal(requestedUrl.searchParams.get('ATPT_OFCDC_SC_CODE'), 'B10');
  assert.equal(requestedUrl.searchParams.get('SCHUL_NM'), '오금중학교');
});

test('weekly meals parse mealServiceDietInfo[1].row and request Monday through Friday', async () => {
  const requestedUrls = [];
  const fetchMock = async (url) => {
    const parsedUrl = new URL(url);
    requestedUrls.push(parsedUrl);
    return jsonResponse({
      mealServiceDietInfo: [
        { head: [{ list_total_count: 1 }] },
        { row: [{ MLSV_YMD: parsedUrl.searchParams.get('MLSV_YMD'), DDISH_NM: '급식' }] },
      ],
    });
  };

  const meals = await getWeeklyMealInfo('B10', '7130197', '2026-11-17', fetchMock);
  assert.equal(meals.length, 5);
  assert.deepEqual(
    meals.map((meal) => meal.date),
    ['2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19', '2026-11-20'],
  );
  assert.ok(requestedUrls.every((url) => url.searchParams.get('resource') === 'mealServiceDietInfo'));
  assert.ok(requestedUrls.every((url) => url.searchParams.get('SD_SCHUL_CODE') === '7130197'));
  assert.ok(requestedUrls.every((url) => url.searchParams.get('MMEAL_SC_CODE') === '2'));
});

test('weekly meal search skips days with no meals', async () => {
  const fetchMock = async (url) => {
    const parsedUrl = new URL(url);
    const payload = parsedUrl.searchParams.get('MLSV_YMD') === '20261116'
      ? { mealServiceDietInfo: [{ head: [] }, { row: [{ DDISH_NM: '급식' }] }] }
      : { RESULT: { CODE: 'INFO-200', MESSAGE: '해당하는 데이터가 없습니다.' } };
    return jsonResponse(payload);
  };

  const meals = await getWeeklyMealInfo('B10', '7130197', '2026-11-17', fetchMock);
  assert.equal(meals.length, 1);
  assert.equal(meals[0].weekday, '월');
});
