const NEIS_BASE_URL = 'https://open.neis.go.kr/hub';

const allowedParams = {
  schoolInfo: ['ATPT_OFCDC_SC_CODE', 'SCHUL_NM'],
  mealServiceDietInfo: [
    'ATPT_OFCDC_SC_CODE',
    'SD_SCHUL_CODE',
    'MLSV_YMD',
    'MMEAL_SC_CODE',
  ],
};

export default async function neisHandler(req, res, apiKey = process.env.NEIS_API_KEY) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.statusCode = 405;
    res.end(JSON.stringify({ error: 'GET 요청만 지원합니다.' }));
    return;
  }

  if (!apiKey) {
    res.statusCode = 500;
    res.end(JSON.stringify({ error: 'NEIS_API_KEY 환경 변수가 설정되지 않았습니다.' }));
    return;
  }

  const requestUrl = new URL(req.url, 'http://localhost');
  const resource = requestUrl.searchParams.get('resource');
  const params = allowedParams[resource];

  if (!params) {
    res.statusCode = 400;
    res.end(JSON.stringify({ error: '지원하지 않는 NEIS API 요청입니다.' }));
    return;
  }

  const upstreamUrl = new URL(`${NEIS_BASE_URL}/${resource}`);
  upstreamUrl.searchParams.set('KEY', apiKey);
  upstreamUrl.searchParams.set('TYPE', 'json');

  for (const param of params) {
    const value = requestUrl.searchParams.get(param);
    if (!value) {
      res.statusCode = 400;
      res.end(JSON.stringify({ error: `필수 파라미터가 없습니다: ${param}` }));
      return;
    }
    upstreamUrl.searchParams.set(param, value);
  }

  if (resource === 'mealServiceDietInfo') {
    upstreamUrl.searchParams.set('MMEAL_SC_CODE', '2');
  }

  try {
    const response = await fetch(upstreamUrl);
    const body = await response.text();
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.statusCode = response.status;
    res.end(body);
  } catch {
    res.statusCode = 502;
    res.end(JSON.stringify({ error: 'NEIS API에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.' }));
  }
}
