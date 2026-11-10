using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;
using SchoolAdmission.Api.Infrastructure;
using SchoolAdmission.Api.Middleware;
using SchoolAdmission.Api.Services;

var builder = WebApplication.CreateBuilder(args);

// Configure Kestrel to listen on 0.0.0.0:8080 when running normally (not during WebApplicationFactory tests)
if (!builder.Environment.IsEnvironment("Testing"))
{
    var port = builder.Configuration.GetValue<int?>("PORT") ?? 8080;
    builder.WebHost.ConfigureKestrel(options =>
    {
        options.ListenAnyIP(port);
    });
}

// Configure Database Connection
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
                       ?? Environment.GetEnvironmentVariable("POSTGRES_CONNECTION_STRING")
                       ?? Environment.GetEnvironmentVariable("DATABASE_URL");

builder.Services.AddDbContext<AdmissionDbContext>(options =>
{
    if (!string.IsNullOrWhiteSpace(connectionString) && !connectionString.Equals("InMemory", StringComparison.OrdinalIgnoreCase))
    {
        options.UseNpgsql(connectionString);
    }
    else
    {
        options.UseInMemoryDatabase("SchoolAdmissionDb");
    }
});

// Register Application Services
builder.Services.AddScoped<IAdmissionService, AdmissionService>();
builder.Services.AddHostedService<ExpiredHoldCleanupService>();

// Configure Controllers & JSON serialization
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
        options.JsonSerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.Never;
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
    });

// Configure CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

// OpenAPI / Swagger
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new() { Title = "School Admission System API", Version = "v1" });
});

var app = builder.Build();

// Ensure Database is created on startup when running normally
if (!app.Environment.IsEnvironment("Testing"))
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<AdmissionDbContext>();
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
    try
    {
        if (db.Database.IsNpgsql())
        {
            logger.LogInformation("Applying PostgreSQL database schema...");
            await db.Database.EnsureCreatedAsync();
            logger.LogInformation("PostgreSQL schema successfully ensured.");
        }
        else
        {
            await db.Database.EnsureCreatedAsync();
        }
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "An error occurred while ensuring database schema.");
        throw;
    }
}

// Exception handling middleware
app.UseMiddleware<ExceptionHandlingMiddleware>();

// Enable Swagger in all environments for API testing convenience
app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "School Admission API v1");
    c.RoutePrefix = "swagger";
});

app.UseCors("AllowAll");
app.MapControllers();

// Health check endpoint for container probes and monitoring
app.MapGet("/health", () => Results.Ok(new 
{ 
    status = "Healthy", 
    service = "SchoolAdmission.Api", 
    timestamp = DateTimeOffset.UtcNow 
}));

app.Run();

public partial class Program { }
