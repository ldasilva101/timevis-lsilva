.onLoad <- function(libname, pkgname) {
  # register a handler to decode the timeline data passed from JS to R
  # because the default way of decoding it in shiny flattens a data.frame
  # to a vector
  shiny::registerInputHandler("timevisDF", function(data, ...) {
    jsonlite::fromJSON(jsonlite::toJSON(data, auto_unbox = TRUE))
  }, force = TRUE)
}

# Check if an argument is a single boolean value
is.bool <- function(x) {
  is.logical(x) && length(x) == 1 && !is.na(x)
}

# Convert a data.frame to a list of lists (the data format that D3 uses)
dataframeToD3 <- function(df) {
  if (missing(df) || is.null(df)) {
    return(list())
  }
  if (!is.data.frame(df)) {
    stop("timevis: the input must be a dataframe", call. = FALSE)
  }
  df <- as.data.frame(df)
  row.names(df) <- NULL
  lapply(seq_len(nrow(df)), function(row) {
    row <- df[row, , drop = FALSE]
    row_not_na <- row[, !is.na(row), drop = FALSE]
    lapply(row_not_na, function(x) {
      if (!lengths(x)) return(NA)
      if (is.logical(x)) return(x)
      if (lengths(x) > 1 | is.list(x)) return(lapply(unlist(x),as.character))
      return(as.character(x))
    })
  })
}

#' @importFrom magrittr %>%
#' @export
magrittr::`%>%`

# Validate and normalize a `columns` spec list. Returns NULL if input is NULL.
# Output: list with $specs (list of fully-defaulted col specs) and $autoDates.
tv_normalize_columns <- function(columns, autoDates = FALSE) {
  if (is.null(columns)) return(NULL)
  if (!is.list(columns) || length(columns) == 0) {
    stop("timevis: 'columns' must be a non-empty list of column specs",
         call. = FALSE)
  }
  if (!is.bool(autoDates)) {
    stop("timevis: 'autoDates' must be TRUE or FALSE", call. = FALSE)
  }
  specs <- lapply(seq_along(columns), function(i) {
    spec <- columns[[i]]
    if (!is.list(spec) || is.null(spec[["field"]]) ||
        !is.character(spec[["field"]]) || length(spec[["field"]]) != 1) {
      stop(sprintf("timevis: columns[[%d]] must be a list with a 'field' string", i),
           call. = FALSE)
    }
    if (!is.null(spec[["width"]]) && (!is.numeric(spec[["width"]]) ||
                                      length(spec[["width"]]) != 1 ||
                                      spec[["width"]] <= 0)) {
      stop(sprintf("timevis: columns[[%d]]$width must be a positive number", i),
           call. = FALSE)
    }
    if (!is.null(spec[["width"]]) && spec[["width"]] < 40) {
      warning(sprintf("timevis: columns[[%d]]$width is < 40px and may be unreadable", i))
    }
    list(
      field  = spec[["field"]],
      header = spec[["header"]] %||% spec[["field"]],
      width  = spec[["width"]] %||% 120,
      format = spec[["format"]] %||% "YYYY-MM-DD",
      align  = spec[["align"]]  %||% (if (i == 1) "left" else "center")
    )
  })
  list(specs = specs, autoDates = isTRUE(autoDates))
}

# null-coalescing helper
`%||%` <- function(a, b) if (is.null(a)) b else a
