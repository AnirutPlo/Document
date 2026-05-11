# Requirements Document: Create Order OPD

## Introduction

This feature implements a JavaScript-based workflow for creating OPD (Outpatient Department) orders with insurance benefit calculations. The system reads encounter data from CSV files, creates medication/lab/procedure orders through GraphQL API, and calculates insurance benefits based on coverage usage, pricing configurations, and budget limits.

The feature integrates with the existing visit/encounter creation workflow and follows the same architectural patterns as the create-vn.js implementation.

## Glossary

- **OPD**: Outpatient Department - medical services provided without hospital admission
- **EN**: Encounter Number - unique identifier for a patient encounter
- **VN**: Visit Number - unique identifier for a patient visit
- **HN**: Hospital Number - unique identifier for a patient
- **Order_System**: The system that creates and manages medical orders
- **Benefit_Calculator**: Component that calculates insurance benefits and pricing
- **CSV_Processor**: Component that reads and parses CSV input files
- **Coverage_Usage**: Insurance coverage allocation for a specific visit
- **Charge_Item**: Billable item created from an order
- **Request_Type**: Category of medical order (MEDICATION, LAB, IMAGING, PROCEDURE)
- **Unit_Price**: Price per unit of a product or service
- **Benefit_Limit**: Maximum amount covered by insurance per unit
- **Budget_Limit**: Total coverage budget available for a visit
- **Credit**: Insurance payment collected directly by hospital (not benefit)
- **GraphQL_Client**: HTTP client for making authenticated GraphQL API requests

## Requirements

### Requirement 1: CSV Input Processing

**User Story:** As a system operator, I want to read order data from CSV files, so that I can batch-create multiple orders efficiently.

#### Acceptance Criteria

1. WHEN a CSV file path is provided, THE CSV_Processor SHALL read all rows using the fast-csv library
2. WHEN parsing CSV data, THE CSV_Processor SHALL use the first row as column headers
3. WHEN a required column is missing from a row, THE CSV_Processor SHALL skip that row and log a warning
4. WHEN all rows are processed, THE CSV_Processor SHALL return an array of order input objects
5. THE CSV file SHALL contain columns: EN, productId, quantity, requestType, and optional insurance-related columns

### Requirement 2: GraphQL Order Creation

**User Story:** As a system operator, I want to create orders via GraphQL API, so that orders are properly recorded in the Cortex system.

#### Acceptance Criteria

1. WHEN creating an order, THE Order_System SHALL authenticate using OAuth2 Bearer token
2. WHEN the createOrder mutation is called, THE Order_System SHALL include EN, productId, quantity, and requestType
3. WHEN the API returns success, THE Order_System SHALL extract the order ID and status from the response
4. IF the API returns errors, THEN THE Order_System SHALL log the error details and mark the order as failed
5. WHEN multiple orders are created, THE Order_System SHALL process them sequentially with configurable delay

### Requirement 3: Product Pricing Lookup

**User Story:** As a billing administrator, I want the system to determine correct product pricing, so that charges reflect the appropriate insurance plan rates.

#### Acceptance Criteria

1. WHEN looking up product price, THE Benefit_Calculator SHALL first check product_insurance_plan_benefit_item table
2. IF insurance plan pricing is not found, THEN THE Benefit_Calculator SHALL check product_benefit_plan_item table
3. IF benefit plan pricing is not found, THEN THE Benefit_Calculator SHALL use the product default_unit_price
4. WHEN visit class is specified, THE Benefit_Calculator SHALL filter pricing by visit class or is_for_all_visit_class flag
5. THE Benefit_Calculator SHALL return the benefit_limit_per_unit as the unit price for benefit calculation

### Requirement 4: Insurance Benefit Calculation

**User Story:** As a billing administrator, I want accurate benefit calculations, so that patients are charged correctly and insurance claims are valid.

#### Acceptance Criteria

