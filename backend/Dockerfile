# Multi-stage build for SchoolAdmission.Api
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy project files and restore
COPY ["SchoolAdmission.sln", "./"]
COPY ["SchoolAdmission.Api/SchoolAdmission.Api.csproj", "SchoolAdmission.Api/"]
COPY ["SchoolAdmission.Tests/SchoolAdmission.Tests.csproj", "SchoolAdmission.Tests/"]

RUN dotnet restore "SchoolAdmission.Api/SchoolAdmission.Api.csproj"

# Copy full source and publish
COPY . .
WORKDIR "/src/SchoolAdmission.Api"
RUN dotnet publish "SchoolAdmission.Api.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
COPY --from=build /app/publish .

ENV ASPNETCORE_URLS=http://+:8080
ENV PORT=8080
EXPOSE 8080

ENTRYPOINT ["dotnet", "SchoolAdmission.Api.dll"]
