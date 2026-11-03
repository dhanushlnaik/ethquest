// Runs the Living-cards refresh locally (same as the daily cron).
//   pnpm tsx --conditions=react-server --env-file=.env scripts/refresh-cards.ts
import { refreshLivingCards } from "../src/lib/server/living-cards";

refreshLivingCards().then((r) => { console.log(r); process.exit(0); }).catch((e) => { console.error(e); process.exit(1); });
