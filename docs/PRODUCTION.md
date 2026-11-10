# Ambiente e operação — candidato v0.1.0

Este é um roteiro para uma implantação futura autorizada, não o registro de um deploy realizado. Em 05/11/2026 a validação oficial passou e o MVP está **APTO PARA HOMOLOGAÇÃO com dados sintéticos**; resultados em MVP_PROGRESS.md. A publicação em produção continua bloqueada pelos gates operacionais e de credenciais reais. Para Windows/Docker Desktop e Quick Tunnel temporário protegido por e-mail, use [HOMOLOGATION.md](HOMOLOGATION.md); o servidor definitivo será o da escola.

## Topologia suportada

Um host com Node.js 22.12 ou 24+, backend Express, frontend compilado servido pelo Nginx e PostgreSQL 17 em rede privada. O navegador usa uma única origem HTTPS; Nginx remove `/api` ao encaminhar REST e preserva `/socket.io/` com upgrade WebSocket. Não usar Vite dev/preview como servidor de produção. Não expor a porta do backend nem PostgreSQL à Internet.

Arquivos de referência:

- `deploy/backend.env.example`: variáveis do serviço, sem senha de bootstrap.
- `deploy/nginx.conf.example`: configuração completa de proxy, TLS, SPA, headers e limite no login. Adaptar à configuração Nginx existente; não sobrescrevê-la cegamente.
- `deploy/saida-inteligente.service.example`: processo Node não privilegiado com encerramento SIGTERM. Ajustar o caminho de Node à instalação do host.
- `compose.yaml`: somente PostgreSQL de desenvolvimento. A porta agora é vinculada a `127.0.0.1`; aplicar essa mudança em containers existentes exige recriação com `docker compose up -d --wait`, preservando o volume. Não representa configuração de banco de produção.

## Variáveis e segredos

| Variável | Produção |
| --- | --- |
| NODE_ENV | `production`, obrigatória na definição do serviço |
| PORT | 3000 no exemplo; acesso permitido somente pelo proxy/firewall local |
| DATABASE_URL | PostgreSQL privado, credencial do papel de runtime; senha codificada na URL. Usar TLS com validação do certificado se o banco estiver em outro host. |
| JWT_SECRET | Aleatório, exclusivo, com pelo menos 32 caracteres; gerar em gerenciador de segredos e injetar no serviço |
| JWT_EXPIRES_IN | Padrão 8h; usar uma duração curta adequada à operação, como 8h |
| FRONTEND_ORIGIN | Origem HTTPS explícita, sem caminho/barra final, por exemplo `https://app.escola.example`; ausência, HTTP e valores inválidos impedem inicialização em produção |
| APP_TIMEZONE | `America/Sao_Paulo` no exemplo; conferir o dia escolar com a escola |
| SEED_DEFAULT_PASSWORD | **Ausente no serviço de produção.** Somente desenvolvimento e fixtures sintéticas |

Não imprimir ambiente, DSNs, cookies, JWT, hashes ou senhas. Arquivos de segredos devem ter permissão 0600 e acesso somente ao administrador/serviço necessário. Não colocar segredos em parâmetros de CLI, `.env.example`, arquivos versionados, variáveis `VITE_*`, imagens ou artefatos públicos. Não transportar a configuração local desta máquina para uma escola.

## Banco e credenciais iniciais

Separar a credencial que aplica migrations da credencial do runtime. O runtime não deve ser superusuário, proprietário do banco, nem ter CREATEDB/CREATEROLE. O usuário dos testes precisa de CREATEDB, exclusivamente no ambiente de testes.

Depois das migrations, o DBA pode conceder ao papel de runtime somente USAGE no schema, SELECT em Segmento/Sala/Usuario, SELECT/INSERT/UPDATE em Aluno e SELECT/INSERT em Liberacao/Gerenciamento, além de USAGE/SELECT nas sequências necessárias. Não conceder DELETE/TRUNCATE, ALTER, CREATE ou acesso ao histórico de migrations ao serviço. Reaplicar/revisar grants em migrations futuras. Limitar pg_hba.conf/firewall à rede da aplicação e usar autenticação SCRAM; não usar `trust` ou 0.0.0.0/0.

