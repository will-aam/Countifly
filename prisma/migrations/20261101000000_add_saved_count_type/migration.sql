ALTER TABLE "contagens_salvas"
ADD COLUMN "tipo_contagem" VARCHAR(20) NOT NULL DEFAULT 'legacy';

UPDATE "contagens_salvas"
SET "tipo_contagem" = CASE
  WHEN "nome_arquivo" ~* '^\[COUNT_TYPE:(import|audit|team|api|legacy)\]' THEN lower(substring("nome_arquivo" from '^\[COUNT_TYPE:([^]]+)\]'))
  WHEN "nome_arquivo" ~* '^\[IMP\]' THEN 'import'
  WHEN "nome_arquivo" ~* '^\[AUD' THEN 'audit'
  WHEN "nome_arquivo" ~* '_FINAL\.csv$' THEN 'team'
  ELSE 'legacy'
END;

UPDATE "contagens_salvas"
SET "nome_arquivo" = regexp_replace("nome_arquivo", '^\[COUNT_TYPE:(import|audit|team|api|legacy)\][[:space:]]*', '', 'i')
WHERE "nome_arquivo" ~* '^\[COUNT_TYPE:';

UPDATE "contagens_salvas"
SET "nome_arquivo" = regexp_replace("nome_arquivo", '^\[IMP\][[:space:]]*', '', 'i')
WHERE "nome_arquivo" ~* '^\[IMP\]';

UPDATE "contagens_salvas"
SET "nome_arquivo" = regexp_replace("nome_arquivo", '^\[AUD[^]]*\][[:space:]]*', '', 'i')
WHERE "nome_arquivo" ~* '^\[AUD';

UPDATE "contagens_salvas"
SET "nome_arquivo" = regexp_replace("nome_arquivo", '_FINAL\.csv$', '.csv', 'i')
WHERE "nome_arquivo" ~* '_FINAL\.csv$';

CREATE INDEX "contagens_salvas_usuario_id_tipo_contagem_created_at_idx"
ON "contagens_salvas"("usuario_id", "tipo_contagem", "created_at");
