namespace SchoolAdmission.Api.Domain.Entities;

public class SchoolClass
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public int TotalSeats { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public List<SeatHold> Holds { get; set; } = [];
}
