<h3 align="center">timevis</h3>
<h4 align="center">
  📅 Create interactive timeline visualizations in R
  <br><br>
  <a href="https://daattali.com/shiny/timevis-demo/">Demo</a>
  &middot;
  by <a href="https://deanattali.com">Dean Attali</a>
</h4>

<p align="center">
  <a href="https://github.com/daattali/timevis/actions">
    <img src="https://github.com/daattali/timevis/workflows/R-CMD-check/badge.svg" alt="R build status" />
  </a> 
  <a href="https://cran.r-project.org/package=timevis">
    <img src="https://www.r-pkg.org/badges/version/timevis" alt="CRAN version" />
  </a>
  <a href="https://paypal.me/daattali/20">
    <img src="http://i.imgur.com/vCIGFrH.png" />
  </a>
</p>

---

<img src="inst/img/hex.png" width="170" align="right"/>

{timevis} lets you create rich and *fully interactive* timeline
visualizations in R. Timelines can be included in Shiny apps or R
markdown documents.
{timevis} includes an extensive API to manipulate a timeline after
creation, and supports getting data out of the visualization into R.
This package is based on the [visjs](https://visjs.github.io/vis-timeline/docs/timeline/) Timeline
JavaScript library.

**Need Shiny help? [I'm available for consulting](https://attalitech.com/).**<br/>
**If you find {timevis} useful, please consider [supporting my work](https://github.com/sponsors/daattali)! ❤**

<p align="center">
  <a style="display: inline-block;" href="https://github.com/sponsors/daattali">
    <img height="35" src="https://i.imgur.com/034B8vq.png" />
  </a>
</p>

> This package is part of a larger ecosystem of packages with a shared vision: solving common Shiny issues and improving Shiny apps with minimal effort, minimal code changes, and clear documentation. Other packages for your Shiny apps:

| Package | Description | Demo |
|---|---|---|
| [shinyjs](https://deanattali.com/shinyjs/) | 💡 Easily improve the user experience of your Shiny apps in seconds | [🔗](https://deanattali.com/shinyjs/overview#demo) |
| [shinyalert](https://github.com/daattali/shinyalert/) | 🗯️ Easily create pretty popup messages (modals) in Shiny | [🔗](https://daattali.com/shiny/shinyalert-demo/) |
| [shinyscreenshot](https://github.com/daattali/shinyscreenshot/) | 📷 Capture screenshots of entire pages or parts of pages in Shiny apps | [🔗](https://daattali.com/shiny/shinyscreenshot-demo/) |
| [shinycssloaders](https://github.com/daattali/shinycssloaders/) | ⌛ Add loading animations to a Shiny output while it's recalculating | [🔗](https://daattali.com/shiny/shinycssloaders-demo/) |
| [colourpicker](https://github.com/daattali/colourpicker/) | 🎨 A colour picker tool for Shiny and for selecting colours in plots | [🔗](https://daattali.com/shiny/colourInput/) |
| [shinybrowser](https://github.com/daattali/shinybrowser/) | 🌐 Find out information about a user's web browser in Shiny apps | [🔗](https://daattali.com/shiny/shinybrowser-demo/) |
| [shinydisconnect](https://github.com/daattali/shinydisconnect/) | 🔌 Show a nice message when a Shiny app disconnects or errors | [🔗](https://daattali.com/shiny/shinydisconnect-demo/) |
| [shinytip](https://github.com/daattali/shinytip/) | 💬 Simple flexible tooltips for Shiny apps | WIP |
| [shinymixpanel](https://github.com/daattali/shinymixpanel/) | 🔍 Track user interactions with Mixpanel in Shiny apps or R scripts | WIP |
| [shinyforms](https://github.com/daattali/shinyforms/) | 📝 Easily create questionnaire-type forms with Shiny | WIP |

## Demo

[Click here](https://daattali.com/shiny/timevis-demo/) to view an
interactive demo of many {timevis} features.

If you create a cool timeline with {timevis}, I’d love
to [hear about it](https://deanattali.com/contact/)\!

<h2 id="sponsors">

Sponsors 🏆

</h2>

> There are no sponsors yet

[Become the first sponsor for
{timevis}\!](https://github.com/sponsors/daattali/sponsorships?tier_id=39856)

## Table of contents

  - [Installation](#install)
  - [How to use](#usage)
  - [Slightly more advanced examples](#advanced-examples)
  - [Interactivity](#interactivity)
  - [Groups](#groups)
  - [Multi-column group labels](#columns)
  - [Dependency ties](#ties)
  - [Functions to manipulate a timeline](#manipulate-api)
  - [In a Shiny app](#shiny-apps)
      - [Retrieving data from the widget](#retrieve-data)
  - [Crosstalk support](#crosstalk)

<h2 id="install">

Installation

</h2>

**For most users:** To install the stable CRAN version:

``` r
install.packages("timevis")
```

**For advanced users:** To install the latest development version from GitHub:

``` r
install.packages("remotes")
remotes::install_github("daattali/timevis")
```

<h2 id="usage">

How to use

</h2>

You can view a minimal timeline without any data by simply running

``` r
library(timevis)
timevis()
```

![Minimal timeline](inst/img/minimal.png)

You can add data to the timeline by supplying a data.frame

``` r
data <- data.frame(
  id      = 1:4,
  content = c("Item one"  , "Item two"  ,"Ranged item", "Item four"),
  start   = c("2016-01-10", "2016-01-11", "2016-01-20", "2016-02-14 15:00:00"),
  end     = c(NA          ,           NA, "2016-02-04", NA)
)

timevis(data)
```

![Basic timeline](inst/img/basic.png)

Every item must have a `content` and a `start` variable. If the item is
a time range rather than a single point in time, you can supply an `end` as
well. `id` is only required if you want to access or manipulate an item.

There are more variables that can be used in the data.frame – they are
all documented in the help file for `?timevis()` under the **Data
format** section.

By default, a timeline will show the current date as a red vertical line
and will have zoom in/out buttons. You can supply many customization
options to `timevis()` in order to get it just right (see `?timevis()`
for details).

<h2 id="advanced-examples">

Slightly more advanced examples

</h2>

The content of an item can even include HTML, which makes it easy to
show any kind of data in a timeline, such as the matches of the 2014
World Cup:

![World cup timeline](inst/img/worldcup.png)

If you know some CSS, you can completely customize the look of the
timeline:

![Custom style timeline](inst/img/customstyle.png)

<h2 id="interactivity">

Interactivity

</h2>

The timeline lets the user interact with it seamlessly. You can click on
the zoom in/out buttons or drag the timeline left/right in order to move
to past/future dates.

If you set the `editable = TRUE` option, then the user will be able to
add new items by double clicking, modify items by dragging, and delete
items by selecting them.

<h2 id="groups">

Groups

</h2>

You can use the groups feature to group together multiple items into
"buckets". When using groups, all items with the same group
are placed on one line. A vertical axis is displayed showing the group
names. Grouping items can be useful for a wide range of applications,
for example when showing availability of multiple people, rooms, or
other resources next to each other. You can also think of groups as
"adding a Y axis".

Here is an example of a timeline that has four groups: "Gym", "Pool", "Sauna", "Hot Tub":

![Groups timeline](inst/img/groups.png)

In order to use groups, items in the data need to have group ids, and a
separate dataframe containing the group information needs to be
provided. More information about using groups is available in the help file for `?timevis()` under the **Groups**
section.

Groups can also contain nested groups. The next example is similar to the previous one, except
"Sauna" and "Hot Tub" are now nested under "Pool":

![Nested groups timeline](inst/img/nestedgroups.png)

Refer to the [visjs Timeline](https://visjs.github.io/vis-timeline/docs/timeline/) documentation to see all the options that are supported.

<h2 id="columns">

Multi-column group labels

</h2>

The `columns` argument lets you render the left label panel as a multi-column table. Each column is defined by a named list with a `field` (required), `header`, `width` (pixels), `format` (moment.js date format), and `align`. A sticky header row is rendered above the timeline axis without consuming a timeline lane.

When `autoDates = TRUE`, virtual `"start"` and `"end"` fields are automatically derived from the items in each group (and recursively from nested groups), so you do not need to add date columns to the groups dataframe by hand.

Use `rowMinHeight` to prevent empty rows from collapsing (default 36 px).

``` r
timevis(
  data = items,
  groups = groups,
  columns = list(
    list(field = "content", header = "Task",   width = 180),
    list(field = "start",   header = "Start",  width = 110),
    list(field = "end",     header = "End",     width = 110),
    list(field = "status",  header = "Status",  width = 110)
  ),
  autoDates = TRUE,
  rowMinHeight = 36
)
```

You can update the columns after creation with `setColumns()`, or remove them with `clearColumns()`.

<h2 id="ties">

Dependency ties

</h2>

The `ties` argument draws directed dependency lines between items. Each row of the `ties` data frame connects the right edge of the `from` item to the left edge of the `to` item with a three-segment horizontal-vertical-horizontal path and an arrowhead. An item may appear in multiple ties.

``` r
ties <- data.frame(from = c(1, 2, 3), to = c(2, 3, 4))
timevis(data = items, ties = ties)
```

Ties are automatically redrawn when the user pans or zooms, and are hidden when either endpoint belongs to a collapsed nested group. You can update ties after creation with `setTies()`.

<h2 id="manipulate-api">

Functions to manipulate a timeline

</h2>

There are many functions that allow programmatic manipulation of a
timeline. For example: `addItem()` programmatically adds a new item,
`centerItem()` moves the timeline so that a given item is centered,
`setWindow()` sets the start and end dates of the timeline,
`setOptions()` updates the configuration options, and many more
functions are available.

There are two ways to call these timeline manipulation functions:

### 1\. Timeline manipulation using `%>%` on `timevis()`

You can manipulate a timeline widget during its creation by chaining
functions to the `timevis()` call. For example:

    timevis() %>%
      addItem(list(id = "item1", content = "one", start = "2016-08-01")) %>%
      centerItem("item1")

This method of manipulating a timeline is especially useful when
creating timeline widgets in the R console or in R markdown documents
because it can be used directly when initializing the widget.

### 2\. Timeline manipulation using a timeline’s ID

In Shiny apps, you can manipulate a timeline widget at any point after
its creation by referring to its ID. For example:

<pre>
library(shiny)

ui <- fluidPage(
  timevisOutput("mytime"),
  actionButton("btn", "Add item and center")
)

server <- function(input, output, session) {
  output$mytime <- renderTimevis(timevis())
  observeEvent(input$btn, {<strong>
    addItem("mytime", list(id = "item1", content = "one", start = "2016-08-01"))
    centerItem("mytime", "item1")</strong>
  })
}

shinyApp(ui = ui, server = server)
</pre>

You can even chain these functions and use this manipulation code
instead of the bold code:

    addItem("mytime", list(id = "item1", content = "one", start = "2016-08-01")) %>%
      centerItem("item1")

*Technical note: If you’re trying to understand how both methods of
timeline manipulation work, it might seem very bizarre to you. The
reason they work is that every manipulation function accepts either a
`timevis` object or the ID of one. In order to make chaining work, the
return value from these functions depend on the input: if a `timevis`
object was given, then an updated `timevis` object is returned, and if
an ID was given, then the same ID is returned.*

### Extending timevis

If you need to perform any actions on the timeline object that are not supported by the {timevis} API, you may be able to do so by manipulating the timeline's JavaScript object directly. The timeline object is available via `document.getElementById("id").widget.timeline` (replace `id` with the timeline's id).

This timeline object is the direct widget that vis.js creates, and you can see the [visjs documentation](https://visjs.github.io/vis-timeline/docs/timeline/#Methods) to see what actions you can perform on that object.

<h2 id="shiny-apps">

In a Shiny app

</h2>

You can add a timeline to a Shiny app by adding `timevisOutput()` to the
UI and `renderTimevis(timevis())` to the server.

<h3 id="retrieve-data">

Retrieving data from the widget

</h3>

It is possible to retrieve data from a timeline in a Shiny app. When a
timeline widget is created in a Shiny app, there are four pieces of
information that are always accessible as Shiny inputs. These inputs
have special names based on the timeline’s id. Suppose that a timeline
is created with an `outputId` of **"mytime"**, then the following four
input variables will be available:

  - **input$mytime\_data** - will return a data.frame containing the
    data of the items in the timeline. The input is updated every time
    an item is modified, added, or removed.
  - **input$mytime\_ids** - will return the IDs (a vector) of all the
    items in the timeline. The input is updated every time an item is
    added or removed from the timeline.
  - **input$mytime\_selected** - will return the IDs (a vector) of the
    selected items in the timeline. The input is updated every time an
    item is selected or unselected by the user. Note that this will not
    get updated if an item is selected programmatically using the API
    functions.
  - **input$mytime\_window** - will return a 2-element vector containing
    the minimum and maximum dates currently visible in the timeline. The
    input is updated every time the viewable window of dates is updated
    (by zooming or moving the window).
  - **input$mytime\_visible** - will return a list of IDs of items
    currently visible in the timeline.

<h2 id="crosstalk">

Crosstalk support

</h2>

{timevis} is fully compatible with [crosstalk](https://github.com/rstudio/crosstalk). This means that you can provide it with a crosstalk `SharedData` object to select/filter data across multiple Shiny widgets.

Here is a simple example:

``` r
df <- data.frame(start = c(Sys.Date(), Sys.Date() - 1, Sys.Date() - 2), content = 1:3)
shared_df <- crosstalk::SharedData$new(df)
crosstalk::bscols(
  timevis(shared_df, options = list(multiselect = TRUE), showZoom = FALSE, width = "100%"),
  DT::datatable(shared_df)
)
```

If you select any events in the timeline (use *ctrl* or *shift* to select multiple events), then the table will automatically select those as well, and vice versa.

-----

You can view examples of many of the features supported by checking out
the [demo Shiny app](https://daattali.com/shiny/timevis-demo/). If you
want to see how those examples were created, the full code for the
examples is inside
[inst/example](https://github.com/daattali/timevis/tree/master/inst/example).

Lastly, if you want to learn how to develop an htmlwidget to have
similar features as this package, you can check out the
[`timevisBasic`](https://github.com/daattali/timevisBasic) package or
[my tutorial on htmlwidgets
tips](https://deanattali.com/blog/advanced-htmlwidgets-tips/).

## Credits

Logo design by [Alfredo Hernández](https://aldomann.com/).
