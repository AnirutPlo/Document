# Implementation Plan: Create Order OPD

## Overview

This implementation plan breaks down the create-order-opd feature into discrete coding tasks. The approach follows the same patterns as the existing create-vn.js implementation, reusing authentication, HTTP client, and logging infrastructure. Tasks are organized to build incrementally, with early validation through property-based tests for critical benefit calculation logic.

## Tasks

- [ ] 1. Set up project structure and dependencies
  - Create `src/gen-mock/order/create-order-opd.js` file
  - Add fast-check dependency to package.json for property-based testing
  - Create sample CSV file `src/gen-mock/order/orders-sample.csv` with example data
  - _Requirements: 1.5, 8.1, 8.2_

- [ ] 2. Implement CSV processor
  - [ ] 2.1 Create readCsvFile function using fast-csv
    - Read CSV file from provided path
    - Parse with headers: true option
    - Return array of row objects
    - _Requirements: 1.1, 1.2, 1.4_
  
  - [ ]* 2.2 Write property test for CSV reading completeness
    - **Property 1: CSV Reading Completeness**
    - **Validates: Requirements 1.1, 1.4**
  
  - [ ] 2.3 Add validation for required fields
    - Check for presence of en, productId, quantity in each row
    - Skip rows with missing required fields
    - Log warning with row number and missing fields
    - _Requirements: 1.3, 7.1_
  
  - [ ]* 2.4 Write property test for invalid row skipping
    - **Property 3: Invalid Row Skipping**
    - **Validates: Requirements 1.3, 7.1**

- [ ] 3. Implement benefit calculator module
  - [ ] 3.1 Create calculateBenefits function
    - Accept unitPrice, quantity, coverageInfo parameters
    - Calculate totalPriceBeforeBenefit = unitPrice × quantity
    - Calculate budget remaining from budgetLimit and budgetUsed
    - Allocate benefits based on remaining budget
    - Handle credit vs benefit distinction based on isCredit flag
    - Calculate totalNoneBenefit and totalNetPaid
    - Return BenefitCalculation object
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_
  
  - [ ]* 3.2 Write property test for total price calculation
    - **Property 9: Total Price Calculation**
    - **Validates: Requirements 4.1**
  
  - [ ]* 3.3 Write property test for budget-aware benefit allocation
    - **Property 10: Budget-Aware Benefit Allocation**
    - **Validates: Requirements 4.2, 4.3, 4.4**
  
  - [ ]* 3.4 Write property test for credit vs benefit distinction
    - **Property 11: Credit vs Benefit Distinction**
    - **Validates: Requirements 4.5**
  
  - [ ]* 3.5 Write property test for net paid calculation
    - **Property 12: Net Paid Calculation**
    - **Validates: Requirements 4.6**

- [ ] 4. Checkpoint - Ensure benefit calculation tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Implement pricing lookup module
  - [ ] 5.1 Create lookupProductPricing function
    - Accept cortexApiClient, productId, insurancePlanId, visitClass parameters
    - Query product_insurance_plan_benefit_item with filters
    - If not found, query product_benefit_plan_item with filters
    - If not found, query product.default_unit_price
    - Return PricingResult with unitPrice and source
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_
  
  - [ ]* 5.2 Write property test for pricing lookup priority
    - **Property 7: Pricing Lookup Priority**
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.5**
  
  - [ ]* 5.3 Write unit tests for visit class filtering
    - Test with OPD visit class
    - Test with IPD visit class
    - Test with is_for_all_visit_class flag
    - _Requirements: 3.4_

