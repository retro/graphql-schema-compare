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

    if (fromSchema.length === 0 && toSchema.length === 0) {
      return null;
    } else {
      return {
        dangerous,
        breaking
      };
    }
  });
};

export const diffSchemasAndPrintResult = (from, to) => {
  diffSchemas(from, to).then(res => {
    if (res === null) {
      console.log(colors.green("👌 Schemas are in sync!"));
    } else {
      const { dangerous, breaking } = res;
      if (breaking.length) {
        console.log(
          colors.bgRed.white.underline(
            "  💣  Breaking Changes (" + breaking.length + ")  "
          )
        );
        console.log("\n" + renderChangeTable(breaking).toString() + "\n");
      }
      if (dangerous.length) {
        console.log(
          colors.bgYellow.black.underline(
            "  🔪  Dangerous Changes (" + dangerous.length + ")  "
          )
        );

        console.log("\n" + renderChangeTable(dangerous).toString() + "\n");
      }
    }
  });
};

/*diffSchemasAndPrintResult(
  getSchemaFromFile("./myra.graphql"),
  getSchemaFromGraphql("http://localhost:4000/api/graphql")
);*/
