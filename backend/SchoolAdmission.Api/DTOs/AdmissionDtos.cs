using System.ComponentModel.DataAnnotations;

namespace SchoolAdmission.Api.DTOs;

public record CreateClassRequest(
    [Required(ErrorMessage = "Class name is required.")]
    [StringLength(100, MinimumLength = 1, ErrorMessage = "Class name must be between 1 and 100 characters.")]
    string Name,

    [Range(1, 100000, ErrorMessage = "Total seats must be greater than 0.")]
    int TotalSeats
);

public record ClassResponse(
    string Id,
    string Name,
    int TotalSeats
);

public record ClassDetailResponse(
    string Id,
    string Name,
    int TotalSeats,
    int HeldSeats,
    int ConfirmedSeats,
    int AvailableSeats
);

public record CreateHoldResponse(
    string HoldId,
    string ClassId,
    string StudentId,
    string Status,
    DateTimeOffset ExpiresAt
);

public record HoldResponse(
    string HoldId,
    string ClassId,
    string Status,
    DateTimeOffset ExpiresAt
);

public record ConfirmHoldResponse(
    string HoldId,
    string Status
);

public record MyHoldResponse(
    string HoldId,
    string ClassId,
    string ClassName,
    string Status,
    DateTimeOffset ExpiresAt
);

public record ErrorResponse(
    string Message,
    int Status
);
