import { z } from "zod";

export const SidekickAIResponseSchema = z.object({
  explanation: z.string().describe("溫暖的解釋，指出錯誤觀念、引導正確方向"),
  keyPoints: z.array(z.string()).describe("2-3 個關鍵重點，條列式").min(2).max(3),
  visualReference: z.string().describe("引導使用者看哪張投影片、哪個區域"),
  encouragement: z.string().describe("正向鼓勵語句"),
});

export type SidekickAIResponse = z.infer<typeof SidekickAIResponseSchema>;
