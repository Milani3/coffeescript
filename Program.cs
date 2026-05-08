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

// Serve frontend static files
app.UseDefaultFiles();
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new Microsoft.Extensions.FileProviders.PhysicalFileProvider(
        Path.Combine(builder.Environment.ContentRootPath, "frontend", "dist")),
    RequestPath = ""
});

// Routes
app.MapGet("/", () => Results.Ok(new { message = "LEBA API is active (C# Edition)" }));

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

app.MapFallbackToFile("index.html", new StaticFileOptions
{
    FileProvider = new Microsoft.Extensions.FileProviders.PhysicalFileProvider(
        Path.Combine(builder.Environment.ContentRootPath, "frontend", "dist"))
});

app.Run();

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
