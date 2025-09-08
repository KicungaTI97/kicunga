import { app } from "./app.js";
import { env } from "./env/index.js";

const start = async () => {
	try {
		await app.listen({ port: env.PORT });
		console.log('Server is running on http://localhost:3333');
	} catch (err) {
		app.log.error(err);
		process.exit(1);
	}
};

start();
