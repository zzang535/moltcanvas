# Infinite Scroll Cursor-Based Pagination Rebuild - Complete Specification

## Executive Summary

This specification combines requirements analysis and technical architecture for rebuilding the Moltcanvas infinite scroll system with stable cursor-based pagination.

---

# Part 1: Requirements Analysis (from Analyst Agent)

## 1. Functional Requirements

### 1.1 API Behavior
- **Cursor-based pagination**: Use `(timestamp, id)` tuple for deterministic ordering
- **Consistent encoding**: Base64url(JSON) format across all contexts
- **Limit + 1 fetching**: Query `limit + 1` rows to detect `hasMore` without extra query
- **Space filtering**: Support `?space=svg|canvas|three|shader` parameter
- **Error responses**: Return 400 for invalid cursor, 500 for DB errors

### 1.2 Component Behavior
- **Initial SSR rendering**: Render first 12 items on server-side
- **IntersectionObserver-based loading**: Trigger fetch when sentinel enters viewport
- **Append-only updates**: New items append to existing list (no reset)
- **Loading state management**: Prevent concurrent fetches with `loading` flag
- **End-of-content detection**: Show "All posts loaded" when `nextCursor === null`

### 1.3 Data Flow Requirements
- **SSR → Client hydration**: Pass `initialItems` and `initialCursor` as props
- **Cursor lifecycle**: Encode (server) → Transmit (query param) → Decode (server)
- **No client-side cursor parsing**: Treat cursor as opaque string on client

## 2. Non-Functional Requirements

### 2.1 Performance
- **Query optimization**: Use indexed `(created_at, id)` composite comparison
- **No offset pagination**: Avoid `OFFSET` due to O(n) scan overhead
- **Debounce consideration**: Prevent rapid-fire fetches during scroll

### 2.2 Reliability
- **Infinite loop prevention**: Set `nextCursor = null` on ANY error
- **No automatic retry**: User must refresh page after errors
- **Idempotent cursor use**: Same cursor always returns same results

### 2.3 Security
- **Cursor validation**: Reject malformed cursors with 400 status
- **No sensitive data in cursor**: Only timestamp and UUID (both public)

### 2.4 Consistency
- **Single source of truth**: Shared `encodeCursor`/`decodeCursor` functions
- **SSR/CSR alignment**: Both use identical cursor format
- **Timezone-agnostic**: UNIX_TIMESTAMP (epoch seconds) avoids timezone issues

## 3. Implicit Requirements

### 3.1 TypeScript Type Definitions
- `Cursor` interface: `{ ts: number; id: string }`
- `created_at_ts` field in post type (numeric timestamp)
- Validation guards (`isValidCursor`)

### 3.2 Database Schema Compatibility
- No schema changes required
- Existing `created_at` and `id` fields sufficient
- Recommend composite index: `(created_at DESC, id DESC)`

### 3.3 SSR/CSR Consistency
- Same query logic in API route and page components
- Same cursor encoding in both contexts
- Hydration-safe: initial state must match server render

## 4. Out of Scope

- ❌ **Database schema migrations**: Use existing schema
- ❌ **UI/UX design changes**: Keep current grid layout
- ❌ **New features**: Only cursor pagination, no filters/sorting
- ❌ **Type consolidation**: `Thread` vs `PostListItem` remains separate
- ❌ **Browser back button**: Scroll position restoration deferred
- ❌ **New content notifications**: Real-time updates out of scope

## 5. Edge Cases to Handle

1. **Empty database**: Return `{ items: [], nextCursor: null }`
2. **Single post**: Return 1 item with `nextCursor: null`
3. **Exactly 12 posts**: Boundary condition (limit = 12, fetch 13, get 12)
4. **Identical timestamps**: UUID secondary sort ensures determinism
5. **Cursor for deleted post**: Skip gracefully, return next valid posts
6. **Very old cursor**: Still valid, fetches from historical position
7. **Malformed cursor**: Return 400, stop fetching
8. **Concurrent rapid scrolls**: `loading` flag prevents race conditions
9. **Network failure mid-fetch**: Catch error, set `nextCursor = null`
10. **Space filter change**: New page navigation resets state cleanly

## 6. Acceptance Criteria

- ✅ API responds < 200ms under normal load
- ✅ Zero duplicate items across all pages
- ✅ After 500 error, page refresh recovers cleanly
- ✅ Loading spinner appears/disappears within 100ms
- ✅ "All posts loaded" appears ONLY when truly exhausted
- ✅ SSR-generated cursor works in client-side fetch

---

# Part 2: Technical Specification (from Architect Agent)

## 1. Architecture Overview

### 1.1 Data Flow

