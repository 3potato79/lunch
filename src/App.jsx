import { useMemo, useState } from 'react';
import { getWeeklyMealInfo, searchSchools } from './neis.js';

const EDUCATION_OFFICES = [
  { code: 'B10', name: '서울특별시교육청' },
  { code: 'C10', name: '부산광역시교육청' },
  { code: 'D10', name: '대구광역시교육청' },
  { code: 'E10', name: '인천광역시교육청' },
  { code: 'F10', name: '광주광역시교육청' },
  { code: 'G10', name: '대전광역시교육청' },
  { code: 'H10', name: '울산광역시교육청' },
  { code: 'I10', name: '세종특별자치시교육청' },
  { code: 'J10', name: '경기도교육청' },
  { code: 'K10', name: '강원특별자치도교육청' },
  { code: 'M10', name: '충청북도교육청' },
  { code: 'N10', name: '충청남도교육청' },
  { code: 'P10', name: '전북특별자치도교육청' },
  { code: 'Q10', name: '전라남도교육청' },
  { code: 'R10', name: '경상북도교육청' },
  { code: 'S10', name: '경상남도교육청' },
  { code: 'T10', name: '제주특별자치도교육청' },
];

function localToday() {
  const today = new Date();
  return [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, '0'),
    String(today.getDate()).padStart(2, '0'),
  ].join('-');
}

function cleanDishName(dishText = '') {
  const temporary = document.createElement('textarea');
  temporary.innerHTML = dishText
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?[^>]+>/g, '');
  return temporary.value
    .split('\n')
    .map((dish) => dish.trim())
    .filter(Boolean);
}

function getWeekDates(baseDate) {
  const [year, month, day] = baseDate.split('-').map(Number);
  const monday = new Date(year, month - 1, day);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  return Array.from({ length: 5 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    const isoDate = [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0'),
    ].join('-');
    return { date: isoDate, weekday: ['월', '화', '수', '목', '금'][index] };
  });
}

function formatWeekRange(baseDate) {
  const week = getWeekDates(baseDate);
  const first = new Date(`${week[0].date}T00:00:00`);
  const last = new Date(`${week[4].date}T00:00:00`);
  return `${first.getMonth() + 1}월 ${first.getDate()}일 – ${last.getMonth() + 1}월 ${last.getDate()}일`;
}

