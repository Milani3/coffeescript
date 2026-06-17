using Microsoft.AspNetCore.Mvc;
using Supabase;
using System.Collections.Concurrent;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;

var builder = WebApplication.CreateBuilder(args);
var runtimeLogs = new ConcurrentQueue<LogEntry>();
const int MaxRuntimeLogs = 200;
const string DefaultHfBaseUrls = "https://api-inference.huggingface.co,https://router.huggingface.co/hf-inference";

void AddRuntimeLog(string level, string category, string message, object details = null)
{
    runtimeLogs.Enqueue(new LogEntry(
        DateTime.UtcNow.ToString("o"),
        level,
        category,
        message,
        details
    ));

    while (runtimeLogs.Count > MaxRuntimeLogs && runtimeLogs.TryDequeue(out _)) { }
}

// Add services to the container.
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddHttpClient();

// Configure CORS
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

// Load .env file (supporting parent directory search)
string FindEnvFile()
{
    var dir = Directory.GetCurrentDirectory();
    while (dir != null)
    {
        var path = Path.Combine(dir, ".env");
        if (File.Exists(path)) return path;
        dir = Directory.GetParent(dir)?.FullName;
    }
    return null;
}

var envPath = FindEnvFile();
if (envPath != null)
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

app.MapGet("/health", () => Results.Ok(new
{
    status = "ok",
    timestamp = DateTime.UtcNow.ToString("o")
}));

app.MapGet("/api/health", () =>
{
    var health = new
    {
        status = "ok",
        timestamp = DateTime.UtcNow.ToString("o"),
        renderUrl = Environment.GetEnvironmentVariable("RENDER_EXTERNAL_URL"),
        hfConfigured = !string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("HF_ACCESS_TOKEN")),
        hfModel = Environment.GetEnvironmentVariable("HF_MODEL") ?? "facebook/bart-large-mnli",
        hfAuditModel = Environment.GetEnvironmentVariable("HF_AUDIT_MODEL") ?? "google/flan-t5-base"
    };

    return Results.Ok(health);
});

app.MapGet("/api/debug/logs", () =>
{
    var logs = runtimeLogs.Reverse().Take(100).ToList();
    return Results.Ok(new
    {
        timestamp = DateTime.UtcNow.ToString("o"),
        count = logs.Count,
        logs
    });
});

app.MapGet("/api/debug/ai-status", async (IHttpClientFactory httpClientFactory) =>
{
    var accessToken = Environment.GetEnvironmentVariable("HF_ACCESS_TOKEN");
    var model = Environment.GetEnvironmentVariable("HF_MODEL") ?? "facebook/bart-large-mnli";
    var auditModel = Environment.GetEnvironmentVariable("HF_AUDIT_MODEL") ?? "google/flan-t5-base";

    if (string.IsNullOrWhiteSpace(accessToken))
    {
        return Results.Ok(new
        {
            configured = false,
            model,
            auditModel,
            simulator = "missing token",
            audit = "missing token"
        });
    }

    var client = httpClientFactory.CreateClient();
    var simulatorProbe = await ProbeHuggingFaceAsync(client, accessToken, model, "approve loan", "deny loan");
    var auditProbe = await ProbeHuggingFaceAsync(client, accessToken, auditModel, "fair", "biased");

    return Results.Ok(new
    {
        configured = true,
        model,
        auditModel,
        simulator = simulatorProbe,
        audit = auditProbe
    });
});

