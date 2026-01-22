import { launchCommand, LaunchType } from "@raycast/api";

export default async function Command() {
  await launchCommand({ name: "Confetti", type: LaunchType.UserInitiated });
}