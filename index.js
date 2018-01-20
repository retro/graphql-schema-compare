import { readFile } from "fs";
import Table from "cli-table";
import URL from "url-parse";
import Promise from "bluebird";
import fetch from "node-fetch";
import colors from "colors/safe";
import clear from "clear";
import commandLineArgs from "command-line-args";
import commandLineUsage from "command-line-usage";
import { buildSchemaFromTypeDefinitions } from "graphql-tools";
import {
  introspectionQuery,
  buildClientSchema,
  printSchema,
  findBreakingChanges,
  findDangerousChanges
} from "graphql";

const renderChangeTable = changes => {
  let rows = [];

  for (let i = 0; i < changes.length; i++) {
    let change = changes[i];
    rows.push([change.type, change.description]);
  }

  const t = new Table({
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

  t.push.apply(
    t,
    rows.sort((a, b) => {
      return a[0].localeCompare(b[0]);
    })
  );

  return t;
};

export const getSchemaFromFile = fileLocation => {
  return new Promise((resolve, reject) => {
    readFile(fileLocation, (err, result) => {
      if (err) {
        return reject(err);
      } else {
        resolve(result.toString());
      }
    });
  });
};

export const getSchemaFromURL = url => {
  return fetch(url).then(res => res.text());
};

export const getSchemaFromGraphql = (endpoint, headers = {}) => {
  return fetch(endpoint, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ query: introspectionQuery })
  }).then(res => {
    return res.json().then(({ data, errors }) => {
      if (errors) {
        throw new Error(JSON.stringify(errors, null, 2));
      }
      return printSchema(buildClientSchema(data));
    });
  });
};

export const diffSchemas = (from, to) => {
  return Promise.all([from, to]).then(([fromTypeDefs, toTypeDefs]) => {
    const fromSchema = buildSchemaFromTypeDefinitions(fromTypeDefs);
    const toSchema = buildSchemaFromTypeDefinitions(toTypeDefs);

    const dangerous = findDangerousChanges(fromSchema, toSchema);
    const breaking = findBreakingChanges(fromSchema, toSchema);

    if (dangerous.length === 0 && breaking.length === 0) {
      return null;
    } else {
      return {
        dangerous,
        breaking
      };
    }
  });
};

const renderTableTitle = (type, count) => {
  let style = colors.bgRed.white.bold;
  let title = "Breaking Changes";
  let emoji = "💣 💣 💣";
  let emojiWidth = 8;
  let countWidth = ("" + count).length;

  if (type === "dangerous") {
    title = "Dangerous Changes";
    emoji = "🔪 🔪 🔪";
    style = colors.bgMagenta.white.bold;
  }

  // title length + parantheses length + side padding + count width + emoji width
  const lineLength = title.length + 3 + 5 + countWidth + emojiWidth;
  const line = new Array(lineLength).join(" ");
  return [
    "",
    style(line),
    style("  " + emoji + "  " + title + " (" + count + ")" + "   "),
    style(line),
    ""
  ].join("\n");
};

export const diffSchemasAndPrintResult = (from, to) => {
  diffSchemas(from, to).then(res => {
    if (res === null) {
      console.log("\n" + colors.green("👌  Schemas are in sync!") + "\n");
    } else {
      const { dangerous, breaking } = res;
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
  const extractSchemaLocation = (prefix, options) => {
    const file = options[prefix + "File"];
    const url = options[prefix + "Url"];
    const graphql = options[prefix + "Graphql"];

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

  const getSchema = ({ type, location }) => {
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

  const getExplanation = ({ type, location }) => {
    const style = colors.yellow.bold;
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

  const optionDefinitions = [
    { name: "fromFile", type: String },
    { name: "fromUrl", type: String },
    { name: "fromGraphql", type: String },
    { name: "toFile", type: String },
    { name: "toUrl", type: String },
    { name: "toGraphql", type: String },
    { name: "help", alias: "h", type: Boolean }
  ];

  const options = commandLineArgs(optionDefinitions);

  if (options.help) {
    console.log(
      commandLineUsage([
        {
          header: "GraphQL Schema Comparator",
          content:
            "Compares two GraphQL schemas and prints the diff. Schemas can be loaded from a file, from a URL (schema string) or from a GraphQL endpoint."
        },
        {
          header: "Options",
          optionList: [
            {
              name: "fromFile",
              typeLabel: "[underline]{file}",
              description:
                "File path to a GraphQL IDL file of the `from` schema"
            },
            {
              name: "fromURL",
              typeLabel: "[underline]{url}",
              description: "URL of GraphQL IDL file of the `from` schema"
            },
            {
              name: "fromGraphql",
              typeLabel: "[underline]{url}",
              description:
                "URL of the GraphQL endpoint that will be used to extract the `from` schema"
            },
            {
              name: "toFile",
              typeLabel: "[underline]{file}",
              description: "File path to a GraphQL IDL file of the `to` schema"
            },
            {
              name: "toURL",
              typeLabel: "[underline]{url}",
              description: "URL of GraphQL IDL file of the `to` schema"
            },
            {
              name: "toGraphql",
              typeLabel: "[underline]{url}",
              description:
                "URL of the GraphQL endpoint that will be used to extract the `to` schema"
            },
            {
              name: "help",
              description: "Show help"
            }
          ]
        }
      ])
    );
  } else {
    const from = extractSchemaLocation("from", options);
    const to = extractSchemaLocation("to", options);
    if (!(from && to)) {
      console.error("You must define both the `from` and `to` schemas");
    } else {
      const getFrom = getSchema(from);
      const getTo = getSchema(to);
      console.log(
        "\nComparing " + getExplanation(from) + " to " + getExplanation(to)
      );
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
