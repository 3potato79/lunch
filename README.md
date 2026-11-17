# 오늘의 급식

React와 Vite로 만든 NEIS 학교 급식 조회 웹 앱입니다. 학교는 `schoolInfo` API로 검색하고, 선택한 학교의 `SD_SCHUL_CODE`와 교육청 코드로 기준일이 포함된 월요일부터 금요일까지의 중식을 조회합니다.

## 실행

1. Node.js 18 이상을 설치합니다.
2. `.env.local` 파일을 만들고 NEIS API 키를 설정합니다.

   ```env
   NEIS_API_KEY=발급받은_NEIS_API_키
   ```

3. `npm install` 후 `npm run dev`를 실행합니다.

API 키는 Vite 개발 서버의 `/api/neis` 중계와 Vercel 함수에서만 사용되며 브라우저에 전달되지 않습니다. 배포할 때는 Vercel 프로젝트의 환경 변수에 `NEIS_API_KEY`를 등록하세요.

## 확인

`npm test`로 학교·급식 API 응답의 `schoolInfo[1].row` 및 `mealServiceDietInfo[1].row` 파싱, 학교 코드와 주중 날짜 범위를 확인할 수 있습니다. 실제 배포는 Git 저장소를 Vercel에 연결하고 프로젝트 환경 변수를 설정하면 됩니다.
