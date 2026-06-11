import { NextResponse } from "next/server";
import { confirmNewsletter } from "@/features/forms/newsletter.service";

export async function GET(
  request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;
  const subscriber = await confirmNewsletter(token);
  if (!subscriber) {
    return NextResponse.redirect(new URL("/en?newsletter=invalid", request.url));
  }

  const { searchParams } = new URL(request.url);
  const redirect = searchParams.get("redirect");
  const locale = subscriber.locale.startsWith("ar") ? "ar" : "en";
  const target = redirect ?? `/${locale}?newsletter=confirmed`;
  return NextResponse.redirect(new URL(target, request.url));
}
