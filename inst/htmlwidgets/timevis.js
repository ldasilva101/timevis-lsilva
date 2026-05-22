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
    var originalGroupContent = {};  // groupId -> original content (to allow rebuild)

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
        originalGroupContent = {};
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
        originalGroupContent = {};
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

      // remove header row + restore original group contents
      clearColumns : function() {
        // restore original content for any group we rewrote
        if (timeline.groupsData) {
          var ids = timeline.groupsData.getIds();
          var updates = [];
          for (var i = 0; i < ids.length; i++) {
            var gid = ids[i];
            if (Object.prototype.hasOwnProperty.call(originalGroupContent, gid)) {
              updates.push({ id : gid, content : originalGroupContent[gid] });
            }
          }
          if (updates.length) timeline.groupsData.update(updates);
        }
        originalGroupContent = {};
        var header = container.querySelector('.timevis-cols-header');
        if (header && header.parentNode) header.parentNode.removeChild(header);
      },

      // (re)render group content as multi-column rows and inject sticky header
      applyColumns : function() {
        if (!colSpec || !timeline.groupsData) return;
        var specs = colSpec.specs;
        var autoDates = !!colSpec.autoDates;
        var groups = timeline.groupsData.get();
        if (!groups || groups.length === 0) return;

        // build a quick map of items per group for autoDates
        var itemsByGroup = {};
        if (autoDates) {
          var allItemsArr = timeline.itemsData.get();
          for (var i = 0; i < allItemsArr.length; i++) {
            var it = allItemsArr[i];
            if (it.group === undefined || it.group === null) continue;
            (itemsByGroup[it.group] = itemsByGroup[it.group] || []).push(it);
          }
        }

        // build a map: groupId -> group object
        var groupById = {};
        for (var j = 0; j < groups.length; j++) groupById[groups[j].id] = groups[j];

        function parseDate(v) {
          if (v === null || v === undefined || v === "") return null;
          if (v instanceof Date) return v;
          var d = new Date(v);
          return isNaN(d.getTime()) ? null : d;
        }

        // recursive autoDates: leaf = min/max of items in group; parent = min/max of nested
        var dateCache = {}; // gid -> { start: Date|null, end: Date|null }
        function computeDates(gid) {
          if (Object.prototype.hasOwnProperty.call(dateCache, gid)) return dateCache[gid];
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
          return (dateCache[gid] = { start : startD, end : endD });
        }

        function fmtDate(d, format) {
          if (!d) return "";
          if (typeof vis !== 'undefined' && vis.moment) {
            return vis.moment(d).format(format || "YYYY-MM-DD");
          }
          // fallback: ISO date
          return d.toISOString().slice(0, 10);
        }

        function escapeHtml(s) {
          if (s === null || s === undefined) return "";
          return String(s)
            .replace(/&/g, "&amp;").replace(/</g, "&lt;")
            .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
        }

        function valueFor(group, spec) {
          var f = spec.field;
          if (autoDates && (f === "start" || f === "end") &&
              (group[f] === undefined || group[f] === null || group[f] === "")) {
            var dd = computeDates(group.id);
            return fmtDate(dd[f], spec.format);
          }
          var v = group[f];
          if (v === undefined || v === null) return "";
          var asDate = parseDate(v);
          if (asDate && (f === "start" || f === "end" ||
                         /date|time/i.test(f))) {
            return fmtDate(asDate, spec.format);
          }
          return v;
        }

        function buildRow(group, isHeader) {
          var parts = ['<div class="timevis-cols' +
                       (isHeader ? ' timevis-cols-header' : '') + '">'];
          for (var n = 0; n < specs.length; n++) {
            var s = specs[n];
            var raw = isHeader ? (s.header || s.field) : valueFor(group, s);
            // for non-header first column, preserve any HTML the user already
            // had in `content` (e.g. their group name with formatting)
            var inner;
            if (isHeader) {
              inner = escapeHtml(raw);
            } else if (n === 0 && s.field === "content") {
              inner = raw; // leave HTML
            } else {
              inner = escapeHtml(raw);
            }
            parts.push(
              '<span class="timevis-col" style="width:' + s.width +
              'px;text-align:' + s.align + '">' + inner + '</span>'
            );
          }
          parts.push('</div>');
          return parts.join('');
        }

        // rebuild group content
        var updates = [];
        for (var p = 0; p < groups.length; p++) {
          var grp = groups[p];
          if (!Object.prototype.hasOwnProperty.call(originalGroupContent, grp.id)) {
            originalGroupContent[grp.id] = grp.content;
          }
          // make a synthetic group object whose `content` field is the original,
          // so first-column field="content" produces the original label
          var synth = {};
          for (var key in grp) {
            if (Object.prototype.hasOwnProperty.call(grp, key)) synth[key] = grp[key];
          }
          synth.content = originalGroupContent[grp.id];
          updates.push({ id : grp.id, content : buildRow(synth, false) });
        }
        timeline.groupsData.update(updates);

        // inject / replace sticky header row in the left panel
        var leftPanel = container.querySelector('.vis-panel.vis-left');
        if (leftPanel) {
          var existing = leftPanel.querySelector('.timevis-cols-header');
          if (existing) existing.parentNode.removeChild(existing);
          var headerEl = document.createElement('div');
          headerEl.className = 'timevis-cols-header-wrap';
          headerEl.innerHTML = buildRow({}, true);
          leftPanel.insertBefore(headerEl, leftPanel.firstChild);
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
