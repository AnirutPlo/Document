# Benefit Plan ER Diagram

This diagram shows the relationships between the `benefit_plan` table and related entities in the EMR system.

```mermaid
erDiagram
    benefit_plan ||--o{ insurance_plan : "has many"
    benefit_plan ||--o{ product_benefit_plan_item : "has many"
    benefit_plan ||--o{ medication_benefit_plan_condition : "has many"
    
    product ||--o{ product_benefit_plan_item : "has many"
    product_benefit_plan_item }o--|| benefit_plan : "belongs to"
    product_benefit_plan_item }o--|| product : "belongs to"
    
    insurance_plan }o--o| benefit_plan : "belongs to (optional)"
    insurance_plan }o--o| payor : "belongs to (optional)"
    
    medication_benefit_plan_condition }o--|| benefit_plan : "belongs to"
    
    benefit_plan {
        string id PK "VarChar(15)"
        string name
        int version
        boolean active
        datetime created_at
        string created_by
        datetime updated_at
        string updated_by
        datetime deleted_at
        string deleted_by
    }
    
    insurance_plan {
        int id PK
        int version
        boolean active
        string name
        string code UK
        json info
        int rank
        boolean is_default
        string payor_id FK
        string nhso_insurance_plan_category_code
        string validation_method_code
        boolean is_refer
        boolean is_require_budget
        boolean is_require_document
        string benefit_plan_id FK
        boolean is_iclaim
        boolean require_payor_input
        string claim_opd_platform
        string claim_ipd_platform
        string opd_benefit_type
        string ipd_benefit_type
        boolean allow_combine_with_other
        datetime created_at
        string created_by
        datetime updated_at
        string updated_by
        datetime deleted_at
        string deleted_by
    }
    
    product_benefit_plan_item {
        int id PK
        int version
        boolean active
        int product_id FK
        string benefit_plan_id FK
        decimal benefit_limit_per_unit
        string visit_class "OPD or IPD"
        boolean is_for_all_visit_class
        datetime created_at
        string created_by
        datetime updated_at
        string updated_by
        datetime deleted_at
        string deleted_by
    }
    
    medication_benefit_plan_condition {
        int id PK
        int version
        boolean active
        string medication_code
        string benefit_plan_id FK
        boolean require_document
        int_array fillable_form_ids
        boolean require_ned_reason
        string default_ned_reason_code
        boolean require_diagnosis
        datetime created_at
        string created_by
        datetime updated_at
        string updated_by
        datetime deleted_at
        string deleted_by
    }
    
    product {
        int id PK
        int version
        boolean active
        string code UK
        string type "GOODS, SERVICE, PACKAGE"
        json info
        int category_id FK
        decimal default_unit_price
        int default_currency_id FK
        datetime created_at
        string created_by
        datetime updated_at
        string updated_by
        datetime deleted_at
        string deleted_by
    }
    
    payor {
        string id PK
        string name
        string code
        boolean active
    }
```

## Relationship Summary

### BenefitPlan (Central Entity)

**One-to-Many Relationships:**

1. **benefit_plan → insurance_plan**
   - A benefit plan can be used by multiple insurance plans
   - Insurance plans optionally reference a benefit plan via `benefit_plan_id`
   - Relationship: Optional (insurance plan may not have a benefit plan)

2. **benefit_plan → product_benefit_plan_item**
   - A benefit plan defines pricing/limits for multiple products
   - Links products to benefit plans with specific benefit limits per unit
   - Includes visit class filtering (OPD/IPD or all)
   - Relationship: Required

3. **benefit_plan → medication_benefit_plan_condition**
   - A benefit plan can have special conditions for specific medications
   - Defines requirements like documents, NED reasons, or diagnosis
   - Relationship: Required

### Related Entities

**Product:**
- Products are linked to benefit plans through `product_benefit_plan_item`
- Each product can have different benefit limits for different benefit plans
- Can specify different limits for OPD vs IPD visits

**InsurancePlan:**
- Insurance plans optionally reference a benefit plan
- Also references a payor (insurance company)
- Contains claim platform configurations and benefit types

**Payor:**
- Represents insurance companies or payment entities
- Referenced by insurance plans

## Key Business Rules

1. **Product Benefit Limits**: Each product can have different benefit limits per unit depending on the benefit plan and visit class (OPD/IPD)

2. **Medication Conditions**: Certain medications may require additional documentation or diagnosis when used with specific benefit plans

3. **Insurance Plan Flexibility**: Insurance plans can optionally use a benefit plan, allowing for flexible pricing structures

4. **Visit Class Segregation**: Benefits can be configured differently for outpatient (OPD) vs inpatient (IPD) visits
