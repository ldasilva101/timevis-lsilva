context("columns / setColumns")

test_that("tv_normalize_columns returns NULL when input is NULL", {
  expect_null(tv_normalize_columns(NULL))
  expect_null(tv_normalize_columns(NULL, autoDates = TRUE))
})

test_that("tv_normalize_columns errors on bad input", {
  expect_error(tv_normalize_columns(list()), "non-empty list")
  expect_error(tv_normalize_columns("nope"), "non-empty list")
  expect_error(tv_normalize_columns(list(list(field = "x")), autoDates = "yes"),
               "must be TRUE or FALSE")
  expect_error(
    tv_normalize_columns(list(list(header = "no field"))),
    "must be a list with a 'field' string"
  )
  expect_error(
    tv_normalize_columns(list(list(field = "x", width = -1))),
    "must be a positive number"
  )
})

test_that("tv_normalize_columns warns on tiny width", {
  expect_warning(
    tv_normalize_columns(list(list(field = "x", width = 10))),
    "may be unreadable"
  )
})

test_that("tv_normalize_columns fills defaults", {
  out <- tv_normalize_columns(
    list(
      list(field = "content"),
      list(field = "start", header = "Start", width = 100, format = "MM/DD")
    ),
    autoDates = TRUE
  )
  expect_true(is.list(out))
  expect_true(out$autoDates)
  expect_length(out$specs, 2)

  s1 <- out$specs[[1]]
  expect_equal(s1$field, "content")
  expect_equal(s1$header, "content")   # defaults to field
  expect_equal(s1$width, 120)
  expect_equal(s1$format, "YYYY-MM-DD")
  expect_equal(s1$align, "left")       # first col

  s2 <- out$specs[[2]]
  expect_equal(s2$header, "Start")
  expect_equal(s2$width, 100)
  expect_equal(s2$format, "MM/DD")
  expect_equal(s2$align, "center")     # non-first col
})

test_that("timevis() with columns = NULL preserves prior behavior", {
  w <- timevis(
    data = data.frame(id = 1, start = "2020-01-01", content = "x")
  )
  expect_null(w$x$columns)
})

test_that("timevis() with columns stashes normalized spec on x", {
  w <- timevis(
    data = data.frame(id = 1, start = "2020-01-01", content = "x"),
    columns = list(list(field = "content", header = "Name"))
  )
  expect_true(is.list(w$x$columns))
  expect_length(w$x$columns$specs, 1)
  expect_equal(w$x$columns$specs[[1]]$header, "Name")
  expect_false(w$x$columns$autoDates)
})

test_that("setColumns chained pre-render queues the API call", {
  w <- timevis(
    data = data.frame(id = 1, start = "2020-01-01", content = "x")
  ) %>%
    setColumns(list(list(field = "content")), autoDates = TRUE)
  expect_true(length(w$x$api) >= 1)
  call <- w$x$api[[1]]
  expect_equal(call$method, "setColumns")
  expect_true(call$columns$autoDates)
  expect_equal(call$columns$specs[[1]]$field, "content")
})
