"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.diffSchemasAndPrintResult = exports.diffSchemas = exports.getSchemaFromGraphql = exports.getSchemaFromURL = exports.getSchemaFromFile = undefined;

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _fs = require("fs");

var _graphqlTools = require("graphql-tools");

var _graphql = require("graphql");

var _cliTable = require("cli-table");

var _cliTable2 = _interopRequireDefault(_cliTable);

var _urlParse = require("url-parse");

var _urlParse2 = _interopRequireDefault(_urlParse);

var _bluebird = require("bluebird");

var _bluebird2 = _interopRequireDefault(_bluebird);

var _nodeFetch = require("node-fetch");

var _nodeFetch2 = _interopRequireDefault(_nodeFetch);

var _safe = require("colors/safe");

var _safe2 = _interopRequireDefault(_safe);

var _clear = require("clear");

var _clear2 = _interopRequireDefault(_clear);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var renderChangeTable = function renderChangeTable(changes) {
  var rows = [];

  for (var i = 0; i < changes.length; i++) {
    var change = changes[i];
    rows.push([change.type, change.description]);
  }

  var t = new _cliTable2.default({
    head: ["Change Type", "Change Description"],
    colWidths: [35, 125],
    chars: {
      top: "═",
      "top-mid": "╤",
      "top-left": "╔",
      "top-right": "╗",
      bottom: "═",
      "bottom-mid": "╧",
      "bottom-left": "╚",
      "bottom-right": "╝",
      left: "║",
      "left-mid": "╟",
      mid: "─",
      "mid-mid": "┼",
      right: "║",
      "right-mid": "╢",
      middle: "│"
    }
  });

  t.push.apply(t, rows.sort(function (a, b) {
    return a[0].localeCompare(b[0]);
  }));

  return t;
};

var getSchemaFromFile = exports.getSchemaFromFile = function getSchemaFromFile(fileLocation) {
  return new _bluebird2.default(function (resolve, reject) {
    (0, _fs.readFile)(fileLocation, function (err, result) {
      if (err) {
        return reject(err);
      } else {
        resolve(result.toString());
      }
    });
  });
};

var getSchemaFromURL = exports.getSchemaFromURL = function getSchemaFromURL(url) {
  return (0, _nodeFetch2.default)(url).then(function (res) {
    return res.text();
  });
};

var getSchemaFromGraphql = exports.getSchemaFromGraphql = function getSchemaFromGraphql(endpoint) {
  var headers = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

  return (0, _nodeFetch2.default)(endpoint, {
    method: "POST",
    headers: _extends({}, headers, { "Content-Type": "application/json" }),
    body: JSON.stringify({ query: _graphql.introspectionQuery })
  }).then(function (res) {
    return res.json().then(function (_ref) {
      var data = _ref.data,
          errors = _ref.errors;

      if (errors) {
        throw new Error(JSON.stringify(errors, null, 2));
      }
      return (0, _graphql.printSchema)((0, _graphql.buildClientSchema)(data));
    });
  });
};

var diffSchemas = exports.diffSchemas = function diffSchemas(from, to) {
  return _bluebird2.default.all([from, to]).then(function (_ref2) {
    var _ref3 = _slicedToArray(_ref2, 2),
        fromTypeDefs = _ref3[0],
        toTypeDefs = _ref3[1];

    var fromSchema = (0, _graphqlTools.buildSchemaFromTypeDefinitions)(fromTypeDefs);
    var toSchema = (0, _graphqlTools.buildSchemaFromTypeDefinitions)(toTypeDefs);

    var dangerous = (0, _graphql.findDangerousChanges)(fromSchema, toSchema);
    var breaking = (0, _graphql.findBreakingChanges)(fromSchema, toSchema);

    if (dangerous.length === 0 && breaking.length === 0) {
      return null;
    } else {
      return {
        dangerous: dangerous,
        breaking: breaking
      };
    }
  });
};

var renderTableTitle = function renderTableTitle(type, count) {
  var style = _safe2.default.bgRed.white.bold;
  var title = "Breaking Changes";
  var emoji = "💣 💣 💣";
  var emojiWidth = 8;
  var countWidth = ("" + count).length;

  if (type === "dangerous") {
    title = "Dangerous Changes";
    emoji = "🔪 🔪 🔪";
    style = _safe2.default.bgMagenta.white.bold;
  }

  // title length + parantheses length + side padding + count width + emoji width
  var lineLength = title.length + 3 + 5 + countWidth + emojiWidth;
  var line = new Array(lineLength).join(" ");
  return ["", style(line), style("  " + emoji + "  " + title + " (" + count + ")" + "   "), style(line), ""].join("\n");
};

var diffSchemasAndPrintResult = exports.diffSchemasAndPrintResult = function diffSchemasAndPrintResult(from, to) {
  diffSchemas(from, to).then(function (res) {
    if (res === null) {
      console.log("\n" + _safe2.default.green("👌  Schemas are in sync!") + "\n");
    } else {
      var dangerous = res.dangerous,
          breaking = res.breaking;

      if (breaking.length) {
        console.log(renderTableTitle("breaking", breaking.length));
        console.log(renderChangeTable(breaking).toString() + "\n");
      }
      if (dangerous.length) {
        console.log(renderTableTitle("dangerous", dangerous.length));
        console.log(renderChangeTable(dangerous).toString() + "\n");
      }
    }
  });
};

/*diffSchemasAndPrintResult(
  getSchemaFromFile("./myra.graphql"),
  getSchemaFromGraphql("http://localhost:4000/api/graphql")
);*/