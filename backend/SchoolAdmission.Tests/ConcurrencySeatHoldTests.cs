using System.Net;
using System.Net.Http.Json;
using SchoolAdmission.Api.DTOs;
using Xunit;

namespace SchoolAdmission.Tests;

public class ConcurrencySeatHoldTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly HttpClient _client;

    public ConcurrencySeatHoldTests(CustomWebApplicationFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task ConcurrentSeatHold_UnderHighLoad_NeverExceedsTotalSeats()
    {
        // 1. Create a class with only 5 seats
        const int totalSeats = 5;
        const int concurrentRequests = 30;

        var createClassResponse = await _client.PostAsJsonAsync("/classes", new CreateClassRequest("Class 6 - Concurrency Test", totalSeats));
        Assert.Equal(HttpStatusCode.Created, createClassResponse.StatusCode);
        var createdClass = await createClassResponse.Content.ReadFromJsonAsync<ClassResponse>();
        Assert.NotNull(createdClass);
        var classId = createdClass.Id;

        // 2. Prepare 30 distinct student IDs (valid 17 digits: e.g. 20260000000000001 to 20260000000000030)
        var studentIds = Enumerable.Range(1, concurrentRequests)
            .Select(i => $"2026{i:D13}")
            .ToList();

        // 3. Fire all 30 hold requests simultaneously
        var tasks = studentIds.Select(async studentId =>
        {
            using var request = new HttpRequestMessage(HttpMethod.Post, $"/classes/{classId}/holds");
            request.Headers.Add("X-Student-Id", studentId);
            return await _client.SendAsync(request);
        }).ToList();

        var responses = await Task.WhenAll(tasks);

        // 4. Assert: Exactly 5 succeed with 201 Created, 25 fail with 409 Conflict
        var successCount = responses.Count(r => r.StatusCode == HttpStatusCode.Created);
        var conflictCount = responses.Count(r => r.StatusCode == HttpStatusCode.Conflict);

        Assert.Equal(totalSeats, successCount);
        Assert.Equal(concurrentRequests - totalSeats, conflictCount);

        // 5. Verify the class seat count from API: held + confirmed must equal totalSeats, availableSeats must be 0
        var classDetailResponse = await _client.GetFromJsonAsync<ClassDetailResponse>($"/classes/{classId}");
        Assert.NotNull(classDetailResponse);
        Assert.Equal(totalSeats, classDetailResponse.HeldSeats);
        Assert.Equal(0, classDetailResponse.AvailableSeats);
        Assert.Equal(totalSeats, classDetailResponse.HeldSeats + classDetailResponse.ConfirmedSeats);
    }
}
