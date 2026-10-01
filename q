[1mdiff --git a/README.md b/README.md[m
[1mindex e8f461b..00a0097 100644[m
[1m--- a/README.md[m
[1m+++ b/README.md[m
[36m@@ -70,7 +70,7 @@[m [mflowchart LR[m
 [m
 - Frontend: React + TypeScript + Vite[m
 - Backend: Node.js + Express + TypeScript[m
[31m-- Banco de dados: PostgreSQL (planejado para uma etapa posterior)[m
[32m+[m[32m- Banco de dados: PostgreSQL 17.11 (Docker Compose no ambiente de desenvolvimento)[m
 - Comunicação em tempo real: Socket.io (planejado para uma etapa posterior)[m
 [m
 ---[m
[36m@@ -100,6 +100,50 @@[m [mAo iniciar o frontend, o Vite mostra a URL local da aplicação.[m
 [m
 ---[m
 [m
[32m+[m[32m## PostgreSQL para desenvolvimento local[m
[32m+[m
[32m+[m[32m### Pré-requisito[m
[32m+[m
[32m+[m[32mDocker com Docker Compose disponível.[m
[32m+[m
[32m+[m[32m### Configuração[m
[32m+[m
[32m+[m[32mCrie o arquivo `.env` local na raiz do projeto com base em [`.env.example`](./.env.example). Defina uma senha local segura para `POSTGRES_PASSWORD`; o arquivo `.env` não é versionado.[m
[32m+[m
[32m+[m[32m### Inicialização[m
[32m+[m
[32m+[m[32m```bash[m
[32m+[m[32mdocker compose up -d[m
[32m+[m[32m```[m
[32m+[m
[32m+[m[32m### Verificação[m
[32m+[m
[32m+[m[32m```bash[m
[32m+[m[32mdocker compose ps[m
[32m+[m[32m```[m
[32m+[m
[32m+[m[32m### Logs[m
[32m+[m
[32m+[m[32m```bash[m
[32m+[m[32mdocker compose logs postgres[m
[32m+[m[32m```[m
[32m+[m
[32m+[m[32m### Encerramento[m
[32m+[m
[32m+[m[32m```bash[m
[32m+[m[32mdocker compose down[m
[32m+[m[32m```[m
[32m+[m
[32m+[m[32m### Reset completo[m
[32m+[m
[32m+[m[32m```bash[m
[32m+[m[32mdocker compose down -v[m
[32m+[m[32m```[m
[32m+[m
[32m+[m[32m`-v` remove o volume e **APAGA os dados locais do PostgreSQL**.[m
[32m+[m
[32m+[m[32m---[m
[32m+[m
 ## 👥 Equipe[m
 [m
 | Nome | Função |[m
