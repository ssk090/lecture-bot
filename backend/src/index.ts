import { config as dotenvConfig } from "dotenv";
import path from "node:path";
import { createApp } from "./app";
import { ensureIndexes } from "./db";

dotenvConfig({
  path: [path.join(process.cwd(), ".env"), path.join(process.cwd(), "../.env")],
});

const PORT = Number(process.env.PORT ?? 3000);

// Best effort: index the sessions collection so listing stays fast. If Mongo
// is down, the first request surfaces the error with a useful message.
ensureIndexes().catch(() => {});

createApp().listen(PORT, () => console.log(`server http://localhost:${PORT}`));