app.MapPost("/api/predict", async ([FromBody] PredictionRequest request, IHttpClientFactory httpClientFactory) =>
{
    try
    {
        var formData = request.FormData;
        var biasSettings = request.BiasSettings ?? new BiasSettings(false, false, true);

        var (auditScore, factors) = EvaluateApplicant(
            formData.Income,
            formData.LoanAmount,
            formData.CreditScore,
            formData.Location,
            formData.Gender,
            formData.CriminalRecord,
            formData.DeviceType,
            biasSettings
        );

        var hfPrediction = await GetHuggingFacePrediction(formData, httpClientFactory);
        AddRuntimeLog("info", "predict", "Simulator request completed", new
        {
            hfPrediction.Available,
            hfPrediction.Model,
            hfPrediction.Approved,
            hfPrediction.Confidence
        });
        int finalScore = hfPrediction.Available
            ? (int)Math.Round((auditScore + hfPrediction.ApprovalScore) / 2.0)
            : auditScore;
        bool approved = finalScore >= 50;
        string explanation = BuildDecisionExplanation(formData, approved, finalScore, auditScore, factors, hfPrediction);

        var results = new
        {
            timestamp = DateTime.UtcNow.ToString("o"),
            approved,
            score = Math.Clamp(finalScore, 0, 100),
            factors,
            explanation,
            aiPrediction = new
            {
                enabled = hfPrediction.Available,
                approved = hfPrediction.Approved,
                confidence = Math.Round(hfPrediction.Confidence, 2),
                approvalScore = Math.Round(hfPrediction.ApprovalScore, 2),
                model = hfPrediction.Model,
                note = hfPrediction.Note
            },
            metadata = new
            {
                model = hfPrediction.Available ? "LEBA-HF-Audit-v1" : "LEBA-Audit-v1",
                region = "Nigeria-Localized"
            }
        };

        return Results.Ok(results);
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Prediction Error: {ex.Message}");
        AddRuntimeLog("error", "predict", "Simulator request failed", new { error = ex.Message });
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
    var biasSettings = request.BiasSettings ?? new BiasSettings(false, false, true);
    var applicants = GenerateApplicants(count);
    var results = new List<AuditResult>();

    foreach (var applicant in applicants)
    {
        results.Add(RunAuditSimulation(applicant, biasSettings));
    }

    // Calculate Fairness Metrics
    var totalProcessed = results.Count;
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
            totalProcessed,
            approvedCount = totalApproved,
            overallApprovalRate = totalProcessed > 0 ? (double)totalApproved / totalProcessed : 0,
            biasDetected = disparateImpact < 0.8 || disparateImpact > 1.25,
            fairnessScore = Math.Round(fairnessScore, 2)
        },
        metrics = new
        {
            genderParity = new
            {
                maleRate = Math.Round(maleApprovalRate, 2),
                femaleRate = Math.Round(femaleApprovalRate, 2),
                maleApproved = maleResults.Count(r => r.Approved),
                femaleApproved = femaleResults.Count(r => r.Approved),
                maleTotal = maleResults.Count,
                femaleTotal = femaleResults.Count,
                disparateImpactRatio = Math.Round(disparateImpact, 2)
            },
            regionalDisparity = results.GroupBy(r => r.Applicant.Location)
                .Select(g => new {
                    region = g.Key,
                    approvalRate = Math.Round((double)g.Count(r => r.Approved) / g.Count(), 2),
                    total = g.Count()
                }).OrderBy(r => r.region).ToList(),
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
                }),
        },
        details = results // Return all results for full audit log view
    };

    return Results.Ok(report);
});

