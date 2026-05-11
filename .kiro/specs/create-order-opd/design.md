# Design Document: Create Order OPD

## Overview

The Create Order OPD feature implements a batch order creation system that reads encounter and product data from CSV files and creates medical orders through the Cortex GraphQL API. The system calculates insurance benefits based on coverage usage, pricing configurations, and budget limits, following the same architectural patterns as the existing create-vn.js implementation.

The design emphasizes:
- Reusability of existing authentication and HTTP client infrastructure
- Comprehensive insurance benefit calculation logic
- Robust error handling and validation
- Configurable batch processing with rate limiting
- Detailed logging and result tracking

## Architecture

### High-Level Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐     ┌──────────────┐
│   CSV File  │────▶│ CSV Processor│────▶│ Order Creator   │────▶│ Cortex API   │
│  (Input)    │     │              │     │ + Benefit Calc  │     │  (GraphQL)   │
└─────────────┘     └──────────────┘     └─────────────────┘     └──────────────┘
                                                  │
                                                  ▼
                                         ┌─────────────────┐
                                         │ Token Manager   │
                                         │ (OAuth2)        │
                                         └─────────────────┘
                                                  │
                                                  ▼
                                         ┌─────────────────┐
                                         │ Results CSV     │
                                         │ (Output)        │
                                         └─────────────────┘
```

### Component Interaction Flow

```
┌──────────────┐
│ create-order-│
│   opd.js     │
│  (Main)      │
└──────┬───────┘
       │
       ├──▶ readCsvFile()
       │    └─ fast-csv parse
       │
       ├──▶ createTokenManager()
       │    └─ OAuth2 authentication
       │
       ├──▶ createCortexApiClient()
       │    └─ HTTP client with auth
       │
       ├──▶ For each CSV row:
       │    │
       │    ├──▶ buildOrderInput()
       │    │    └─ Transform CSV to GraphQL input
       │    │
       │    ├──▶ lookupProductPricing()
       │    │    └─ Determine unit price
       │    │
       │    ├──▶ calculateBenefits()
       │    │    └─ Compute insurance benefits
       │    │
       │    ├──▶ createOrder()
       │    │    └─ GraphQL mutation
       │    │
       │    └──▶ sleep(delay)
       │
       └──▶ writeResultsCsv()
            └─ Output results
```

## Components and Interfaces

### 1. CSV Processor

**Responsibility:** Read and parse CSV input files containing order data.

**Interface:**
```javascript
async function readCsvFile(csvPath: string): Promise<Array<OrderRow>>

