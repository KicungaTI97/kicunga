// @ts-ignore
import type { Knex } from "knex";

declare module "knex/types/tables" {
  interface Tables {
    transactions: {
      id: string;
      title: string;
      amount: number;
      type: "credit" | "debit";
      session_id?: string;
      created_at: Date;
    };
    // Adicione outras tabelas aqui, se necessário
  }
}