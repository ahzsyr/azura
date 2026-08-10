-- Portal team member and partner search entity types.
ALTER TYPE "SearchEntityType" ADD VALUE IF NOT EXISTS 'TEAM_MEMBER';
ALTER TYPE "SearchEntityType" ADD VALUE IF NOT EXISTS 'PARTNER';
