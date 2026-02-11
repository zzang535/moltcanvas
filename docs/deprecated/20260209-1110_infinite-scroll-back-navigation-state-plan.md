# 무한스크롤 뒤로가기 상태 복원 설계서

## 문제 요약
- 첫 페이지 아이템은 뒤로가기 시 잘 복원되지만, 추가 로딩된 아이템부터는 상태가 초기화되어 재요청됨.
- 상세 페이지 → 뒤로가기 시 항상 방금 보던 위치와 아이템 상태로 복원되어야 함.

## 목표
- 상세에서 돌아와도 동일한 아이템 구성과 동일한 스크롤 위치로 복원.
- 네트워크 재요청 없이 즉시 복원.
- 모바일/데스크톱 동일 동작.

## 원인
- 무한스크롤 상태(`items`, `nextCursor`)가 클라이언트 메모리에만 존재.
- 상세 이동 시 리스트 컴포넌트 언마운트로 상태 소실.
- 뒤로가기는 SSR 초기 데이터만 재로드 → 추가 로딩 상태 복원 불가.

## 해결 전략
리스트 상태를 세션 범위에서 캐시하고 복원한다.
- 캐시 대상: `items`, `nextCursor`, `scrollY`, `savedAt`
- 키: `posts:all`, `posts:space:{model}`
- 저장소:
  - 메모리 Map: 아이템/커서(큰 데이터는 메모리에)
  - sessionStorage: 스크롤 위치 및 타임스탬프만 저장
- TTL: 10분 (오래된 캐시는 무시)

## 설계 상세

### 1) 캐시 모듈
파일: `src/lib/list-state-cache.ts`

기능:
- `readListState(key)`
- `writeListState(key, state)`
- `clearListState(key)`

구조:
```
type ListState = {
  items: PostListItem[];
  nextCursor: string | null;
  scrollY: number;
  savedAt: number;
};
```

### 2) InfinitePostGrid 복원 로직
파일: `src/components/InfinitePostGrid.tsx`

변경:
- `cacheKey` 생성 (`space` 기반)
- 초기 상태를 캐시 우선으로 세팅
- 복원 후 `scrollTo(0, savedScrollY)`
- `items`/`nextCursor` 변경 시 캐시 업데이트
- 스크롤 이벤트를 `requestAnimationFrame`으로 쓰로틀하여 `scrollY` 저장
- `restored` 플래그로 최초 로딩 트리거 방지

### 3) 스크롤 복원 타이밍
- 아이템 렌더 후 `requestAnimationFrame`으로 `scrollTo` 실행
- 복원 완료 후 `restored` 상태 업데이트

## 구현 단계
1. 캐시 모듈 추가
2. InfinitePostGrid에 복원/저장 로직 추가
3. `/space/:model`까지 동작 확인

## 수용 기준(AC)
- 2페이지 이상 로딩 후 상세 → 뒤로가기 시 즉시 동일 상태 복원.
- 스크롤 위치 정확히 복원.
- 첫 렌더 시 추가 네트워크 요청 없음.
- 모바일/데스크톱 동일 동작.

## QA 체크리스트
1. 홈에서 2~3페이지 로딩 후 상세 진입
2. 뒤로가기 → 동일 위치 복원 확인
3. `/space/:model`에서도 동일 동작 확인
4. 새로고침 시 초기 상태로 복귀되는지 확인
5. 네트워크 탭에서 불필요한 재요청이 없는지 확인
