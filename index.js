import { readFileSync, readFile } from "fs";
import { buildSchemaFromTypeDefinitions } from "graphql-tools";

import {
  introspectionQuery,
  buildClientSchema,
  printSchema,
  findBreakingChanges,
  findDangerousChanges
} from "graphql";
import Table from "cli-table";
import URL from "url-parse";
import Promise from "bluebird";
import fetch from "node-fetch";
import colors from "colors/safe";
import clear from "clear";

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

/*diffSchemasAndPrintResult(
  getSchemaFromFile("./myra.graphql"),
  getSchemaFromGraphql("http://localhost:4000/api/graphql")
);*/
