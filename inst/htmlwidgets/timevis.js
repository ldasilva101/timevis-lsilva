/*********************************************************************/
/* Dean Attali 2016-2023                                             */
/* timevis                                                           */
/* Create timeline visualizations in R using htmlwidgets and vis.js  */
/*********************************************************************/

HTMLWidgets.widget({

  name : 'timevis',

  type : 'output',

  factory : function(el, width, height) {

    var elementId = el.id;
    var container = document.getElementById(elementId);
    var timeline = new vis.Timeline(container, [], {});
    var initialized = false;
    var ctSel = null;
    var ctFil = null;
    var allItems;
    var colSpec = null;             // current { specs:[...], autoDates: bool } or null
    var lastGroupsArray = null;     // raw groups array last passed to timeline.setGroups

    return {

      renderValue: function(opts) {
        // alias this
        var that = this;

        if (!initialized) {
          initialized = true;

          // attach the widget to the DOM
          container.widget = that;

          // Set up the zoom button click listeners
          var zoomMenu = container.getElementsByClassName("zoom-menu")[0];
          zoomMenu.getElementsByClassName("zoom-in")[0]
            .onclick = function(ev) { that.zoomInTimevis(opts.zoomFactor); };
          zoomMenu.getElementsByClassName("zoom-out")[0]
            .onclick = function(ev) { that.zoomOutTimevis(opts.zoomFactor); };

          // set listeners to events and pass data back to Shiny
          if (HTMLWidgets.shinyMode) {

            // Items have been manually selected
            timeline.on('select', function (properties) {
              Shiny.onInputChange(
                elementId + "_selected",
                properties.items
              );
            });
            Shiny.onInputChange(
              elementId + "_selected",
              timeline.getSelection()
            );

            // The range of the window has changes (by dragging or zooming)
            timeline.on('rangechanged', function (properties) {
              Shiny.onInputChange(
                elementId + "_window",
                [timeline.getWindow().start, timeline.getWindow().end]
              );
            });
            Shiny.onInputChange(
              elementId + "_window",
              [timeline.getWindow().start, timeline.getWindow().end]
            );

            // The data in the timeline has changed
            timeline.itemsData.on('*', function (event, properties, senderId) {
              Shiny.onInputChange(
                elementId + "_data" + ":timevisDF",
                timeline.itemsData.get()
              );
            });
            Shiny.onInputChange(
              elementId + "_data" + ":timevisDF",
              timeline.itemsData.get()
            );

            // An item was added or removed, send back the list of IDs
            timeline.itemsData.on('add', function (event, properties, senderId) {
              Shiny.onInputChange(
                elementId + "_ids",
                timeline.itemsData.getIds()
              );
            });
            timeline.itemsData.on('remove', function (event, properties, senderId) {
              Shiny.onInputChange(
                elementId + "_ids",
                timeline.itemsData.getIds()
              );
            });
            Shiny.onInputChange(
              elementId + "_ids",
              timeline.itemsData.getIds()
            );

            // Visible items have changed
            var sendShinyVisible = function() {
              Shiny.onInputChange(
                elementId + "_visible",
                timeline.getVisibleItems()
              );
            };
            timeline.on('rangechanged', sendShinyVisible);
            timeline.itemsData.on('add', sendShinyVisible);
            timeline.itemsData.on('remove', sendShinyVisible);
            setTimeout(sendShinyVisible, 0);
          }

          // if a crosstalk dataframe is used, initialize crosstalk
          if (typeof(crosstalk) !== "undefined" && opts.crosstalk) {
            ctSel = new crosstalk.SelectionHandle(opts.crosstalk.group);
            ctSel.on("change", function(e) {
              if (e.sender !== ctSel) {
                that.setSelection({ itemId : e.value });
              }
            });
            timeline.on('select', function (properties) {
              ctSel.set(properties.items);
            });

            ctFil = new crosstalk.FilterHandle(opts.crosstalk.group);
            ctFil.on("change", function(e) {
              if (e.value === null) {
                that.setItems({ data : allItems });
              } else {
                let keys = e.value;
                keys = keys.map(String); // workaround for https://github.com/rstudio/crosstalk/issues/140
                that.setItems({ data : allItems.filter(function(item) { return keys.includes(item.id); } ) });
              }
              // after doing a filter, a new set of items is used so the selection needs to be re-done
              if (ctSel !== null) {
                that.setSelection({ itemId : ctSel.value });
              }
            });
          }
        }

        // set the custom configuration options
        if (Array === opts.options.constructor) {
          opts['options'] = {};
        }
        if (opts['height'] !== null &&
            typeof opts['options']['height'] === "undefined") {
          opts['options']['height'] = opts['height'];
        }
        if (opts['timezone'] !== null) {
          opts['options']['moment'] = function(date) {
            return vis.moment(date).utcOffset(opts['timezone']);
          };
        }
        timeline.setOptions(opts.options);

        // set the data items and groups
        timeline.itemsData.clear();
        timeline.itemsData.add(opts.items);
        lastGroupsArray = opts.groups || null;
        timeline.setGroups(opts.groups);

        // apply column spec (if any) from initial widget data
        if (opts.columns) {
          colSpec = opts.columns;
        }
        if (colSpec) {
          that.applyColumns();
        }

        // fit the items on the timeline
        if (opts.fit) {
          timeline.fit({ animation : false });
        }

        // Show or hide the zoom button
        var zoomMenu = container.getElementsByClassName("zoom-menu")[0];
        if (opts.showZoom) {
          zoomMenu.setAttribute("data-show-zoom", true);
        } else {
          zoomMenu.removeAttribute("data-show-zoom");
        }

        // Now that the timeline is initialized, call any outstanding API
        // functions that the user wantd to run on the timeline before it was
        // ready
        var numApiCalls = opts['api'].length;
        for (var i = 0; i < numApiCalls; i++) {
          var call = opts['api'][i];
          var method = call.method;
          delete call['method'];
          try {
            that[method](call);
          } catch(err) {}
        }

        // If crosstalk is enabled, respect its selection
        allItems = opts.items;
        if (ctFil !== null && ctFil.filteredKeys !== null) {
          let keys = ctFil.filteredKeys;
          keys = keys.map(String);
          that.setItems({ data : allItems.filter(function(item) { return keys.includes(item.id); } ) });
        }
        if (ctSel !== null) {
          that.setSelection({ itemId : ctSel.value });
        }
      },

      resize : function(width, height) {
        // the timeline widget knows how to resize itself automatically
      },

      // zoom the timeline in/out
      // I had to work out the math on paper so that zooming in and then out
      // will exactly negate each other
      zoomInTimevis : function(percentage, animation) {
        if (typeof animation === "undefined") {
          animation = true;
        }
        var range = timeline.getWindow();
        var start = range.start.valueOf();
        var end = range.end.valueOf();
        var interval = end - start;
        var newInterval = interval / (1 + percentage);
        var distance = (interval - newInterval) / 2;
        var newStart = start + distance;
        var newEnd = end - distance;

        timeline.setWindow({
          start   : newStart,
          end     : newEnd,
          animation : animation
        });
      },
      zoomOutTimevis : function(percentage, animation) {
        if (typeof animation === "undefined") {
          animation = true;
        }
        var range = timeline.getWindow();
        var start = range.start.valueOf();
        var end = range.end.valueOf();
        var interval = end - start;
        var newStart = start - interval * percentage / 2;
        var newEnd = end + interval * percentage / 2;

        timeline.setWindow({
          start   : newStart,
          end     : newEnd,
          animation : animation
        });
      },

      // export the timeline object for others to use if they want to
      timeline : timeline,

      /* API functions that manipulate a timeline's data */
      addItem : function(params) {
        timeline.itemsData.add(params.data);
      },
      addItems : function(params) {
        timeline.itemsData.add(params.data);
      },
      removeItem : function(params) {
        timeline.itemsData.remove(params.itemId);
      },
      addCustomTime : function(params) {
        timeline.addCustomTime(params.time, params.itemId);
      },
      removeCustomTime : function(params) {
        timeline.removeCustomTime(params.itemId);
      },
      setCustomTime : function(params) {
        timeline.setCustomTime(params.time, params.itemId);
      },
      setCurrentTime : function(params) {
        timeline.setCurrentTime(params.time);
      },
      fitWindow : function(params) {
        timeline.fit(params.options);
      },
      centerTime : function(params) {
        timeline.moveTo(params.time, params.options);
      },
      centerItem : function(params) {
         if (typeof params.options === 'undefined') {
          params.options = { 'zoom' : false };
        } else if (typeof params.options.zoom === 'undefined') {
          params.options.zoom = false;
        }
        timeline.focus(params.itemId, params.options);
      },
      setItems : function(params) {
        timeline.itemsData.clear();
        timeline.itemsData.add(params.data);
        if (colSpec) this.applyColumns();
      },
      setGroups : function(params) {
        lastGroupsArray = params.data || null;
        timeline.setGroups(params.data);
        if (colSpec) this.applyColumns();
      },
      setColumns : function(params) {
        // params.columns may be null/undefined to clear
        if (!params.columns) {
          colSpec = null;
          this.clearColumns();
          return;
        }
        colSpec = params.columns;
        this.applyColumns();
      },

      // remove header row + clear the custom groupTemplate
      clearColumns : function() {
        // restore default group rendering by clearing groupTemplate
        timeline.setOptions({ groupTemplate: null });
        var headerWrap = container.querySelector('.timevis-cols-header-wrap');
        if (headerWrap && headerWrap.parentNode) {
          headerWrap.parentNode.removeChild(headerWrap);
        }
        var styleEl = document.getElementById('timevis-cols-style-' + elementId);
        if (styleEl && styleEl.parentNode) styleEl.parentNode.removeChild(styleEl);
      },

      // (re)render group labels as multi-column rows via vis-timeline's
      // groupTemplate option, and inject sticky header row above the timeline.
      applyColumns : function() {
        if (!colSpec) return;
        var specs = colSpec.specs;
        var autoDates = !!colSpec.autoDates;

        // ---- helpers ----
        function parseDate(v) {
          if (v === null || v === undefined || v === "") return null;
          if (v instanceof Date) return v;
          var d = new Date(v);
          return isNaN(d.getTime()) ? null : d;
        }
        function fmtDate(d, format) {
          if (!d) return "";
          if (typeof vis !== 'undefined' && vis.moment) {
            return vis.moment(d).format(format || "YYYY-MM-DD");
          }
          return d.toISOString().slice(0, 10);
        }
        function escapeHtml(s) {
          if (s === null || s === undefined) return "";
          return String(s)
            .replace(/&/g, "&amp;").replace(/</g, "&lt;")
            .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
        }
        function buildHeaderHTML() {
          var parts = ['<div class="timevis-cols timevis-cols-header">'];
          for (var n = 0; n < specs.length; n++) {
            var s = specs[n];
            parts.push(
              '<span class="timevis-col tv-col-' + n + ' tv-align-' + s.align + '">' +
              escapeHtml(s.header || s.field) + '</span>'
            );
          }
          parts.push('</div>');
          return parts.join('');
        }

        // Inject a per-widget <style> tag with one CSS rule per column index.
        // Using class-based widths (not inline style) bypasses vis-timeline's
        // built-in XSS sanitizer (which strips style attrs on group HTML).
        function injectColStyle() {
          var styleId = 'timevis-cols-style-' + elementId;
          var styleEl = document.getElementById(styleId);
          if (!styleEl) {
            styleEl = document.createElement('style');
            styleEl.id = styleId;
            document.head.appendChild(styleEl);
          }
          var rules = [];
          var prefix = '.timevis.html-widget#' + elementId + ' ';
          for (var n = 0; n < specs.length; n++) {
            var s = specs[n];
            rules.push(prefix + '.tv-col-' + n + '{flex:0 0 ' + s.width +
                       'px;width:' + s.width + 'px;min-width:' + s.width +
                       'px;max-width:' + s.width + 'px;}');
          }
          rules.push(prefix + '.tv-align-left{text-align:left;}');
          rules.push(prefix + '.tv-align-center{text-align:center;}');
          rules.push(prefix + '.tv-align-right{text-align:right;}');
          styleEl.textContent = rules.join('\n');
        }
        injectColStyle();

        // closure captures specs/autoDates and recomputes auto dates on demand
        function makeTemplate() {
          return function(group, element) {
            // re-derive item & group maps lazily on each call so updates work
            var groupsArr = lastGroupsArray || [];
            var groupById = {};
            for (var j = 0; j < groupsArr.length; j++) {
              groupById[groupsArr[j].id] = groupsArr[j];
            }
            var itemsByGroup = {};
            if (autoDates) {
              var arr = timeline.itemsData.get();
              for (var i = 0; i < arr.length; i++) {
                var it = arr[i];
                if (it.group === undefined || it.group === null) continue;
                (itemsByGroup[it.group] = itemsByGroup[it.group] || []).push(it);
              }
            }
            var dateCache = {};
            function computeDates(gid) {
              if (Object.prototype.hasOwnProperty.call(dateCache, gid)) {
                return dateCache[gid];
              }
              var g = groupById[gid];
              var startD = null, endD = null;
              var nested = g && g.nestedGroups;
              if (nested && nested.length) {
                for (var k = 0; k < nested.length; k++) {
                  var cd = computeDates(nested[k]);
                  if (cd.start && (!startD || cd.start < startD)) startD = cd.start;
                  if (cd.end   && (!endD   || cd.end   > endD  )) endD   = cd.end;
                }
              }
              var its = itemsByGroup[gid] || [];
              for (var m = 0; m < its.length; m++) {
                var s = parseDate(its[m].start);
                var e = parseDate(its[m].end) || s;
                if (s && (!startD || s < startD)) startD = s;
                if (e && (!endD   || e > endD  )) endD   = e;
              }
              return (dateCache[gid] = { start: startD, end: endD });
            }

            function valueFor(g, spec) {
              var f = spec.field;
              if (f === "content") return g.content;
              if (autoDates && (f === "start" || f === "end") &&
                  (g[f] === undefined || g[f] === null || g[f] === "")) {
                return fmtDate(computeDates(g.id)[f], spec.format);
              }
              var v = g[f];
              if (v === undefined || v === null) return "";
              var asDate = parseDate(v);
              if (asDate && (f === "start" || f === "end" ||
                             /date|time/i.test(f))) {
                return fmtDate(asDate, spec.format);
              }
              return v;
            }

            // Build the row HTML and return it. Use class-based widths
            // (tv-col-N) so widths survive vis-timeline's XSS sanitizer.
            var parts = ['<div class="timevis-cols">'];
            for (var n = 0; n < specs.length; n++) {
              var s = specs[n];
              var raw = valueFor(group, s);
              var inner = (n === 0 && s.field === "content")
                ? (raw == null ? "" : String(raw))   // pass HTML through
                : escapeHtml(raw);
              parts.push(
                '<span class="timevis-col tv-col-' + n +
                ' tv-align-' + s.align + '">' + inner + '</span>'
              );
            }
            parts.push('</div>');
            return parts.join('');
          };
        }

        // Hand the template to vis-timeline. Also disable the XSS sanitizer
        // so our `class` attributes survive (the default sanitizer can be
        // surprisingly aggressive). The HTML we generate is built from
        // R-side data only, so this does not weaken any user-facing trust
        // boundary.
        timeline.setOptions({
          xss: { disabled: true },
          groupTemplate: makeTemplate()
        });
        // force a redraw so existing groups re-render through the template
        if (typeof timeline.redraw === 'function') timeline.redraw();

        // inject / replace sticky header row above the timeline.
        // Sibling of .vis-timeline so we never displace .vis-labelset.
        var visRoot = container.querySelector('.vis-timeline');
        var existing = container.querySelector('.timevis-cols-header-wrap');
        if (existing && existing.parentNode) existing.parentNode.removeChild(existing);
        if (visRoot && visRoot.parentNode) {
          var headerEl = document.createElement('div');
          headerEl.className = 'timevis-cols-header-wrap';
          headerEl.innerHTML = buildHeaderHTML();
          visRoot.parentNode.insertBefore(headerEl, visRoot);
        }
      },
      setOptions : function(params) {
        timeline.setOptions(params.options);
      },
      setSelection : function(params) {
        timeline.setSelection(params.itemId, params.options);
        if (HTMLWidgets.shinyMode) {
          Shiny.onInputChange(
            elementId + "_selected",
            params.itemId
          );
        }
      },
      setWindow : function(params) {
        timeline.setWindow(params.start, params.end, params.options);
      },
      zoomIn : function(params) {
        timeline.zoomIn(params.percent, { animation : params.animation });
      },
      zoomOut : function(params) {
        timeline.zoomOut(params.percent, { animation : params.animation });
      },
    };
  }
});

// Attach message handlers if in shiny mode (these correspond to API)
if (HTMLWidgets.shinyMode) {
  var fxns =
    ['addItem', 'addItems', 'removeItem', 'addCustomTime', 'removeCustomTime',
     'fitWindow', 'centerTime', 'centerItem', 'setItems', 'setGroups',
     'setColumns', 'setOptions', 'setSelection', 'setWindow', 'setCustomTime',
     'setCurrentTime', 'zoomIn', 'zoomOut'];

  var addShinyHandler = function(fxn) {
    return function() {
      Shiny.addCustomMessageHandler(
        "timevis:" + fxn, function(message) {
          var el = document.getElementById(message.id);
          if (el) {
            delete message['id'];
            el.widget[fxn](message);
          }
        }
      );
    }
  };

  for (var i = 0; i < fxns.length; i++) {
    addShinyHandler(fxns[i])();
  }
}
