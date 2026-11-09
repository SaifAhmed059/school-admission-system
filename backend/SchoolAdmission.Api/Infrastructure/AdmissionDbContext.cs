using Microsoft.EntityFrameworkCore;
using SchoolAdmission.Api.Domain.Entities;

namespace SchoolAdmission.Api.Infrastructure;

public class AdmissionDbContext : DbContext
{
    public AdmissionDbContext(DbContextOptions<AdmissionDbContext> options) : base(options)
    {
    }

    public DbSet<SchoolClass> Classes => Set<SchoolClass>();
    public DbSet<SeatHold> Holds => Set<SeatHold>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<SchoolClass>(entity =>
        {
            entity.ToTable("Classes");
            entity.HasKey(c => c.Id);
            entity.Property(c => c.Id).HasMaxLength(50);
            entity.Property(c => c.Name).HasMaxLength(150).IsRequired();
            entity.Property(c => c.TotalSeats).IsRequired();
            entity.Property(c => c.CreatedAt).IsRequired();

            entity.HasMany(c => c.Holds)
                  .WithOne(h => h.SchoolClass)
                  .HasForeignKey(h => h.ClassId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<SeatHold>(entity =>
        {
            entity.ToTable("Holds");
            entity.HasKey(h => h.Id);
            entity.Property(h => h.Id).HasMaxLength(50);
            entity.Property(h => h.ClassId).HasMaxLength(50).IsRequired();
            entity.Property(h => h.StudentId).HasMaxLength(30).IsRequired();
            entity.Property(h => h.Status).HasMaxLength(20).IsRequired();
            entity.Property(h => h.ExpiresAt).IsRequired();
            entity.Property(h => h.CreatedAt).IsRequired();

            entity.HasIndex(h => new { h.ClassId, h.Status, h.ExpiresAt });
            entity.HasIndex(h => h.StudentId);
            entity.HasIndex(h => new { h.ClassId, h.StudentId });
        });
    }
}