O seed existente é bloqueado em produção e cria 22 contas com uma única senha apenas para desenvolvimento. Ele preserva hashes existentes; trocar SEED_DEFAULT_PASSWORD não troca senhas. **Antes de dados reais falta um procedimento autorizado e validado para criar os segmentos/salas e provisionar uma senha exclusiva por conta, armazenada com Argon2id, sem a senha compartilhada.** Esta tarefa não criou uma nova funcionalidade de gestão de credenciais. A escola deve definir responsáveis pelas contas e entrega segura de cada senha. Não basta reutilizar o banco de desenvolvimento nem remover a variável depois de executar o seed: as contas continuariam com a senha antiga.

## Build e deploy futuro

1. Conferir os passes padrão registrados em MVP_PROGRESS.md e os gates operacionais ainda pendentes. Revisar o diff/commits e aprovar a integração futura em develop. Não há autorização atual para push, merge ou publicação.
2. Preparar um checkout/release revisado em `/srv/saida-inteligente` e instalar dependências a partir dos lockfiles, com Node compatível. Para o job de build/migration, injetar DATABASE_URL de migration pelo mecanismo seguro do ambiente. O download de Prisma exige `binaries.prisma.sh`; manter TLS e checksum ativos.

   ```bash
   cd /srv/saida-inteligente/backend
   npm ci
   npm run prisma:generate
   npm run prisma:validate
   npm run prisma:migrate:deploy
   npm run build
   cd ../frontend
   npm ci
   umask 022
   npm run build
   ```

3. O usuário do Nginx precisa de leitura/travessia somente dos artefatos públicos `frontend/dist` (diretórios 0755, arquivos 0644). Um umask privado pode gerar 0700/0600 e causar erro 500 no fallback SPA; ajustar somente os artefatos públicos, sem ampliar permissões de `.env`, backups ou chaves. Remover dependências de desenvolvimento apenas depois do build; conferir o runtime do Prisma no artefato gerado.
4. Provisionar as credenciais individuais e os grants restritos do banco. Instalar o arquivo de ambiente protegido do runtime; ele usa DATABASE_URL de runtime, não a credencial de migration. Não executar seed em produção.
5. Instalar certificado válido para o domínio real, configurar renovação/alerta de expiração e testar HTTPS. Adaptar os exemplos de Nginx/systemd ao host. O exemplo deve servir o frontend e a API na mesma origem, habilitar upgrade WebSocket, redirecionar HTTP e emitir HttpOnly/Secure/SameSite=Lax. Nenhum ajuste de `trust proxy` é necessário para o cookie: Secure vem de NODE_ENV. Sites distintos não são suportados por este roteiro.
6. Conferir `nginx -t`, iniciar/reiniciar somente os serviços da implantação autorizada e verificar saúde, autenticação dos três perfis, Sala Geral, isolamento e reconexão na rede real. Validar rate limit do login considerando o NAT da escola (exemplo: 5/min por IP, burst 20); não expor diretamente o backend para contornar esse limite.
7. Registrar versão implantada, responsável, resultado, backup pré-migration e plano de retorno. Não reverter schema por `db push`, reset ou edição de migrations; se houver incompatibilidade, parar escritas e restaurar backup em banco novo ou aplicar migration corretiva revisada. Manter a versão anterior dos artefatos para retorno somente se compatível com o schema atual.

## Backup e restauração

O volume Docker não é backup. Definir e testar com a escola RPO/RTO, responsáveis, retenção, criptografia, cópia fora do host e alertas de falha. Como ponto de partida para revisão: backup diário, RPO de até 24h e um ensaio de restauração com RTO medido; esses objetivos ainda não foram aprovados/validados operacionalmente.