type OrderRow = {
  en: string;                    // Encounter Number (required)
  productId: string;             // Product ID (required)
  quantity: string;              // Quantity (required)
  requestType?: string;          // MEDICATION | LAB | IMAGING | PROCEDURE
  insurancePlanId?: string;      // Insurance Plan ID for pricing lookup
  coverageUsageId?: string;      // Coverage Usage ID for benefit calculation
  visitClass?: string;           // OPD | IPD
  budgetLimit?: string;          // Budget limit for coverage
  budgetUsed?: string;           // Budget already used
}
```

**CSV Column Specification:**
- **Required columns:** `en`, `productId`, `quantity`
- **Optional columns:** `requestType`, `insurancePlanId`, `coverageUsageId`, `visitClass`, `budgetLimit`, `budgetUsed`

### 2. Order Creator

**Responsibility:** Create orders via GraphQL API with proper authentication.
**Interface:**
```shell
curl --request POST \
  --url https://demo-x.cortexcloud.co/cortex-api/graphql \
  --header 'authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJPaG4yR05IeGxfek55ejZaSE9IZ1B4Mzc2d0NGMElwdmo3Z0R2d1FhdlVvIn0.eyJleHAiOjE3NzAyODMzNTAsImlhdCI6MTc3MDI4MzA1MCwianRpIjoib25ydHJvOjc3NTIwNjIzLWFjZDEtM2ZiYy00NTlhLTk0MzU1YWMwYTA4OCIsImlzcyI6Imh0dHBzOi8vaWQtZGVtby14LmNvcnRleGNsb3VkLmNvL3JlYWxtcy9jb3J0ZXgiLCJhdWQiOlsicG9zdGdyZXN0IiwiY29ydGV4IiwidGhpbmtlaHItcmVzdCIsImZoaXIiLCJhY2NvdW50Il0sInN1YiI6IjQzMjgyMGRmLTlkYmMtNGI3Yy05ZmNmLWE2NTNjZTc4MjI0NyIsInR5cCI6IkJlYXJlciIsImF6cCI6ImNvcnRleC11aSIsInNpZCI6ImY0MGMwZGYwLTVmNzUtNjJmZS05ZDliLTFhZDA0OThhMTgzZSIsImFjciI6IjEiLCJhbGxvd2VkLW9yaWdpbnMiOlsiaHR0cDovL2xvY2FsaG9zdDo4MDgwIiwiaHR0cHM6Ly9kZW1vLXguY29ydGV4Y2xvdWQuY28iLCJodHRwOi8vbG9jYWxob3N0OjQyMDAiLCJodHRwOi8vbG9jYWxob3N0OjUxNzMiXSwicmVhbG1fYWNjZXNzIjp7InJvbGVzIjpbIlRoaW5rRUhSQWRtaW4iLCJFSFJCYXNlQWRtaW4iLCJvZmZsaW5lX2FjY2VzcyIsInN1cGVyLXVzZXIiLCJ1bWFfYXV0aG9yaXphdGlvbiIsIkVIUkJhc2VVc2VyIiwiZGVmYXVsdC1yb2xlcy1jb3J0ZXgiXX0sInJlc291cmNlX2FjY2VzcyI6eyJjb3J0ZXgiOnsicm9sZXMiOlsic3VwZXItdXNlciJdfSwidGhpbmtlaHItcmVzdCI6eyJyb2xlcyI6WyJST0xFX1ZJRVdfQURNSU4iLCJST0xFX1dSSVRFX0VIUiIsIlJPTEVfUFJFU0VOVEFUSU9OIiwiUk9MRV9VU0VSX0FETUlOIiwiUk9MRV9XUklURV9HRU5FUkFURUQiLCJST0xFX1FVRVJZIiwiUk9MRV9URU1QTEFURV9BRE1JTiIsIlJPTEVfRVZFTlRfQURNSU4iLCJST0xFX1ZJRVciLCJST0xFX1dSSVRFIiwiUk9MRV9SRUFEIiwiUk9MRV9GT1JNX0FETUlOIl19LCJmaGlyIjp7InJvbGVzIjpbIkZISVJBZG1pbiIsIkZISVJDb3J0ZXhSZWFkV3JpdGUiXX0sInBvc3RncmVzdCI6eyJyb2xlcyI6WyJwb3N0Z3Jlc3RfZW1yX3JlYWRfd3JpdGUiXX0sImFjY291bnQiOnsicm9sZXMiOlsibWFuYWdlLWFjY291bnQiLCJtYW5hZ2UtYWNjb3VudC1saW5rcyIsInZpZXctcHJvZmlsZSJdfX0sInNjb3BlIjoiZW1haWwgcHJvZmlsZSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJwcmVmaXgiOiLguJnguLLguIciLCJodHRwczovL2NvcnRleGNsb3VkLmNvL2p3dC9jbGFpbSI6eyJ4LWNvcnRleC1vcmctaWQiOiI4Yjc0YTIxNC00YmJkLTQ4ZDQtOTUzYS1kZjJjNjVlNWMxODEiLCJ4LWNvcnRleC1vcmctbmFtZSI6ImNvcnRleCJ9LCJuYW1lIjoidXNlcjEgZXhhbXBsZSIsInByZWZlcnJlZF91c2VybmFtZSI6InVzZXIxIiwiZmhpckdyb3VwcyI6WyJGSElSQWRtaW4iLCJGSElSQ29ydGV4UmVhZFdyaXRlIl0sImdpdmVuX25hbWUiOiJ1c2VyMSIsImZhbWlseV9uYW1lIjoiZXhhbXBsZSIsImVtYWlsIjoidXNlcjFAZXhhbXBsZS5jb20ifQ.2_7ZWP7QqsF6jvTQrNFVGx4YU79L7aQgxba3KuPNCG6WuOis0Jjegqwx6ATqUAtxUpLEhjU68vGOU8Z6dlbRtRA2X1ZpoHtC3k9RAbOXJMig5iBLBvRX2ikf7lTo1DssPHN_ZeMvFV4KJvyX5h-MU6ei8JrgiiUPen30_oed1PgCug1SaA3OFMgrLNUdsdw5qKQoZ5sc63Guf-pMEaxgpKXl_tbud0GKU3uTkOLSvW9LPZYLwqJhqTaz1J5KXcziBvYWJHciXfiQfx8f2Yar42wd0CcF6J4hfNJKz6vt8GjTpvmo5l3I41TK6Z66WZIM2HIqeYLhOuuCuytcXhPpXg' \
  --header 'content-type: application/json' \
  --data '{"query":"mutation CreateVisit($input: CreateVisitInput!) {\n  createVisit(input: $input) {\n    vn\n    hn\n    active\n    latestStatusCode\n    coverageUsages {\n      id\n      insurancePlanId\n      priority\n    }\n  }\n}","variables":"{\n  \"input\": {\n    \"hn\": \"6903069\",\n    \"source\": \"kiosk\",\n    \"encounterInput\": [\n      {\n        \"encounterType\": \"WALK_IN\",\n        \"walkInTarget\": {\n          \"clinicId\": 1\n        },\n        \"insurancePlanIds\": [1]\n      }/*,\n      {\n        \"encounterType\": \"WALK_IN\",\n        \"walkInTarget\": {\n          \"clinicId\": 2\n        },\n        \"insurancePlanIds\": [1]\n      }*/\n    ],\n    \"coverageInput\": [\n      {\n        \"insurancePlanId\": 1,\n        \"priority\": 10,\n        \"isChecked\": true\n      }\n    ],\n    \"preferReceivePostalPrescription\": true\n  }\n}"}'
