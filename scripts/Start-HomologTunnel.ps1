#requires -Version 7.2
[CmdletBinding()]
param(
    [Parameter(Mandatory)][ValidateNotNullOrEmpty()][string[]]$AllowedEmail,
    [ValidateRange(1024,65535)][int]$Port = 8080
)
$ErrorActionPreference = 'Stop'
$cloudflared = (Get-Command cloudflared -ErrorAction Stop).Source
foreach ($email in $AllowedEmail) {
    try { $address = [System.Net.Mail.MailAddress]::new($email) } catch { throw 'Use somente endereços de e-mail individuais válidos.' }
    if ($address.Address -cne $email -or $email.Contains('*') -or $email.Contains(',')) { throw 'Não use curingas, domínios inteiros ou listas dentro de um único endereço.' }
}
foreach ($name in @('config.yml', 'config.yaml')) {
    if (Test-Path (Join-Path $HOME ".cloudflared/$name")) { throw 'Há uma configuração cloudflared existente. Preserve-a e consulte a documentação de Quick Tunnels antes de continuar.' }
}
$help = (& $cloudflared tunnel --help 2>&1 | Out-String)
if ($LASTEXITCODE -ne 0 -or $help -notmatch '--allowed-mail') {
    throw 'Este cloudflared não confirma suporte a --allowed-mail. Atualize pela fonte oficial. Não inicie um túnel sem a restrição por e-mail.'
}
$arguments = @('tunnel', '--url', "http://127.0.0.1:$Port")
foreach ($email in $AllowedEmail) { $arguments += @('--allowed-mail', $email) }
Write-Host 'Iniciando Quick Tunnel com lista explícita de e-mails. Mantenha este terminal aberto; Ctrl+C encerra o acesso remoto.'
& $cloudflared @arguments
if ($LASTEXITCODE -ne 0) { throw 'cloudflared terminou com erro; não remova a restrição por e-mail para contornar a falha.' }
