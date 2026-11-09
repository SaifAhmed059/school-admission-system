using System.Net;
using System.Net.Http.Json;
using SchoolAdmission.Api.Domain.Entities;
using SchoolAdmission.Api.DTOs;
using Xunit;

namespace SchoolAdmission.Tests;

public class AdmissionFlowIntegrationTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly HttpClient _client;

    public AdmissionFlowIntegrationTests(CustomWebApplicationFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task FullAdmissionLifecycle_WorksAccordingToSpecification()
    {
        var studentId = "20261109012345678";

        // 1. POST /classes
        var createClassRes = await _client.PostAsJsonAsync("/classes", new CreateClassRequest("Class 7 - Morning Shift", 10));
        Assert.Equal(HttpStatusCode.Created, createClassRes.StatusCode);
        var schoolClass = await createClassRes.Content.ReadFromJsonAsync<ClassResponse>();
        Assert.NotNull(schoolClass);
        var classId = schoolClass.Id;

        // 2. GET /classes
        var listRes = await _client.GetFromJsonAsync<List<ClassDetailResponse>>("/classes");
        Assert.NotNull(listRes);
        var foundClass = listRes.FirstOrDefault(c => c.Id == classId);
        Assert.NotNull(foundClass);
        Assert.Equal(10, foundClass.AvailableSeats);
        Assert.Equal(0, foundClass.HeldSeats);

        // 3. POST /classes/{classId}/holds (Seat hold)
        using var holdReq = new HttpRequestMessage(HttpMethod.Post, $"/classes/{classId}/holds");
        holdReq.Headers.Add("X-Student-Id", studentId);
        var holdRes = await _client.SendAsync(holdReq);
        Assert.Equal(HttpStatusCode.Created, holdRes.StatusCode);
        var holdData = await holdRes.Content.ReadFromJsonAsync<CreateHoldResponse>();
        Assert.NotNull(holdData);
        Assert.Equal(HoldStatus.Held, holdData.Status);
        Assert.Equal(studentId, holdData.StudentId);
        var holdId = holdData.HoldId;

        // Verify class availableSeats decreased to 9, heldSeats increased to 1
        var classAfterHold = await _client.GetFromJsonAsync<ClassDetailResponse>($"/classes/{classId}");
        Assert.NotNull(classAfterHold);
        Assert.Equal(9, classAfterHold.AvailableSeats);
        Assert.Equal(1, classAfterHold.HeldSeats);
        Assert.Equal(0, classAfterHold.ConfirmedSeats);

        // 4. Rule 3: Same student cannot hold another seat in same class
        using var duplicateHoldReq = new HttpRequestMessage(HttpMethod.Post, $"/classes/{classId}/holds");
        duplicateHoldReq.Headers.Add("X-Student-Id", studentId);
        var duplicateHoldRes = await _client.SendAsync(duplicateHoldReq);
        Assert.Equal(HttpStatusCode.Conflict, duplicateHoldRes.StatusCode);

        // 5. GET /holds/{holdId}
        var getHoldRes = await _client.GetFromJsonAsync<HoldResponse>($"/holds/{holdId}");
        Assert.NotNull(getHoldRes);
        Assert.Equal(HoldStatus.Held, getHoldRes.Status);
        Assert.Equal(classId, getHoldRes.ClassId);

        // 6. POST /holds/{holdId}/confirm
        using var confirmReq = new HttpRequestMessage(HttpMethod.Post, $"/holds/{holdId}/confirm");
        confirmReq.Headers.Add("X-Student-Id", studentId);
        var confirmRes = await _client.SendAsync(confirmReq);
        Assert.Equal(HttpStatusCode.OK, confirmRes.StatusCode);
        var confirmData = await confirmRes.Content.ReadFromJsonAsync<ConfirmHoldResponse>();
        Assert.NotNull(confirmData);
        Assert.Equal(HoldStatus.Confirmed, confirmData.Status);

        // Check seat counts: confirmedSeats = 1, heldSeats = 0, availableSeats = 9
        var classAfterConfirm = await _client.GetFromJsonAsync<ClassDetailResponse>($"/classes/{classId}");
        Assert.NotNull(classAfterConfirm);
        Assert.Equal(1, classAfterConfirm.ConfirmedSeats);
        Assert.Equal(0, classAfterConfirm.HeldSeats);
        Assert.Equal(9, classAfterConfirm.AvailableSeats);

        // 7. Rule 5: Idempotency - Confirming multiple times returns 200 without increasing confirmed seats
        using var secondConfirmReq = new HttpRequestMessage(HttpMethod.Post, $"/holds/{holdId}/confirm");
        secondConfirmReq.Headers.Add("X-Student-Id", studentId);
        var secondConfirmRes = await _client.SendAsync(secondConfirmReq);
        Assert.Equal(HttpStatusCode.OK, secondConfirmRes.StatusCode);

        var classAfterSecondConfirm = await _client.GetFromJsonAsync<ClassDetailResponse>($"/classes/{classId}");
        Assert.NotNull(classAfterSecondConfirm);
        Assert.Equal(1, classAfterSecondConfirm.ConfirmedSeats);

        // 8. GET /me/holds
        using var meReq = new HttpRequestMessage(HttpMethod.Get, "/me/holds");
        meReq.Headers.Add("X-Student-Id", studentId);
        var meRes = await _client.SendAsync(meReq);
        Assert.Equal(HttpStatusCode.OK, meRes.StatusCode);
        var myHolds = await meRes.Content.ReadFromJsonAsync<List<MyHoldResponse>>();
        Assert.NotNull(myHolds);
        var myApplication = myHolds.FirstOrDefault(h => h.HoldId == holdId);
        Assert.NotNull(myApplication);
        Assert.Equal(HoldStatus.Confirmed, myApplication.Status);
        Assert.Equal("Class 7 - Morning Shift", myApplication.ClassName);
    }
}