1. WHEN calculating benefits, THE Benefit_Calculator SHALL compute totalPriceBeforeBenefit as unitPrice multiplied by quantity
2. WHEN coverage has a budget_limit, THE Benefit_Calculator SHALL check remaining budget before allocating benefits
3. IF remaining budget is sufficient, THEN THE Benefit_Calculator SHALL set totalBenefit equal to totalPriceBeforeBenefit
4. IF remaining budget is insufficient, THEN THE Benefit_Calculator SHALL set totalBenefit to remaining budget and totalNoneBenefit to the excess amount
5. WHEN the insurance plan is credit type, THE Benefit_Calculator SHALL transfer totalBenefit to totalCredit and set totalBenefit to zero
6. THE Benefit_Calculator SHALL compute totalNetPaid as totalNoneBenefit minus totalDiscount

### Requirement 5: Multiple Coverage Priority Handling

**User Story:** As a billing administrator, I want to handle patients with multiple insurance coverages, so that benefits are applied in the correct priority order.

#### Acceptance Criteria

1. WHEN a patient has multiple coverage_usage records, THE Order_System SHALL retrieve all active coverages
2. WHEN applying benefits, THE Order_System SHALL sort coverages by priority in ascending order
3. WHEN the primary coverage budget is exhausted, THE Order_System SHALL apply remaining charges to the next priority coverage
4. THE Order_System SHALL create separate benefit records for each coverage used
5. WHEN all coverages are exhausted, THE Order_System SHALL set remaining amount as totalNoneBenefit

### Requirement 6: Order Request Type Support

**User Story:** As a healthcare provider, I want to create different types of orders, so that I can order medications, labs, imaging, and procedures.

#### Acceptance Criteria

1. THE Order_System SHALL support requestType values: MEDICATION, LAB, IMAGING, and PROCEDURE
2. WHEN requestType is provided in CSV, THE Order_System SHALL include it in the order creation request
3. IF requestType is not provided, THEN THE Order_System SHALL default to MEDICATION
4. WHEN creating an order, THE Order_System SHALL validate that requestType is one of the supported values
5. THE Order_System SHALL associate each order with its requestType for proper categorization

### Requirement 7: Error Handling and Validation

**User Story:** As a system operator, I want comprehensive error handling, so that I can identify and resolve issues quickly.

#### Acceptance Criteria

1. WHEN a required field is missing, THE Order_System SHALL log a validation error and skip that row
2. WHEN an API call fails, THE Order_System SHALL log the error response and continue processing remaining rows
3. WHEN authentication fails, THE Order_System SHALL retry token acquisition once before failing
4. IF a product is not found, THEN THE Order_System SHALL log a product lookup error
5. WHEN processing completes, THE Order_System SHALL display a summary showing total processed, successful, and failed orders

### Requirement 8: Batch Processing Configuration

**User Story:** As a system operator, I want to configure batch processing parameters, so that I can optimize performance and avoid API rate limits.

#### Acceptance Criteria

1. THE Order_System SHALL accept a delay parameter to control time between API requests
2. THE Order_System SHALL accept a batch-size parameter to control how many orders are processed in parallel
3. WHEN delay is specified, THE Order_System SHALL wait the specified milliseconds between requests
4. THE Order_System SHALL default to 100ms delay if not specified
5. THE Order_System SHALL default to batch size of 1 if not specified

### Requirement 9: Output and Logging

**User Story:** As a system operator, I want detailed logging and output, so that I can track order creation progress and results.

#### Acceptance Criteria

1. WHEN an order is created successfully, THE Order_System SHALL log the row number, EN, product ID, and created order ID
2. WHEN an order fails, THE Order_System SHALL log the row number, EN, product ID, and error message
3. WHEN verbose mode is enabled, THE Order_System SHALL log detailed request and response data
4. WHEN processing completes, THE Order_System SHALL display a summary table with success and failure counts
5. IF a log file path is provided, THEN THE Order_System SHALL write all logs to the specified file

### Requirement 10: CSV Output Generation

**User Story:** As a system operator, I want to generate output CSV files with order results, so that I can track created orders and use them in downstream workflows.

#### Acceptance Criteria

1. WHEN orders are created successfully, THE Order_System SHALL write results to an output CSV file
2. THE output CSV SHALL contain columns: EN, productId, orderId, requestType, status
3. WHEN an order fails, THE Order_System SHALL include the error message in the status column
4. THE Order_System SHALL create the output file in the same directory as the input file with suffix "-results.csv"
5. WHEN the output file already exists, THE Order_System SHALL append a timestamp to avoid overwriting