```



**Interface:**
```javascript
async function createOrder(
  cortexApiClient: CortexApiClient,
  input: OrderInput,
  logger: Logger
): Promise<OrderResult>

type OrderInput = {
  en: string;
  productId: number;
  quantity: number;
  requestType: string;
  unitPrice: number;
  totalPriceBeforeBenefit: number;
  totalBenefit: number;
  totalCredit: number;
  totalNoneBenefit: number;
  totalDiscount: number;
  totalNetPaid: number;
}

type OrderResult = {
  success: boolean;
  orderId?: string;
  errors?: Array<GraphQLError>;
}
```

**GraphQL Mutation:**
```graphql
mutation CreateOrder($input: CreateOrderInput!) {
  createOrder(input: $input) {
    id
    en
    productId
    quantity
    requestType
    unitPrice
    totalPriceBeforeBenefit
    totalBenefit
    totalCredit
    totalNoneBenefit
    totalDiscount
    totalNetPaid
    latestStatusCode
  }
}
```

### 3. Benefit Calculator

**Responsibility:** Calculate insurance benefits based on pricing and coverage.

**Interface:**
```javascript
function calculateBenefits(
  unitPrice: number,
  quantity: number,
  coverageInfo: CoverageInfo
): BenefitCalculation

type CoverageInfo = {
  insurancePlanId: number;
  budgetLimit?: number;
  budgetUsed?: number;
  isCredit: boolean;
  priority: number;
}

type BenefitCalculation = {
  totalPriceBeforeBenefit: number;
  totalBenefit: number;
  totalCredit: number;
  totalNoneBenefit: number;
  totalDiscount: number;
  totalNetPaid: number;
}
```

**Calculation Logic:**
```
1. totalPriceBeforeBenefit = unitPrice × quantity
2. budgetRemaining = budgetLimit - budgetUsed
3. maxBenefit = min(totalPriceBeforeBenefit, budgetRemaining)
4. IF isCredit THEN
     totalCredit = maxBenefit
     totalBenefit = 0
   ELSE
     totalBenefit = maxBenefit
     totalCredit = 0
5. totalNoneBenefit = totalPriceBeforeBenefit - totalBenefit - totalCredit
6. totalNetPaid = totalNoneBenefit - totalDiscount
```

### 4. Pricing Lookup

**Responsibility:** Determine the correct unit price based on insurance plan and product.

**Interface:**
```javascript
async function lookupProductPricing(
  cortexApiClient: CortexApiClient,
  productId: number,
  insurancePlanId?: number,
  visitClass?: string
): Promise<PricingResult>

