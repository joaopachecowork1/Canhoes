using Microsoft.EntityFrameworkCore;
using XPlayer.Api.Models;

namespace XPlayer.Api.Data;

public class XPlayerDbContext : DbContext
{
    public XPlayerDbContext(DbContextOptions<XPlayerDbContext> options) : base(options) { }

    public DbSet<UserEntity> Users => Set<UserEntity>();

    // Canhões do Ano
    public DbSet<AwardCategoryEntity> AwardCategories => Set<AwardCategoryEntity>();
    public DbSet<NomineeEntity> Nominees => Set<NomineeEntity>();
    public DbSet<CategoryProposalEntity> CategoryProposals => Set<CategoryProposalEntity>();
    public DbSet<GalaMeasureEntity> Measures => Set<GalaMeasureEntity>();
    public DbSet<MeasureProposalEntity> MeasureProposals => Set<MeasureProposalEntity>();
    public DbSet<VoteEntity> Votes => Set<VoteEntity>();
    public DbSet<UserVoteEntity> UserVotes => Set<UserVoteEntity>();
    public DbSet<WishlistItemEntity> WishlistItems => Set<WishlistItemEntity>();
    public DbSet<SecretSantaDrawEntity> SecretSantaDraws => Set<SecretSantaDrawEntity>();
    public DbSet<SecretSantaAssignmentEntity> SecretSantaAssignments => Set<SecretSantaAssignmentEntity>();
    public DbSet<CanhoesEventStateEntity> CanhoesEventState => Set<CanhoesEventStateEntity>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<UserEntity>()
            .HasIndex(x => x.ExternalId)
            .IsUnique();

        modelBuilder.Entity<UserEntity>()
            .HasIndex(x => x.Email)
            .IsUnique();

        modelBuilder.Entity<AwardCategoryEntity>()
            .HasKey(x => x.Id);

        modelBuilder.Entity<NomineeEntity>()
            .HasIndex(x => new { x.CategoryId, x.Status });

        modelBuilder.Entity<CategoryProposalEntity>()
            .HasIndex(x => x.Status);

        modelBuilder.Entity<MeasureProposalEntity>()
            .HasIndex(x => x.Status);

        modelBuilder.Entity<VoteEntity>()
            .HasIndex(x => new { x.CategoryId, x.UserId })
            .IsUnique();

        modelBuilder.Entity<UserVoteEntity>()
            .HasIndex(x => new { x.CategoryId, x.VoterUserId })
            .IsUnique();

        modelBuilder.Entity<CanhoesEventStateEntity>()
            .HasKey(x => x.Id);
    }
}
