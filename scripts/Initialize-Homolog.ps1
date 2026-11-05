#requires -Version 7.2
[CmdletBinding()]
param()
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$envFile = Join-Path $root '.env.homolog'
$privateDir = Join-Path $root 'deploy/homolog/private'
if (Test-Path $envFile) { throw '.env.homolog já existe. Não sobrescreva os segredos de um volume existente.' }
if (Test-Path (Join-Path $privateDir 'credentials.json')) { throw 'Já existem credenciais privadas. Preserve o par volume/credenciais ou siga a limpeza sintética.' }
function New-HomologSecret {
    $bytes = [byte[]]::new(32)
    [System.Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
    return [Convert]::ToHexString($bytes).ToLowerInvariant()
}
$lines = @(
    "POSTGRES_PASSWORD=$(New-HomologSecret)"
    "POSTGRES_RUNTIME_PASSWORD=$(New-HomologSecret)"
    "JWT_SECRET=$(New-HomologSecret)"
    'HOMOLOG_HTTP_PORT=8080'
    'FRONTEND_ORIGIN=https://pending.invalid'
    'PUBLIC_HOST=pending.invalid'
    'PUBLIC_WS_ORIGIN=wss://pending.invalid'
)
New-Item -ItemType Directory -Path $privateDir -Force | Out-Null
[IO.File]::WriteAllLines($envFile, $lines, [Text.UTF8Encoding]::new($false))
if ($IsWindows) {
    # Retira herança somente dos arquivos privados deste ambiente.
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent().Name
    & icacls.exe $envFile /inheritance:r /grant:r "${identity}:(F)" | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'Não foi possível proteger .env.homolog com ACL.' }
    & icacls.exe $privateDir /inheritance:r /grant:r "${identity}:(OI)(CI)F" | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'Não foi possível proteger a pasta privada com ACL.' }
}
Write-Host 'Ambiente sintético inicializado, sem exibir segredos. Leia docs/HOMOLOGATION.md antes de iniciar o túnel.'
