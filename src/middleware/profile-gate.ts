import { NextResponse } from "next/server";

export function profileDisabledResponse(): NextResponse {
  return new NextResponse(null, { status: 404 });
}
