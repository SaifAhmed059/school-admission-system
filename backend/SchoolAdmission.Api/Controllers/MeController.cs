using Microsoft.AspNetCore.Mvc;
using SchoolAdmission.Api.DTOs;
using SchoolAdmission.Api.Exceptions;
using SchoolAdmission.Api.Services;

namespace SchoolAdmission.Api.Controllers;

[ApiController]
[Route("me")]
public class MeController : ControllerBase
{
    private readonly IAdmissionService _admissionService;

    public MeController(IAdmissionService admissionService)
    {
        _admissionService = admissionService;
    }

    [HttpGet("holds")]
    public async Task<ActionResult<IReadOnlyList<MyHoldResponse>>> GetMyHolds(
        [FromHeader(Name = "X-Student-Id")] string? studentId,
        CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(studentId))
        {
            throw new ValidationException("X-Student-Id header is required.");
        }

        var result = await _admissionService.GetMyHoldsAsync(studentId, ct);
        return Ok(result);
    }
}
