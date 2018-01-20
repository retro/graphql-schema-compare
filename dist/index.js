"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.diffSchemasAndPrintResult = exports.diffSchemas = exports.getSchemaFromGraphql = exports.getSchemaFromURL = exports.getSchemaFromFile = undefined;

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _fs = require("fs");

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

var _commandLineArgs = require("command-line-args");

var _commandLineArgs2 = _interopRequireDefault(_commandLineArgs);

var _commandLineUsage = require("command-line-usage");

var _commandLineUsage2 = _interopRequireDefault(_commandLineUsage);

var _graphqlTools = require("graphql-tools");

var _graphql = require("graphql");

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

if (require.main === module) {
  var extractSchemaLocation = function extractSchemaLocation(prefix, options) {
    var file = options[prefix + "File"];
    var url = options[prefix + "Url"];
    var graphql = options[prefix + "Graphql"];

    if (file) {
      return { type: "file", location: file };
    }
    if (url) {
      return { type: "url", location: url };
    }
    if (graphql) {
      return { type: "graphql", location: graphql };
    }
  };

  var getSchema = function getSchema(_ref4) {
    var type = _ref4.type,
        location = _ref4.location;

    if (type === "file") {
      return getSchemaFromFile(location);
    }
    if (type === "url") {
      return getSchemaFromURL(location);
    }
    if (type === "graphql") {
      return getSchemaFromGraphql(location);
    }
  };

  var getExplanation = function getExplanation(_ref5) {
    var type = _ref5.type,
        location = _ref5.location;

    var style = _safe2.default.yellow.bold;
    if (type === "file") {
      return "schema from " + style(location) + " (file)";
    }
    if (type === "url") {
      return "schema from " + style(location) + " (URL)";
    }
    if (type === "graphql") {
      return "schema from " + style(location) + " (GraphQL endpoint)";
    }
  };

  var optionDefinitions = [{ name: "fromFile", type: String }, { name: "fromUrl", type: String }, { name: "fromGraphql", type: String }, { name: "toFile", type: String }, { name: "toUrl", type: String }, { name: "toGraphql", type: String }, { name: "help", alias: "h", type: Boolean }];

  var options = (0, _commandLineArgs2.default)(optionDefinitions);

  if (options.help) {
    console.log((0, _commandLineUsage2.default)([{
      header: "GraphQL Schema Comparator",
      content: "Compares two GraphQL schemas and prints the diff. Schemas can be loaded from a file, from a URL (schema string) or from a GraphQL endpoint."
    }, {
      header: "Options",
      optionList: [{
        name: "fromFile",
        typeLabel: "[underline]{file}",
        description: "File path to a GraphQL IDL file of the `from` schema"
      }, {
        name: "fromURL",
        typeLabel: "[underline]{url}",
        description: "URL of GraphQL IDL file of the `from` schema"
      }, {
        name: "fromGraphql",
        typeLabel: "[underline]{url}",
        description: "URL of the GraphQL endpoint that will be used to extract the `from` schema"
      }, {
        name: "toFile",
        typeLabel: "[underline]{file}",
        description: "File path to a GraphQL IDL file of the `to` schema"
      }, {
        name: "toURL",
        typeLabel: "[underline]{url}",
        description: "URL of GraphQL IDL file of the `to` schema"
      }, {
        name: "toGraphql",
        typeLabel: "[underline]{url}",
        description: "URL of the GraphQL endpoint that will be used to extract the `to` schema"
      }, {
        name: "help",
        description: "Show help"
      }]
    }]));
  } else {
    var from = extractSchemaLocation("from", options);
    var to = extractSchemaLocation("to", options);
    if (!(from && to)) {
      console.error("You must define both the `from` and `to` schemas");
    } else {
      var getFrom = getSchema(from);
      var getTo = getSchema(to);
      console.log("\nComparing " + getExplanation(from) + " to " + getExplanation(to));
      diffSchemasAndPrintResult(getFrom, getTo);
    }
  }

  /*diffSchemasAndPrintResult(
    getSchemaFromFile("./myra.graphql"),
    getSchemaFromURL(
      "https://gist.githubusercontent.com/retro/2d1f165858f1bb1182370243d2182d3b/raw/b035f8c545544a48792e4d95c5e80261e48405d9/schema.graphql"
    )
    //getSchemaFromGraphql("http://localhost:4000/api/graphql")
  );*/
}