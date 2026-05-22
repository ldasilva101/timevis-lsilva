# Native multi-column collapsible group labels for timevis

## Purpose

Add first-class support to the `timevis` R package for rendering the left
("label") panel of a timeline as a multi-column table aligned with the existing
collapsible nested-groups feature. Eliminates the current need for users to
hand-roll HTML in `groups$content` and per-folder header rows.

## Non-goals

- Column sorting
- Column resize / drag
- Frozen header on scroll (single header row is sufficient)
- Per-row custom column overrides

## Public API

### Constructor argument

`timevis(data, groups = NULL, columns = NULL, ...)`

`columns` is a list of column specs. Each spec is a named list:

| key      | type        | required | description |
|----------|-------------|----------|-------------|
| `field`  | string      | yes      | Column name on `groups` df, OR the virtual fields `"start"` / `"end"` (only when `autoDates = TRUE`) |
| `header` | string      | no       | Header label. Defaults to `field`. |
| `width`  | integer px  | no       | Column width. Default 120. |
| `format` | string      | no       | moment.js format string applied if value is a date. Default `"YYYY-MM-DD"`. moment.js is already bundled with vis-timeline so no extra dependency. |
| `align`  | string      | no       | `"left" | "center" | "right"`. Default `"left"` for col 1, `"center"` otherwise. |

Plus one top-level flag on the spec list: passed as a second arg.

`setColumns(id, columns, autoDates = FALSE)`

- `id`: timeline id (string) OR `timevis` widget (chainable `%>%`).
- `autoDates`: if `TRUE`, fields named `"start"` / `"end"` that are missing on a
  group row are derived from items: child groups → `min(items$start)` /
  `max(items$end)` over `items$group == id`; parent groups → recursive min/max
  over their `nestedGroups`.

`columns = NULL` (the default) preserves existing behavior exactly.

## Internal flow

```
timevis(items, groups, columns) ──► widget$x$columns  (raw spec)
                                  │
                                  ▼
                       JS: applyColumns(spec)
                       1. compute derived dates if autoDates
                       2. for each group: rebuild `content` HTML
                          using a <div class="timevis-cols">…</div>
                       3. insert single header row above label panel
                          via DOM injection into .vis-labelset
                       4. inject CSS for widths/alignment
```

Re-runs whenever `setColumns`, `setGroups`, or `setItems` fires (subscribe
to dataset events on the JS side).

## HTML template per group

```html
<div class="timevis-cols">
  <span class="timevis-col" style="width:160px;text-align:left">Task A</span>
  <span class="timevis-col" style="width:100px;text-align:center">2026-05-01</span>
  <span class="timevis-col" style="width:100px;text-align:center">2026-05-09</span>
</div>
```

Header row uses class `timevis-cols-header` and is inserted as the first child
of the left panel container (`.vis-panel.vis-left`) with
`position: sticky; top: 0; z-index: 2` so it stays pinned at the top of the
label panel during vertical scroll and never consumes a timeline lane.

## Files changed

| File | Change |
|------|--------|
| `R/timevis.R` | accept `columns` arg, validate, stash on `x` list |
| `R/api.R` | new `setColumns()` (mirrors `setGroups`) |
| `R/utils.R` | `tv_build_col_html()`, `tv_derive_group_dates()` |
| `inst/htmlwidgets/timevis.js` | handle `setColumns` msg + apply on init |
| `inst/htmlwidgets/timevis.css` | new file w/ `.timevis-cols*` rules; load via `htmlwidgets` dependency |
| `inst/htmlwidgets/timevis.yaml` | register the new css file |
| `man/setColumns.Rd` | roxygen autogen |
| `NAMESPACE` | export `setColumns` |
| `tests/testthat/test-columns.R` | unit tests |
| `NEWS.md` | feature entry |

## Validation rules

- Error if `columns` not `NULL` and not a list of lists.
- Error if any `field` references a column not on `groups` and is not
  `start`/`end` with `autoDates = TRUE`.
- Warn if a column width is < 40 (likely unreadable).

## Tests

1. `columns = NULL` → output identical to current behavior (snapshot).
2. Group `content` rewritten to HTML with N spans matching N column specs.
3. Header row present in widget JSON when `columns` supplied.
4. `autoDates = TRUE`: leaf group derives min/max from items; parent derives
   from its nested children recursively.
5. `setColumns()` chained pre-render = same result as constructor `columns`.
6. Date formatting honors `format`.
7. Validation errors trigger on bad field name / wrong shape.

## Open questions

None — proceeding with above.
