using Microsoft.AspNetCore.Mvc;
using Supabase;
using System.Text.Json.Serialization;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Configure CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

// Load .env file
var envPath = Path.Combine(Directory.GetCurrentDirectory(), ".env");
if (File.Exists(envPath))
{
    foreach (var line in File.ReadAllLines(envPath))
    {
        var parts = line.Split('=', 2);
        if (parts.Length == 2)
        {
            Environment.SetEnvironmentVariable(parts[0].Trim(), parts[1].Trim());
        }
    }
}

// Configure Supabase (Optional)
var supabaseUrl = Environment.GetEnvironmentVariable("SUPABASE_URL");
var supabaseKey = Environment.GetEnvironmentVariable("SUPABASE_SERVICE_ROLE_KEY");

if (!string.IsNullOrEmpty(supabaseUrl) && !string.IsNullOrEmpty(supabaseKey))
{
    builder.Services.AddSingleton(new Supabase.Client(supabaseUrl, supabaseKey));
}

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("AllowAll");

// Serve frontend static files only if the directory exists
var distPath = Path.Combine(builder.Environment.ContentRootPath, "frontend", "dist");
if (Directory.Exists(distPath))
{
    var fileProvider = new Microsoft.Extensions.FileProviders.PhysicalFileProvider(distPath);
    app.UseDefaultFiles(new DefaultFilesOptions
    {
        FileProvider = fileProvider,
        RequestPath = ""
    });
    app.UseStaticFiles(new StaticFileOptions
    {
        FileProvider = fileProvider,
        RequestPath = ""
    });

    app.MapFallbackToFile("index.html", new StaticFileOptions
    {
        FileProvider = fileProvider
    });
}
app.MapGet("/api", () => Results.Ok(new { message = "LEBA API is active (C# Edition)" }));

app.MapPost("/api/predict", async ([FromBody] PredictionRequest request) =>
{
    try
    {
        var formData = request.FormData;
        var biasSettings = request.BiasSettings;

        int score = 0;
        var factors = new List<Factor>();

        // 1. Base Logic (Simulating a neutral model)
        double income = formData.Income;
        int creditScore = formData.CreditScore;

        // Income Factor
        if (income > 500000)
        {
            score += 45;
            factors.Add(new Factor("High Monthly Income", 45));
        }
        else if (income > 200000)
        {
            score += 30;
            factors.Add(new Factor("Stable Monthly Income", 30));
        }
        else
        {
            score += 10;
            factors.Add(new Factor("Low Income Bracket", 10));
        }

        // Credit Score Factor
        if (creditScore > 750)
        {
            score += 35;
            factors.Add(new Factor("Excellent Credit History", 35));
        }
        else if (creditScore > 600)
        {
            score += 20;
            factors.Add(new Factor("Fair Credit History", 20));
        }
        else
        {
            score -= 10;
            factors.Add(new Factor("Poor Credit History", -10));
        }

        // 2. Bias Injection Logic
        
        // Location Bias
        if (biasSettings.PenalizeLocation)
        {
            var penalizedStates = new List<string> { "Kano", "Kaduna", "Delta", "Rivers" };
            if (penalizedStates.Contains(formData.Location))
            {
                score -= 30;
                factors.Add(new Factor("Regional Risk Adjustment (Biased)", -30));
            }
        }

        // Gender Bias
        if (biasSettings.GenderBias && formData.Gender == "Female")
        {
            score -= 20;
            factors.Add(new Factor("Gender Weighting (Biased)", -20));
        }

        // Criminal Policy
        if (formData.CriminalRecord)
        {
            int penalty = biasSettings.StrictCriminalRecord ? 60 : 20;
            score -= penalty;
            factors.Add(new Factor("Criminal Record Penalty", -penalty));
        }

        bool approved = score >= 50;

        var results = new
        {
            timestamp = DateTime.UtcNow.ToString("o"),
            approved,
            score = Math.Clamp(score, 0, 100),
            factors,
            metadata = new
            {
                model = "LEBA-Audit-v1",
                region = "Nigeria-Localized"
            }
        };

        return Results.Ok(results);
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Prediction Error: {ex.Message}");
        return Results.Problem("Internal Server Error", statusCode: 500);
    }
});

app.MapGet("/api/metrics", () => Results.Ok(new
{
    approvalRates = new
    {
        Lagos = 0.72,
        Abuja = 0.68,
        Kano = 0.35,
        Rivers = 0.42
    },
    biasIndex = 0.24,
    totalAudits = 1240
}));

/**
 * Enterprise Feature: Batch Audit Simulation
 * Generates N synthetic applicants and audits the model for bias.
 */
