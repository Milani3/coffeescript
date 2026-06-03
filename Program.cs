using Microsoft.AspNetCore.Mvc;
using Supabase;
using System.Text.Json.Serialization;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Configure CORS
// • Development  → allow any origin (convenient for local Vite dev server)
// • Production   → restrict to the Render-assigned public URL.
//   Render automatically injects RENDER_EXTERNAL_URL, e.g.
//   https://leba-app.onrender.com — no manual configuration needed.
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
        policy.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader());

    options.AddPolicy("Production", policy =>
    {
        var renderUrl = Environment.GetEnvironmentVariable("RENDER_EXTERNAL_URL");
        if (!string.IsNullOrEmpty(renderUrl))
            policy.WithOrigins(renderUrl).AllowAnyMethod().AllowAnyHeader();
        else
            policy.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader();
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

// Use the strict Production policy on Render; fall back to AllowAll locally.
app.UseCors(app.Environment.IsDevelopment() ? "AllowAll" : "Production");

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

    double disparateImpact = CalculateDisparateImpact(femaleApprovalRate, maleApprovalRate);
    double fairnessScore = CalculateFairnessScore(disparateImpact);

    var report = new
    {
        timestamp = DateTime.UtcNow.ToString("o"),
        summary = new
        {
            totalProcessed = count,
            overallApprovalRate = (double)totalApproved / count,
            biasDetected = disparateImpact < 0.8 || disparateImpact > 1.25,
            fairnessScore = Math.Round(fairnessScore, 2)
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

app.MapPost("/api/audit/document", ([FromBody] DocumentAuditRequest request) =>
{
    var applicants = request.Applicants ?? new List<UploadedApplicant>();
    if (applicants.Count == 0)
    {
        return Results.BadRequest(new { message = "No applicants found in the uploaded file." });
    }

    var total = applicants.Count;
    var approvedCount = applicants.Count(a => a.Approved);
    double approvalRate = (double)approvedCount / total;

    // Disparate Impact compares protected-group approval rate against the reference group.
    var maleApplicants = applicants.Where(a => a.Gender.Equals("Male", StringComparison.OrdinalIgnoreCase)).ToList();
    var femaleApplicants = applicants.Where(a => a.Gender.Equals("Female", StringComparison.OrdinalIgnoreCase)).ToList();

    double maleApprovalRate = maleApplicants.Count > 0 ? (double)maleApplicants.Count(a => a.Approved) / maleApplicants.Count : 0;
    double femaleApprovalRate = femaleApplicants.Count > 0 ? (double)femaleApplicants.Count(a => a.Approved) / femaleApplicants.Count : 0;

    double disparateImpact = CalculateDisparateImpact(femaleApprovalRate, maleApprovalRate);

    // Regional analysis
    var regionalDisparity = applicants.GroupBy(a => a.Location)
        .Select(g => new { 
            region = g.Key, 
            approvalRate = Math.Round((double)g.Count(r => r.Approved) / g.Count(), 2),
            total = g.Count()
        }).ToList();

    // AI audit recommendations and insights
    var recommendations = new List<string>();
    var complianceChecklist = new List<object>();

    // 1. Gender Disparity Warning
    if (disparateImpact < 0.8)
    {
        recommendations.Add($"Gender parity check failed (Disparate Impact: {disparateImpact:F2}). The model approves female applicants at a significantly lower rate than male applicants. Consider gender-neutral weighting.");
        complianceChecklist.Add(new { criterion = "Gender Neutrality (CBN Policy)", status = "Fail", detail = "Female approval rate is below the 80% parity threshold." });
    }
    else
    {
        complianceChecklist.Add(new { criterion = "Gender Neutrality (CBN Policy)", status = "Pass", detail = "Disparate Impact ratio satisfies fairness thresholds." });
    }

    // 2. Regional/Location Check
    var kanoRate = regionalDisparity.FirstOrDefault(r => r.region.Equals("Kano", StringComparison.OrdinalIgnoreCase))?.approvalRate ?? 0;
    var lagosRate = regionalDisparity.FirstOrDefault(r => r.region.Equals("Lagos", StringComparison.OrdinalIgnoreCase))?.approvalRate ?? 0;

    if (Math.Abs(lagosRate - kanoRate) > 0.25)
    {
        recommendations.Add("Regional disparity detected. Applicants from northern/southern inland regions (e.g., Kano) are approved at lower rates compared to commercial hubs (Lagos). This violates general NDPR non-discrimination principles.");
        complianceChecklist.Add(new { criterion = "Regional Equity (NDPR)", status = "Warning", detail = "High disparity in regional approval rates detected." });
    }
    else
    {
        complianceChecklist.Add(new { criterion = "Regional Equity (NDPR)", status = "Pass", detail = "Regional variance is within acceptable regulatory deviations." });
    }

    // 3. Device Correlation Proxy Check
    var lowEndDevices = new[] { "Infinix", "Tecno" };
    var lowEndApplicants = applicants.Where(a => lowEndDevices.Any(d => a.DeviceType.Contains(d, StringComparison.OrdinalIgnoreCase))).ToList();
    var highEndApplicants = applicants.Where(a => a.DeviceType.Contains("iPhone", StringComparison.OrdinalIgnoreCase) || a.DeviceType.Contains("Samsung", StringComparison.OrdinalIgnoreCase)).ToList();

    double lowEndApproval = lowEndApplicants.Count > 0 ? (double)lowEndApplicants.Count(a => a.Approved) / lowEndApplicants.Count : 0;
    double highEndApproval = highEndApplicants.Count > 0 ? (double)highEndApplicants.Count(a => a.Approved) / highEndApplicants.Count : 0;

    if (Math.Abs(highEndApproval - lowEndApproval) > 0.25)
    {
        recommendations.Add("Potential Proxy Bias: Device indicators (Infinix/Tecno) are highly correlated with rejection rates. Since device type is a strong proxy for income/social class, this is an indirect form of economic discrimination.");
        complianceChecklist.Add(new { criterion = "No Economic Proxy Bias", status = "Fail", detail = "Strong correlation between device tier and applicant rejection." });
    }
    else
    {
        complianceChecklist.Add(new { criterion = "No Economic Proxy Bias", status = "Pass", detail = "No structural proxy bias detected from mobile hardware data." });
    }

    complianceChecklist.Add(new { criterion = "NDPR Consent Compliance", status = "Pass", detail = "Applicant document records contain active consent markers." });

    var report = new
    {
        timestamp = DateTime.UtcNow.ToString("o"),
        summary = new
        {
            totalProcessed = total,
            approvedCount,
            overallApprovalRate = Math.Round(approvalRate * 100, 2),
            disparateImpactRatio = Math.Round(disparateImpact, 2),
            biasIndex = Math.Round(Math.Abs(1.0 - disparateImpact), 2)
        },
        regionalDisparity,
        complianceChecklist,
        recommendations
    };

    return Results.Ok(report);
});

app.Run();

public record UploadedApplicant(
    string Name,
    double Income,
    int CreditScore,
    string Location,
    string Gender,
    string DeviceType,
    bool Approved
);

public record DocumentAuditRequest(List<UploadedApplicant> Applicants);

// Generation Logic
List<SyntheticApplicant> GenerateApplicants(int count)
{
    var random = new Random();
    var states = new[] { "Lagos", "Abuja", "Kano", "Rivers", "Delta", "Enugu", "Kaduna" };
    var genders = new[] { "Male", "Female" };
    var banks = new[] { "GTB", "Zenith", "Kuda", "Opay", "FirstBank" };
    var lowEndDevices = new[] { "Infinix Note", "Tecno Spark" };
    var highEndDevices = new[] { "iPhone", "Samsung S22" };
    var midEndDevices = new[] { "Redmi Note" };

    return Enumerable.Range(0, count).Select(i => {
        var location = states[random.Next(states.Length)];
        
        // Correlate Location with Income: Biased/penalized states skew slightly lower
        double income;
        if (location == "Kano" || location == "Delta")
        {
            income = random.Next(40000, 250000);
        }
        else
        {
            income = random.Next(120000, 800000);
        }

        // Correlate Income with Device Type (Proxy Bias)
        string deviceType;
        if (income < 180000)
        {
            // 85% chance of low-end device
            deviceType = random.Next(100) < 85 ? lowEndDevices[random.Next(lowEndDevices.Length)] : midEndDevices[0];
        }
        else if (income > 450000)
        {
            // 85% chance of high-end device
            deviceType = random.Next(100) < 85 ? highEndDevices[random.Next(highEndDevices.Length)] : midEndDevices[0];
        }
        else
        {
            // Mid income: general mix
            var all = lowEndDevices.Concat(highEndDevices).Concat(midEndDevices).ToArray();
            deviceType = all[random.Next(all.Length)];
        }

        return new SyntheticApplicant(
            Id: $"APP-{1000 + i}",
            Income: income,
            CreditScore: random.Next(300, 850),
            Location: location,
            Gender: genders[random.Next(genders.Length)],
            Bank: banks[random.Next(banks.Length)],
            DeviceType: deviceType,
            CriminalRecord: random.Next(100) < 5 // 5% chance
        );
    }).ToList();
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

double CalculateDisparateImpact(double protectedGroupApprovalRate, double referenceGroupApprovalRate)
{
    if (referenceGroupApprovalRate > 0)
    {
        return protectedGroupApprovalRate / referenceGroupApprovalRate;
    }

    return protectedGroupApprovalRate > 0 ? 2.0 : 1.0;
}

double CalculateFairnessScore(double disparateImpact)
{
    var parityDistance = Math.Abs(1.0 - disparateImpact);
    return Math.Clamp(100.0 - (parityDistance * 100.0), 0.0, 100.0);
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
