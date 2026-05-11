# Chat Conversation

Note: _This is purely the output of the chat conversation and does not contain any raw data, codebase snippets, etc. used to generate the output._

### User Input

pls create js script file for create VN from this shell api curl --request POST \
  --url https://cortex.srbrhospital.com/cortex-api/graphql \
  --header 'authorization: Bearer {{token}}' \
  --header 'content-type: application/json' \
  --data '{"query":"mutation CreateVisit($input: CreateVisitInput!) {\n  createVisit(input: $input) {\n    vn\n    hn\n    active\n    latestStatusCode\n    coverageUsages {\n      id\n      insurancePlanId\n      priority\n    }\n  }\n}","variables":"{\n  \"input\": {\n    \"hn\": \"6903000\",\n    \"source\": \"kiosk\",\n    \"encounterInput\": [\n      {\n        \"encounterType\": \"WALK_IN\",\n        \"walkInTarget\": {\n          \"clinicId\": 438\n        },\n        \"insurancePlanIds\": [241]\n      }\n    ],\n    \"coverageInput\": [\n      {\n        \"insurancePlanId\": 241,\n        \"expiredAt\": \"2026-12-15T20:00:00+07:00\",\n        \"priority\": 10\n      },\n      {\n        \"insurancePlanId\": 182,\n        \"priority\": 20\n      }\n    ]\n  }\n}\n"}'

### Planner Response

I'll create a JavaScript script for creating a VN (Visit Number) using the GraphQL API. Let me first check the existing project structure to follow the same patterns.