app.MapPost("/api/audit/batch", async ([FromBody] BatchAuditRequest request) =>
{
    int count = request.Count > 0 ? request.Count : 30;
    var applicants = GenerateApplicants(count);
    var results = new List<AuditResult>();

    foreach (var applicant in applicants)
    {
        results.Add(RunAuditSimulation(applicant, request.BiasSettings));
    }

    // Calculate Fairness Metrics
    var totalApproved = results.Count(r => r.Approved);
    var maleResults = results.Where(r => r.Applicant.Gender == "Male").ToList();
    var femaleResults = results.Where(r => r.Applicant.Gender == "Female").ToList();

    double maleApprovalRate = maleResults.Count > 0 ? (double)maleResults.Count(r => r.Approved) / maleResults.Count : 0;
    double femaleApprovalRate = femaleResults.Count > 0 ? (double)femaleResults.Count(r => r.Approved) / femaleResults.Count : 0;

    // Disparate Impact Ratio (DI) - Safe calculation to avoid division by zero (Infinity/NaN)
    double disparateImpact = 1.0;
    if (maleApprovalRate > 0)
    {
        disparateImpact = femaleApprovalRate / maleApprovalRate;
    }
    else if (femaleApprovalRate > 0)
    {
        disparateImpact = 2.0; // High default ratio if male rate is 0 but female rate is positive
    }
    else
    {
        disparateImpact = 1.0; // Perfect parity if both are 0
    }

    var report = new
    {
        timestamp = DateTime.UtcNow.ToString("o"),
        summary = new
        {
            totalProcessed = count,
            overallApprovalRate = (double)totalApproved / count,
            biasDetected = disparateImpact < 0.8 || disparateImpact > 1.25,
            fairnessScore = Math.Round(disparateImpact * 100, 2)
        },
        metrics = new
        {
            genderParity = new
            {
                maleRate = Math.Round(maleApprovalRate, 2),
                femaleRate = Math.Round(femaleApprovalRate, 2),
                disparateImpactRatio = Math.Round(disparateImpact, 2)
            },
            regionalDisparity = results.GroupBy(r => r.Applicant.Location)
                .Select(g => new { 
                    region = g.Key, 
                    approvalRate = Math.Round((double)g.Count(r => r.Approved) / g.Count(), 2) 
                }),
            deviceDisparity = results.GroupBy(r => {
                if (r.Applicant.DeviceType.Contains("iPhone")) return "iPhone";
                if (r.Applicant.DeviceType.Contains("Samsung")) return "Samsung";
                if (r.Applicant.DeviceType.Contains("Infinix") || r.Applicant.DeviceType.Contains("Tecno")) return "Infinix/Tecno";
                return "Other";
            })
            .Select(g => new {
                device = g.Key,
                approvalRate = Math.Round((double)g.Count(r => r.Approved) / g.Count(), 2)
            }),
            incomeDisparity = results.GroupBy(r => {
                if (r.Applicant.Income < 150000) return "Low";
                if (r.Applicant.Income < 400000) return "Mid";
                return "High";
            })
            .Select(g => new {
                bracket = g.Key,
                approvalRate = Math.Round((double)g.Count(r => r.Approved) / g.Count(), 2)
            })
        },
        details = results.Take(10) // Return first 10 for sample inspection
    };

    return Results.Ok(report);
});

app.Run();

// Generation Logic
List<SyntheticApplicant> GenerateApplicants(int count)
{
    var random = new Random();
    var states = new[] { "Lagos", "Abuja", "Kano", "Rivers", "Delta", "Enugu", "Kaduna" };
    var genders = new[] { "Male", "Female" };
    var banks = new[] { "GTB", "Zenith", "Kuda", "Opay", "FirstBank" };
    var devices = new[] { "iPhone", "Samsung S22", "Infinix Note", "Tecno Spark", "Redmi Note" };

    return Enumerable.Range(0, count).Select(i => new SyntheticApplicant(
        Id: $"APP-{1000 + i}",
        Income: random.Next(50000, 800000),
        CreditScore: random.Next(300, 850),
        Location: states[random.Next(states.Length)],
        Gender: genders[random.Next(genders.Length)],
        Bank: banks[random.Next(banks.Length)],
        DeviceType: devices[random.Next(devices.Length)],
        CriminalRecord: random.Next(100) < 5 // 5% chance
    )).ToList();
}

AuditResult RunAuditSimulation(SyntheticApplicant applicant, BiasSettings biasSettings)
{
    int score = 0;
    
    // Core Logic
    if (applicant.Income > 300000) score += 40; else score += 15;
    if (applicant.CreditScore > 650) score += 30; else score -= 10;

    // Inject Bias
    if (biasSettings.GenderBias && applicant.Gender == "Female") score -= 15;
    if (biasSettings.PenalizeLocation && (applicant.Location == "Kano" || applicant.Location == "Delta")) score -= 25;
    
    // Proxy Bias: Penalty for low-end devices (often correlates with lower income/class)
    if (applicant.DeviceType.Contains("Infinix") || applicant.DeviceType.Contains("Tecno")) score -= 10;

    return new AuditResult(applicant, score >= 50, score);
}

// Models
public record BatchAuditRequest(int Count, BiasSettings BiasSettings);
public record AuditResult(SyntheticApplicant Applicant, bool Approved, int Score);
public record SyntheticApplicant(
    string Id,
    double Income,
    int CreditScore,
    string Location,
    string Gender,
    string Bank,
    string DeviceType,
    bool CriminalRecord
);

// Models
public record Factor(string Name, int Impact);

public record FormData(
    double Income,
    int CreditScore,
    string Location,
    string Gender,
    bool CriminalRecord
);

public record BiasSettings(
    bool PenalizeLocation,
    bool GenderBias,
    bool StrictCriminalRecord
);

public record PredictionRequest(
    FormData FormData,
    BiasSettings BiasSettings
);
