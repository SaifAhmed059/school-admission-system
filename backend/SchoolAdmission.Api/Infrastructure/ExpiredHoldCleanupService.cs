using Microsoft.EntityFrameworkCore;
using SchoolAdmission.Api.Domain.Entities;

namespace SchoolAdmission.Api.Infrastructure;

public class ExpiredHoldCleanupService : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<ExpiredHoldCleanupService> _logger;

    public ExpiredHoldCleanupService(IServiceProvider serviceProvider, ILogger<ExpiredHoldCleanupService> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("ExpiredHoldCleanupService started.");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = _serviceProvider.CreateScope();
                var dbContext = scope.ServiceProvider.GetRequiredService<AdmissionDbContext>();

                var now = DateTimeOffset.UtcNow;
                var expiredHolds = await dbContext.Holds
                    .Where(h => h.Status == HoldStatus.Held && h.ExpiresAt <= now)
                    .Take(100)
                    .ToListAsync(stoppingToken);

                if (expiredHolds.Count > 0)
                {
                    foreach (var hold in expiredHolds)
                    {
                        hold.Status = HoldStatus.Expired;
                    }
                    await dbContext.SaveChangesAsync(stoppingToken);
                    _logger.LogInformation("Marked {Count} expired seat holds as EXPIRED.", expiredHolds.Count);
                }
            }
            catch (Exception ex) when (!stoppingToken.IsCancellationRequested)
            {
                _logger.LogError(ex, "Error occurred during expired hold cleanup.");
            }

            try
            {
                await Task.Delay(TimeSpan.FromSeconds(5), stoppingToken);
            }
            catch (OperationCanceledException)
            {
                break;
            }
        }

        _logger.LogInformation("ExpiredHoldCleanupService stopped.");
    }
}