type PricingResult = {
  unitPrice: number;
  source: 'insurance_plan' | 'benefit_plan' | 'default';
  benefitLimitPerUnit?: number;
}
```

**Lookup Priority:**
1. Query `product_insurance_plan_benefit_item` filtered by productId, insurancePlanId, visitClass
2. If not found, query `product_benefit_plan_item` filtered by productId, visitClass
3. If not found, use `product.default_unit_price`

**GraphQL Query:**
```graphql
query GetProductPricing($productId: Int!, $insurancePlanId: Int, $visitClass: String) {
  productInsurancePlanBenefitItems(
    where: {
      productId: { _eq: $productId }
      insurancePlanId: { _eq: $insurancePlanId }
      _or: [
        { visitClass: { _eq: $visitClass } }
        { isForAllVisitClass: { _eq: true } }
      ]
    }
  ) {
    benefitLimitPerUnit
  }
  
  productBenefitPlanItems(
    where: {
      productId: { _eq: $productId }
      _or: [
        { visitClass: { _eq: $visitClass } }
        { isForAllVisitClass: { _eq: true } }
      ]
    }
  ) {
    benefitLimitPerUnit
  }
  
  product(id: $productId) {
    defaultUnitPrice
  }
}
```

### 5. Input Transformer

**Responsibility:** Transform CSV row data into GraphQL mutation input.

**Interface:**
```javascript
function buildOrderInput(row: OrderRow, pricingResult: PricingResult, benefitCalc: BenefitCalculation): OrderInput
```

**Transformation Rules:**
- Parse numeric strings to numbers
- Default requestType to 'MEDICATION' if not provided
- Validate EN format
- Validate quantity > 0
- Validate productId is numeric

### 6. Results Writer

**Responsibility:** Write order creation results to output CSV file.

**Interface:**
```javascript
async function writeResultsCsv(
  results: Array<OrderResultRow>,
  outputPath: string
): Promise<void>

type OrderResultRow = {
  en: string;
  productId: number;
  orderId?: string;
  requestType: string;
  status: 'success' | 'failed';
  errorMessage?: string;
  totalNetPaid?: number;
}
```

## Data Models

### CSV Input Schema

```csv
en,productId,quantity,requestType,insurancePlanId,coverageUsageId,visitClass,budgetLimit,budgetUsed
EN-2024-001,123,10,MEDICATION,67,,OPD,10000,2000
EN-2024-002,456,1,LAB,67,,OPD,10000,2500
EN-2024-003,789,5,PROCEDURE,182,,IPD,50000,15000
```

### GraphQL Input Type

```graphql
input CreateOrderInput {
  en: String!
  productId: Int!
  quantity: Float!
  requestType: RequestType!
  unitPrice: Float!
  totalPriceBeforeBenefit: Float!
  totalBenefit: Float!
  totalCredit: Float!
  totalNoneBenefit: Float!
  totalDiscount: Float!
  totalNetPaid: Float!
}

enum RequestType {
  MEDICATION
  LAB
  IMAGING
  PROCEDURE
}
```

### Output CSV Schema

```csv
en,productId,orderId,requestType,status,totalNetPaid,errorMessage
EN-2024-001,123,ORD-001,MEDICATION,success,0,
EN-2024-002,456,ORD-002,LAB,success,150,
EN-2024-003,789,,PROCEDURE,failed,,"Product not found"
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property 1: CSV Reading Completeness
*For any* valid CSV file with N rows, reading the file should return an array with N-1 order objects (excluding the header row).
**Validates: Requirements 1.1, 1.4**

### Property 2: CSV Header Parsing
*For any* CSV file, the first row should be used as column headers, and all subsequent rows should have properties matching those headers.
**Validates: Requirements 1.2**

### Property 3: Invalid Row Skipping
*For any* CSV row missing required fields (en, productId, or quantity), that row should be skipped and not included in the output array.
**Validates: Requirements 1.3, 7.1**

### Property 4: Authentication Token Presence
*For any* API request made by the Order_System, the request should include a Bearer token in the Authorization header.
**Validates: Requirements 2.1**

### Property 5: Required Fields in Mutation
*For any* createOrder mutation call, the input should include en, productId, quantity, and requestType fields.
**Validates: Requirements 2.2**

### Property 6: Sequential Processing with Delay
*For any* list of N orders processed with delay D, the time between processing order i and order i+1 should be at least D milliseconds.
**Validates: Requirements 2.5, 8.3**

### Property 7: Pricing Lookup Priority
*For any* product and insurance plan combination, the pricing lookup should return the benefit_limit_per_unit from product_insurance_plan_benefit_item if it exists, otherwise from product_benefit_plan_item if it exists, otherwise the product default_unit_price.
**Validates: Requirements 3.1, 3.2, 3.3, 3.5**

