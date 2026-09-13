param([int]$Port = 8001)

$ErrorActionPreference = 'Stop'
$base = "http://127.0.0.1:$Port"
$payload = @{ request_id = 'smoke-test'; text = 'A calm message for the API smoke test.' } | ConvertTo-Json
$serverProcess = $null
$startedHere = $false

try {
    $existing = Get-NetTCPConnection -LocalAddress '127.0.0.1' -LocalPort $Port -State Listen -ErrorAction SilentlyContinue

    if ($null -eq $existing) {
        $python = Join-Path $PSScriptRoot '.venv\Scripts\python.exe'
        if (-not (Test-Path -LiteralPath $python)) {
            $python = (Get-Command python -ErrorAction Stop).Source
        }

        $serverProcess = Start-Process -FilePath $python `
            -ArgumentList @('-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', "$Port") `
            -WorkingDirectory $PSScriptRoot -PassThru -WindowStyle Hidden
        $startedHere = $true
    }

    $ready = $false
    for ($attempt = 1; $attempt -le 180; $attempt++) {
        try {
            $health = Invoke-RestMethod -Uri "$base/health" -Method Get -TimeoutSec 2
            if ($health.status -eq 'ok') {
                $ready = $true
                break
            }
        } catch {
            Start-Sleep -Seconds 1
        }
    }

    if (-not $ready) {
        throw "API did not become ready at $base within 180 seconds."
    }

    $response = Invoke-RestMethod -Uri "$base/predict" -Method Post `
        -ContentType 'application/json' -Body $payload -TimeoutSec 30

    if ($response.status_code -ne 200) {
        throw "Unexpected API status_code: $($response.status_code)"
    }
    if ($null -eq $response.confidence -or $null -eq $response.sentiment) {
        throw 'Response contract is incomplete.'
    }

    Write-Output "FastAPI smoke test passed at $base."
} finally {
    if ($startedHere -and $null -ne $serverProcess -and -not $serverProcess.HasExited) {
        Stop-Process -Id $serverProcess.Id -Force -ErrorAction SilentlyContinue
    }
}
