import { createOpenClawClient, getOpenClawConfigFromEnv } from "../../lib/openclaw-client";

async function main() {
  const prompt = process.argv.slice(2).join(" ").trim() || "ping";
  const client = createOpenClawClient(getOpenClawConfigFromEnv(process.env));

  const result = await client.call(prompt, {
    systemPrompt: "Reply briefly.",
  });

  console.log(result);
}

main().catch((error) => {
  console.error("[openclaw-minimal] client call failed:", error.message);
  process.exit(1);
});