*Listed directory [src](file:///Users/hlab/Documents/GitHub/cortex-testing/src) *

*Listed directory [service](file:///Users/hlab/Documents/GitHub/cortex-testing/src/service) *

*Viewed [cortex-api.client.js](file:///Users/hlab/Documents/GitHub/cortex-testing/src/service/cortex-api.client.js) *

*Viewed [token-manager.js](file:///Users/hlab/Documents/GitHub/cortex-testing/src/service/token-manager.js) *

*Listed directory [setup](file:///Users/hlab/Documents/GitHub/cortex-testing/src/setup) *

### Planner Response

Let me check the gen-mock directory for similar scripts and how they handle API calls:

*Listed directory [gen-mock](file:///Users/hlab/Documents/GitHub/cortex-testing/src/gen-mock) *

*Listed directory [visit](file:///Users/hlab/Documents/GitHub/cortex-testing/src/gen-mock/visit) *

*Viewed [index.js](file:///Users/hlab/Documents/GitHub/cortex-testing/src/gen-mock/visit/index.js) *

### Planner Response

Now I have a good understanding of the existing patterns. Let me also check the gen-mock index.js to see how clients are set up:

*Viewed [index.js](file:///Users/hlab/Documents/GitHub/cortex-testing/src/gen-mock/index.js) *

### Planner Response

Now I understand the project structure. Let me create a standalone JavaScript script for creating a VN (Visit Number) that follows the existing patterns. I'll place it in the `src/gen-mock/visit` directory:

*Edited relevant file*

### Planner Response

I've created the JavaScript script file. Let me also verify the [.env.sample](cci:7://file:///Users/hlab/Documents/GitHub/cortex-testing/src/setup/.env.sample:0:0-0:0) file exists in the gen-mock directory to document the required environment variables:

### Planner Response

I've successfully created the script file. Here's a summary of what I created:

## Created: [/src/gen-mock/visit/create-vn.js](cci:7://file:///Users/hlab/Documents/GitHub/cortex-testing/src/gen-mock/visit/create-vn.js:0:0-0:0)

This JavaScript script creates a VN (Visit Number) using the GraphQL API. It follows the existing project patterns and provides the following features:

### **Usage Examples:**

```bash
# Basic usage - Create a visit with default settings
node src/gen-mock/visit/create-vn.js --hn 6903000

# Create a visit with specific clinic and insurance plans
node src/gen-mock/visit/create-vn.js --hn 6903000 --clinic-id 438 --insurance-plan-ids "241,182"

# Create a visit with detailed coverage input (matching your original curl)
node src/gen-mock/visit/create-vn.js --hn 6903000 --clinic-id 438 --insurance-plan-ids "241" \
  --coverage '[{"insurancePlanId":241,"expiredAt":"2026-12-15T20:00:00+07:00","priority":10},{"insurancePlanId":182,"priority":20}]'
```

### **CLI Options:**

| Option | Description | Default |
|--------|-------------|---------|
| `--hn` | Hospital Number (required) | - |
| `--clinic-id` | Clinic ID for walk-in target | `438` |
| `--source` | Visit source | `kiosk` |
| `--encounter-type` | Encounter type (`WALK_IN` or `APPOINTMENT`) | `WALK_IN` |
| `--insurance-plan-ids` | Comma-separated insurance plan IDs | `241` |
| `--coverage` | Coverage input as JSON string | auto-generated |
| `--log-file`, `-l` | Path to log file | null |
| `--verbose`, `-v` | Enable verbose logging | false |

### **Required Environment Variables:**

Make sure your [.env](cci:7://file:///Users/hlab/Documents/GitHub/cortex-testing/src/setup/.env:0:0-0:0) file in `src/gen-mock/` contains:
- `OAUTH2_TOKEN_URL` - OAuth2 token endpoint
- `CLIENT_ID` - Client ID for authentication
- `CLIENT_SECRET` - Client secret for authentication
- `CORTEX_API_URL` - Base URL for the Cortex API (e.g., `https://cortex.srbrhospital.com/cortex-api`)

### User Input

ปรับไฟล์ให้ดึงข้อมูลจากCSV และช่วยระบุด้วยว่าในcsvควรมีcolumnอะไรบ้าง

*Edited relevant file*

### Planner Response

Now let me create a sample CSV file as a template:

*Edited relevant file*

### Planner Response

เสร็จแล้วครับ! ผมได้อัปเดตไฟล์ [create-vn.js](cci:7://file:///Users/hlab/Documents/GitHub/cortex-testing/src/gen-mock/visit/create-vn.js:0:0-0:0) ให้ดึงข้อมูลจาก CSV และสร้างไฟล์ตัวอย่าง CSV ด้วย

## 📋 CSV Column Specifications

### **Required Columns (จำเป็น)**
| Column | Type | Description | Example |
|--------|------|-------------|---------|
| `hn` | string | Hospital Number | `6903000` |
| `clinicId` | number | Clinic ID สำหรับ walk-in target | `438` |

### **Optional Columns (ไม่บังคับ)**
| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `source` | string | `kiosk` | แหล่งที่มาของ visit |
| `encounterType` | string | `WALK_IN` | ประเภท encounter (`WALK_IN`, `APPOINTMENT`) |

### **Insurance Plan Columns (สำหรับ encounter)**
| Column | Type | Description |
|--------|------|-------------|
| `insurancePlanId_1` | number | Insurance Plan ID ตัวที่ 1 |
| `insurancePlanId_2` | number | Insurance Plan ID ตัวที่ 2 |
| `insurancePlanId_3` | number | Insurance Plan ID ตัวที่ 3 (ถ้ามี) |

### **Coverage Columns (สำหรับ coverage input)**
| Column | Type | Description |
|--------|------|-------------|
| `coverage_1.insurancePlanId` | number | Insurance Plan ID ของ coverage ที่ 1 |
| `coverage_1.priority` | number | Priority เช่น `10` |
| `coverage_1.expiredAt` | ISO date | วันหมดอายุ เช่น `2026-12-15T20:00:00+07:00` |
| `coverage_1.budgetLimit` | number | วงเงิน (optional) |
| `coverage_1.payorId` | string | Payor ID (optional) |

*สามารถใช้ pattern เดียวกันกับ `coverage_2.*`, `coverage_3.*` ได้เช่นกัน*

---

## 🚀 Usage

```bash
# ใช้งานกับไฟล์ CSV
node src/gen-mock/visit/create-vn.js -i ./src/gen-mock/visit/visits-sample.csv

# พร้อม verbose logging
node src/gen-mock/visit/create-vn.js -i ./visits.csv -v

# กำหนด delay ระหว่าง request
node src/gen-mock/visit/create-vn.js -i ./visits.csv --delay 200
```

---

## 📄 ตัวอย่าง CSV (visits-sample.csv)

```csv
hn,clinicId,source,encounterType,insurancePlanId_1,insurancePlanId_2,coverage_1.insurancePlanId,coverage_1.priority,coverage_1.expiredAt,coverage_2.insurancePlanId,coverage_2.priority
6903000,438,kiosk,WALK_IN,241,182,241,10,2026-12-15T20:00:00+07:00,182,20
6903001,438,kiosk,WALK_IN,241,,241,10,,
6903002,217,kiosk,WALK_IN,182,,182,10,2027-01-01T00:00:00+07:00,
```

*Edited relevant file*

### User Input

อธิบายการทำงานของโค้ดที่เขียนมาหน่อย

### Planner Response

## 📖 อธิบายการทำงานของโค้ด [create-vn.js](cci:7://file:///Users/hlab/Documents/GitHub/cortex-testing/src/gen-mock/visit/create-vn.js:0:0-0:0)

### **ภาพรวม Flow การทำงาน**

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   อ่าน CSV      │ ──▶ │  แปลงข้อมูล     │ ──▶ │  เรียก API      │ ──▶ │  แสดงผลลัพธ์    │
│   (fast-csv)    │     │  เป็น Input     │     │  GraphQL        │     │  Summary        │
└─────────────────┘     └─────────────────┘     └─────────────────┘     └─────────────────┘
```

---

### **1. การ Import และ Setup (บรรทัด 1-49)**

```javascript
import { createReadStream } from 'node:fs';      // อ่านไฟล์แบบ stream
import { parse } from 'fast-csv';                 // parse CSV
import dotenv from 'dotenv';                      // โหลด environment variables
import yargs from 'yargs';                        // parse command line arguments
```

**CLI Options ที่รองรับ:**
- `--input, -i` : path ไปยังไฟล์ CSV (บังคับ)
- `--batch, -b` : จำนวน batch size (default: 1)
- `--delay` : หน่วงเวลาระหว่าง request (default: 100ms)
- `--verbose, -v` : แสดง log ละเอียด

---

### **2. GraphQL Mutation (บรรทัด 89-103)**

```javascript
const CREATE_VISIT_MUTATION = `mutation CreateVisit($input: CreateVisitInput!) {
  createVisit(input: $input) {
    vn           // ← Visit Number ที่สร้างได้
    hn           // ← Hospital Number
    active
    latestStatusCode
    coverageUsages { ... }
  }
}`;
```

นี่คือ GraphQL mutation ที่จะส่งไปยัง Cortex API เพื่อสร้าง Visit

---

### **3. อ่านไฟล์ CSV (บรรทัด 105-117)**

```javascript
async function readCsvFile(csvPath) {
  const rows = [];
  await new Promise((resolve, reject) => {
    createReadStream(csvPath)            // เปิดไฟล์แบบ stream
      .pipe(parse({ headers: true }))    // parse CSV โดยใช้ row แรกเป็น header
      .on('data', (row) => rows.push(row))  // เก็บแต่ละ row
      .on('end', resolve);
  });
  return rows;
}
```

**ตัวอย่างผลลัพธ์จาก CSV ของคุณ:**
```javascript
[
  {
    hn: '6903049',
    clinicId: '2',
    source: 'kiosk',
    encounterType: 'WALK_IN',
    insurancePlanId_1: '67',
    insurancePlanId_2: '',
    'coverage_1.insurancePlanId': '67',
    'coverage_1.priority': '10',
    ...
  }
]
```

---

### **4. แปลง Row เป็น API Input (บรรทัด 119-172)**

```javascript
function buildVisitInputFromRow(row) {
  // 1. ดึงค่าพื้นฐาน
  const hn = row.hn;                    // '6903049'
  const clinicId = Number(row.clinicId); // 2

  // 2. สร้าง array ของ insurancePlanIds
  const insurancePlanIds = [];
  for (let i = 1; i <= 5; i++) {
    const planId = row[`insurancePlanId_${i}`];
    if (planId) insurancePlanIds.push(Number(planId));
  }
  // ผลลัพธ์: [67]

  // 3. สร้าง encounterInput
  const encounterInput = [{
    encounterType: 'WALK_IN',
    walkInTarget: { clinicId: 2 },
    insurancePlanIds: [67]
  }];

  // 4. สร้าง coverageInput จาก coverage_1.*, coverage_2.*, ...
  const coverageInput = [{
    insurancePlanId: 67,
    priority: 10
  }];

  // 5. return input ที่พร้อมส่ง API
  return { hn, source, encounterInput, coverageInput };
}
```

**ผลลัพธ์สำหรับ row ของคุณ:**
```json
{
  "hn": "6903049",
  "source": "kiosk",
  "encounterInput": [{
    "encounterType": "WALK_IN",
    "walkInTarget": { "clinicId": 2 },
    "insurancePlanIds": [67]
  }],
  "coverageInput": [{
    "insurancePlanId": 67,
    "priority": 10
  }]
}
```

---

### **5. เรียก API สร้าง Visit (บรรทัด 174-188)**

```javascript
async function createVisit(cortexApiClient, input, logger) {
  const response = await cortexApiClient.client.post('/graphql', {
    query: CREATE_VISIT_MUTATION,
    variables: { input }
  });

  if (response.data.errors) {
    return { success: false, errors: response.data.errors };
  }
  return { success: true, data: response.data.data.createVisit };
}
```

---

### **6. Main Loop - วนประมวลผลทุก Row (บรรทัด 210-250)**

```javascript
for (let i = 0; i < rows.length; i++) {
  const row = rows[i];
  
  // แปลง row เป็น input
  const input = buildVisitInputFromRow(row);
  
  // เรียก API
  const result = await createVisit(cortexApiClient, input, logger);
  
  if (result.success) {
    console.log(`✅ Row ${rowNum}: HN ${input.hn} -> VN ${result.data.vn}`);
  } else {
    console.error(`❌ Row ${rowNum}: HN ${input.hn} failed`);
  }
  
  // หน่วงเวลาก่อนทำ row ถัดไป
  await sleep(delay);
}
```

---

### **7. แสดง Summary (บรรทัด 252-275)**

```
========================================
              SUMMARY
========================================
Total processed: 1
✅ Success: 1
❌ Failed: 0

Created VNs:
  - Row 2: HN 6903049 -> VN 2601160001
```

---

### **🔐 Authentication Flow**

```
┌─────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ TokenManager│ ──▶ │ Get OAuth Token │ ──▶ │ Add Bearer Token│
│             │     │ from Keycloak   │     │ to Request      │
└─────────────┘     └─────────────────┘     └─────────────────┘
```

Token Manager จะ:
1. ขอ token จาก Keycloak โดยใช้ `CLIENT_ID` และ `CLIENT_SECRET`
2. Cache token ไว้ใช้ซ้ำ
3. Refresh อัตโนมัติเมื่อ token ใกล้หมดอายุ

---

ต้องการให้อธิบายส่วนไหนเพิ่มเติมไหมครับ? 🤔

### User Input

จะต้องรันด้วยbunยังไง

### Planner Response

## 🚀 วิธีรันด้วย Bun

```bash
# รันจาก root directory ของ project
bun run src/gen-mock/visit/create-vn.js -i src/gen-mock/visit/visits-sample.csv
```

ลองรันให้ดูเลยครับ:

*User rejected the command `bun run src/gen-mock/visit/create-vn.js -i src/gen-mock/visit/visits-sample.csv`*

### User Input

จากcodeดึงข้อมูลจากไฟล์csvไหน

### Planner Response

## 📂 ไฟล์ CSV ที่โค้ดดึงข้อมูล

จากโค้ด **ไม่ได้ hardcode path ไว้** แต่รับ path จาก **command line argument** `--input` หรือ `-i`

```javascript
// บรรทัด 16-21
.option('input', {
  alias: 'i',
  type: 'string',
  description: 'Path to input CSV file',
  demandOption: true,  // ← บังคับต้องระบุ
})
```

---

### 🔧 วิธีใช้งาน

ต้องระบุ path ของไฟล์ CSV เองตอนรัน:

```bash
# ใช้ไฟล์ visits-sample.csv
bun run src/gen-mock/visit/create-vn.js -i src/gen-mock/visit/visits-sample.csv

# หรือใช้ไฟล์ Visit.csv ที่คุณเปิดอยู่
bun run src/gen-mock/visit/create-vn.js -i assets/data/account-charge-item/Visit.csv
```

---

### 📄 ไฟล์ที่คุณเปิดอยู่ตอนนี้:

| ไฟล์ | Path |
|------|------|
| [visits-sample.csv](cci:7://file:///Users/hlab/Documents/GitHub/cortex-testing/src/gen-mock/visit/visits-sample.csv:0:0-0:0) | [assets/data/account-charge-item/visits-sample.csv](cci:7://file:///Users/hlab/Documents/GitHub/cortex-testing/assets/data/account-charge-item/visits-sample.csv:0:0-0:0) |
| `Visit.csv` | [assets/data/account-charge-item/Visit.csv](cci:7://file:///Users/hlab/Documents/GitHub/cortex-testing/assets/data/account-charge-item/Visit.csv:0:0-0:0) |

---

ถ้าอยากให้ **default เป็นไฟล์ใดไฟล์หนึ่ง** โดยไม่ต้องระบุทุกครั้ง ผมสามารถแก้โค้ดให้ได้ครับ ต้องการไหม?

*User accepted the command `bun run src/gen-mock/visit/create-vn.js -i src/gen-mock/visit/visits-sample.csv`*

*User accepted the command `bun run src/gen-mock/visit/create-vn.js -i assets/data/account-charge-item/visits-sample.csv`*

### User Input

วิเคราะห์Errorในterminalหน่อย หลังจากรัน bun run src/gen-mock/visit/create-vn.js -i assets/data/account-charge-item/visits-sample.csv

### Planner Response

## 🔍 วิเคราะห์ Error

```json
{
  "message": "must be defined",
  "path": ["variable", "input", "coverageInput", 0, "isChecked"]
}
```

### **สาเหตุ:**
API ต้องการ field **`isChecked`** ใน `coverageInput` แต่โค้ดของเราไม่ได้ส่งไป

### **ปัญหา:**
```javascript
// โค้ดปัจจุบันสร้าง coverageInput แบบนี้:
{
  insurancePlanId: 67,
  priority: 10
}

// แต่ API ต้องการ:
{
  insurancePlanId: 67,
  priority: 10,
  isChecked: true  // ← ขาดตัวนี้!
}
```

---

ผมจะแก้โค้ดให้เพิ่ม `isChecked` เข้าไปครับ:

*Edited relevant file*

### Planner Response

แก้ไขแล้ว! ลองรันอีกครั้งครับ:

*User accepted the command `bun run src/gen-mock/visit/create-vn.js -i assets/data/account-charge-item/visits-sample.csv`*

### Planner Response

## ✅ สำเร็จแล้ว!

```
✅ Row 2: HN 6903049 -> VN V6901160020

========================================
              SUMMARY
========================================
Total processed: 1
✅ Success: 1
❌ Failed: 0
```

### **สิ่งที่แก้ไข:**

เพิ่ม field `isChecked: true` เข้าไปใน `coverageInput` เพราะ API บังคับต้องมี

```javascript
// ก่อนแก้
{
  insurancePlanId: 67,
  priority: 10
}

// หลังแก้
{
  insurancePlanId: 67,
  priority: 10,
  isChecked: true  // ← เพิ่มตัวนี้
}
```

### **CSV Column ใหม่ (Optional):**

ถ้าต้องการควบคุมค่า `isChecked` ใน CSV สามารถเพิ่ม column ได้:

| Column | Default | Description |
|--------|---------|-------------|
| `coverage_1.isChecked` | `true` | ถ้าใส่ `false` จะเป็น false |

*Edited relevant file*

*Edited relevant file*

*Edited relevant file*

*Edited relevant file*

### User Input

อธิบายโค้ดการทำงานของการสร้างVisit แบบทุกไฟล์ที่เกี่ยวข้อง ขอแบบละเอียด

### Planner Response

ผมจะดูไฟล์ที่เกี่ยวข้องทั้งหมดก่อนแล้วอธิบายให้ละเอียดครับ:

*Viewed [create-vn.js](file:///Users/hlab/Documents/GitHub/cortex-testing/src/gen-mock/visit/create-vn.js) *

*Viewed [http-client.js](file:///Users/hlab/Documents/GitHub/cortex-testing/src/service/http-client.js) *

*Viewed [token-manager.js](file:///Users/hlab/Documents/GitHub/cortex-testing/src/service/token-manager.js) *

*Viewed [cortex-api.client.js](file:///Users/hlab/Documents/GitHub/cortex-testing/src/service/cortex-api.client.js) *

*Viewed [index.js](file:///Users/hlab/Documents/GitHub/cortex-testing/src/helper/index.js) *

*Viewed [logger.js](file:///Users/hlab/Documents/GitHub/cortex-testing/src/setup/logger.js) *

*Viewed [require-env.js](file:///Users/hlab/Documents/GitHub/cortex-testing/src/helper/require-env.js) *

### Planner Response

# 📚 อธิบายการทำงานของระบบสร้าง Visit อย่างละเอียด

## 🗂️ ภาพรวมไฟล์ทั้งหมดที่เกี่ยวข้อง

```
src/
├── gen-mock/
│   ├── .env                          # ⚙️ Environment Variables
│   └── visit/
│       └── create-vn.js              # 🚀 Main Script (ไฟล์หลัก)
│
├── service/
│   ├── token-manager.js              # 🔐 จัดการ OAuth Token
│   ├── http-client.js                # 🌐 HTTP Client with Auth
│   └── cortex-api.client.js          # 📡 Cortex API Client
│
├── helper/
│   └── require-env.js                # 🔧 ดึงค่า Environment Variable
│
└── setup/
    └── logger.js                     # 📝 Logging System
```

---

## 🔄 Flow การทำงานทั้งระบบ

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              FLOW การสร้าง Visit                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘

    ┌──────────┐     ┌──────────┐     ┌────────────────┐     ┌──────────────┐
    │  .env    │────▶│ dotenv   │────▶│ requireEnv()   │────▶│ TokenManager │
    │ (config) │     │ (load)   │     │ (validate)     │     │ (get token)  │
    └──────────┘     └──────────┘     └────────────────┘     └──────┬───────┘
                                                                    │
    ┌──────────┐     ┌──────────┐     ┌────────────────┐           │
    │   CSV    │────▶│ fast-csv │────▶│ buildVisit     │           │
    │  (data)  │     │ (parse)  │     │ InputFromRow() │           │
    └──────────┘     └──────────┘     └───────┬────────┘           │
                                              │                     │
                                              ▼                     ▼
                                      ┌───────────────────────────────────┐
                                      │         HTTP Client               │
                                      │   (axios + Bearer Token)          │
                                      └───────────────┬───────────────────┘
                                                      │
                                                      ▼
                                      ┌───────────────────────────────────┐
                                      │      Cortex GraphQL API           │
                                      │   POST /graphql (CreateVisit)     │
                                      └───────────────┬───────────────────┘
                                                      │
                                                      ▼
                                      ┌───────────────────────────────────┐
                                      │          Response                 │
                                      │  { vn, hn, active, ... }          │
                                      └───────────────────────────────────┘
```

---

## 📄 ไฟล์ที่ 1: [.env](cci:7://file:///Users/hlab/Documents/GitHub/cortex-testing/src/setup/.env:0:0-0:0) (Environment Variables)

```env
# OAuth2 Configuration
OAUTH2_TOKEN_URL=https://keycloak.example.com/realms/cortex/protocol/openid-connect/token
CLIENT_ID=cortex-client
CLIENT_SECRET=your-secret-key

# API URLs
CORTEX_API_URL=https://cortex.srbrhospital.com/cortex-api
```

**หน้าที่:** เก็บ configuration ที่ sensitive เช่น credentials และ API URLs

---

## 📄 ไฟล์ที่ 2: [require-env.js](cci:7://file:///Users/hlab/Documents/GitHub/cortex-testing/src/helper/require-env.js:0:0-0:0) (Helper)

```javascript
export function requireEnv(name) {
  const value = process.env[name];  // ดึงค่าจาก environment
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}
```

**หน้าที่:** ดึงค่า environment variable พร้อมตรวจสอบว่ามีค่าหรือไม่

**ตัวอย่างการใช้:**
```javascript
const tokenUrl = requireEnv('OAUTH2_TOKEN_URL');
// ถ้าไม่มีค่า → throw error
// ถ้ามี → return ค่า
```

---

## 📄 ไฟล์ที่ 3: [token-manager.js](cci:7://file:///Users/hlab/Documents/GitHub/cortex-testing/src/service/token-manager.js:0:0-0:0) 🔐

```
┌────────────────────────────────────────────────────────────────┐
│                     TOKEN MANAGER FLOW                         │
└────────────────────────────────────────────────────────────────┘

     ┌─────────────┐         ┌─────────────┐         ┌─────────────┐
     │ getAccess   │───YES──▶│ isTokenValid│───YES──▶│ Return      │
     │ Token()     │         │ ?           │         │ cached token│
     └─────────────┘         └──────┬──────┘         └─────────────┘
                                    │ NO
                                    ▼
                            ┌─────────────┐
                            │ fetchToken()│
                            │ from Keycloak│
                            └──────┬──────┘
                                   │
                                   ▼
                            ┌─────────────┐
                            │ Cache token │
                            │ + expiresAt │
                            └──────┬──────┘
                                   │
                                   ▼
                            ┌─────────────┐
                            │ Return new  │
                            │ token       │
                            └─────────────┘
```

### โค้ดและคำอธิบาย:

```javascript
export function createTokenManager({
  tokenUrl,       // URL ของ Keycloak token endpoint
  clientId,       // Client ID
  clientSecret,   // Client Secret
  safetyWindowMs = 60_000,  // Buffer 1 นาทีก่อน token หมดอายุ
}) {
  // State เก็บ token
  let accessToken = null;
  let expiresAt = 0;
  let refreshPromise = null;  // ป้องกัน race condition

  // ตรวจสอบว่า token ยังใช้ได้ไหม
  const isTokenValid = () => {
    if (!accessToken) return false;
    // ตรวจสอบว่าเวลาปัจจุบัน + buffer < เวลาหมดอายุ
    return Date.now() + safetyWindowMs < expiresAt;
  };

  // ขอ token ใหม่จาก Keycloak
  const fetchToken = async () => {
    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('client_id', clientId);
    params.append('client_secret', clientSecret);

    // POST ไปที่ Keycloak
    const response = await axios.post(tokenUrl, params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    // เก็บ token และเวลาหมดอายุ
    accessToken = response.data.access_token;
    expiresAt = Date.now() + (response.data.expires_in * 1000);

    return accessToken;
  };

  // Function หลักที่เรียกใช้
  const getAccessToken = async () => {
    // ถ้า token ยังใช้ได้ → return เลย
    if (isTokenValid()) {
      return accessToken;
    }

    // ถ้าไม่มี → ขอใหม่ (ป้องกัน race condition)
    if (!refreshPromise) {
      refreshPromise = fetchToken();
    }

    await refreshPromise;
    refreshPromise = null;
    return accessToken;
  };

  return { getAccessToken, invalidate };
}
```

**หน้าที่หลัก:**
1. 🔑 ขอ OAuth2 token จาก Keycloak ด้วย Client Credentials
2. 💾 Cache token ไว้ใช้ซ้ำ
3. ⏰ Auto-refresh เมื่อ token ใกล้หมดอายุ
4. 🔒 ป้องกัน race condition (multiple parallel requests)

---

## 📄 ไฟล์ที่ 4: [http-client.js](cci:7://file:///Users/hlab/Documents/GitHub/cortex-testing/src/service/http-client.js:0:0-0:0) 🌐

```javascript
import axios from 'axios';

// ฟังก์ชันเพิ่ม Authorization header
const setAuthHeader = (headers, token) => {
  return {
    ...headers,
    Authorization: `Bearer ${token}`,  // เพิ่ม Bearer token
  };
};

export function createAuthorizedClient({ tokenManager, axiosConfig = {} }) {
  // สร้าง axios instance
  const client = axios.create(axiosConfig);

  // เพิ่ม interceptor สำหรับทุก request
  client.interceptors.request.use(async (config) => {
    // ดึง token แบบ async (auto-refresh ถ้าหมดอายุ)
    const token = await tokenManager.getAccessToken();
    // เพิ่ม Authorization header
    config.headers = setAuthHeader(config.headers, token);
    return config;
  });

  return client;
}
```

**หน้าที่:**
- 🔗 สร้าง axios client ที่เพิ่ม Bearer token ให้ทุก request อัตโนมัติ
- 🔄 ใช้ interceptor เพื่อเพิ่ม token ก่อนส่ง request

**ผลลัพธ์:**
```http
POST /graphql HTTP/1.1
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI...  ← เพิ่มให้อัตโนมัติ
Content-Type: application/json
```

---

## 📄 ไฟล์ที่ 5: [cortex-api.client.js](cci:7://file:///Users/hlab/Documents/GitHub/cortex-testing/src/service/cortex-api.client.js:0:0-0:0) 📡

```javascript
import { createAuthorizedClient } from './http-client.js';

export function createCortexApiClient({ baseURL, tokenManager }) {
  // Validation
  if (!baseURL) throw new Error('Missing CORTEX_API_URL configuration');
  if (!tokenManager) throw new Error('tokenManager is required');

  // สร้าง HTTP client ที่มี authorization
  const client = createAuthorizedClient({
    tokenManager,
    axiosConfig: {
      baseURL,  // https://cortex.srbrhospital.com/cortex-api
      headers: {
        'Content-Type': 'application/json',
      },
    },
  });

  // ฟังก์ชันสำหรับ import CSV
  const importCsv = async (path, csvFilePath) => {
    const form = new FormData();
    form.append('file', fs.createReadStream(csvFilePath));
    const response = await client.post(path, form, {
      headers: form.getHeaders(),
    });
    return response.data;
  };

  return {
    importCsv,
    client,  // ← ใช้ตัวนี้ในการเรียก GraphQL
  };
}
```

**หน้าที่:**
- 🏭 Factory function สำหรับสร้าง Cortex API client
- 📍 ตั้ง baseURL ไว้ที่ `https://cortex.srbrhospital.com/cortex-api`
- 🔧 มี method [importCsv](cci:1://file:///Users/hlab/Documents/GitHub/cortex-testing/src/service/cortex-api.client.js:23:2-32:4) สำหรับ upload CSV
- 🔌 expose `client` สำหรับเรียก API อื่นๆ เช่น GraphQL

---

## 📄 ไฟล์ที่ 6: [logger.js](cci:7://file:///Users/hlab/Documents/GitHub/cortex-testing/src/setup/logger.js:0:0-0:0) 📝

```javascript
import { configure, getConsoleSink, getLogger } from '@logtape/logtape';

export async function setupLogger(logFile = null) {
  const sinks = {
    console: getConsoleSink(),  // แสดงใน terminal
  };

  // ถ้าระบุ log file → เพิ่ม file sink
  if (logFile) {
    const fileStream = createWriteStream(logFile, { flags: 'a' });
    sinks.file = (record) => {
      const line = `${timestamp} ${level} ${category} ${message}\n`;
      fileStream.write(line);
    };
  }

  await configure({
    sinks,
    loggers: [
      { category: 'setup', level: 'info', sinks: Object.keys(sinks) },
    ],
  });

  return getLogger('setup');  // return logger instance
}
```

**หน้าที่:**
- 📺 แสดง log ใน console
- 📁 เขียน log ลง file (optional)
- 🏷️ จัดรูปแบบ: `timestamp LEVEL category message`

---

## 📄 ไฟล์ที่ 7: [create-vn.js](cci:7://file:///Users/hlab/Documents/GitHub/cortex-testing/src/gen-mock/visit/create-vn.js:0:0-0:0) 🚀 (Main Script)

### ส่วนที่ 1: Import และ Setup

```javascript
import { createReadStream } from 'node:fs';     // อ่านไฟล์
import { parse } from 'fast-csv';                // parse CSV
import dotenv from 'dotenv';                     // load .env
import yargs from 'yargs';                       // CLI arguments

// Load .env file
dotenv.config({ path: join(__dirname, '../.env') });

// Parse CLI arguments
const argv = yargs(hideBin(process.argv))
  .option('input', { alias: 'i', type: 'string', demandOption: true })
  .option('delay', { type: 'number', default: 100 })
  .parse();
```

### ส่วนที่ 2: GraphQL Mutation

```javascript
const CREATE_VISIT_MUTATION = `mutation CreateVisit($input: CreateVisitInput!) {
  createVisit(input: $input) {
    vn                    # Visit Number (ผลลัพธ์)
    hn                    # Hospital Number
    active                # สถานะ active
    latestStatusCode      # รหัสสถานะล่าสุด
    coverageUsages {      # การใช้งานสิทธิ์
      id
      insurancePlanId
      priority
    }
  }
}`;
```

### ส่วนที่ 3: อ่าน CSV

```javascript
async function readCsvFile(csvPath) {
  const rows = [];

  await new Promise((resolve, reject) => {
    createReadStream(csvPath)              // เปิดไฟล์แบบ stream
      .pipe(parse({ headers: true }))      // ใช้ row แรกเป็น header
      .on('data', (row) => rows.push(row)) // เก็บแต่ละ row
      .on('end', resolve);
  });

  return rows;
}
```

**Input CSV:**
```csv
hn,clinicId,source,encounterType,insurancePlanId_1,...
6903050,2,kiosk,WALK_IN,67,...
```

**Output array:**
```javascript
[
  {
    hn: '6903050',
    clinicId: '2',
    source: 'kiosk',
    encounterType: 'WALK_IN',
    insurancePlanId_1: '67',
    ...
  }
]
```

### ส่วนที่ 4: แปลง Row เป็น API Input

```javascript
function buildVisitInputFromRow(row) {
  // 1. ดึงค่าพื้นฐาน
  const hn = row.hn;
  const clinicId = Number(row.clinicId);
  const source = row.source || 'kiosk';
  const encounterType = row.encounterType || 'WALK_IN';

  // 2. สร้าง array ของ insurancePlanIds
  const insurancePlanIds = [];
  for (let i = 1; i <= 5; i++) {
    if (row[`insurancePlanId_${i}`]) {
      insurancePlanIds.push(Number(row[`insurancePlanId_${i}`]));
    }
  }

  // 3. สร้าง encounterInput
  const encounterInput = [{
    encounterType,
    walkInTarget: { clinicId },
    insurancePlanIds
  }];

  // 4. สร้าง coverageInput
  const coverageInput = [];
  for (let i = 1; i <= 5; i++) {
    const insurancePlanId = row[`coverage_${i}.insurancePlanId`];
    if (insurancePlanId) {
      coverageInput.push({
        insurancePlanId: Number(insurancePlanId),
        priority: Number(row[`coverage_${i}.priority`]) || i * 10,
        isChecked: true,  // ← ค่าที่ API บังคับต้องมี
        expiredAt: row[`coverage_${i}.expiredAt`] || undefined,
      });
    }
  }

  // 5. Return final input
  return { hn, source, encounterInput, coverageInput };
}
```

**Output:**
```json
{
  "hn": "6903050",
  "source": "kiosk",
  "encounterInput": [{
    "encounterType": "WALK_IN",
    "walkInTarget": { "clinicId": 2 },
    "insurancePlanIds": [67]
  }],
  "coverageInput": [{
    "insurancePlanId": 67,
    "priority": 10,
    "isChecked": true
  }]
}
```

### ส่วนที่ 5: เรียก API

```javascript
async function createVisit(cortexApiClient, input, logger) {
  const response = await cortexApiClient.client.post('/graphql', {
    query: CREATE_VISIT_MUTATION,
    variables: { input },
  });

  if (response.data.errors) {
    return { success: false, errors: response.data.errors };
  }

  return { success: true, data: response.data.data.createVisit };
}
```

### ส่วนที่ 6: Main Loop

```javascript
async function run() {
  // 1. อ่าน CSV
  const rows = await readCsvFile(csvPath);

  // 2. สร้าง services
  const tokenManager = createTokenManager({
    tokenUrl: requireEnv('OAUTH2_TOKEN_URL'),
    clientId: requireEnv('CLIENT_ID'),
    clientSecret: requireEnv('CLIENT_SECRET'),
  });

  const cortexApiClient = createCortexApiClient({
    baseURL: requireEnv('CORTEX_API_URL'),
    tokenManager,
  });

  // 3. วนสร้าง Visit ทีละ row
  for (const row of rows) {
    const input = buildVisitInputFromRow(row);
    const result = await createVisit(cortexApiClient, input, logger);

    if (result.success) {
      console.log(`✅ HN ${input.hn} -> VN ${result.data.vn}`);
    } else {
      console.error(`❌ HN ${input.hn} failed`);
    }

    await sleep(delay);  // หน่วงเวลาระหว่าง request
  }

  // 4. แสดง summary
  console.log(`Total: ${rows.length}, Success: ${successCount}, Failed: ${failedCount}`);
}
```

---

## 🔄 Sequence Diagram แบบละเอียด

```
┌──────────┐  ┌──────────┐  ┌────────────┐  ┌──────────────┐  ┌────────────┐  ┌─────────┐
│   User   │  │create-vn │  │TokenManager│  │ HTTP Client  │  │Cortex API  │  │Keycloak │
└────┬─────┘  └────┬─────┘  └─────┬──────┘  └──────┬───────┘  └─────┬──────┘  └────┬────┘
     │             │              │                │                │              │
     │ bun run ... │              │                │                │              │
     │──────────▶│             │                │                │              │
     │             │              │                │                │              │
     │             │ Read CSV     │                │                │              │
     │             │──────────▶│              │                │              │
     │             │              │                │                │              │
     │             │ For each row:│                │                │              │
     │             │ ─────────────│                │                │              │
     │             │              │                │                │              │
     │             │ getAccessToken()              │                │              │
     │             │──────────────▶│                │                │              │
     │             │              │                │                │              │
     │             │              │ [if no token]  │                │              │
     │             │              │ POST /token    │                │              │
     │             │              │────────────────────────────────────────────────▶│
     │             │              │                │                │              │
     │             │              │◀───────────────────────────────────────────────────│
     │             │              │ {access_token, expires_in}     │              │
     │             │              │                │                │              │
     │             │◀──────────────│ token          │                │              │
     │             │              │                │                │              │
     │             │ POST /graphql│                │                │              │
     │             │──────────────────────────────▶│                │              │
     │             │              │                │                │              │
     │             │              │                │ [add Bearer token]            │
     │             │              │                │ POST /graphql  │              │
     │             │              │                │───────────────▶│              │
     │             │              │                │                │              │
     │             │              │                │◀───────────────│              │
     │             │              │                │ {vn, hn, ...}  │              │
     │             │              │                │                │              │
     │             │◀──────────────────────────────│                │              │
     │             │ response     │                │                │              │
     │             │              │                │                │              │
     │◀────────────│ ✅ VN created│                │                │              │
     │             │              │                │                │              │
```

---

## 📋 สรุป

| ไฟล์ | หน้าที่หลัก |
|------|------------|
| [.env](cci:7://file:///Users/hlab/Documents/GitHub/cortex-testing/src/setup/.env:0:0-0:0) | เก็บ credentials และ URLs |
| [require-env.js](cci:7://file:///Users/hlab/Documents/GitHub/cortex-testing/src/helper/require-env.js:0:0-0:0) | ดึงและ validate environment variables |
| [token-manager.js](cci:7://file:///Users/hlab/Documents/GitHub/cortex-testing/src/service/token-manager.js:0:0-0:0) | จัดการ OAuth2 token (ขอ/cache/refresh) |
| [http-client.js](cci:7://file:///Users/hlab/Documents/GitHub/cortex-testing/src/service/http-client.js:0:0-0:0) | สร้าง axios client ที่มี Bearer token |
| [cortex-api.client.js](cci:7://file:///Users/hlab/Documents/GitHub/cortex-testing/src/service/cortex-api.client.js:0:0-0:0) | Factory สำหรับ Cortex API client |
| [logger.js](cci:7://file:///Users/hlab/Documents/GitHub/cortex-testing/src/setup/logger.js:0:0-0:0) | ระบบ logging |
| [create-vn.js](cci:7://file:///Users/hlab/Documents/GitHub/cortex-testing/src/gen-mock/visit/create-vn.js:0:0-0:0) | **Main script** - อ่าน CSV และสร้าง Visit |