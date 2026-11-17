const API_PATH = '/api/neis';
const WEEKDAYS = ['월', '화', '수', '목', '금'];

async function requestNeis(resource, params, fetchImpl) {
  const url = new URL(API_PATH, globalThis.location?.origin || 'http://localhost');
  url.searchParams.set('resource', resource);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  let response;
  try {
    response = await fetchImpl(url);
  } catch {
    throw new Error('서버에 연결할 수 없습니다. 네트워크 상태를 확인해 주세요.');
  }

  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new Error('NEIS API 응답을 읽을 수 없습니다.');
  }

  if (!response.ok) {
    throw new Error(payload.error || `NEIS API 요청에 실패했습니다. (${response.status})`);
  }
  return payload;
}

function extractRows(payload, serviceName) {
  const service = payload?.[serviceName];
  if (!service) {
    const result = payload?.RESULT;
    if (result?.CODE === 'INFO-200') return [];
    if (result) throw new Error(result.MESSAGE || 'NEIS API 요청에 실패했습니다.');
    return [];
  }

  const rows = service[1]?.row;
  if (!rows) return [];
  return Array.isArray(rows) ? rows : [rows];
}

export async function searchSchools(atptCode, schoolName, fetchImpl = fetch) {
  const payload = await requestNeis(
    'schoolInfo',
    { ATPT_OFCDC_SC_CODE: atptCode, SCHUL_NM: schoolName.trim() },
    fetchImpl,
  );
  const rows = extractRows(payload, 'schoolInfo');

  return rows
    .map((row) => ({
      code: row.SD_SCHUL_CODE,
      name: row.SCHUL_NM,
      officeCode: row.ATPT_OFCDC_SC_CODE,
      kind: row.SCHUL_KND_SC_NM,
      address: row.ORG_RDNMA,
    }))
    .filter((school) => school.code && school.name)
    .sort((a, b) => {
      const aExact = a.name === schoolName.trim();
      const bExact = b.name === schoolName.trim();
      return Number(bExact) - Number(aExact) || a.name.localeCompare(b.name, 'ko');
    });
}

function getWeekDates(baseDate) {
  const [year, month, day] = baseDate.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const mondayOffset = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - mondayOffset);

  return WEEKDAYS.map((weekday, index) => {
    const weekdayDate = new Date(date);
    weekdayDate.setDate(date.getDate() + index);
    const isoDate = [
      weekdayDate.getFullYear(),
      String(weekdayDate.getMonth() + 1).padStart(2, '0'),
      String(weekdayDate.getDate()).padStart(2, '0'),
    ].join('-');
    return { date: isoDate, weekday };
  });
}

export async function getWeeklyMealInfo(
  atptCode,
  schoolCode,
  baseDate,
  fetchImpl = fetch,
) {
  const week = getWeekDates(baseDate);
  const results = await Promise.all(
    week.map(async ({ date, weekday }) => {
      const payload = await requestNeis(
        'mealServiceDietInfo',
        {
          ATPT_OFCDC_SC_CODE: atptCode,
          SD_SCHUL_CODE: schoolCode,
          MLSV_YMD: date.replaceAll('-', ''),
          MMEAL_SC_CODE: '2',
        },
        fetchImpl,
      );
      return extractRows(payload, 'mealServiceDietInfo').map((meal) => ({
        ...meal,
        weekday,
        date,
      }));
    }),
  );

  return results.flat();
}
