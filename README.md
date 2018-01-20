# graphql-schema-compare usage

```
$ git clone https://github.com/retro/graphql-schema-compare.git
$ cd graphql-schema-compare
$ yarn
$ yarn run start --fromFile=./localSchema.graphql --toGraphql=http://example.com/graphql/endpoint
```

You can pass any of the following as the schema source:

1. Local GraphQL schema file
2. Remote GraphQL schema file
3. GraphQL endpoint

More info in the help:

```
$ yarn run start --help
```
