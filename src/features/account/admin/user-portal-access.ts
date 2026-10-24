export function userContactHrefs(phone: string | null | undefined): {
  whatsapp: string | null;
  tel: string | null;
} {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (!digits) return { whatsapp: null, tel: null };
  return {
    whatsapp: `https://wa.me/${digits}?text=${encodeURIComponent("Hello")}`,
    tel: `tel:+${digits}`,
  };
}

export function canToggleAccount(input: {
  actorId: string;
  actorRole: string;
  targetId: string;
  targetRole: string;
}): boolean {
  if (input.actorId === input.targetId) return false;
  if (input.targetRole === "SUPER_ADMIN") return false;
  if (input.targetRole === "CUSTOMER") {
    return input.actorRole === "ADMIN" || input.actorRole === "SUPER_ADMIN";
  }
  if (input.targetRole === "ADMIN") return input.actorRole === "SUPER_ADMIN";
  return false;
}