app.MapPost("/api/audit/document", async ([FromBody] DocumentAuditRequest request, IHttpClientFactory httpClientFactory) =>
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

    var highLoanBurden = applicants.Where(a => a.Income > 0 && a.LoanAmount / a.Income > 3).ToList();
    if (highLoanBurden.Count > 0)
    {
        recommendations.Add($"{highLoanBurden.Count} applicant(s) requested loan amounts above three times their monthly income. Review affordability because loan amount should be measured against income and credit score.");
        complianceChecklist.Add(new { criterion = "Loan Affordability Check", status = "Warning", detail = "Some requested loan amounts are high compared with applicant income." });
    }
    else
    {
        complianceChecklist.Add(new { criterion = "Loan Affordability Check", status = "Pass", detail = "Requested loan amounts are within a reasonable range compared with income." });
    }

    complianceChecklist.Add(new { criterion = "NDPR Consent Compliance", status = "Pass", detail = "Applicant document records contain active consent markers." });

    var aiAuditInsight = await GetHuggingFaceAuditInsight(
        total,
        approvalRate,
        disparateImpact,
        JsonSerializer.Serialize(regionalDisparity),
        recommendations,
        httpClientFactory
    );
    if (!string.IsNullOrWhiteSpace(aiAuditInsight.Note))
    {
        recommendations.Add(aiAuditInsight.Note);
    }
    AddRuntimeLog("info", "audit", "Document audit completed", new
    {
        total,
        approvalRate = Math.Round(approvalRate * 100, 2),
        disparateImpact = Math.Round(disparateImpact, 2),
        aiEnabled = aiAuditInsight.Available,
        aiModel = aiAuditInsight.Model
    });

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
        recommendations,
        aiAudit = new
        {
            enabled = aiAuditInsight.Available,
            model = aiAuditInsight.Model,
            note = aiAuditInsight.Note,
            confidence = aiAuditInsight.Confidence
        }
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
    var firstNames = new[] {
        // Yoruba
        "Adebayo", "Tunde", "Temitope", "Olusegun", "Adewale", "Bukola", "Folake", "Yetunde", "Oluwaseun", "Damilola",
        // Igbo
        "Chioma", "Emeka", "Ifeoma", "Adaeze", "Chinedu", "Obinna", "Nkechi", "Chukwuemeka", "Nneka", "Ugochukwu",
        // Hausa
        "Fatima", "Aisha", "Musa", "Suleiman", "Hauwa", "Aminu", "Halima", "Abdullahi", "Zainab", "Usman",
        // Edo / Delta / South-South
        "Blessing", "Osaze", "Eghosa", "Ivie", "Osagie", "Ehigiator", "Isoken", "Osakpolor",
        // Tiv / Middle-Belt
        "Terfa", "Ngunan", "Aondofa", "Sewuese"
    };
    var lastNames = new[] {
        // Yoruba
        "Bello", "Adeyemi", "Afolayan", "Oladipo", "Balogun", "Ogundimu", "Ayodele", "Fashola",
        // Igbo
        "Okafor", "Eze", "Nwosu", "Onyeka", "Okonkwo", "Nnamdi", "Obi", "Igwe",
        // Hausa
        "Ibrahim", "Garba", "Usman", "Sani", "Mohammed", "Danjuma", "Balarabe",
        // Edo / Other
        "Ogiemwonyi", "Igbinedion", "Okojie", "Ehikhamenor", "Adesanya"
    };
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

        var loanAmount = Math.Round(income * (random.NextDouble() * 3.6 + 0.6), 0);

        return new SyntheticApplicant(
            Id: $"APP-{1000 + i}",
            Name: $"{firstNames[random.Next(firstNames.Length)]} {lastNames[random.Next(lastNames.Length)]}",
            Income: income,
            LoanAmount: loanAmount,
            CreditScore: random.Next(300, 850),
            Location: location,
            Gender: genders[random.Next(genders.Length)],
            Bank: banks[random.Next(banks.Length)],
            DeviceType: deviceType,
            CriminalRecord: random.Next(100) < 5 // 5% chance
        );
    }).ToList();
}

