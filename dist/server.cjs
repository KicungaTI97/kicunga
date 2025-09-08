"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// src/app.ts
var import_cookie = __toESM(require("@fastify/cookie"), 1);
var import_fastify = __toESM(require("fastify"), 1);

// src/routes/transactions.ts
var import_node_crypto = __toESM(require("crypto"), 1);
var import_zod2 = __toESM(require("zod"), 1);

// src/database.ts
var import_knex = __toESM(require("knex"), 1);

// src/env/index.ts
var import_dotenv = require("dotenv");
var import_zod = require("zod");
if (process.env.NODE_ENV === "test") {
  (0, import_dotenv.config)({ path: ".env.test" });
} else {
  (0, import_dotenv.config)();
}
var envSchema = import_zod.z.object({
  NODE_ENV: import_zod.z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: import_zod.z.string(),
  PORT: import_zod.z.coerce.number().default(3333)
});
var _env = envSchema.safeParse(process.env);
if (_env.success === false) {
  console.error("Invalid environment variables", _env.error.format());
  throw new Error("Invalid environment variables");
}
var env = _env.data;

// src/database.ts
var config2 = {
  client: "sqlite3",
  connection: {
    filename: env.DATABASE_URL
  },
  useNullAsDefault: true,
  migrations: {
    extension: "ts",
    directory: "./db/migrations"
  },
  pool: {
    afterCreate: (conn, cb) => {
      conn.run("PRAGMA foreign_keys = ON", cb);
    }
  }
};
var db = (0, import_knex.default)(config2);

// src/middlewares/check-session-id-exists.ts
async function CheckSessionIdExists(request, reply) {
  const sessionId = request.cookies.sessionId;
  if (!sessionId) {
    return reply.status(401).send({ error: "Unauthorized" });
  }
}

// src/routes/transactions.ts
async function transactionsRoutes(app2) {
  app2.get(
    "/",
    {
      preHandler: [CheckSessionIdExists]
    },
    async (request) => {
      const { sessionId } = request.cookies;
      const transactions = await db("transactions").where("session_id", sessionId).select("*");
      return { transactions };
    }
  );
  app2.get("/:id", async (request, reply) => {
    const getTransactionParamsSchema = import_zod2.default.object({
      id: import_zod2.default.string().uuid()
    });
    const { id } = getTransactionParamsSchema.parse(request.params);
    const { sessionId } = request.cookies;
    const transaction = await db("transactions").where({
      id,
      session_id: sessionId
    }).first();
    if (!transaction) {
      return reply.status(404).send({ message: "Transaction not found" });
    }
    return { transaction };
  });
  app2.get(
    "/summary",
    {
      preHandler: [CheckSessionIdExists]
    },
    async (request) => {
      const { sessionId } = request.cookies;
      const summary = await db("transactions").where("session_id", sessionId).sum("amount", { as: "amount" }).first();
      return { summary };
    }
  );
  app2.post(
    "/",
    async (request, reply) => {
      const createTransactionBodySchema = import_zod2.default.object({
        title: import_zod2.default.string(),
        amount: import_zod2.default.number(),
        type: import_zod2.default.enum(["credit", "debit"])
      });
      const { amount, title, type } = createTransactionBodySchema.parse(
        request.body
      );
      let sessionId = request.cookies.sessionId;
      if (!sessionId) {
        sessionId = import_node_crypto.default.randomUUID();
        reply.cookie("sessionId", sessionId, {
          path: "/",
          maxAge: 60 * 60 * 24 * 7
          // 7 days
        });
      }
      await db("transactions").insert({
        id: import_node_crypto.default.randomUUID(),
        title,
        amount: type === "credit" ? amount : amount * -1,
        type,
        session_id: sessionId
      }).returning("*");
      return reply.status(201).send({ message: "Transaction created successfully" });
    }
  );
}

// src/app.ts
var app = (0, import_fastify.default)();
app.register(import_cookie.default);
app.register(transactionsRoutes, {
  prefix: "/transactions"
});

// src/server.ts
var start = async () => {
  try {
    await app.listen({ port: env.PORT });
    console.log("Server is running on http://localhost:3333");
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};
start();
