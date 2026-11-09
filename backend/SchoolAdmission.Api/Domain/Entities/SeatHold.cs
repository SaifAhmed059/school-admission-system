namespace SchoolAdmission.Api.Domain.Entities;

public class SeatHold
{
    public string Id { get; set; } = string.Empty;
    public string ClassId { get; set; } = string.Empty;
    public string StudentId { get; set; } = string.Empty;
    public string Status { get; set; } = HoldStatus.Held;
    public DateTimeOffset ExpiresAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? ConfirmedAt { get; set; }
    public DateTimeOffset? CancelledAt { get; set; }

    public SchoolClass SchoolClass { get; set; } = null!;
}
