using Microsoft.AspNetCore.Mvc;
using SchoolAdmission.Api.DTOs;
using SchoolAdmission.Api.Exceptions;
using SchoolAdmission.Api.Services;

namespace SchoolAdmission.Api.Controllers;

[ApiController]
[Route("classes")]
public class ClassesController : ControllerBase
{
    private readonly IAdmissionService _admissionService;

    public ClassesController(IAdmissionService admissionService)
    {
        _admissionService = admissionService;
    }

    [HttpPost]
    public async Task<ActionResult<ClassResponse>> CreateClass(
        [FromBody] CreateClassRequest request,
        CancellationToken ct)
    {
        if (!ModelState.IsValid)
        {
            var firstError = ModelState.Values.SelectMany(v => v.Errors).FirstOrDefault()?.ErrorMessage
                             ?? "Invalid request payload.";
            throw new ValidationException(firstError);
        }

        var result = await _admissionService.CreateClassAsync(request, ct);
        return StatusCode(StatusCodes.Status201Created, result);
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<ClassDetailResponse>>> GetClasses(CancellationToken ct)
    {
        var result = await _admissionService.GetClassesAsync(ct);
        return Ok(result);
    }

    [HttpGet("{classId}")]
    public async Task<ActionResult<ClassDetailResponse>> GetClassById(
        string classId,
        CancellationToken ct)
    {
        var result = await _admissionService.GetClassByIdAsync(classId, ct);
        return Ok(result);
    }

    [HttpPost("{classId}/holds")]
    public async Task<ActionResult<CreateHoldResponse>> CreateHold(
        string classId,
        [FromHeader(Name = "X-Student-Id")] string? studentId,
        CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(studentId))
        {
            throw new ValidationException("X-Student-Id header is required.");
        }

        var result = await _admissionService.CreateHoldAsync(classId, studentId, ct);
        return StatusCode(StatusCodes.Status201Created, result);
    }
}
