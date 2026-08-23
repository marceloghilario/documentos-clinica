# Documentos Clínica

Aplicação para gestão de documentos e anexos dos pacientes da clínica **Pro
Avanço**. O sistema organiza arquivos por paciente, tipo de documento e
referência (mês/ano ou semestre/ano), mantendo os binários exclusivamente no
Amazon S3.

## Stack

- Backend: Node.js 20, TypeScript, Serverless Framework 3, AWS Lambda,
  API Gateway HTTP API, DynamoDB e S3.
- Frontend: React 19, Vite, React Router 7, Tailwind CSS 4 e Lucide.
- Validação: Zod no backend; validações equivalentes no frontend.

## Estrutura de pastas

```text
backend/
  src/{functions,services,models,utils}
frontend/
  src/{pages,components,services,types,hooks,utils}
```

`services/patientService.ts` e `functions/patients/`, além dos componentes
`components/temp-patients/`, isolam o cadastro temporário de pacientes.

## Como executar

### Backend

```bash
cd backend
npm install
npm run offline
```

O backend usa as credenciais e a região configuradas no ambiente AWS. Para
executar o frontend, copie `frontend/.env.example` para `frontend/.env` e
ajuste a URL da API:

```bash
cd frontend
npm install
npm run dev
```

Variável de ambiente do frontend:

- `VITE_API_URL`: URL base da HTTP API do backend. Stage `dev` já publicado em
  `https://2mkhzotp5a.execute-api.us-east-1.amazonaws.com`.

## INFRAESTRUTURA AWS

O alvo da clínica Pro Avanço é a conta AWS `909569945193`, usando o perfil
`CloudProAvanco` (ou as credenciais equivalentes provisionadas no ambiente).
A região padrão é `us-east-1`. Para fazer o deploy nessa conta:

```bash
AWS_PROFILE=CloudProAvanco npx serverless deploy --stage dev --region us-east-1
```

O backend cria:

- Tabela DynamoDB `${service}-patients-${stage}`, com chave `patientId`.
- Tabela DynamoDB `${service}-documents-${stage}`, com chave `documentId` e
  GSI `patientId-createdAt-index`.
- Bucket S3 `${service}-documents-${stage}-${accountId}`.

O bucket tem CORS para `GET`, `PUT`, `POST` e `HEAD`, expõe `ETag` (necessário
para multipart), bloqueia totalmente o acesso público e permite acesso aos
objetos apenas por URLs presigned. As policies IAM da função restringem
DynamoDB às duas tabelas e seus índices, e S3 aos objetos do bucket, com
operações `s3:PutObject`, `s3:GetObject` e `s3:DeleteObject`. O fluxo
multipart utiliza `s3:PutObject` para iniciar, enviar e concluir o upload,
sem permissões adicionais de listagem ou aborto de multipart.

## Modelo de dados

Um `Patient` temporário possui `patientId`, `nome`, `cpf`, `dataNascimento`,
`responsavel`, `telefone` e `createdAt`. Um `Document` possui
`documentId`, `patientId`, `tipo`, referências opcionais conforme o tipo,
`especialidade`, `fileName`, `s3Key`, `size`, `contentType` e `createdAt`.
Nenhum binário ou base64 é armazenado no DynamoDB.

## Endpoints

Todos os endpoints retornam `{ success, data }` em caso de sucesso e
`{ success, error }` em caso de erro.

| Método | Endpoint                                                    | Descrição                         |
| ------ | ----------------------------------------------------------- | --------------------------------- |
| POST   | `/patients`                                                 | Cria paciente temporário          |
| GET    | `/patients`                                                 | Lista pacientes                   |
| GET    | `/patients/{patientId}`                                     | Busca paciente                    |
| DELETE | `/patients/{patientId}`                                     | Exclui paciente sem documentos    |
| GET    | `/patients/{patientId}/documents`                           | Lista documentos e URLs presigned |
| POST   | `/patients/{patientId}/documents/upload-url`                | Gera URL PUT ou URLs multipart    |
| POST   | `/patients/{patientId}/documents/multipart/complete`        | Finaliza multipart                |
| POST   | `/patients/{patientId}/documents`                           | Salva metadados após upload       |
| GET    | `/patients/{patientId}/documents/{documentId}/download-url` | Gera URL de download              |
| DELETE | `/patients/{patientId}/documents/{documentId}`              | Exclui objeto e metadados         |

## Regras de validação por tipo de documento

| Tipo              | Campos obrigatórios           | Campos permitidos              |
| ----------------- | ----------------------------- | ------------------------------ |
| Nota Fiscal       | mês e ano                     | mês e ano                      |
| Lista de Presença | mês e ano                     | mês e ano                      |
| PEI               | semestre e ano                | semestre e ano                 |
| Relatórios        | semestre, ano e especialidade | especialidade em lista oficial |
| Outros            | nenhum                        | mês e ano opcionais            |

O ano deve ser inteiro entre 2000 e 2100, o mês entre 1 e 12 e o semestre 1
ou 2. Campos incoerentes com o tipo são rejeitados.

## Como adicionar uma especialidade

Adicione o nome à constante `SPECIALTIES` em
`backend/src/models/specialties.ts` e à constante equivalente em
`frontend/src/utils/specialties.ts`. As duas listas precisam permanecer
idênticas; o backend é a validação definitiva.

## Limitações e TODOs

- **TEMPORÁRIO: cadastro de pacientes será substituído pela integração com o
  sistema de pacientes.** Os arquivos e componentes do cadastro temporário
  estão isolados para facilitar a substituição.
- O CPF aceita 11 dígitos com ou sem máscara, mas a validação do dígito
  verificador é um TODO.
- Este MVP **não possui autenticação**: os endpoints são públicos. Adicionar
  autenticação e autorização antes do uso em produção é um TODO.
