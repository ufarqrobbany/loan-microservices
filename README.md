# Smart Lending Platform - NestJS Microservices Template (with API Gateway)

Overview
- Event-driven microservices for enterprise lending (Kafka).
- Example implemented: loan-core service with Saga orchestrator.
- Services included: API Gateway, loan-core, kyc, credit, risk, blacklist, audit.
- Demonstrates compensation pattern when Blacklist check fails.

Requirements
- Docker & Docker Compose (v2)
- Node.js 18+
- npm / yarn
- docker-desktop (windows) / docker Engine(linux)

Quick start (Docker)
1. Copy `.env.example` -> `.env` in the **root folder** AND in **every service folder** (e.g., `services/api-gateway/.env`, `services/loan-core/.env`, `services/kyc/.env`, etc.) and customize if needed.
2. Build & start:
   ```bash
   docker-compose up --build -d
3. API Gateway (public): http://localhost:3000
   - POST /api/loans/apply -> start loan flow

Quick dev (no full Docker)
- Start infrastructure (Kafka, Zookeeper, and Databases):
  ```bash
  docker-compose up -d zookeeper kafka pg_loan_core pg_kyc
- Start services locally (run each line in a separate terminal):
  ```bash
  cd services/kyc && npm install && npm run start:dev
  cd services/credit && npm install && npm run start:dev
  cd services/risk && npm install && npm run start:dev
  cd services/blacklist && npm install && npm run start:dev
  cd services/audit && npm install && npm run start:dev
  cd services/loan-core && npm install && npm run start:dev
  cd services/api-gateway && npm install && npm run start:dev

Test examples
- Approve / normal:
  ```bash
  curl -X POST http://localhost:3000/api/loans/apply -H "Content-Type: application/json" -d '{"userId":"good-user","amount":1000,"product":"STD","type":"UNSECURED"}'
- Force blacklist fail (deterministic):
  ```bash
  curl -X POST http://localhost:3000/api/loans/apply -H "Content-Type: application/json" -d '{"userId":"user-bad-1","amount":1000,"product":"STD","type":"UNSECURED"}'
- Check audit via gateway:
  ```bash
  curl http://localhost:3000/api/audit/APP001
  applicationId = APP001
  the audit data  is available at audit_logs/APP001.log 

 
