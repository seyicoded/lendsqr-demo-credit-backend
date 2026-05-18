import type { Knex } from "knex";

import { knexConfig } from "./db/knex-config";

const config: Record<string, Knex.Config> = knexConfig;

export default config;
module.exports = config;
