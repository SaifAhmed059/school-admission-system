using System.Collections.Concurrent;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using SchoolAdmission.Api.Domain.Entities;
using SchoolAdmission.Api.DTOs;
using SchoolAdmission.Api.Exceptions;
using SchoolAdmission.Api.Infrastructure;

namespace SchoolAdmission.Api.Services;

public class AdmissionService : IAdmissionService
{
    private readonly AdmissionDbContext _dbContext;
    private readonly IConfiguration _configuration;
    private readonly ILogger<AdmissionService> _logger;

    private static readonly ConcurrentDictionary<string, SemaphoreSlim> ClassLocks = new();
    private static readonly Regex StudentIdRegex = new(@"^\d{17}$", RegexOptions.Compiled);

    public AdmissionService(
        AdmissionDbContext dbContext,
        IConfiguration configuration,
        ILogger<AdmissionService> logger)
    {
        _dbContext = dbContext;
        _configuration = configuration;
        _logger = logger;
    }

    private int GetHoldDurationSeconds()
    {
        var configured = _configuration.GetValue<int?>("HOLD_DURATION_SECONDS");
        return configured is > 0 ? configured.Value : 600;
    }

    private static void ValidateStudentId(string studentId)
    {
        if (string.IsNullOrWhiteSpace(studentId) || !StudentIdRegex.IsMatch(studentId.Trim()))
        {
            throw new ValidationException("Student ID must be a valid 17-digit birth registration number.");
        }
    }

    private static SemaphoreSlim GetLockForClass(string classId)
    {
        return ClassLocks.GetOrAdd(classId, _ => new SemaphoreSlim(1, 1));
    }

    private async Task<IDbContextTransaction?> BeginTransactionSafelyAsync(CancellationToken ct)
    {
        if (_dbContext.Database.IsNpgsql())
        {
            return await _dbContext.Database.BeginTransactionAsync(ct);
        }
        return null;
    }

    public async Task<ClassResponse> CreateClassAsync(CreateClassRequest request, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            throw new ValidationException("Class name is required.");
        }

        if (request.TotalSeats <= 0)
        {
            throw new ValidationException("Total seats must be greater than zero.");
        }

        var newId = $"c_{Guid.NewGuid():N}"[..8];

        var schoolClass = new SchoolClass
        {
            Id = newId,
            Name = request.Name.Trim(),
            TotalSeats = request.TotalSeats,
            CreatedAt = DateTimeOffset.UtcNow
        };

        _dbContext.Classes.Add(schoolClass);
        await _dbContext.SaveChangesAsync(ct);

        _logger.LogInformation("Created class {ClassId}: {ClassName} with {TotalSeats} seats",
            schoolClass.Id, schoolClass.Name, schoolClass.TotalSeats);

