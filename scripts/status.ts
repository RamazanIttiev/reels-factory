import { isStatus, loadPlan, savePlan, STATUSES, withStatus } from "./curriculum";

const [idArg, statusArg] = process.argv.slice(2);
const id = Number(idArg);
const plan = loadPlan();

if (!Number.isInteger(id) || !statusArg || !isStatus(statusArg)) {
  console.error(`Usage: status <id> <${STATUSES.join("|")}>`);
  process.exit(1);
}

if (!plan.episodes.some((episode) => episode.id === id)) {
  console.error(`No episode with id ${id}`);
  process.exit(1);
}

savePlan(withStatus(plan, id, statusArg));
console.log(`#${id} -> ${statusArg}`);