- [ ] 6. Implement order creator module
  - [ ] 6.1 Create GraphQL mutation constant
    - Define CREATE_ORDER_MUTATION with all required fields
    - Include response fields: id, en, productId, quantity, requestType, pricing fields, latestStatusCode
    - _Requirements: 2.2, 2.3_
  
  - [ ] 6.2 Create createOrder function
    - Accept cortexApiClient, input, logger parameters
    - Make POST request to /graphql endpoint
    - Include mutation and variables in request body
    - Parse response and extract order data
    - Handle GraphQL errors and return OrderResult
    - _Requirements: 2.1, 2.2, 2.3, 2.4_
  
  - [ ]* 6.3 Write property test for authentication token presence
    - **Property 4: Authentication Token Presence**
    - **Validates: Requirements 2.1**
  
  - [ ]* 6.4 Write unit tests for error handling
    - Test with mock API error responses
    - Test with network errors
    - Verify error logging and failed status
    - _Requirements: 2.4, 7.2_

- [ ] 7. Implement input transformer
  - [ ] 7.1 Create buildOrderInput function
    - Accept row, pricingResult, benefitCalc parameters
    - Parse numeric strings to numbers
    - Default requestType to 'MEDICATION' if not provided
    - Validate EN format (non-empty string)
    - Validate quantity > 0
    - Validate productId is numeric
    - Return OrderInput object
    - _Requirements: 6.2, 6.3, 6.4, 7.1_
  
  - [ ]* 7.2 Write property test for request type default
    - **Property 16: Request Type Default**
    - **Validates: Requirements 6.3**
  
  - [ ]* 7.3 Write property test for request type preservation
    - **Property 17: Request Type Preservation**
    - **Validates: Requirements 6.2, 6.5**
  
  - [ ]* 7.4 Write unit tests for request type validation
    - Test with valid request types (MEDICATION, LAB, IMAGING, PROCEDURE)
    - Test with invalid request type
    - _Requirements: 6.1, 6.4_

- [ ] 8. Implement results writer
  - [ ] 8.1 Create writeResultsCsv function
    - Accept results array and outputPath parameters
    - Use fast-csv to write CSV file
    - Include columns: en, productId, orderId, requestType, status, totalNetPaid, errorMessage
    - Handle file write errors gracefully
    - _Requirements: 10.1, 10.2, 10.3_
  
  - [ ]* 8.2 Write property test for output CSV completeness
    - **Property 22: Output CSV Completeness**
    - **Validates: Requirements 10.1, 10.2, 10.3**
  
  - [ ] 8.3 Create generateOutputPath function
    - Accept input file path
    - Generate output path by appending "-results.csv"
    - Check if file exists, append timestamp if needed
    - Return output file path
    - _Requirements: 10.4, 10.5_
  
  - [ ]* 8.4 Write property test for output file naming
    - **Property 23: Output File Naming**
    - **Validates: Requirements 10.4, 10.5**

- [ ] 9. Implement main processing loop
  - [ ] 9.1 Create CLI argument parser using yargs
    - Define options: input, output, delay, batch-size, verbose, log-file
    - Set required: input
    - Set defaults: delay=100, batch-size=1
    - Parse and validate arguments
    - _Requirements: 8.1, 8.2, 8.4, 8.5_
  
  - [ ] 9.2 Create main run function
    - Load environment variables using dotenv
    - Setup logger using setupLogger
    - Create TokenManager using requireEnv for credentials
    - Create CortexApiClient with baseURL and tokenManager
    - Read CSV file using readCsvFile
    - Initialize results array and counters
    - _Requirements: 2.1, 9.5_
  
  - [ ] 9.3 Implement order processing loop
    - Iterate through CSV rows
    - For each row: lookup pricing, calculate benefits, build input, create order
    - Log success with row number, EN, productId, orderId
    - Log failure with row number, EN, productId, error message
    - Add result to results array
    - Sleep for specified delay between requests
    - Continue processing on errors
    - _Requirements: 2.5, 7.2, 9.1, 9.2_
  
  - [ ]* 9.4 Write property test for sequential processing with delay
    - **Property 6: Sequential Processing with Delay**
    - **Validates: Requirements 2.5, 8.3**
  
  - [ ]* 9.5 Write property test for error recovery continuation
    - **Property 18: Error Recovery Continuation**
    - **Validates: Requirements 7.2**

