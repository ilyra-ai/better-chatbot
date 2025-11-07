import { customModelProvider } from "lib/ai/models";

export const GET = async () => {
  await customModelProvider.refresh();
  return Response.json(
    customModelProvider.modelsInfo.sort((a, b) => {
      if (a.hasAPIKey && !b.hasAPIKey) return -1;
      if (!a.hasAPIKey && b.hasAPIKey) return 1;
      return 0;
    }),
  );
};
