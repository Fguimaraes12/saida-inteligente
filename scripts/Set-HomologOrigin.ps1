#requires -Version 7.2
[CmdletBinding()]
param([Parameter(Mandatory)][string]$Origin)
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$envFile = Join-Path $root '.env.homolog'
if ($Origin -cnotmatch '^https://[a-z0-9]+(?:-[a-z0-9]+)*\.trycloudflare\.com$') {
    throw 'Informe exatamente https://nome.trycloudflare.com, sem barra final, caminho ou porta.'
}
if (!(Test-Path $envFile)) { throw 'Execute Initialize-Homolog.ps1 primeiro.' }
$uri = [Uri]$Origin
$updates = @{
    FRONTEND_ORIGIN = $Origin
    PUBLIC_HOST = $uri.Host
    PUBLIC_WS_ORIGIN = "wss://$($uri.Host)"
}
$lines = [IO.File]::ReadAllLines($envFile)
foreach ($key in $updates.Keys) {
    $matchingLines = @($lines | Where-Object { $_ -match "^$key=" })
    if ($matchingLines.Count -ne 1) { throw "Variável $key ausente ou repetida no arquivo privado." }
    $lines = @($lines | ForEach-Object { if ($_ -match "^$key=") { "$key=$($updates[$key])" } else { $_ } })
}
[IO.File]::WriteAllLines($envFile, $lines, [Text.UTF8Encoding]::new($false))
Write-Host 'Origem, host do Nginx e WebSocket atualizados. Recrie backend/proxy conforme o guia; o túnel não foi iniciado por este script.'