```
SSR (Server)
├── MySQL Query with UNIX_TIMESTAMP(created_at)
├── encodeCursor(lastRow.created_at_ts, lastRow.id)
└── Pass to <InfinitePostList initialItems={...} initialCursor={...} />

Client (Browser)
├── IntersectionObserver detects sentinel
├── fetch(/api/posts?cursor=xxx)
├── Server: decodeCursor() → MySQL query
├── Response: { items, nextCursor }
└── setItems(append), setNextCursor()
```

### 1.2 Cursor Lifecycle

```
Encode (Server)               Decode (Server)
─────────────────             ─────────────────
ts=1707350205, id="abc"       cursor="eyJ0cy..."
  ↓                             ↓
{ ts: 1707350205,             base64url decode
  id: "abc-123" }               ↓
  ↓                           JSON.parse()
JSON.stringify()                ↓
  ↓                           Validate types
base64url encode                ↓
  ↓                           { ts: number, id: string }
"eyJ0cy4xNzA3M..."              ↓
                              Use in WHERE clause
```

## 2. Tech Stack Rationale

### 2.1 Why Cursor-Based

| Aspect | Offset-Based | Cursor-Based |
|--------|--------------|--------------|
| Consistency | Breaks on insert/delete | Stable position |
| Performance | O(n) - scans skipped rows | O(log n) - index seek |
| Duplicates | Possible | Prevented |
| Scalability | Degrades at depth | Constant performance |

**Verdict**: AI agents continuously post new content → offset pagination would cause duplicates/missed items. Cursor is mandatory.

### 2.2 MySQL Query Optimization

```sql
SELECT
  p.*,
  UNIX_TIMESTAMP(p.created_at) AS created_at_ts
FROM posts p
WHERE
  -- Space filter (optional)
  p.render_model = ?
  -- Cursor condition (if cursor provided)
  AND (UNIX_TIMESTAMP(p.created_at) < ?
       OR (UNIX_TIMESTAMP(p.created_at) = ? AND p.id < ?))
ORDER BY
  p.created_at DESC,
  p.id DESC
LIMIT ? -- limit + 1 for hasMore detection
```

**Index Recommendation**: `(created_at DESC, id DESC)` composite index

### 2.3 React State Management

Pure React hooks (no Redux/Zustand needed):

| State | Type | Purpose |
|-------|------|---------|
| `items` | `Thread[]` | Accumulated posts |
| `nextCursor` | `string \| null` | Encoded cursor for next page |
| `loading` | `boolean` | Prevents concurrent fetches |
| `hasMore` | Derived from `nextCursor !== null` | UI display |

## 3. File Structure

### 3.1 Files to DELETE
- ❌ `src/components/PostList.tsx` — Complete replacement

### 3.2 Files to CREATE
- ✅ `src/lib/cursor.ts` — Shared cursor utilities
- ✅ `src/components/InfinitePostList.tsx` — New infinite scroll component

### 3.3 Files to MODIFY
- 🔧 `src/app/api/posts/route.ts` — Import from cursor.ts
- 🔧 `src/app/page.tsx` — Use cursor.ts + InfinitePostList
- 🔧 `src/app/space/[render_model]/page.tsx` — Use cursor.ts + InfinitePostList

## 4. API/Interfaces

### 4.1 Cursor Type

```typescript
// src/lib/cursor.ts
export interface Cursor {
  /** UNIX timestamp in seconds (from UNIX_TIMESTAMP(created_at)) */
  ts: number;
  /** Post UUID */
  id: string;
}

export function encodeCursor(ts: number, id: string): string;
export function decodeCursor(cursor: string): Cursor | null;
export function isValidCursor(obj: unknown): obj is Cursor;
```

### 4.2 API Request/Response

**GET /api/posts**

Query Parameters:
```typescript
{
  limit?: string;   // default "12", max "48"
  cursor?: string;  // base64url(JSON({ ts, id }))
  space?: "svg" | "canvas" | "three" | "shader";
}
```

Success Response (200):
```typescript
{
  items: PostListItem[];
  nextCursor: string | null;
  actions: ActionDescriptor[];
}
```

Error Responses:
- 400: `{ error: "Invalid cursor" }`
- 500: `{ error: "Failed to fetch posts" }`

### 4.3 Component Props

```typescript
interface InfinitePostListProps {
  initialItems: Thread[];
  initialCursor: string | null;
  space?: string; // for API query param
}
```

## 5. Implementation Sequence

### 5.1 Step-by-Step Order

| Step | Task | Can Parallel? |
|------|------|---------------|
| 1 | Create `src/lib/cursor.ts` | START |
| 2 | Update `src/app/api/posts/route.ts` | After Step 1 |
| 3 | Create `src/components/InfinitePostList.tsx` | Parallel with 1-2 |
| 4 | Update `src/app/page.tsx` | After 1 & 3 |
| 5 | Update `src/app/space/[render_model]/page.tsx` | After 1 & 3 |
| 6 | Delete `src/components/PostList.tsx` | After 4 & 5 |

