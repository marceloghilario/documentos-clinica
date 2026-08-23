---
name: testing-frontend
description: How to run and end-to-end test the Documentos Clínica React frontend against the deployed serverless AWS backend (patients + document upload/download/delete).
---

# Testing the Documentos Clínica frontend

## Start the app

```bash
cd frontend
echo 'VITE_API_URL=<HTTP API base URL>' > .env   # e.g. https://<id>.execute-api.us-east-1.amazonaws.com
npm install && npm run dev                       # serves on http://localhost:5173
```

`frontend/src/utils/constants.ts` reads `VITE_API_URL`; if it is missing, every request fails with the
toast "API URL não configurada. Defina VITE_API_URL no .env." — always check `.env` first when the
list shows an error toast instead of data.

Sanity-check the API and CORS before touching the UI (the API allows `Access-Control-Allow-Origin: *`,
so `localhost:5173` works without a proxy):

```bash
curl -s <API>/patients            # -> {"success":true,"data":[...]}
```

There is **no authentication** in this version, so no login step is needed.

## UI paths

- `/` redirects to `/documentos` (patient list). "Inserir paciente" opens the create modal.
- `/documentos/:patientId` is the detail page with 5 tabs: Nota Fiscal, Lista de Presença, PEI,
  Relatórios, Outros. Each tab badge shows the document count for that `tipo`.
- The upload form is remounted per tab via `key={active}`, so switching tabs resets all fields.
  Conditional fields (see `components/DocumentUploadForm.tsx`): Mês for NOTA_FISCAL/LISTA_PRESENCA/OUTROS,
  Semestre for PEI/RELATORIOS, Especialidade only for RELATORIOS, Ano always.
- Client-side validation messages are toasts, not inline errors: "Mês e ano são obrigatórios.",
  "Semestre e ano são obrigatórios.", "Especialidade é obrigatória para relatórios.", "Selecione um arquivo."

## Selecting a file for upload

The file input is a plain `<input type="file">`. With computer-use: click the input, then in the
native GTK file chooser press `ctrl+l` and type the absolute path followed by Enter. Create small
fixtures with unique content so you can prove the downloaded bytes match:

```bash
printf 'unique marker ABC123\n' > /tmp/upload-fixture.txt
```

## Verifying upload / download

Upload is a 2-step flow: `POST /patients/:id/documents/upload-url` → presigned `PUT` to S3 →
`POST /patients/:id/documents` (metadata). Success shows the toast "Documento enviado com sucesso."

"Baixar" calls `/download-url` and `window.open`s a presigned URL whose
`response-content-disposition` is `attachment`, so the browser **downloads** the file rather than
rendering it. Verify content from the shell and, for visual proof, open the downloaded file:

```bash
diff ~/Downloads/upload-fixture.txt /tmp/upload-fixture.txt && echo IDENTICAL
# then browse to file:///home/ubuntu/Downloads/upload-fixture.txt for an on-screen screenshot
```

## Deletion order matters (cleanup)

The backend **refuses** to delete a patient that still has documents:
`{"success":false,"error":"Não é possível excluir paciente que possui documentos"}`.
Always delete every document (trash icon on each row, `window.confirm` dialog) across **all tabs**
before clicking "Excluir paciente". Both deletes use native `confirm()` dialogs, so accept them by
clicking OK in the browser dialog.

Confirm cleanup afterwards:

```bash
curl -s <API>/patients                        # -> data: []
curl -s <API>/patients/<id>                   # -> 404 / "Paciente não encontrado"
```

## Known issues / gotchas

- **Post-upload list refresh is optimistic, not a refetch** (since commit `680ad81`). `POST /documents`
  returns the created `Document` (WITHOUT a `downloadUrl` — only the `list` endpoint enriches items with
  one), `DocumentUploadForm` passes it up via `onUploaded(createdDocument)`, and `PatientDetail`
  prepends it to local state, deduping by `documentId`, then fetches the `downloadUrl` in the
  background with an on-demand fallback in the "Baixar" handler. This exists because the backend list
  query hits an eventually-consistent DynamoDB GSI, so an immediate refetch could miss the new item
  (that was the old bug: badge stuck at 0 and "Nenhum anexo nesta categoria." right after a successful
  upload). When testing this area, assert the row/badge appear **without any reload**, and separately
  assert that a download clicked immediately after the upload still works — that path depends on the
  background URL fetch or the fallback, so it can regress independently. If a row ever fails to appear,
  re-check the API with curl before reporting data loss; if it appears twice, suspect the dedup key.
- **CPF is masked for display only.** `frontend/src/utils/cpf.ts` provides
  `normalizeCpf`/`formatCpf`/`isValidCpf`; the input live-masks to `000.000.000-00` (`maxLength={14}`)
  and `PatientTable`/`PatientDetail` render `formatCpf(patient.cpf)`, while the value POSTed and stored
  is digits only. So type raw digits (`39053344705`) to prove the mask, and expect the API to return
  `"cpf":"39053344705"` — a formatted value in the API response would be the bug, not the fix.
  Note `isValidCpf` only checks for 11 digits; it does NOT verify the CPF check digits, so any 11-digit
  string passes validation.
- Sizes under 1 MB render as `0 KB` (`formatSize` rounds), and the file label shows `(0.0 MB)`.
  That is expected for tiny fixtures, not a bug.
- Multipart upload only triggers above 50 MB (`MAX_SINGLE`), so normal fixtures exercise the
  single-PUT path only.

## Devin Secrets Needed

- None for frontend testing (no auth; the dev API is public).
- `CLOUDPROAVANCO_AWS_ACCESS_KEY_ID` / `CLOUDPROAVANCO_AWS_SECRET_ACCESS_KEY` only if you need AWS
  console/CLI access. Note the IAM user is **not** authorized for `s3:ListBucket`/`GetObject` on
  `documentos-clinica-documents-dev-909569945193` (AccessDenied / 403), so S3 object-level
  verification is not possible with these keys — verify through the API instead.