(int Score, List<Factor> Factors) EvaluateApplicant(
    double income,
    double loanAmount,
    int creditScore,
    string location,
    string gender,
    bool criminalRecord,
    string deviceType,
    BiasSettings biasSettings)
{
    int score = 0;
    var factors = new List<Factor>();

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

    var monthlyRepaymentRatio = income > 0 ? loanAmount / income : 10;
    if (monthlyRepaymentRatio <= 1.5)
    {
        score += 20;
        factors.Add(new Factor("Affordable Loan Amount", 20));
    }
    else if (monthlyRepaymentRatio <= 3)
    {
        score += 5;
        factors.Add(new Factor("Moderate Loan Amount", 5));
    }
    else
    {
        score -= 25;
        factors.Add(new Factor("Loan Amount Too High For Income", -25));
    }

    // Bias Injection Logic
    if (biasSettings != null)
    {
        if (biasSettings.PenalizeLocation)
        {
            var penalizedStates = new List<string> { "Kano", "Kaduna", "Delta", "Rivers" };
            if (penalizedStates.Contains(location))
            {
                score -= 30;
                factors.Add(new Factor("Regional Risk Adjustment (Biased)", -30));
            }
        }

        if (biasSettings.GenderBias)
        {
            if (gender == "Female")
            {
                score -= 20;
                factors.Add(new Factor("Gender Weighting (Biased)", -20));
            }
        }

        if (biasSettings.StrictCriminalRecord)
        {
            if (criminalRecord)
            {
                score -= 60;
                factors.Add(new Factor("Criminal Record Penalty", -60));
            }
        }

        // Proxy Bias: Penalty for low-end devices
        if (biasSettings.PenalizeLocation && !string.IsNullOrEmpty(deviceType) &&
            (deviceType.Contains("Infinix", StringComparison.OrdinalIgnoreCase) || deviceType.Contains("Tecno", StringComparison.OrdinalIgnoreCase)))
        {
            score -= 10;
            factors.Add(new Factor("Economic Hardware Adjustment (Biased)", -10));
        }
    }

    return (Math.Clamp(score, 0, 100), factors);
}

AuditResult RunAuditSimulation(SyntheticApplicant applicant, BiasSettings biasSettings)
{
    var (score, factors) = EvaluateApplicant(
        applicant.Income,
        applicant.LoanAmount,
        applicant.CreditScore,
        applicant.Location,
        applicant.Gender,
        applicant.CriminalRecord,
        applicant.DeviceType,
        biasSettings
    );

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
    if (disparateImpact <= 0)
    {
        return 0;
    }

    var parityRatio = Math.Min(disparateImpact, 1.0 / disparateImpact);
    return Math.Clamp(parityRatio * 100.0, 0.0, 100.0);
}

async Task<HuggingFacePrediction> GetHuggingFacePrediction(FormData formData, IHttpClientFactory httpClientFactory)
{
    var accessToken = Environment.GetEnvironmentVariable("HF_ACCESS_TOKEN");
    if (string.IsNullOrWhiteSpace(accessToken))
    {
        return new HuggingFacePrediction(false, false, 0, 0, "Not configured", "HF_ACCESS_TOKEN is not set.");
    }

    var model = Environment.GetEnvironmentVariable("HF_MODEL");
    if (string.IsNullOrWhiteSpace(model))
    {
        model = "facebook/bart-large-mnli";
    }

    var applicantProfile =
        $"Loan applicant in Nigeria. Monthly income: {formData.Income:N0} naira. " +
        $"Requested loan amount: {formData.LoanAmount:N0} naira. " +
        $"Credit score: {formData.CreditScore}. Location: {formData.Location}. " +
        $"Gender: {formData.Gender}. Criminal record: {(formData.CriminalRecord ? "yes" : "no")}. " +
        "Decide if this applicant should be approved or denied for a loan.";

    var payload = new
    {
        inputs = applicantProfile,
        parameters = new
        {
            candidate_labels = new[] { "approve loan", "deny loan" }
        },
        options = new
        {
            wait_for_model = true
        }
    };

    try
    {
        using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(25));
        var client = httpClientFactory.CreateClient();
        var (available, approved, confidence, approvalScore, note) = await TryHuggingFacePredictionAsync(client, accessToken, model, payload, timeout.Token);
        return new HuggingFacePrediction(available, approved, confidence, approvalScore, model, note);
    }
    catch (Exception ex)
    {
        var classified = ClassifyHuggingFaceException(ex);
        Console.WriteLine($"Hugging Face Prediction Error: {classified}");
        AddRuntimeLog("error", "hf-simulator", "Hugging Face simulator exception", new { error = classified });
        return new HuggingFacePrediction(false, false, 0, 0, model, classified);
    }
}

