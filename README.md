# Smart Lending Platform - NestJS Microservices Template (with API Gateway)

Overview
- Event-driven microservices for enterprise lending (Kafka).
- Example implemented: loan-core service with Saga orchestrator.
- Services included: API Gateway, loan-core, kyc, credit, risk, blacklist, audit.
- Demonstrates compensation pattern when Blacklist check fails.

Requirements
- Docker & Docker Compose (v2)
- Node 18+
- npm / yarn

Quick start (Docker)
1. Copy `.env.example` -> `.env` and customize.
2. Build & start:
   docker-compose up --build -d
3. API Gateway (public): http://localhost:3000
   - POST /api/loans/apply -> start loan flow

Quick dev (no full Docker)
- Start Kafka/Zookeeper:
  docker-compose up -d zookeeper kafka
- Start services locally (each folder):
  cd services/kyc && npm install && npm run start:dev
  cd services/credit && npm install && npm run start:dev
  cd services/risk && npm install && npm run start:dev
  cd services/blacklist && npm install && npm run start:dev
  cd services/audit && npm install && npm run start:dev
  cd services/loan-core && npm install && npm run start:dev
  cd services/api-gateway && npm install && npm run start:dev

Test examples
- Approve / normal:
  curl -X POST http://localhost:3000/api/loans/apply -H "Content-Type: application/json" -d '{"userId":"good-user","amount":1000,"product":"STD","type":"UNSECURED"}'
- Force blacklist fail (deterministic):
  curl -X POST http://localhost:3000/api/loans/apply -H "Content-Type: application/json" -d '{"userId":"user-bad-1","amount":1000,"product":"STD","type":"UNSECURED"}'
- Check audit via gateway:
  curl http://localhost:3000/api/audit/<applicationId>


erikut gambaran arsitektur sistem yang dihasilkan oleh skrip terakhir beserta alur pesan (normal & kompensasi), daftar topik Kafka/event, layanan & port, dan beberapa catatan operasional / peningkatan.

Ringkasan komponen
API Gateway (Express) — publik, menerima request klien pada http://localhost:3000 dan meneruskan ke loan-core; juga membaca audit via audit service.
loan-core (NestJS) — orchestrator / Saga starter, mem-publish event loan.requested dan menunggu event berurutan (kyc.completed -> credit.checked -> risk.checked -> blacklist.checked). Menangani kompensasi (loan.cancelled, loan.rolledback, audit.logged).
kyc — consumer topic loan.requested → mengeluarkan kyc.completed.
credit — consumer topic kyc.completed → mengeluarkan credit.checked (skor/decision).
risk — consumer topic credit.checked → mengeluarkan risk.checked (risk level).
blacklist — consumer topic risk.checked → mengeluarkan blacklist.checked (boolean blacklisted).
audit — consumer topic audit.logged → menyimpan log; juga menyediakan HTTP API untuk membaca audit logs (port 3010).
Kafka + Zookeeper — event bus.
Postgres (pg_loan_core, pg_kyc) — database contoh; loan-core dikonfig untuk Postgres (saat ini hanya skeleton / TypeORM setup).
Docker Compose — mendefinisikan dan membangun semua layanan; gateway diekspos di host 3000, loan-core diekspos 3001, audit HTTP 3010.
Diagram arsitektur (ASCII) /--- Internet/Client ---
| POST /api/loans/apply | V | [API Gateway] ----------> [loan-core (Saga)] ------------------+ (3000) (emit loan.requested) | | | V | Kafka Topics | | | +--------+ loan.requested v kyc.completed v credit.checked v risk.checked v blacklist.checked | KYC | <-------------- [Kafka] -----------------> [Credit] --------------> [Risk] --------------> [Blacklist] +--------+ (consumes loan.requested) (consumes kyc.completed) (consumes credit.checked) (consumes risk.checked) ^ | | +--- loan.cancelled / loan.rolledback / loan.approved / audit.logged <-- loan-core (compensation/complete) | v [Audit service] (stores logs, serves HTTP /audit/:id)

Topik Kafka & event (dipakai di code)

