context("ties / setTies")

items <- data.frame(
  id      = 1:3,
  content = c("Plan", "Build", "Ship"),
  start   = c("2016-01-10", "2016-01-14", "2016-01-20"),
  end     = c("2016-01-13", "2016-01-19", "2016-01-22")
)

test_that("timevis() with ties = NULL stores no ties", {
  w <- timevis(data = items)
  expect_null(w$x$ties)
})

test_that("timevis() errors when ties is not a data.frame", {
  expect_error(
    timevis(data = items, ties = list(from = 1, to = 2)),
    "'ties' must be a data.frame"
  )
})

test_that("timevis() errors when ties is missing required columns", {
  expect_error(
    timevis(data = items, ties = data.frame(from = 1)),
    "'from' and 'to'"
  )
  expect_error(
    timevis(data = items, ties = data.frame(to = 1)),
    "'from' and 'to'"
  )
})

test_that("timevis() accepts a zero-row ties data.frame", {
  w <- timevis(data = items,
               ties = data.frame(from = character(), to = character()))
  expect_true(is.null(w$x$ties) || length(w$x$ties) == 0)
})

test_that("timevis() normalises ties to list-of-lists with character ids", {
  w <- timevis(data = items,
               ties = data.frame(from = c(1L, 2L), to = c(2L, 3L)))
  expect_true(is.list(w$x$ties))
  expect_length(w$x$ties, 2)
  expect_equal(w$x$ties[[1]]$from, "1")
  expect_equal(w$x$ties[[1]]$to,   "2")
  expect_equal(w$x$ties[[2]]$from, "2")
  expect_equal(w$x$ties[[2]]$to,   "3")
})

test_that("setTies chained pre-render queues the API call", {
  ties_df <- data.frame(from = 1L, to = 2L)
  w <- timevis(data = items) %>% setTies(ties_df)
  expect_true(length(w$x$api) >= 1)
  call <- w$x$api[[length(w$x$api)]]
  expect_equal(call$method, "setTies")
  expect_true(is.list(call$ties))
  expect_length(call$ties, 1)
  expect_equal(call$ties[[1]]$from, "1")
  expect_equal(call$ties[[1]]$to,   "2")
})

test_that("setTies accepts NULL to clear ties", {
  w <- timevis(data = items) %>% setTies(NULL)
  call <- w$x$api[[length(w$x$api)]]
  expect_equal(call$method, "setTies")
  expect_null(call$ties)
})