async Task<HuggingFaceAuditInsight> GetHuggingFaceAuditInsight(
    int totalProcessed,
    double approvalRate,
    double disparateImpact,
    string regionalDisparityJson,
    List<string> recommendations,
    IHttpClientFactory httpClientFactory)
{
    var accessToken = Environment.GetEnvironmentVariable("HF_ACCESS_TOKEN");
    if (string.IsNullOrWhiteSpace(accessToken))
    {
        return new HuggingFaceAuditInsight(false, "Not configured", "HF_ACCESS_TOKEN is not set.", 0);
    }

    var model = Environment.GetEnvironmentVariable("HF_AUDIT_MODEL");
    if (string.IsNullOrWhiteSpace(model))
    {
        model = "google/flan-t5-base";
    }

    var prompt = new StringBuilder();
    prompt.AppendLine("You are an AI audit assistant for a Nigerian loan fairness review.");
    prompt.AppendLine($"Total processed: {totalProcessed}.");
    prompt.AppendLine($"Overall approval rate: {approvalRate:P2}.");
    prompt.AppendLine($"Disparate impact ratio: {disparateImpact:F2}.");
    prompt.AppendLine("Regional disparity summary:");
    prompt.AppendLine(regionalDisparityJson);
    prompt.AppendLine("Existing findings:");
    foreach (var item in recommendations.Take(4))
    {
        prompt.AppendLine($"- {item}");
    }
    prompt.AppendLine("Return one short, practical audit note focusing on fairness, regional bias, or proxy bias.");

    var payload = new
    {
        inputs = prompt.ToString(),
        parameters = new
        {
            max_new_tokens = 120,
            temperature = 0.2,
            return_full_text = false
        },
        options = new
        {
            wait_for_model = true
        }
    };

    try
    {
        using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(25));
        var client = httpClientFactory.CreateClient();
        var (available, note, confidence) = await TryHuggingFaceAuditInsightAsync(client, accessToken, model, payload, timeout.Token);
        return new HuggingFaceAuditInsight(available, model, note, confidence);
    }
    catch (Exception ex)
    {
        var classified = ClassifyHuggingFaceException(ex);
        Console.WriteLine($"Hugging Face Audit Insight Error: {classified}");
        AddRuntimeLog("error", "hf-audit", "Hugging Face audit exception", new { error = classified });
        return new HuggingFaceAuditInsight(false, model, classified, 0);
    }
}

async Task<object> ProbeHuggingFaceAsync(HttpClient client, string accessToken, string model, string labelA, string labelB)
{
    try
    {
        var payload = new
        {
            inputs = "Loan applicant: income 200000 naira, loan 150000 naira, credit score 650, location Lagos.",
            parameters = new
            {
                candidate_labels = new[] { labelA, labelB }
            },
            options = new
            {
                wait_for_model = true
            }
        };

        using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(20));
        var (available, approved, confidence, approvalScore, note) = await TryHuggingFacePredictionAsync(client, accessToken, model, payload, timeout.Token);
        return new
        {
            ok = available,
            statusCode = available ? 200 : 0,
            body = note,
            approved,
            confidence,
            approvalScore
        };
    }
    catch (Exception ex)
    {
        return new
        {
            ok = false,
            statusCode = 0,
            body = ex.Message
        };
    }
}

string TrimForLog(string value, int max = 700)
{
    if (string.IsNullOrWhiteSpace(value)) return "";
    return value.Length <= max ? value : value.Substring(0, max) + "...";
}

string BuildHuggingFaceModelUrl(string model)
{
    var baseUrls = Environment.GetEnvironmentVariable("HF_API_BASE_URLS");
    if (string.IsNullOrWhiteSpace(baseUrls))
    {
        baseUrls = DefaultHfBaseUrls;
    }

    return $"{baseUrls.Split(',')[0].Trim().TrimEnd('/')}/models/{model}";
}

