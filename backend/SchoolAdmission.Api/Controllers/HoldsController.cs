using Microsoft.AspNetCore.Mvc;
using SchoolAdmission.Api.DTOs;
using SchoolAdmission.Api.Exceptions;
using SchoolAdmission.Api.Services;

namespace SchoolAdmission.Api.Controllers;

[ApiController]
[Route("holds")]
public class HoldsController : ControllerBase
{
    private readonly IAdmissionService _admissionService;

    public HoldsController(IAdmissionService admissionService)
    {
        _admissionService = admissionService;
    }

    [HttpGet("{holdId}")]
    public async Task<ActionResult<HoldResponse>> GetHoldById(
        string holdId,
        CancellationToken ct)
    {
        var result = await _admissionService.GetHoldByIdAsync(holdId, ct);
        return Ok(result);
    }

    [HttpPost("{holdId}/confirm")]
    public async Task<ActionResult<ConfirmHoldResponse>> ConfirmHold(
        string holdId,
        [FromHeader(Name = "X-Student-Id")] string? studentId,
        CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(studentId))
        {
            throw new ValidationException("X-Student-Id header is required.");
        }

        var result = await _admissionService.ConfirmHoldAsync(holdId, studentId, ct);
        return Ok(result);
    }

    [HttpDelete("{holdId}")]
    public async Task<IActionResult> CancelHold(
        string holdId,
        [FromHeader(Name = "X-Student-Id")] string? studentId,
        CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(studentId))
        {
            throw new ValidationException("X-Student-Id header is required.");
        }

        await _admissionService.CancelHoldAsync(holdId, studentId, ct);
        return NoContent();
    }
}