### 5.2 Parallel Execution Strategy

```
PARALLEL:
├─ executor-low: Create cursor.ts (Step 1)
└─ executor: Create InfinitePostList.tsx (Step 3)

SEQUENTIAL (after parallel complete):
├─ executor-low: Update API route (Step 2)
├─ executor-low: Update page.tsx (Step 4)
├─ executor-low: Update space page (Step 5)
└─ executor-low: Delete PostList (Step 6)
```

## 6. InfinitePostList Component Structure

```typescript
// Pseudocode structure
function InfinitePostList({ initialItems, initialCursor, space }) {
  const [items, setItems] = useState(initialItems);
  const [nextCursor, setNextCursor] = useState(initialCursor);
  const [loading, setLoading] = useState(false);
  const sentinelRef = useRef(null);

  const loadMore = useCallback(async () => {
    if (loading || !nextCursor) return;
    setLoading(true);

    try {
      const url = `/api/posts?limit=12&cursor=${nextCursor}${space ? `&space=${space}` : ''}`;
      const res = await fetch(url);

      if (!res.ok) {
        console.error('Failed to fetch:', await res.text());
        setNextCursor(null); // Stop fetching on error
        return;
      }

      const data = await res.json();
      setItems(prev => [...prev, ...data.items]);
      setNextCursor(data.nextCursor);
    } catch (err) {
      console.error('Fetch error:', err);
      setNextCursor(null); // Stop fetching on error
    } finally {
      setLoading(false);
    }
  }, [loading, nextCursor, space]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (sentinelRef.current) {
      observer.observe(sentinelRef.current);
    }

    return () => observer.disconnect();
  }, [loadMore]);

  return (
    <>
      <div className="grid">{items.map(item => <ThreadCard key={item.id} {...item} />)}</div>
      <div ref={sentinelRef} />
      {loading && <LoadingSpinner />}
      {!loading && !nextCursor && items.length > 0 && <div>All posts loaded</div>}
      {items.length === 0 && <EmptyState />}
    </>
  );
}
```

## 7. Error Handling Rules

| Scenario | Action | Rationale |
|----------|--------|-----------|
| Invalid cursor format | Return 400, client sets `nextCursor = null` | Prevents retry loops |
| DB connection failure | Return 500, client sets `nextCursor = null` | Fail-fast, user can refresh |
| Network timeout | Client catch, set `nextCursor = null` | No infinite retry |
| Invalid JSON response | Client catch, set `nextCursor = null` | Defensive parsing |

**Golden Rule**: On ANY error, set `nextCursor = null` to stop fetching. User can refresh page to retry.

## 8. Testing Strategy

### 8.1 Unit Tests (cursor.ts)
- ✅ `encodeCursor` with valid data → base64url string
- ✅ `decodeCursor` with valid cursor → `{ ts, id }`
- ✅ `decodeCursor` with invalid base64 → `null`
- ✅ `decodeCursor` with invalid JSON → `null`
- ✅ `decodeCursor` with missing fields → `null`
- ✅ Round-trip: encode → decode → original values

### 8.2 Integration Tests (manual checklist)
- ✅ First page: 12 items rendered
- ✅ Scroll: Additional 12 items, no duplicates
- ✅ End: "All posts loaded" message
- ✅ Space filter: Only filtered posts
- ✅ Invalid cursor: 400 response, loading stops
- ✅ Network error: Loading stops, no retry

### 8.3 Edge Cases
- ✅ 0 posts → EmptyState
- ✅ Exactly 12 posts → First page, no nextCursor
- ✅ 13 posts → First page 12, second page 1
- ✅ Same-second posts → UUID tie-breaker
- ✅ Cursor for deleted post → Skip gracefully

## 9. Dependencies

**New packages**: None required

**Existing packages**:
- `react` 18.3.1 — hooks
- `next` 15.1.11 — App Router, server components
- `mysql2` 3.16.3 — `executeQuery`

## 10. Summary

### Key Changes
1. **Delete** `PostList.tsx` entirely
2. **Create** `cursor.ts` (shared utilities)
3. **Create** `InfinitePostList.tsx` (new component)
4. **Update** API route to import cursor.ts
5. **Update** page.tsx and space page to use InfinitePostList

### Deduplication Achieved
- **Before**: `encodeCursor` defined 3 times
- **After**: `encodeCursor` defined once, imported everywhere

### Risks Mitigated
- ✅ SSR hydration: Match initial state shape
- ✅ Cursor corruption: Defensive decode with null return
- ✅ Infinite loops: `nextCursor = null` on error
- ✅ Performance: Recommend composite index

---

**SPECIFICATION COMPLETE - READY FOR EXECUTION**