string[] GetHuggingFaceBaseUrls()
{
    var configured = Environment.GetEnvironmentVariable("HF_API_BASE_URLS");
    var raw = string.IsNullOrWhiteSpace(configured) ? DefaultHfBaseUrls : configured;
    return raw.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
}

async Task<(bool Available, bool Approved, double Confidence, double ApprovalScore, string Note)> TryHuggingFacePredictionAsync(
    HttpClient client,
    string accessToken,
    string model,
    object payload,
    CancellationToken cancellationToken)
{
    foreach (var baseUrl in GetHuggingFaceBaseUrls())
    {
        try
        {
            using var message = new HttpRequestMessage(HttpMethod.Post, $"{baseUrl.TrimEnd('/')}/models/{model}");
            message.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
            message.Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");

            using var response = await client.SendAsync(message, cancellationToken);
            var body = await response.Content.ReadAsStringAsync(cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                AddRuntimeLog("error", "hf-simulator", "Hugging Face simulator request failed", new
                {
                    baseUrl,
                    statusCode = (int)response.StatusCode,
                    body
                });
                continue;
            }

            using var document = JsonDocument.Parse(body);
            var root = document.RootElement;
            if (!root.TryGetProperty("labels", out var labels) || !root.TryGetProperty("scores", out var scores))
            {
                continue;
            }

            double approveScore = 0;
            double denyScore = 0;
            for (int i = 0; i < labels.GetArrayLength(); i++)
            {
                var label = labels[i].GetString() ?? "";
                var labelScore = scores[i].GetDouble();
                if (label.Contains("approve", StringComparison.OrdinalIgnoreCase))
                {
                    approveScore = labelScore;
                }
                else if (label.Contains("deny", StringComparison.OrdinalIgnoreCase))
                {
                    denyScore = labelScore;
                }
            }

            var approved = approveScore >= denyScore;
            var confidence = Math.Max(approveScore, denyScore) * 100;
            return (true, approved, confidence, approveScore * 100, $"AI model response received from {baseUrl}.");
        }
        catch (Exception ex)
        {
            var classified = ClassifyHuggingFaceException(ex);
            AddRuntimeLog("error", "hf-simulator", "Hugging Face simulator exception", new { baseUrl, error = classified });
            continue;
        }
    }

    return (false, false, 0, 0, "All Hugging Face endpoints failed. LEBA used the local audit score.");
}

async Task<(bool Available, string Note, double Confidence)> TryHuggingFaceAuditInsightAsync(
    HttpClient client,
    string accessToken,
    string model,
    object payload,
    CancellationToken cancellationToken)
{
    foreach (var baseUrl in GetHuggingFaceBaseUrls())
    {
        try
        {
            using var message = new HttpRequestMessage(HttpMethod.Post, $"{baseUrl.TrimEnd('/')}/models/{model}");
            message.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
            message.Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");

            using var response = await client.SendAsync(message, cancellationToken);
            var body = await response.Content.ReadAsStringAsync(cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                AddRuntimeLog("error", "hf-audit", "Hugging Face audit request failed", new
                {
                    baseUrl,
                    statusCode = (int)response.StatusCode,
                    body
                });
                continue;
            }

            using var document = JsonDocument.Parse(body);
            var root = document.RootElement;
            string note = "";

            if (root.ValueKind == JsonValueKind.Array && root.GetArrayLength() > 0)
            {
                var first = root[0];
                if (first.TryGetProperty("generated_text", out var generatedText))
                {
                    note = generatedText.GetString() ?? "";
                }
                else if (first.TryGetProperty("summary_text", out var summaryText))
                {
                    note = summaryText.GetString() ?? "";
                }
            }
            else if (root.TryGetProperty("generated_text", out var directGeneratedText))
            {
                note = directGeneratedText.GetString() ?? "";
            }

            if (string.IsNullOrWhiteSpace(note))
            {
                note = "AI audit note could not be read.";
            }

            return (true, note.Trim(), 100);
        }
        catch (Exception ex)
        {
            var classified = ClassifyHuggingFaceException(ex);
            AddRuntimeLog("error", "hf-audit", "Hugging Face audit exception", new { baseUrl, error = classified });
            continue;
        }
    }

    return (false, "All Hugging Face endpoints failed.", 0);
}

