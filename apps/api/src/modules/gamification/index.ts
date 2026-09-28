// apps/api/src/modules/gamification/index.ts
export { SidekickStateMachine } from "./sidekick-state-machine.js";
export {
  createGamificationService,
  type GamificationServiceInterface,
} from "./gamification.service.js";
export type {
  GameState,
  SidekickContext,
  QuizAnswer,
  SidekickResponse,
  GameSession,
  GamificationConfig,
} from "./types.js";
