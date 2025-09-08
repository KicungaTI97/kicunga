// src/app.ts
import cookie from "@fastify/cookie";
import fastify from "fastify";

// src/routes/transactions.ts
import crypto from "crypto";
import z2 from "zod";

// src/database.ts
import knex from "knex";

// src/env/index.ts
import { config } from "dotenv";
import { z } from "zod";
if (process.env.NODE_ENV === "test") {
  config({ path: ".env.test" });
} else {
  config();
}
var envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string(),
  PORT: z.coerce.number().default(3333)
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
var db = knex(config2);

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
    const getTransactionParamsSchema = z2.object({
      id: z2.string().uuid()
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
      const createTransactionBodySchema = z2.object({
        title: z2.string(),
        amount: z2.number(),
        type: z2.enum(["credit", "debit"])
      });
      const { amount, title, type } = createTransactionBodySchema.parse(
        request.body
      );
      let sessionId = request.cookies.sessionId;
      if (!sessionId) {
        sessionId = crypto.randomUUID();
        reply.cookie("sessionId", sessionId, {
          path: "/",
          maxAge: 60 * 60 * 24 * 7
          // 7 days
        });
      }
      await db("transactions").insert({
        id: crypto.randomUUID(),
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
var app = fastify();
app.register(cookie);
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
