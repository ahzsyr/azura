import { NextResponse } from "next/server";
import { statusBoardService } from "@/modules/status-page/service";

type Params = { params: Promise<{ slug: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { slug } = await params;
  const board = await statusBoardService.getBySlug(slug);
  if (!board) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(board);
}
