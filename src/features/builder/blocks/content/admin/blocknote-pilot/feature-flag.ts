/**
 * Phase 1.5 BlockNote pilot gate.
 * Set `AZURA_BLOCKNOTE_PILOT=1` (inlined via next.config `env`) to opt the
 * advanced-rich-text admin field into BlockNotePilotEditor.
 * TipTap remains the default when unset / not `"1"`.
 */
export function isBlockNotePilotEnabled(): boolean {
  return (
    process.env.AZURA_BLOCKNOTE_PILOT === "1" ||
    process.env.NEXT_PUBLIC_AZURA_BLOCKNOTE_PILOT === "1"
  );
}