export default function App() {
  const [officeCode, setOfficeCode] = useState('B10');
  const [schoolQuery, setSchoolQuery] = useState('');
  const [baseDate, setBaseDate] = useState(localToday);
  const [schools, setSchools] = useState([]);
  const [selectedSchool, setSelectedSchool] = useState(null);
  const [searchState, setSearchState] = useState('idle');
  const [mealState, setMealState] = useState('idle');
  const [meals, setMeals] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');

  const groupedMeals = useMemo(() => {
    const mealsByDate = new Map();
    for (const meal of meals) {
      if (!mealsByDate.has(meal.date)) mealsByDate.set(meal.date, []);
      mealsByDate.get(meal.date).push(meal);
    }
    return mealsByDate;
  }, [meals]);

  async function handleSchoolSearch(event) {
    event.preventDefault();
    if (!schoolQuery.trim()) {
      setSearchState('empty-query');
      setSchools([]);
      setSelectedSchool(null);
      return;
    }

    setSearchState('loading');
    setSchools([]);
    setSelectedSchool(null);
    setMeals([]);
    setMealState('idle');
    setErrorMessage('');
    try {
      const results = await searchSchools(officeCode, schoolQuery);
      setSchools(results);
      setSearchState(results.length ? 'results' : 'no-results');
    } catch (error) {
      setSearchState('error');
      setErrorMessage(error.message);
    }
  }

  async function handleMealSearch(event) {
    event.preventDefault();
    if (!selectedSchool) {
      setMealState('school-required');
      return;
    }
    if (!baseDate) {
      setMealState('date-required');
      return;
    }

    setMealState('loading');
    setMeals([]);
    setErrorMessage('');
    try {
      const results = await getWeeklyMealInfo(
        officeCode,
        selectedSchool.code,
        baseDate,
      );
      setMeals(results);
      setMealState(results.length ? 'results' : 'no-meals');
    } catch (error) {
      setMealState('error');
      setErrorMessage(error.message);
    }
  }

  function handleOfficeChange(event) {
    setOfficeCode(event.target.value);
    setSchools([]);
    setSelectedSchool(null);
    setMeals([]);
    setSearchState('idle');
    setMealState('idle');
    setErrorMessage('');
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="LUNCH 홈">
          <span className="brand-mark" aria-hidden="true">◒</span>
          <span>LUNCH</span>
        </a>
        <span className="topbar-caption">학교 점심을 한눈에</span>
      </header>

      <main>
        <section className="hero" aria-labelledby="page-title">
          <p className="eyebrow">YOUR SCHOOL LUNCH, THIS WEEK</p>
          <h1 id="page-title">
            이번 주 점심,
            <br />
            <span>뭐가 나올까요?</span>
          </h1>
          <p className="hero-copy">
            학교를 선택하고 날짜를 고르면
            <br className="mobile-break" /> 한 주의 점심 메뉴를 보여드려요.
          </p>
        </section>

        <section className="lookup-panel" aria-label="급식 조회">
          <form className="lookup-form" onSubmit={handleSchoolSearch}>
            <label className="field">
              <span className="field-label">시도교육청</span>
              <select value={officeCode} onChange={handleOfficeChange}>
                {EDUCATION_OFFICES.map((office) => (
                  <option value={office.code} key={office.code}>
                    {office.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="field school-field">
              <span className="field-label">학교 이름</span>
              <span className="input-with-icon">
                <input
                  type="search"
                  placeholder="학교명을 입력해 주세요"
                  value={schoolQuery}
                  onChange={(event) => {
                    setSchoolQuery(event.target.value);
                    setSelectedSchool(null);
                    setMeals([]);
                    setMealState('idle');
                    setSearchState('idle');
                  }}
                  aria-label="학교명"
                />
                <span className="search-icon" aria-hidden="true">⌕</span>
              </span>
            </label>
            <button className="button button-secondary school-search-button" type="submit">
              학교 검색
            </button>

            <label className="field date-field">
              <span className="field-label">조회 기준일</span>
              <input
                type="date"
                value={baseDate}
                onChange={(event) => setBaseDate(event.target.value)}
              />
            </label>
            <button className="button button-primary meal-search-button" type="button" onClick={handleMealSearch}>
              이번 주 급식 보기 <span aria-hidden="true">↗</span>
            </button>
          </form>

          <div className="panel-feedback" aria-live="polite">
            {searchState === 'loading' && <p className="feedback">학교를 찾고 있어요…</p>}
            {searchState === 'empty-query' && <p className="feedback feedback-error">학교명을 입력해 주세요.</p>}
            {searchState === 'no-results' && <p className="feedback">검색 결과가 없어요. 학교명과 교육청을 확인해 주세요.</p>}
            {searchState === 'error' && <p className="feedback feedback-error">학교 검색에 실패했어요. {errorMessage}</p>}
            {searchState === 'results' && (
              <div className="school-results">
                <p className="results-caption">학교를 선택해 주세요</p>
                {schools.map((school) => (
                  <button
                    className={`school-option${selectedSchool?.code === school.code ? ' is-selected' : ''}`}
                    type="button"
                    key={school.code}
                    onClick={() => {
                      setSelectedSchool(school);
                      setMealState('idle');
                    }}
                  >
                    <span className="school-option-name">{school.name}</span>
                    <span className="school-option-meta">
                      {school.kind || '학교'}{school.address ? ` · ${school.address}` : ''}
                    </span>
                    <span className="school-option-check" aria-hidden="true">
                      {selectedSchool?.code === school.code ? '✓' : '›'}
                    </span>
                  </button>
                ))}
              </div>
            )}
            {selectedSchool && (
              <p className="selected-school">
                선택한 학교 <strong>{selectedSchool.name}</strong>
                <span>학교코드 {selectedSchool.code}</span>
              </p>
            )}
            {mealState === 'school-required' && (
              <p className="feedback feedback-error">급식을 조회하려면 먼저 학교를 검색하고 선택해 주세요.</p>
            )}
            {mealState === 'date-required' && (
              <p className="feedback feedback-error">급식을 조회할 기준일을 선택해 주세요.</p>
            )}
          </div>
        </section>

        {mealState === 'loading' && (
          <section className="meal-section status-section" aria-live="polite">
            <span className="loader" aria-hidden="true" />
            <p>이번 주 메뉴를 불러오고 있어요</p>
          </section>
        )}
        {mealState === 'error' && (
          <section className="meal-section status-section" aria-live="polite">
            <span className="status-icon status-icon-error" aria-hidden="true">!</span>
            <h2>급식을 불러오지 못했어요</h2>
            <p>{errorMessage || '잠시 후 다시 시도해 주세요.'}</p>
          </section>
        )}
        {mealState === 'no-meals' && (
          <section className="meal-section status-section" aria-live="polite">
            <span className="status-icon" aria-hidden="true">☼</span>
            <h2>등록된 급식이 없어요</h2>
            <p>선택한 주에 등록된 중식 메뉴가 없습니다.</p>
          </section>
        )}
        {mealState === 'results' && (
          <section className="meal-section" aria-labelledby="meal-heading">
            <div className="meal-heading">
              <div>
                <p className="eyebrow">LUNCH MENU</p>
                <h2 id="meal-heading">{formatWeekRange(baseDate)}의 점심</h2>
              </div>
              <p className="meal-school-label">{selectedSchool?.name}</p>
            </div>
            <div className="meal-grid">
              {getWeekDates(baseDate).map(({ date, weekday }) => {
                const dayMeals = groupedMeals.get(date) || [];
                const meal = dayMeals[0];
                const dishes = meal ? cleanDishName(meal.DDISH_NM) : [];
                return (
                  <article className="meal-card" key={date}>
                    <div className="meal-card-heading">
                      <div>
                        <p className="meal-weekday">{weekday}요일</p>
                        <h3>{new Date(`${date}T00:00:00`).getDate()}</h3>
                      </div>
                      <span className="meal-type">중식</span>
                    </div>
                    {dishes.length ? (
                      <>
                        <ul className="dish-list">
                          {dishes.map((dish, index) => <li key={`${dish}-${index}`}>{dish}</li>)}
                        </ul>
                        {meal.CAL_INFO && <p className="calorie-info">{meal.CAL_INFO}</p>}
                      </>
                    ) : (
                      <p className="no-meal-day">등록된 메뉴가 없습니다.</p>
                    )}
                  </article>
                );
              })}
            </div>
            <p className="meal-footnote">메뉴와 알레르기 정보는 학교 사정에 따라 변경될 수 있습니다.</p>
          </section>
        )}
      </main>

      <footer className="footer">
        <span>NEIS 학교급식 정보 서비스</span>
        <span>간단하게, 한 주의 점심을.</span>
      </footer>
    </div>
  );
}
