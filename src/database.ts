import knex, { type Knex } from 'knex';
import { env } from './env/index.js';

export const config: Knex.Config = {
	client: env.DATABASE_CLIENT,
	connection:
		env.DATABASE_URL === 'sqlite'
			? {
					filename: env.DATABASE_URL,
				}
			: env.DATABASE_URL,
	useNullAsDefault: true,
	migrations: {
		extension: 'ts',
		directory: './db/migrations',
	},
};

export const db = knex(config);