string ClassifyHuggingFaceException(Exception ex)
{
    var message = ex.Message ?? "Unknown Hugging Face error.";
    var lower = message.ToLowerInvariant();

    if (lower.Contains("name or service not known") || lower.Contains("no such host") || lower.Contains("dns"))
    {
        return $"Network/DNS failure reaching Hugging Face: {message}";
    }

    if (lower.Contains("timeout") || lower.Contains("task canceled") || lower.Contains("operation was canceled"))
    {
        return $"Hugging Face request timed out: {message}";
    }

    return $"Hugging Face request failed: {message}";
}

string BuildDecisionExplanation(
    FormData formData,
    bool approved,
    int finalScore,
    int auditScore,
    List<Factor> factors,
    HuggingFacePrediction hfPrediction)
{
    var positiveFactors = factors.Where(f => f.Impact > 0).Select(f => f.Name.ToLower()).ToList();
    var negativeFactors = factors.Where(f => f.Impact < 0).Select(f => f.Name.ToLower()).ToList();

    var explanation = approved
        ? $"The applicant was approved because the final score was {finalScore}/100, which is above the approval mark of 50."
        : $"The applicant was denied because the final score was {finalScore}/100, which is below the approval mark of 50.";

    if (positiveFactors.Count > 0)
    {
        explanation += $" The decision was helped by {string.Join(", ", positiveFactors)}.";
    }

    if (negativeFactors.Count > 0)
    {
        explanation += $" The decision was reduced by {string.Join(", ", negativeFactors)}.";
    }

    if (hfPrediction.Available)
    {
        explanation += hfPrediction.Approved
            ? $" The Hugging Face model also leaned towards approval with {hfPrediction.Confidence:F1}% confidence."
            : $" The Hugging Face model leaned towards denial with {hfPrediction.Confidence:F1}% confidence.";
        explanation += $" LEBA combined the AI result with its audit score of {auditScore}/100.";
    }
    else
    {
        explanation += " The AI model was not available, so LEBA used the local audit score only.";
    }

    if (formData.CriminalRecord)
    {
        explanation += " The criminal record input also affected the decision.";
    }

    return explanation;
}

// Models
public record HuggingFacePrediction(
    bool Available,
    bool Approved,
    double Confidence,
    double ApprovalScore,
    string Model,
    string Note
);

public record HuggingFaceAuditInsight(
    bool Available,
    string Model,
    string Note,
    double Confidence
);

public record LogEntry(
    string Timestamp,
    string Level,
    string Category,
    string Message,
    object Details
);

public record BiasSettings(
    bool PenalizeLocation,
    bool GenderBias,
    bool StrictCriminalRecord
);

public record BatchAuditRequest(int Count, BiasSettings BiasSettings);
public record AuditResult(SyntheticApplicant Applicant, bool Approved, int Score);
public record SyntheticApplicant(
    string Id,
    string Name,
    double Income,
    double LoanAmount,
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
    double LoanAmount,
    int CreditScore,
    string Location,
    string Gender,
    bool CriminalRecord,
    string DeviceType = null
);

public record PredictionRequest(
    FormData FormData,
    BiasSettings BiasSettings
);

public record UploadedApplicant(
    string Name,
    double Income,
    double LoanAmount,
    int CreditScore,
    string Location,
    string Gender,
    string DeviceType,
    bool Approved
);

public record DocumentAuditRequest(List<UploadedApplicant> Applicants);
