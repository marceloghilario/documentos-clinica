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

Variáveis de ambiente do frontend:

- `VITE_API_URL`: URL base da HTTP API do backend. Stage `dev` já publicado em
  `https://2mkhzotp5a.execute-api.us-east-1.amazonaws.com`.
- `VITE_FINANCEIRO_API_URL`: URL base da API do sistema financeiro, usada para
  listar os pacientes já cadastrados lá. O padrão é `/api`, que funciona quando
  os dois apps são servidos pelo mesmo domínio
  (`https://adm-proavanco.com.br`). Em outros hosts, use a URL absoluta
  `https://adm-proavanco.com.br/api`.

## Integração com os pacientes do financeiro

A lista oficial de pacientes vem do sistema financeiro
(`GET /api/patients`), que exige token JWT. O botão **Paciente do financeiro**
pede e-mail e senha do próprio sistema financeiro (`POST /api/auth/login`),
guarda o token no `localStorage` (`documentos.financeiro.token`) e exibe um
combo com os pacientes cadastrados. Ao vincular um paciente, o backend de
documentos grava uma cópia mínima (nome, CPF e convênio) via
`POST /patients/import`, usando `patientId = fin-<id do financeiro>` e
`origem = FINANCEIRO`; a operação é idempotente, então vincular o mesmo
paciente novamente apenas atualiza os dados. Os documentos continuam sendo
gravados sob esse `patientId`.

O cadastro manual (`origem = MANUAL`) permanece disponível como fallback
temporário e não depende do financeiro.

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

O frontend é publicado no bucket S3
`documentos-clinica-frontend-${stage}-${accountId}`, criado pela mesma stack.
Esse bucket usa hospedagem estática com `index.html` como documento inicial e
de erro, permitindo o fallback das rotas do React Router. Os quatro bloqueios
de acesso público ficam desativados somente nesse bucket, que possui uma
política pública exclusivamente para leitura (`s3:GetObject`). O bucket de
documentos permanece privado e não é exposto pelo CloudFront.

Para gerar e publicar o frontend:

```bash
cd frontend
VITE_API_URL=https://2mkhzotp5a.execute-api.us-east-1.amazonaws.com npm run build
AWS_ACCESS_KEY_ID="$CLOUDPROAVANCO_AWS_ACCESS_KEY_ID" \
AWS_SECRET_ACCESS_KEY="$CLOUDPROAVANCO_AWS_SECRET_ACCESS_KEY" \
AWS_REGION=us-east-1 \
aws s3 sync dist/ \
  s3://documentos-clinica-frontend-dev-909569945193 \
  --delete
AWS_ACCESS_KEY_ID="$CLOUDPROAVANCO_AWS_ACCESS_KEY_ID" \
AWS_SECRET_ACCESS_KEY="$CLOUDPROAVANCO_AWS_SECRET_ACCESS_KEY" \
AWS_REGION=us-east-1 \
aws cloudfront create-invalidation \
  --distribution-id E3SSHNETHE3D0V \
  --paths "/*"
```

O build acima usa a raiz (`/`) por padrão e continua sendo o build usado no
bucket S3/CloudFront. Para publicar o mesmo frontend sob o prefixo
`/documentos/` no Nginx, use:

```bash
cd frontend
VITE_BASE_PATH=/documentos/ \
VITE_API_URL=https://2mkhzotp5a.execute-api.us-east-1.amazonaws.com \
npm run build
```

O `VITE_BASE_PATH` altera somente o caminho público dos assets. As rotas do
aplicativo já usam o prefixo `/documentos`, portanto o router não utiliza
`basename`.

## URL de produção

A aplicação está publicada em:

```text
https://adm-proavanco.com.br/documentos/
```

O domínio é servido por Nginx na instância EC2 `clinica-backend`
(`i-07649d556b914c0fd`, região `sa-east-1`, conta `909569945193`), no arquivo
`/etc/nginx/sites-available/clinica`. O build estático fica em
`/var/www/documentos` e é servido por:

```nginx
location /documentos/ {
    alias /var/www/documentos/;
    try_files $uri $uri/ /documentos/index.html;
}

location = /documentos {
    return 301 /documentos/;
}
```

O acesso à instância é feito por EC2 Instance Connect com o usuário IAM
`devin-deploy`. Para publicar uma nova versão, gere o build com
`VITE_BASE_PATH=/documentos/`, envie o pacote para o bucket do frontend e baixe
na instância por URL presigned:

```bash
cd frontend
VITE_BASE_PATH=/documentos/ \
VITE_API_URL=https://2mkhzotp5a.execute-api.us-east-1.amazonaws.com \
npm run build
tar czf /tmp/documentos-dist.tgz -C dist .
aws s3 cp /tmp/documentos-dist.tgz \
  s3://documentos-clinica-frontend-dev-909569945193/deploy/documentos-dist.tgz \
  --region us-east-1
URL=$(aws s3 presign \
  s3://documentos-clinica-frontend-dev-909569945193/deploy/documentos-dist.tgz \
  --region us-east-1 --expires-in 1200)
aws ec2-instance-connect send-ssh-public-key --region sa-east-1 \
  --instance-id i-07649d556b914c0fd --instance-os-user ubuntu \
  --availability-zone sa-east-1a --ssh-public-key "file://$HOME/.ssh/eic_key.pub"
ssh -i ~/.ssh/eic_key ubuntu@52.67.138.187 "
  curl -fsS -o /tmp/documentos-dist.tgz '$URL'
  sudo rm -rf /var/www/documentos/*
  sudo tar xzf /tmp/documentos-dist.tgz -C /var/www/documentos
  sudo chown -R www-data:www-data /var/www/documentos"
```

O Nginx serve arquivos estáticos, portanto não é necessário recarregá-lo após
uma nova publicação do build.

Depois de publicar no bucket S3, invalide o cache da distribuição CloudFront
para que os novos assets sejam disponibilizados imediatamente. A distribuição
segue disponível como acesso alternativo:

```text
https://d1eai4tokv4mjy.cloudfront.net
```

A distribuição `E3SSHNETHE3D0V` usa como origem customizada o endpoint website
HTTP do bucket S3 e redireciona HTTP para HTTPS. Os erros `403` e `404` são
configurados para servir `/index.html` com status `200`, permitindo o
funcionamento correto das rotas profundas do React Router.

O endpoint website S3 continua disponível como origem e fallback:

```text
http://documentos-clinica-frontend-dev-909569945193.s3-website-us-east-1.amazonaws.com
```

Ao acessar diretamente o endpoint S3, rotas profundas continuam retornando
status HTTP `404`, embora o `ErrorDocument` entregue o `index.html` no corpo e
o aplicativo funcione normalmente. Essa limitação não se aplica ao endpoint
CloudFront, que converte esses erros para status `200`.

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
| POST   | `/patients/import`                                          | Vincula paciente do financeiro    |
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
