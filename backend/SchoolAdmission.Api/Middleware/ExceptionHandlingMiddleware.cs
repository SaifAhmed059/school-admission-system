using System.Net;
using System.Text.Json;
using SchoolAdmission.Api.DTOs;
using SchoolAdmission.Api.Exceptions;

namespace SchoolAdmission.Api.Middleware;

public class ExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;

    public ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            await HandleExceptionAsync(context, ex);
        }
    }

    private async Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        var statusCode = exception switch
        {
            ValidationException => HttpStatusCode.BadRequest,
            KeyNotFoundException => HttpStatusCode.NotFound,
            ConflictException => HttpStatusCode.Conflict,
            ForbiddenException => HttpStatusCode.Forbidden,
            BadHttpRequestException => HttpStatusCode.BadRequest,
            JsonException => HttpStatusCode.BadRequest,
            _ => HttpStatusCode.InternalServerError
        };

        if (statusCode == HttpStatusCode.InternalServerError)
        {
            _logger.LogError(exception, "Unhandled server error occurred while processing request.");
        }
        else
        {
            _logger.LogWarning("Handled business/client exception ({StatusCode}): {Message}", (int)statusCode, exception.Message);
        }

        context.Response.ContentType = "application/json";
        context.Response.StatusCode = (int)statusCode;

        var message = statusCode == HttpStatusCode.InternalServerError
            ? "An unexpected internal server error occurred."
            : exception.Message;

        var response = new ErrorResponse(message, (int)statusCode);
        var json = JsonSerializer.Serialize(response, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        });

        await context.Response.WriteAsync(json);
    }
}