loan.requested — emitted oleh loan-core saat menerima apply.
kyc.completed — emitted oleh KYC.
credit.checked — emitted oleh Credit service (includes score, decision PASS/REVIEW/FAIL).
risk.checked — emitted oleh Risk service (LOW/MEDIUM/HIGH).
blacklist.checked — emitted oleh Blacklist service (blacklisted: true/false).
loan.cancelled — emitted oleh loan-core saat kompensasi.
loan.rolledback — emitted oleh loan-core (simulasi rollback status).
loan.approved — emitted oleh loan-core saat seluruh pengecekan lulus.
audit.logged — emitted oleh loan-core untuk catatan audit (compensations & decisions).
Alur end-to-end (berurutan)
Client -> API Gateway: POST /api/loans/apply { userId, amount, ... }.
Gateway -> loan-core: POST /loans/apply.
loan-core:
menghasilkan applicationId (uuid) dan emit loan.requested(topic key=applicationId).
menunggu kyc.completed dengan key=applicationId (timeout).
setelah KYC PASSED, menunggu credit.checked → jika decision === FAIL → emit loan.cancelled + audit.logged → selesai (REJECTED).
jika credit PASS/REVIEW → menunggu risk.checked.
setelah risk.checked → menunggu blacklist.checked.
jika blacklist.checked.blacklisted === true → kompensasi:
emit loan.cancelled (reason BLACKLISTED)
emit audit.logged (compensation.blacklist)
emit loan.rolledback (simulasi rollback)
return REJECTED.
jika blacklist false → emit loan.approved + audit.logged → return APPROVED.
Kasus gagal/kompensasi (Blacklist fail)
Blacklist service mengembalikan blacklisted=true → loan-core akan:
membatalkan aplikasi (loan.cancelled)
mencatat audit (audit.logged dengan eventName compensation.blacklist)
mem-publish loan.rolledback (simulasi rollback state)
hasil akhir ke client: { applicationId, status: 'REJECTED', reason: 'BLACKLISTED' }
Port & endpoint penting (default)
API Gateway: host:3000
POST /api/loans/apply
GET /api/audit/:id
GET /health
loan-core: container:3000 exposed as host:3001 via docker-compose
POST /loans/apply (internal)
GET /loans/health
audit HTTP: container:3010 (vol mount audit_logs) and endpoint GET /audit/:id
Kafka: broker kafka:9092 (exposed host 9092)
Zookeeper: 2181
Postgres (loan_core): 5432 (container mapped to host 5432)
Deployment & operasional singkat
Cara cepat: docker-compose up --build -d (semua service dibangun dari folder masing-masing)
Untuk dev cepat tanpa membangun image: jalankan kafka+zookeeper via compose lalu start service lokal dengan ts-node (start:dev).
Audit logs disimpan ke ./audit_logs (mounted ke container audit saat compose).
Keterbatasan / area untuk perbaikan
Saga saat ini: blocking waiter per request (loan-core membuat consumer per wait). Untuk produksi gunakan:
durabel saga store / orchestration (Redis, DB, or dedicated saga engine) atau non-blocking event-driven state machine.
idempotency: setiap consumer/producer harus tangani pengiriman ulang / duplicate messages.
retries & DLQ: gunakan retry policy & dead-letter topics untuk event processing failures.
monitoring/tracing: Prometheus metrics + Jaeger traces per service.
security: mutual TLS for Kafka, mTLS/HTTPS for services, authentication at gateway.
persistence: loan-core harus menyimpan saga state / transaction logs ke DB supaya restart tidak hilang.
scale: consumer groups sehingga service bisa skala horizontal; be mindful of per-application ordering (use keyed partitions).
Flow pengujian contoh (quick)
docker-compose up --build -d
curl POST http://localhost:3000/api/loans/apply -d '{"userId":"user-bad-1","amount":1000}' → akan trigger blacklist fail (userId contains "bad")
cek audit logs: curl http://localhost:3000/api/audit/<applicationId>
Visual summary (one-liner) API Gateway → loan-core (Saga) → publish loan.requested → KYC → Credit → Risk → Blacklist → (if blacklisted → compensation events + audit; else → loan.approved + audit) — all connected via Kafka.
Jika mau, saya bisa:

buatkan diagram PNG/SVG yang lebih rapi (saya bisa kirim merinci langkah pembuatan file diagram atau output mermaid);
atau modifikasi implementasi saga menjadi non-blocking (event-driven) dengan state persisten di DB sehingga lebih siap produksi;
atau tambahkan opsi env untuk memaksa gagal/force-test (kyc fail, credit fail, blacklist fail) supaya mudah pengujian.
