-- Adicionar campo is_portfolio para indicar se aluno foi fidelizado na carteira
-- true = aluno está na carteira do professor (fidelizado)
-- false = aluno veio da plataforma mas ainda não foi fidelizado

ALTER TABLE "teacher_students" 
ADD COLUMN IF NOT EXISTS "is_portfolio" BOOLEAN DEFAULT false;

-- Alunos cadastrados manualmente (MANUAL) são automaticamente da carteira
UPDATE "teacher_students" SET is_portfolio = true WHERE source = 'MANUAL';

-- Alunos da plataforma começam como não-fidelizados
UPDATE "teacher_students" SET is_portfolio = false WHERE source = 'PLATFORM' AND is_portfolio IS NULL;

-- Index para filtrar por carteira
CREATE INDEX IF NOT EXISTS "teacher_students_is_portfolio_idx" ON "teacher_students"("is_portfolio");