        return new ClassResponse(schoolClass.Id, schoolClass.Name, schoolClass.TotalSeats);
    }

    public async Task<IReadOnlyList<ClassDetailResponse>> GetClassesAsync(CancellationToken ct = default)
    {
        var now = DateTimeOffset.UtcNow;

        var classes = await _dbContext.Classes
            .AsNoTracking()
            .OrderBy(c => c.CreatedAt)
            .Select(c => new
            {
                c.Id,
                c.Name,
                c.TotalSeats,
                ConfirmedSeats = c.Holds.Count(h => h.Status == HoldStatus.Confirmed),
                HeldSeats = c.Holds.Count(h => h.Status == HoldStatus.Held && h.ExpiresAt > now)
            })
            .ToListAsync(ct);

        return classes.Select(c =>
        {
            var available = Math.Max(0, c.TotalSeats - (c.ConfirmedSeats + c.HeldSeats));
            return new ClassDetailResponse(
                c.Id,
                c.Name,
                c.TotalSeats,
                c.HeldSeats,
                c.ConfirmedSeats,
                available
            );
        }).ToList();
    }

    public async Task<ClassDetailResponse> GetClassByIdAsync(string classId, CancellationToken ct = default)
    {
        var now = DateTimeOffset.UtcNow;

        var classInfo = await _dbContext.Classes
            .AsNoTracking()
            .Where(c => c.Id == classId)
            .Select(c => new
            {
                c.Id,
                c.Name,
                c.TotalSeats,
                ConfirmedSeats = c.Holds.Count(h => h.Status == HoldStatus.Confirmed),
                HeldSeats = c.Holds.Count(h => h.Status == HoldStatus.Held && h.ExpiresAt > now)
            })
            .FirstOrDefaultAsync(ct);

        if (classInfo == null)
        {
            throw new KeyNotFoundException($"Class with ID '{classId}' not found.");
        }

        var available = Math.Max(0, classInfo.TotalSeats - (classInfo.ConfirmedSeats + classInfo.HeldSeats));

        return new ClassDetailResponse(
            classInfo.Id,
            classInfo.Name,
            classInfo.TotalSeats,
            classInfo.HeldSeats,
            classInfo.ConfirmedSeats,
            available
        );
    }

    public async Task<CreateHoldResponse> CreateHoldAsync(string classId, string studentId, CancellationToken ct = default)
    {
        ValidateStudentId(studentId);
        studentId = studentId.Trim();

        var sem = GetLockForClass(classId);
        await sem.WaitAsync(ct);
        try
        {
            var tx = await BeginTransactionSafelyAsync(ct);
            try
            {
                // Row-level lock on PostgreSQL if Npgsql is used
                SchoolClass? schoolClass;
                if (_dbContext.Database.IsNpgsql())
                {
                    schoolClass = await _dbContext.Classes
                        .FromSqlInterpolated($"SELECT * FROM \"Classes\" WHERE \"Id\" = {classId} FOR UPDATE")
                        .FirstOrDefaultAsync(ct);
                }
                else
                {
                    schoolClass = await _dbContext.Classes.FirstOrDefaultAsync(c => c.Id == classId, ct);
                }

                if (schoolClass == null)
                {
                    throw new KeyNotFoundException($"Class with ID '{classId}' not found.");
                }

                var now = DateTimeOffset.UtcNow;

                // Rule 3: Check if student already has an active hold or confirmed seat in this class
                var hasActiveOrConfirmed = await _dbContext.Holds
                    .Where(h => h.ClassId == classId && h.StudentId == studentId)
                    .Where(h => h.Status == HoldStatus.Confirmed || (h.Status == HoldStatus.Held && h.ExpiresAt > now))
                    .AnyAsync(ct);

                if (hasActiveOrConfirmed)
                {
                    throw new ConflictException("Student already has an active hold or confirmed admission in this class.");
                }

                // Rule 1: Check held + confirmed count against total seats
                var confirmedCount = await _dbContext.Holds
                    .Where(h => h.ClassId == classId && h.Status == HoldStatus.Confirmed)
                    .CountAsync(ct);

                var heldCount = await _dbContext.Holds
                    .Where(h => h.ClassId == classId && h.Status == HoldStatus.Held && h.ExpiresAt > now)
                    .CountAsync(ct);

                if (heldCount + confirmedCount >= schoolClass.TotalSeats)
                {
                    throw new ConflictException("No seats available for this class.");
                }

                var durationSeconds = GetHoldDurationSeconds();
                var expiresAt = now.AddSeconds(durationSeconds);
                var holdId = $"h_{Guid.NewGuid():N}"[..8];

                var hold = new SeatHold
                {
                    Id = holdId,
                    ClassId = classId,
                    StudentId = studentId,
                    Status = HoldStatus.Held,
                    CreatedAt = now,
                    ExpiresAt = expiresAt
                };

                _dbContext.Holds.Add(hold);
                await _dbContext.SaveChangesAsync(ct);

                if (tx != null)
                {
                    await tx.CommitAsync(ct);
                }

                _logger.LogInformation("Seat hold {HoldId} created for Student {StudentId} in Class {ClassId}, expires at {ExpiresAt}",
                    holdId, studentId, classId, expiresAt);

                return new CreateHoldResponse(
                    hold.Id,
                    hold.ClassId,
                    hold.StudentId,
                    hold.Status,
                    hold.ExpiresAt
                );
            }
            finally
            {
                if (tx != null)
                {
                    await tx.DisposeAsync();
                }
            }
        }
        finally
        {
            sem.Release();
        }
    }

    public async Task<HoldResponse> GetHoldByIdAsync(string holdId, CancellationToken ct = default)
    {
        var hold = await _dbContext.Holds
            .AsNoTracking()
            .FirstOrDefaultAsync(h => h.Id == holdId, ct);

        if (hold == null)
        {
            throw new KeyNotFoundException($"Hold with ID '{holdId}' not found.");
        }

        var status = ResolveHoldStatus(hold);

        return new HoldResponse(
            hold.Id,
            hold.ClassId,
            status,
            hold.ExpiresAt
        );
    }

    public async Task<ConfirmHoldResponse> ConfirmHoldAsync(string holdId, string studentId, CancellationToken ct = default)
    {
        ValidateStudentId(studentId);
        studentId = studentId.Trim();

        var tx = await BeginTransactionSafelyAsync(ct);
        try
        {
            SeatHold? hold;
            if (_dbContext.Database.IsNpgsql())
            {
                hold = await _dbContext.Holds
                    .FromSqlInterpolated($"SELECT * FROM \"Holds\" WHERE \"Id\" = {holdId} FOR UPDATE")
                    .FirstOrDefaultAsync(ct);
            }
            else
            {
                hold = await _dbContext.Holds.FirstOrDefaultAsync(h => h.Id == holdId, ct);
            }

            if (hold == null)
            {
                throw new KeyNotFoundException($"Hold with ID '{holdId}' not found.");
            }

            // Rule 4: Only student who made the hold can confirm it
            if (hold.StudentId != studentId)
            {
                throw new ForbiddenException("You can only confirm your own hold.");
            }

            // Rule 5: Idempotency - If already confirmed, return 200 OK without incrementing seats
            if (hold.Status == HoldStatus.Confirmed)
            {
                _logger.LogInformation("Hold {HoldId} already confirmed. Returning idempotent confirmation.", holdId);
                return new ConfirmHoldResponse(hold.Id, HoldStatus.Confirmed);
            }

            if (hold.Status == HoldStatus.Cancelled)
            {
                throw new ConflictException("Hold has already been cancelled.");
            }

            var now = DateTimeOffset.UtcNow;
            if (hold.Status == HoldStatus.Expired || hold.ExpiresAt <= now)
            {
                if (hold.Status == HoldStatus.Held)
                {
                    hold.Status = HoldStatus.Expired;
                    await _dbContext.SaveChangesAsync(ct);
                    if (tx != null)
                    {
                        await tx.CommitAsync(ct);
                    }
                }
                throw new ConflictException("Hold has expired and cannot be confirmed.");
            }

            if (hold.Status != HoldStatus.Held)
            {
                throw new ConflictException($"Hold cannot be confirmed from status '{hold.Status}'.");
            }

            // Confirm
            hold.Status = HoldStatus.Confirmed;
            hold.ConfirmedAt = now;
            await _dbContext.SaveChangesAsync(ct);

            if (tx != null)
            {
                await tx.CommitAsync(ct);
            }

            _logger.LogInformation("Hold {HoldId} confirmed successfully for student {StudentId}", holdId, studentId);

            return new ConfirmHoldResponse(hold.Id, HoldStatus.Confirmed);
        }
        finally
        {
            if (tx != null)
            {
                await tx.DisposeAsync();
            }
        }
    }

    public async Task CancelHoldAsync(string holdId, string studentId, CancellationToken ct = default)
    {
        ValidateStudentId(studentId);
        studentId = studentId.Trim();

        var hold = await _dbContext.Holds.FirstOrDefaultAsync(h => h.Id == holdId, ct);
        if (hold == null)
        {
            throw new KeyNotFoundException($"Hold with ID '{holdId}' not found.");
        }

        if (hold.StudentId != studentId)
        {
            throw new ForbiddenException("You can only cancel your own hold.");
        }

        if (hold.Status == HoldStatus.Confirmed)
        {
            throw new ConflictException("Confirmed admissions cannot be cancelled.");
        }

        if (hold.Status == HoldStatus.Held)
        {
            hold.Status = HoldStatus.Cancelled;
            hold.CancelledAt = DateTimeOffset.UtcNow;
            await _dbContext.SaveChangesAsync(ct);
            _logger.LogInformation("Hold {HoldId} cancelled by student {StudentId}", holdId, studentId);
        }
    }

    public async Task<IReadOnlyList<MyHoldResponse>> GetMyHoldsAsync(string studentId, CancellationToken ct = default)
    {
        ValidateStudentId(studentId);
        studentId = studentId.Trim();

        var holds = await _dbContext.Holds
            .AsNoTracking()
            .Include(h => h.SchoolClass)
            .Where(h => h.StudentId == studentId)
            .OrderByDescending(h => h.CreatedAt)
            .ToListAsync(ct);

        return holds.Select(h => new MyHoldResponse(
            h.Id,
            h.ClassId,
            h.SchoolClass?.Name ?? string.Empty,
            ResolveHoldStatus(h),
            h.ExpiresAt
        )).ToList();
    }

    private static string ResolveHoldStatus(SeatHold hold)
    {
        if (hold.Status == HoldStatus.Held && hold.ExpiresAt <= DateTimeOffset.UtcNow)
        {
            return HoldStatus.Expired;
        }

        return hold.Status;
    }
}
