"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/features/auth/guards";
import { revalidateGoogleShoppingFeed } from "@/services/cache";
import { emitEvent } from "@/features/seo/google-platform/events";
import {
  updateServiceConfiguration,
  upsertGooglePlatformState,
} from "@/features/seo/google-platform/persistence";
import {
  availabilityRequiresDate,
  isGoogleShoppingAvailability,
  isGoogleShoppingAvailabilityDate,
} from "./google-shopping-feed.overrides";
import type { GoogleShoppingAvailability } from "./google-shopping-feed.types";

export type GoogleShoppingFeedGenerateResult = {
  ok: boolean;
  message: string;
};

function revalidateFeedAdminPaths() {
  revalidateGoogleShoppingFeed();
  revalidatePath("/feeds/google-shopping.xml");
  revalidatePath("/admin/seo/google");
  revalidatePath("/admin/seo/search-operations/google");
}

export async function generateGoogleShoppingFeedAction(input: {
  priceAdjustmentPercent: number | string;
  priceAdjustmentDirection: string;
  availability: string;
  availabilityDate: string;
}): Promise<GoogleShoppingFeedGenerateResult> {
  try {
    await requireAdmin();

    const percent = Number(input.priceAdjustmentPercent);
    if (!Number.isFinite(percent) || percent < 0 || percent > 1000) {
      return { ok: false, message: "Percentage must be a number between 0 and 1000." };
    }

    const direction = input.priceAdjustmentDirection === "decrease" ? "decrease" : "increase";
    const availabilityRaw = String(input.availability ?? "").trim();
    let availability: GoogleShoppingAvailability | "" = "";
    if (availabilityRaw) {
      if (!isGoogleShoppingAvailability(availabilityRaw)) {
        return {
          ok: false,
          message: "Choose in stock, out of stock, preorder, or backorder.",
        };
      }
      availability = availabilityRaw;
    }

    const availabilityDate = String(input.availabilityDate ?? "").trim();
    if (availability && availabilityRequiresDate(availability)) {
      if (!availabilityDate || !isGoogleShoppingAvailabilityDate(availabilityDate)) {
        return {
          ok: false,
          message:
            "Availability date is required for preorder and backorder (YYYY-MM-DD).",
        };
      }
    }

    let state = await updateServiceConfiguration("merchant_center", {
      feedPriceAdjustmentPercent: percent,
      feedPriceAdjustmentDirection: direction,
      feedAvailability: availability,
      feedAvailabilityDate: availabilityDate,
    });
    state = emitEvent(
      state,
      "ConfigUpdated",
      "merchant_center",
      "Shopping feed generated with price and availability rules",
    );
    await upsertGooglePlatformState(state);
    revalidateFeedAdminPaths();

    const priceNote =
      percent === 0
        ? "list prices unchanged"
        : `list prices ${direction === "decrease" ? "decreased" : "increased"} by ${percent}%`;
    const availabilityNote = availability
      ? `availability set to ${availability}`
      : "product stock availability kept";

    return {
      ok: true,
      message: `Feed updated: ${priceNote}; ${availabilityNote}. Google will fetch /feeds/google-shopping.xml.`,
    };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : String(error) };
  }
}