### Property 8: Visit Class Filtering
*For any* pricing lookup with a specified visit class, only pricing records matching that visit class or marked as is_for_all_visit_class should be considered.
**Validates: Requirements 3.4**

### Property 9: Total Price Calculation
*For any* unit price P and quantity Q, the totalPriceBeforeBenefit should equal P × Q.
**Validates: Requirements 4.1**

### Property 10: Budget-Aware Benefit Allocation
*For any* order with totalPriceBeforeBenefit T and remaining budget B, if B ≥ T then totalBenefit should equal T and totalNoneBenefit should equal 0, otherwise totalBenefit should equal B and totalNoneBenefit should equal T - B.
**Validates: Requirements 4.2, 4.3, 4.4**

### Property 11: Credit vs Benefit Distinction
*For any* insurance plan marked as credit type, the totalCredit should equal the calculated benefit amount and totalBenefit should equal 0; for non-credit plans, totalBenefit should equal the calculated benefit amount and totalCredit should equal 0.
**Validates: Requirements 4.5**

### Property 12: Net Paid Calculation
*For any* totalNoneBenefit N and totalDiscount D, the totalNetPaid should equal N - D.
**Validates: Requirements 4.6**

### Property 13: Coverage Priority Sorting
*For any* list of coverage_usage records, when applying benefits, the coverages should be processed in ascending order of their priority values.
**Validates: Requirements 5.2**

### Property 14: Cascading Benefit Allocation
*For any* order where the primary coverage budget is insufficient, the remaining amount should be allocated to the next priority coverage until all coverages are exhausted or the full amount is covered.
**Validates: Requirements 5.3, 5.5**

### Property 15: Request Type Validation
*For any* order creation request, the requestType should be one of: MEDICATION, LAB, IMAGING, or PROCEDURE.
**Validates: Requirements 6.1, 6.4**

### Property 16: Request Type Default
*For any* CSV row without a requestType specified, the order should be created with requestType set to MEDICATION.
**Validates: Requirements 6.3**

### Property 17: Request Type Preservation
*For any* CSV row with a requestType specified, the created order should have the same requestType value.
**Validates: Requirements 6.2, 6.5**

### Property 18: Error Recovery Continuation
*For any* batch of N orders where order i fails, orders i+1 through N should still be processed.
**Validates: Requirements 7.2**

### Property 19: Configuration Parameter Defaults
*For any* execution without specified delay or batch-size parameters, the system should use 100ms delay and batch size of 1.
**Validates: Requirements 8.4, 8.5**

### Property 20: Comprehensive Logging
*For any* order creation attempt, the log should contain the row number, EN, and product ID; successful attempts should also log the order ID, and failed attempts should also log the error message.
**Validates: Requirements 9.1, 9.2**

### Property 21: Summary Accuracy
*For any* batch processing of N orders with S successes and F failures, the summary should show S + F = N.
**Validates: Requirements 7.5, 9.4**

### Property 22: Output CSV Completeness
*For any* batch of processed orders, the output CSV should contain one row per order with columns: EN, productId, orderId (if successful), requestType, status, and errorMessage (if failed).
**Validates: Requirements 10.1, 10.2, 10.3**

### Property 23: Output File Naming
*For any* input file path P, the output file should be created at the same directory with the name derived from P by appending "-results.csv", or if that file exists, appending a timestamp before the extension.
**Validates: Requirements 10.4, 10.5**

## Error Handling

### Validation Errors

**Missing Required Fields:**
- Check for presence of `en`, `productId`, and `quantity` in each CSV row
- Log warning with row number and missing field names
- Skip row and continue processing

**Invalid Data Types:**
- Validate `productId` and `quantity` are numeric
- Validate `quantity` is positive
- Log error and skip row if validation fails

**Invalid Request Type:**
- Validate `requestType` is one of the supported enum values
- Default to 'MEDICATION' if not provided
- Reject row if provided value is invalid

### API Errors

**Authentication Failures:**
- Retry token acquisition once using TokenManager
- If retry fails, log error and exit process
- Do not continue processing without valid authentication

**GraphQL Errors:**
- Parse error response from API
- Log error details including error code and message
- Mark order as failed in results
- Continue processing remaining orders

**Network Errors:**
- Catch network timeout and connection errors
- Log error with request details
- Mark order as failed
- Continue processing remaining orders

### Data Errors

**Product Not Found:**
- Log error indicating product ID does not exist
- Mark order as failed
- Continue processing

