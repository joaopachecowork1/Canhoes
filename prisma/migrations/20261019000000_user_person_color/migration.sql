-- Every member wears one colour of the group palette (lib/personColors.ts). Existing users get a
-- random one: a volatile default is evaluated once per row when the column is added.
ALTER TABLE "Users" ADD COLUMN "Color" TEXT NOT NULL DEFAULT (ARRAY['coral', 'amber', 'teal', 'blue', 'pink', 'lime', 'violet', 'sky'])[floor(random() * 8 + 1)];
