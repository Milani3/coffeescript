# ─────────────────────────────────────────────────────────────────────────────
# Stage 1: Build the React / Vite Frontend
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend

# Install dependencies first (better layer caching)
COPY frontend/package*.json ./
RUN npm install --no-audit

# Declare Vite build-time environment variables.
# Render forwards matching env vars as Docker --build-arg automatically.
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY

# Make them available to the Vite build process
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY

COPY frontend/ ./
RUN npm run build

# ─────────────────────────────────────────────────────────────────────────────
# Stage 2: Build the ASP.NET Core Backend
# ─────────────────────────────────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS backend-build
WORKDIR /app

# Restore NuGet packages (layer cached separately for speed)
COPY LebaBackend.csproj ./
RUN dotnet restore --nologo

# Copy source and publish a Release build
COPY . ./
RUN dotnet publish LebaBackend.csproj -c Release -o /app/out --nologo

# ─────────────────────────────────────────────────────────────────────────────
# Stage 3: Final Runtime Image
# ─────────────────────────────────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app

# Copy compiled backend
COPY --from=backend-build /app/out .

# Copy the Vite-built frontend so ASP.NET Core can serve it as static files
COPY --from=frontend-build /app/frontend/dist ./frontend/dist

# Render assigns a dynamic PORT env var — ASP.NET Core must listen on it.
# Fallback to 8080 for local Docker testing.
ENV ASPNETCORE_URLS=http://+:${PORT:-8080}
EXPOSE 8080

ENTRYPOINT ["dotnet", "LebaBackend.dll"]
