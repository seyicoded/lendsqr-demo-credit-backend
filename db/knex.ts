import { knex } from "knex";

import { env } from "../src/config/env";
import { knexConfig } from "./knex-config";

export const db = knex(knexConfig[env.NODE_ENV]);
