import { AdminPageHeader } from "@/components/admin/layout/admin-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSearchOperationsPlatform } from "@/features/search-intelligence/workspaces/server";
import {
  ActionButton,
  ActionPanel,
  SearchOpsSubnav,
} from "@/features/search-intelligence/workspaces/ui";
import {
  applyAiSuggestionsAction,
  applyLinkRecommendationsAction,
  createContentDraftAction,
} from "@/features/search-intelligence/workspaces/actions";

export const dynamic = "force-dynamic";

export default async function SearchOpsContentWorkspace() {
  const platform = await getSearchOperationsPlatform();
  const content = await platform.contentIntelligence();
  const org = (await platform.query.findByType("Organization"))[0];
  const links = org ? await platform.recommendLinks(org.publicId) : [];
  const siteOrigin = platform.siteOrigin;
  const orgPublicId = org?.publicId ?? null;
  const topLinkIds = links.slice(0, 5).map((l) => l.toPublicId);
  const audit = platform.auditPage(
    {
      url: `${siteOrigin}/`,
      title: "Homepage",
      description: "Professional wireless communication equipment and DMR radio solutions.",
      canonical: `${siteOrigin}/`,
      h1s: ["Homepage"],
      internalLinks: links.slice(0, 2).map((l) => l.toPublicId),
      wordCount: 180,
    },
    {
      searchIntentFit: 0.7,
      readability: 0.75,
      trust: 0.7,
      authority: 0.55,
      ctaQuality: 0.55,
      topicalCoverage: 0.5,
      semanticDepth: 0.55,
    },
  );

  return (
    <div className="space-y-8 max-w-6xl">
      <AdminPageHeader
        title="Content"
        description="AI + CMS + SEO workflow: generate drafts, apply audits, and link recommendations."
      />
      <SearchOpsSubnav active="Content" />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Topic gaps</CardTitle>
            <CardDescription>Create drafts directly from missing intents.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {content.gaps.length === 0 ? (
              <p className="text-muted-foreground">No gaps detected yet.</p>
            ) : (
              content.gaps.slice(0, 6).map((gap) => {
                const draftTitle = gap.suggestedTitles[0] ?? gap.topic;
                return (
                  <div key={gap.topic} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium">{gap.topic}</p>
                        <p className="text-xs text-muted-foreground">
                          Missing: {gap.missingIntents.join(", ")}
                        </p>
                      </div>
                      <ActionButton
                        formAction={async () => {
                          "use server";
                          await createContentDraftAction(draftTitle);
                        }}
                      >
                        Create Draft
                      </ActionButton>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">AI Audit — {audit.total}/100</CardTitle>
            <CardDescription>
              Rules {audit.rulesScore} ({Math.round(audit.rulesWeight * 100)}%) · AI {audit.aiScore} (
              {Math.round(audit.aiWeight * 100)}%)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {audit.suggestions.map((suggestion) => (
              <div key={suggestion} className="rounded-lg border p-3">
                {suggestion}
              </div>
            ))}
            <ActionPanel title="Apply AI changes">
              <ActionButton
                formAction={async () => {
                  "use server";
                  await applyAiSuggestionsAction({ url: `${siteOrigin}/` });
                }}
              >
                Queue Apply Metadata
              </ActionButton>
            </ActionPanel>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Internal linking recommendations</CardTitle>
          <CardDescription>Apply selected links from ontology + graph metrics.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {links.length === 0 ? (
            <p className="text-muted-foreground">No recommendations yet.</p>
          ) : (
            <>
              {links.slice(0, 8).map((link) => (
                <div key={link.toPublicId} className="rounded-lg border p-3">
                  <p className="font-medium">{link.toPublicId}</p>
                  <p className="text-xs text-muted-foreground">
                    score {link.score.toFixed(2)} · {link.reason}
                  </p>
                </div>
              ))}
              {orgPublicId ? (
                <ActionButton
                  formAction={async () => {
                    "use server";
                    await applyLinkRecommendationsAction({
                      fromPublicId: orgPublicId,
                      toPublicIds: topLinkIds,
                    });
                  }}
                >
                  Apply Top 5 Links
                </ActionButton>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
