using SchoolAdmission.Api.DTOs;

namespace SchoolAdmission.Api.Services;

public interface IAdmissionService
{
    Task<ClassResponse> CreateClassAsync(CreateClassRequest request, CancellationToken ct = default);
    Task<IReadOnlyList<ClassDetailResponse>> GetClassesAsync(CancellationToken ct = default);
    Task<ClassDetailResponse> GetClassByIdAsync(string classId, CancellationToken ct = default);
    Task<CreateHoldResponse> CreateHoldAsync(string classId, string studentId, CancellationToken ct = default);
    Task<HoldResponse> GetHoldByIdAsync(string holdId, CancellationToken ct = default);
    Task<ConfirmHoldResponse> ConfirmHoldAsync(string holdId, string studentId, CancellationToken ct = default);
    Task CancelHoldAsync(string holdId, string studentId, CancellationToken ct = default);
    Task<IReadOnlyList<MyHoldResponse>> GetMyHoldsAsync(string studentId, CancellationToken ct = default);
}
