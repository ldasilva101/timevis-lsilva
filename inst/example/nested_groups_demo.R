# Native multi-column collapsible groups demo for timevis
# Run: shiny::runApp("inst/example/nested_groups_demo.R")

library(shiny)
library(timevis)

# --- Items ----------------------------------------------------------------
items <- data.frame(
  id      = 1:8,
  content = c("Spec",   "Build",   "QA",      "Ship",
              "Hire",   "Onboard", "Audit",   "Filing"),
  start   = c("2026-05-01","2026-05-10","2026-05-20","2026-05-28",
              "2026-05-05","2026-05-15","2026-05-08","2026-05-22"),
  end     = c("2026-05-09","2026-05-19","2026-05-27","2026-05-30",
              "2026-05-14","2026-05-25","2026-05-12","2026-05-26"),
  group   = c("t1","t2","t3","t4","t5","t6","t7","t8")
)

# --- Groups (folders + task leaves) --------------------------------------
groups <- data.frame(
  id      = c("eng","hr","fin",
              "t1","t2","t3","t4","t5","t6","t7","t8"),
  content = c("Engineering","HR","Finance",
              "Spec","Build","QA","Ship","Hire","Onboard","Audit","Filing"),
  status  = c("","","",
              "Complete","Complete","In Progress","Not Started",
              "Complete","In Progress","Complete","In Progress"),
  nestedGroups = I(list(
    list("t1","t2","t3","t4"),  # eng
    list("t5","t6"),             # hr
    list("t7","t8"),             # fin
    NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL
  )),
  showNested = c(TRUE, TRUE, FALSE, rep(NA, 8)),
  stringsAsFactors = FALSE
)

# --- Ties (task dependencies) --------------------------------------------
ties <- data.frame(
  from = c(1, 2, 3, 5, 7),
  to   = c(2, 3, 4, 6, 8)
)

ui <- fluidPage(
  titlePanel("timevis: native multi-column collapsible groups"),
  p("Folders collapse via caret. Start/End columns auto-derived from items. Arrows show task dependencies."),
  timevisOutput("tl", height = "520px")
)

server <- function(input, output, session) {
  output$tl <- renderTimevis({
    timevis(
      data    = items,
      groups  = groups,
      columns = list(
        list(field = "content", header = "Task",  width = 180),
        list(field = "start",   header = "Start", width = 110),
        list(field = "end",     header = "End",   width = 110),
        list(field = "status",  header = "Status", width = 110)
      ),
      autoDates = TRUE, rowMinHeight = 36,
      ties      = ties,
      options = list(stack = TRUE, orientation = "top",
                     margin = list(item = 6, axis = 20))
    )
  })
}

shinyApp(ui, server)
