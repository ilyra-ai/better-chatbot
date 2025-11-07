import { NextResponse } from "next/server";

import { getComponentCategoriesSummary } from "@/lib/component-config";

export async function GET() {
  try {
    const data = await getComponentCategoriesSummary();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Não foi possível carregar as categorias.",
      },
      { status: 500 },
    );
  }
}
