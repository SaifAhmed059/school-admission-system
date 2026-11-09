using System.Net;
using System.Net.Http.Json;
using Microsoft.Extensions.DependencyInjection;
using SchoolAdmission.Api.Domain.Entities;
using SchoolAdmission.Api.DTOs;
using SchoolAdmission.Api.Infrastructure;
using Xunit;

namespace SchoolAdmission.Tests;

public class HoldExpirationAndRulesTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public HoldExpirationAndRulesTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task ExpiredHold_ReturnsSeatToAvailablePool_WithoutApiCall()
    {
        // Create class with 1 seat
        var createRes = await _client.PostAsJsonAsync("/classes", new CreateClassRequest("Class 8 - Expiry Test", 1));
        var schoolClass = await createRes.Content.ReadFromJsonAsync<ClassResponse>();
        Assert.NotNull(schoolClass);

        var student1 = "20261109000000001";
        var student2 = "20261109000000002";

        // Student 1 holds the only seat
        using var holdReq1 = new HttpRequestMessage(HttpMethod.Post, $"/classes/{schoolClass.Id}/holds");
        holdReq1.Headers.Add("X-Student-Id", student1);
        var holdRes1 = await _client.SendAsync(holdReq1);
        Assert.Equal(HttpStatusCode.Created, holdRes1.StatusCode);
        var holdData1 = await holdRes1.Content.ReadFromJsonAsync<CreateHoldResponse>();
        Assert.NotNull(holdData1);

        // Manually adjust the hold's expiration date to 10 seconds in the past to simulate expiry
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AdmissionDbContext>();
            var hold = await db.Holds.FindAsync(holdData1.HoldId);
            Assert.NotNull(hold);
            hold.ExpiresAt = DateTimeOffset.UtcNow.AddSeconds(-10);
            await db.SaveChangesAsync();
        }

        // Check hold status dynamically returns EXPIRED
        var holdStatusRes = await _client.GetFromJsonAsync<HoldResponse>($"/holds/{holdData1.HoldId}");
        Assert.NotNull(holdStatusRes);
        Assert.Equal(HoldStatus.Expired, holdStatusRes.Status);

        // Verify class availableSeats is 1 again, without any API call to release it!
        var classDetail = await _client.GetFromJsonAsync<ClassDetailResponse>($"/classes/{schoolClass.Id}");
        Assert.NotNull(classDetail);
        Assert.Equal(1, classDetail.AvailableSeats);
        Assert.Equal(0, classDetail.HeldSeats);

        // Now Student 2 can immediately hold this seat!
        using var holdReq2 = new HttpRequestMessage(HttpMethod.Post, $"/classes/{schoolClass.Id}/holds");
        holdReq2.Headers.Add("X-Student-Id", student2);
        var holdRes2 = await _client.SendAsync(holdReq2);
        Assert.Equal(HttpStatusCode.Created, holdRes2.StatusCode);
    }

    [Fact]
    public async Task ConfirmHold_FromAnotherStudent_ReturnsForbidden()
    {
        var createRes = await _client.PostAsJsonAsync("/classes", new CreateClassRequest("Class 9 - Shift A", 5));
        var schoolClass = await createRes.Content.ReadFromJsonAsync<ClassResponse>();
        Assert.NotNull(schoolClass);

        var studentA = "20261109111111111";
        var studentB = "20261109222222222";

        using var holdReq = new HttpRequestMessage(HttpMethod.Post, $"/classes/{schoolClass.Id}/holds");
        holdReq.Headers.Add("X-Student-Id", studentA);
        var holdRes = await _client.SendAsync(holdReq);
        var hold = await holdRes.Content.ReadFromJsonAsync<CreateHoldResponse>();
        Assert.NotNull(hold);

        // Student B tries to confirm Student A's hold
        using var confirmReq = new HttpRequestMessage(HttpMethod.Post, $"/holds/{hold.HoldId}/confirm");
        confirmReq.Headers.Add("X-Student-Id", studentB);
        var confirmRes = await _client.SendAsync(confirmReq);

        Assert.Equal(HttpStatusCode.Forbidden, confirmRes.StatusCode);
    }

    [Fact]
    public async Task DeleteHold_CancelsReservation_AndFreesSeat()
    {
        var createRes = await _client.PostAsJsonAsync("/classes", new CreateClassRequest("Class 10 - Cancellation", 2));
        var schoolClass = await createRes.Content.ReadFromJsonAsync<ClassResponse>();
        Assert.NotNull(schoolClass);

        var studentId = "20261109333333333";

        // Hold seat
        using var holdReq = new HttpRequestMessage(HttpMethod.Post, $"/classes/{schoolClass.Id}/holds");
        holdReq.Headers.Add("X-Student-Id", studentId);
        var holdRes = await _client.SendAsync(holdReq);
        var hold = await holdRes.Content.ReadFromJsonAsync<CreateHoldResponse>();
        Assert.NotNull(hold);

        // Class has 1 held seat, 1 available
        var detailBefore = await _client.GetFromJsonAsync<ClassDetailResponse>($"/classes/{schoolClass.Id}");
        Assert.Equal(1, detailBefore!.HeldSeats);
        Assert.Equal(1, detailBefore.AvailableSeats);

        // Cancel hold
        using var deleteReq = new HttpRequestMessage(HttpMethod.Delete, $"/holds/{hold.HoldId}");
        deleteReq.Headers.Add("X-Student-Id", studentId);
        var deleteRes = await _client.SendAsync(deleteReq);
        Assert.Equal(HttpStatusCode.NoContent, deleteRes.StatusCode);

        // Class has 0 held seats, 2 available
        var detailAfter = await _client.GetFromJsonAsync<ClassDetailResponse>($"/classes/{schoolClass.Id}");
        Assert.Equal(0, detailAfter!.HeldSeats);
        Assert.Equal(2, detailAfter.AvailableSeats);
    }

    [Theory]
    [InlineData("12345")]                // Too short
    [InlineData("202611091111111112")]   // Too long (18 digits)
    [InlineData("ABC11091111111112")]   // Contains letters
    [InlineData("")]                     // Empty
    public async Task InvalidStudentId_Returns400BadRequest_Never500(string invalidId)
    {
        using var holdReq = new HttpRequestMessage(HttpMethod.Post, "/classes/c_dummy/holds");
        if (!string.IsNullOrEmpty(invalidId))
        {
            holdReq.Headers.Add("X-Student-Id", invalidId);
        }
        var res = await _client.SendAsync(holdReq);

        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
    }
}