**Coverage Not Found:**
- Log warning if coverage usage ID is provided but not found
- Fall back to default pricing without benefits
- Continue processing

**Budget Exceeded:**
- Calculate partial benefit based on remaining budget
- Set totalNoneBenefit for amount exceeding budget
- Continue processing (not an error condition)

### File System Errors

**Input File Not Found:**
- Log error with file path
- Exit process with error code

**Output File Write Error:**
- Log error with file path and system error
- Attempt to write to alternative location (temp directory)
- If alternative fails, log results to console only

## Testing Strategy

### Dual Testing Approach

The testing strategy employs both unit tests and property-based tests to ensure comprehensive coverage:

**Unit Tests** focus on:
- Specific examples of benefit calculations with known inputs and outputs
- Edge cases like zero quantity, missing optional fields, empty CSV files
- Error conditions like invalid product IDs, authentication failures
- Integration points between CSV processor and order creator
- File I/O operations for reading CSV and writing results

**Property-Based Tests** focus on:
- Universal properties that hold for all valid inputs
- Benefit calculation correctness across random price and quantity combinations
- CSV parsing behavior across randomly generated CSV files
- Pricing lookup priority across various data availability scenarios
- Budget allocation logic across random budget and price combinations

### Property Test Configuration

- **Test Library:** fast-check (JavaScript property-based testing library)
- **Minimum Iterations:** 100 runs per property test
- **Test Tagging:** Each property test must reference its design document property number
- **Tag Format:** `// Feature: create-order-opd, Property {number}: {property_text}`

### Example Property Test Structure

```javascript
// Feature: create-order-opd, Property 9: Total Price Calculation
test('totalPriceBeforeBenefit equals unitPrice × quantity', () => {
  fc.assert(
    fc.property(
      fc.float({ min: 0.01, max: 10000 }), // unitPrice
      fc.integer({ min: 1, max: 1000 }),   // quantity
      (unitPrice, quantity) => {
        const result = calculateBenefits(unitPrice, quantity, {});
        expect(result.totalPriceBeforeBenefit).toBeCloseTo(unitPrice * quantity, 2);
      }
    ),
    { numRuns: 100 }
  );
});
```

### Test Coverage Goals

- **Unit Test Coverage:** Minimum 80% code coverage
- **Property Test Coverage:** All 23 correctness properties must have corresponding property tests
- **Integration Tests:** End-to-end tests covering CSV input → API calls → CSV output
- **Error Path Coverage:** All error handling paths must be tested

### Testing Priorities

1. **Critical Path:** Benefit calculation logic (Properties 9-12)
2. **High Priority:** CSV processing and API integration (Properties 1-6)
3. **Medium Priority:** Configuration and logging (Properties 19-21)
4. **Low Priority:** File naming and output formatting (Properties 22-23)

## Implementation Notes

### Reusing Existing Infrastructure

The implementation should leverage existing components from create-vn.js:

- **TokenManager:** Reuse for OAuth2 authentication
- **CortexApiClient:** Reuse for HTTP client with Bearer token
- **Logger:** Reuse for consistent logging format
- **requireEnv:** Reuse for environment variable validation

### Performance Considerations

- **Batch Processing:** Process orders sequentially to avoid overwhelming the API
- **Rate Limiting:** Use configurable delay between requests (default 100ms)
- **Memory Efficiency:** Stream CSV reading to handle large files
- **Connection Pooling:** Reuse HTTP connections via axios client

### Configuration

Environment variables required (same as create-vn.js):
- `OAUTH2_TOKEN_URL`: OAuth2 token endpoint
- `CLIENT_ID`: Client ID for authentication
- `CLIENT_SECRET`: Client secret for authentication
- `CORTEX_API_URL`: Base URL for Cortex API

CLI options:
- `--input, -i`: Path to input CSV file (required)
- `--output, -o`: Path to output CSV file (optional, defaults to input path + "-results.csv")
- `--delay`: Delay between requests in milliseconds (default: 100)
- `--batch-size, -b`: Number of orders to process in parallel (default: 1)
- `--verbose, -v`: Enable verbose logging
- `--log-file, -l`: Path to log file (optional)

### Future Enhancements

- Support for multiple coverage priority handling in a single order
- Discount calculation integration
- Real-time budget tracking via API queries
- Parallel batch processing for improved performance
- Retry logic for transient API failures
- Progress bar for large batch processing