Usar um serviço/perfil libpq protegido, por exemplo `PGSERVICE=saida_backup`, com credencial restrita ao backup; não inserir senha na linha de comando. Exemplo operacional a adaptar:

```bash
umask 077
PGSERVICE=saida_backup pg_dump -Fc --no-owner --no-acl --file /var/backups/saida-inteligente/backup.dump
```

Proteger o arquivo e copiá-lo por canal criptografado a armazenamento externo criptografado com retenção aprovada. Não deixar backups no checkout, dist, diretório servido pelo Nginx ou logs. O dump contém dados pessoais e hashes. Guardar configuração de papéis/grants e os segredos separadamente; `--no-owner --no-acl` não restaura esses privilégios.

Ensaiar em banco **novo e isolado**, sem `--clean` sobre produção:

```bash
PGSERVICE=saida_restore_admin createdb saida_restore
PGSERVICE=saida_restore_admin pg_restore --exit-on-error --no-owner --no-acl --dbname=saida_restore /caminho/protegido/backup.dump
```

Reaplicar os grants, comparar contagens, FKs/uniqueness, histórico/checksums de migrations e autenticação, sem imprimir hashes/senhas. Medir duração e registrar a evidência. Nesta tarefa foi testado dump/restauração **local de dados sintéticos**, com 4 segmentos, 16 salas, 22 contas e constraints. Não foram configurados agendamento, armazenamento externo, criptografia de backup ou recuperação de desastre da escola.

## Logs e monitoramento

O backend sanitiza erros inesperados, falhas de seed e de encerramento; não registrar request bodies, headers de autenticação, cookies ou SQL parametrizado. Nginx usa formato de access log sem query string/cookie/body; restringir também os error logs, que podem conter dados da requisição. Definir acesso e retenção com a escola. O exemplo de serviço envia stdout/stderr ao journal; rotação/retencão dependem do host.

`GET /health` é liveness e não garante disponibilidade contínua do banco. Monitorar também PostgreSQL, espaço em disco, backups, certificado, erros HTTP e falhas/reconexões Socket.io. Não foi validado um serviço real de monitoramento/alerta.

## Validação e limite da evidência atual

Scripts padrão em backend:

```bash
npm run prisma:generate
npm run prisma:validate
npm run prisma:migrate:deploy
npm run build
npm run test:config
npm test
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e
```

`npm test` e `test:e2e` criam seus próprios bancos temporários; apontar DATABASE_URL para PostgreSQL de validação, nunca produção. Não há mais hook PRISMA_MIGRATION_RUNNER. Os comandos convencionais passaram em 05/11/2026 após a liberação efetiva do domínio, sem engine alternativo, mirror ou verificação desativada. Isso não substitui homologação na rede da escola.

`npm run test:production` é um smoke independente do **proxy local**, não o E2E do MVP: requer Nginx/TLS de teste, backend iniciado por `npm start` com NODE_ENV=production, banco isolado preparado com contas sintéticas e origem `.test`. O teste força a resolução ao loopback e valida o certificado com a CA fornecida. Exemplo após preparar essa fixture:

```bash
PRODUCTION_TEST_ORIGIN=https://app.escola.test:58443 \
PRODUCTION_TEST_CA=/caminho/protegido/tls.crt \
npm run test:production
```

As senhas sintéticas são injetadas só no processo de teste via `PRODUCTION_TEST_MANAGER_PASSWORD` e `PRODUCTION_TEST_ROOM_PASSWORD`; o fallback `SEED_DEFAULT_PASSWORD` preserva a fixture antiga, nunca o serviço. A fixture histórica de 04/11 usou cópia **apenas do schema** de desenvolvimento para checagens independentes; a validação oficial de 05/11 aplicou migrations em banco vazio. O systemd, certificado público, restauração externa, credenciais individuais reais e operação da escola ainda precisam de validação.
