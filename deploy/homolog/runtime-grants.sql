REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT CONNECT ON DATABASE saida_homolog TO si_homolog_runtime;
GRANT USAGE ON SCHEMA public TO si_homolog_runtime;
GRANT SELECT ON "Segmento", "Sala", "Usuario" TO si_homolog_runtime;
GRANT SELECT, INSERT, UPDATE ON "Aluno" TO si_homolog_runtime;
GRANT SELECT, INSERT ON "Liberacao", "Gerenciamento" TO si_homolog_runtime;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO si_homolog_runtime;
REVOKE ALL ON "_prisma_migrations" FROM si_homolog_runtime;
