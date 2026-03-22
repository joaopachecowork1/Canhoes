using Microsoft.EntityFrameworkCore;
using XPlayer.Api.Data;

namespace XPlayer.Api.Startup;

/// <summary>
/// Applies incremental, idempotent DDL changes that EnsureCreated() cannot handle
/// (adding new columns to existing tables, schema migrations without EF Migrations).
///
/// Safe to run every startup – every statement is guarded by an existence check.
/// Only runs on SQL Server (the production provider).
/// </summary>
internal static class DbSchema
{
    public static async Task EnsureAsync(XPlayerDbContext db)
    {
        try
        {
            if (!db.Database.IsRelational()) return;

            var provider = db.Database.ProviderName ?? "";
            if (!provider.Contains("SqlServer", StringComparison.OrdinalIgnoreCase)) return;

            await db.Database.ExecuteSqlRawAsync(@"
-- Users: ExternalId + IsAdmin are used by auth middleware.
IF COL_LENGTH('Users', 'ExternalId') IS NULL
BEGIN
  ALTER TABLE Users ADD ExternalId NVARCHAR(128) NOT NULL DEFAULT('');
  CREATE UNIQUE INDEX IX_Users_ExternalId ON Users(ExternalId);
END

IF COL_LENGTH('Users', 'IsAdmin') IS NULL
BEGIN
  ALTER TABLE Users ADD IsAdmin BIT NOT NULL DEFAULT(0);
END

IF COL_LENGTH('Users', 'DisplayName') IS NULL
BEGIN
  ALTER TABLE Users ADD DisplayName NVARCHAR(128) NULL;
END

-- Canhões do Ano - AwardCategories extra fields
IF COL_LENGTH('dbo.AwardCategories', 'Description') IS NULL
BEGIN
  ALTER TABLE AwardCategories ADD Description NVARCHAR(1000) NULL;
END

IF COL_LENGTH('dbo.AwardCategories', 'VoteQuestion') IS NULL
BEGIN
  ALTER TABLE AwardCategories ADD VoteQuestion NVARCHAR(256) NULL;
END

IF COL_LENGTH('dbo.AwardCategories', 'VoteRules') IS NULL
BEGIN
  ALTER TABLE AwardCategories ADD VoteRules NVARCHAR(2000) NULL;
END
");
        }
        catch
        {
            // Don't block app startup in dev if schema step fails.
            // The next failing request will surface the real DB error.
        }
    }
}