- [ ] 10. Implement summary and output generation
  - [ ] 10.1 Create displaySummary function
    - Calculate total processed, success count, failure count
    - Display formatted summary table
    - List created order IDs with their ENs
    - _Requirements: 7.5, 9.4_
  
  - [ ]* 10.2 Write property test for summary accuracy
    - **Property 21: Summary Accuracy**
    - **Validates: Requirements 7.5, 9.4**
  
  - [ ] 10.3 Add output CSV generation to main function
    - Generate output path using generateOutputPath
    - Write results using writeResultsCsv
    - Log output file location
    - Handle write errors gracefully
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [ ] 11. Add comprehensive logging
  - [ ] 11.1 Implement verbose logging mode
    - Log request details when verbose is enabled
    - Log response details when verbose is enabled
    - Log pricing lookup details
    - Log benefit calculation details
    - _Requirements: 9.3_
  
  - [ ]* 11.2 Write property test for comprehensive logging
    - **Property 20: Comprehensive Logging**
    - **Validates: Requirements 9.1, 9.2**

- [ ] 12. Implement multiple coverage priority handling
  - [ ] 12.1 Create getCoverageUsages function
    - Query coverage_usage records for given VN/AN
    - Filter for active coverages
    - Sort by priority in ascending order
    - Return array of CoverageInfo objects
    - _Requirements: 5.1, 5.2_
  
  - [ ]* 12.2 Write property test for coverage priority sorting
    - **Property 13: Coverage Priority Sorting**
    - **Validates: Requirements 5.2**
  
  - [ ] 12.3 Implement cascading benefit allocation
    - Iterate through sorted coverages
    - Apply benefits from each coverage until amount is covered or coverages exhausted
    - Create benefit record for each coverage used
    - Set totalNoneBenefit for remaining amount
    - _Requirements: 5.3, 5.4, 5.5_
  
  - [ ]* 12.4 Write property test for cascading benefit allocation
    - **Property 14: Cascading Benefit Allocation**
    - **Validates: Requirements 5.3, 5.5**

- [ ] 13. Add authentication retry logic
  - [ ] 13.1 Implement token retry in createOrder function
    - Catch authentication errors
    - Invalidate token using tokenManager.invalidate()
    - Retry request once with new token
    - Fail if second attempt fails
    - _Requirements: 7.3_
  
  - [ ]* 13.2 Write unit tests for authentication retry
    - Test with mock auth failure followed by success
    - Test with two consecutive auth failures
    - _Requirements: 7.3_

- [ ] 14. Final checkpoint - Integration testing
  - [ ] 14.1 Create integration test with sample CSV
    - Use orders-sample.csv with various scenarios
    - Mock Cortex API responses
    - Verify end-to-end flow from CSV input to results output
    - Verify all success and error paths
    - _Requirements: All_
  
  - [ ] 14.2 Test with edge cases
    - Empty CSV file
    - CSV with all invalid rows
    - CSV with mixed valid and invalid rows
    - Large CSV file (1000+ rows)
    - _Requirements: 7.1, 7.2, 7.5_
  
  - [ ] 14.3 Ensure all tests pass
    - Run all unit tests
    - Run all property tests (minimum 100 iterations each)
    - Verify code coverage meets 80% threshold
    - Ensure all tests pass, ask the user if questions arise.

- [ ] 15. Create documentation
  - [ ] 15.1 Create README.md for the order module
    - Document CSV input format with column descriptions
    - Document CLI usage with examples
    - Document environment variables required
    - Document output CSV format
    - Include troubleshooting section
  
  - [ ] 15.2 Add inline code documentation
    - Add JSDoc comments to all functions
    - Document function parameters and return types
    - Add examples for complex functions
    - Document error conditions

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at critical milestones
- Property tests validate universal correctness properties with minimum 100 iterations
- Unit tests validate specific examples, edge cases, and error conditions
- The implementation reuses existing infrastructure (TokenManager, CortexApiClient, Logger) from create-vn.js
- Integration tests verify end-to-end functionality before completion
