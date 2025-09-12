import { app } from "./app.js";
import { env } from "./env/index.js";

const start = async () => {
	try {
		await app.listen({ 
      port: env.PORT,
      host: "0.0.0.0"
    });
		console.log(`Server is running on ${env.PORT}`);
	} catch (err) {
		app.log.error(err);
		process.exit(1);
	}
};

start();
