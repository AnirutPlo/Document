# Requirements Document

## Introduction

ระบบ Mock Data Script เป็นเครื่องมือสำหรับการจัดการข้อมูลทดสอบในระบบ EMR (Electronic Medical Record) โดยมีความสามารถในการ setup ข้อมูล master data จาก CSV files และสร้างข้อมูล mock patients ผ่าน API ระบบรองรับการทำงานแบบ modular และสามารถเลือก setup เฉพาะ module หรือ entity ที่ต้องการได้

## Glossary

- **Setup_Script**: สคริปต์หลักที่ใช้ในการนำเข้าข้อมูล master data จาก CSV files เข้าสู่ database และ APIs
- **Gen_Mock_Script**: สคริปต์สำหรับสร้างข้อมูล mock patients โดยใช้ Faker library
- **Doctor_Script**: สคริปต์สำหรับตรวจสอบความพร้อมของระบบและ configuration
- **Module**: กลุ่มของ entities ที่เกี่ยวข้องกัน เช่น demographic, general, coverage
- **Entity**: ข้อมูล master data แต่ละประเภท เช่น nationality, occupation, branch
- **Skip_Records_Tracker**: ระบบติดตามและบันทึกรายการข้อมูลที่ไม่สามารถนำเข้าได้
- **Token_Manager**: ระบบจัดการ OAuth2 access tokens สำหรับการเรียก APIs
- **Data_Directory**: โฟลเดอร์ที่เก็บ CSV files สำหรับการนำเข้าข้อมูล
- **Batch_Processing**: การประมวลผลข้อมูลเป็นกลุ่มๆ เพื่อเพิ่มประสิทธิภาพ

## Requirements

### Requirement 1

**User Story:** As a developer, I want to understand the complete workflow of mock data scripts, so that I can effectively use and maintain the system

#### Acceptance Criteria

1. THE Setup_Script SHALL provide three execution modes: all, modules, and entity
2. WHEN a user runs Setup_Script with mode "all", THE Setup_Script SHALL execute all available modules sequentially
3. WHEN a user runs Setup_Script with mode "modules", THE Setup_Script SHALL execute only the specified modules
4. WHEN a user runs Setup_Script with mode "entity", THE Setup_Script SHALL execute only the specified entities
5. THE Setup_Script SHALL validate command line arguments before execution

### Requirement 2

**User Story:** As a developer, I want to visualize the workflow diagram, so that I can quickly understand the system architecture and data flow

#### Acceptance Criteria

1. THE workflow_diagram SHALL illustrate the complete execution flow from script initialization to completion
2. THE workflow_diagram SHALL show decision points for different execution modes
3. THE workflow_diagram SHALL display the relationship between modules and entities
4. THE workflow_diagram SHALL indicate external dependencies such as PostgreSQL, APIs, and OAuth2
5. THE workflow_diagram SHALL use Mermaid syntax for easy rendering

### Requirement 3

**User Story:** As a developer, I want clear documentation of command usage, so that I can run the scripts with correct parameters

#### Acceptance Criteria

1. THE documentation SHALL provide command examples for all three scripts: setup, gen-mock, and doctor
2. THE documentation SHALL explain all available command line options with their aliases
3. THE documentation SHALL include examples for common use cases
4. THE documentation SHALL specify required environment variables
5. THE documentation SHALL document the expected data directory structure

### Requirement 4

**User Story:** As a system administrator, I want to verify system health before running scripts, so that I can ensure all dependencies are available

#### Acceptance Criteria

1. THE Doctor_Script SHALL check all required environment variables
2. THE Doctor_Script SHALL verify PostgreSQL database connectivity
3. THE Doctor_Script SHALL validate OAuth2 token acquisition
4. THE Doctor_Script SHALL test API endpoints availability (Cortex API, Demographic API)
5. THE Doctor_Script SHALL verify Keycloak service availability
6. WHEN any check fails, THE Doctor_Script SHALL report the failure with descriptive error messages
7. WHEN all checks pass, THE Doctor_Script SHALL exit with status code 0

### Requirement 5

**User Story:** As a developer, I want to setup master data from CSV files, so that I can populate the database with reference data

#### Acceptance Criteria

1. THE Setup_Script SHALL read CSV files from the specified data directory
2. THE Setup_Script SHALL establish PostgreSQL database connection before processing
3. THE Setup_Script SHALL create Token_Manager for API authentication
4. WHEN processing modules, THE Setup_Script SHALL execute entities in the correct dependency order
5. THE Setup_Script SHALL use Skip_Records_Tracker to log records that fail to import
6. WHEN import completes, THE Setup_Script SHALL generate a skip records report
7. IF total skipped records exceed zero, THE Setup_Script SHALL save the report to a log file

### Requirement 6

**User Story:** As a developer, I want to generate mock patient data, so that I can test the system with realistic patient records

#### Acceptance Criteria

1. THE Gen_Mock_Script SHALL accept count parameter to specify number of patients to generate
2. THE Gen_Mock_Script SHALL accept batch parameter to control API call batch size
3. THE Gen_Mock_Script SHALL use Faker library to generate realistic patient data
4. THE Gen_Mock_Script SHALL authenticate with Demographic API using Token_Manager
5. THE Gen_Mock_Script SHALL process patient creation in batches
6. THE Gen_Mock_Script SHALL write generated patient data to CSV files in output directory
7. WHEN generation completes, THE Gen_Mock_Script SHALL log summary statistics

### Requirement 7

**User Story:** As a developer, I want detailed logging during script execution, so that I can troubleshoot issues effectively

#### Acceptance Criteria

1. THE Setup_Script SHALL support optional log file parameter for persistent logging
2. THE Setup_Script SHALL support verbose flag for detailed logging output
3. THE Setup_Script SHALL log start and completion of each module or entity
4. WHEN errors occur, THE Setup_Script SHALL log error details including message, code, and stack trace
5. THE Gen_Mock_Script SHALL log progress during batch processing
6. THE Doctor_Script SHALL display check results with visual indicators (✅, ⏩, 🚫)

### Requirement 8

**User Story:** As a developer, I want flexible data directory configuration, so that I can use different data sources for different environments

#### Acceptance Criteria

1. THE Setup_Script SHALL accept data-dir parameter to specify custom data directory
2. THE Setup_Script SHALL validate that data directory exists before execution
3. THE Setup_Script SHALL verify required subdirectories exist (demographic, general, coverage, order-data, medication, finance)
4. WHEN data directory validation fails, THE Setup_Script SHALL display descriptive error message
5. THE Gen_Mock_Script SHALL accept data-dir parameter for code table lookups

### Requirement 9

**User Story:** As a developer, I want to understand the service initialization pattern, so that I can maintain consistent API client usage

#### Acceptance Criteria

1. THE Setup_Script SHALL use lazy initialization for Token_Manager
2. THE Setup_Script SHALL use lazy initialization for API clients (Cortex, Demographic, Keycloak)
3. THE Setup_Script SHALL reuse Token_Manager instance across all API clients
4. THE Setup_Script SHALL initialize services only when required by selected modules
5. WHEN module does not require API access, THE Setup_Script SHALL not initialize API clients

### Requirement 10

**User Story:** As a developer, I want comprehensive workflow documentation, so that I can onboard new team members efficiently

#### Acceptance Criteria

1. THE documentation SHALL include sequence diagrams for each script execution flow
2. THE documentation SHALL document the module-to-entity mapping
3. THE documentation SHALL explain the Skip_Records_Tracker mechanism
4. THE documentation SHALL provide troubleshooting guide for common issues
5. THE documentation SHALL include examples of log output for successful and failed executions
