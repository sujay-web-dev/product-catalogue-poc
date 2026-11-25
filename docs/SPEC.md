# Senior Full Stack Engineer Coding Assessment

## 1. Project Overview

The objective of this assignment is to develop a Product Catalogue web application as a Proof of Concept (PoC) for an entrepreneur who wants to introduce a custom product catalogue solution.

The application will allow customers to browse products, explore different product categories, search for specific products, view detailed product information and submit enquiries for products they are interested in.

The primary objective is to build a functional PoC while establishing a maintainable foundation that can evolve as business requirements change.

The product data source, email provider and application's look and feel should be replaceable without requiring significant changes to the overall application architecture.

## 2. Technology Stack

The proposed technology stack is:

| Layer | Technology |
|---|---|
| Frontend | React.js with TypeScript |
| Backend | Node.js with TypeScript |
| Product Data Source | Fake Store API |
| API Communication | REST APIs |
| Testing | Unit and integration testing |
| Version Control | Git and GitHub |

The frontend and backend will communicate through REST APIs. The frontend will not directly access the Fake Store API. All product-related data requests will be handled through the backend.

## 3. Functional Requirements

### 3.1 Home Page

The homepage will display five featured products identified as top-rated products.

These products will be prominently displayed to help customers discover popular products when they initially access the application.

### 3.2 Category Navigation and Category Page

The application will provide category-based navigation, allowing customers to browse products based on their categories.

When a customer selects a category:

The application will display top-rated products belonging to the selected category.
Additional products belonging to that category will be displayed separately.
Customers will be able to explore individual products from the category listing.

### 3.3 Product Search

The application will provide a search functionality that allows customers to find products using search terms.

When a customer enters a search term and initiates the search:

The backend will process the search request.
Products matching the search term will be returned.
Only matching products will be displayed in the search results.

### 3.4 Product Details

Customers will be able to select a product from the homepage, category listing or search results to view its detailed information.

The product details page will display relevant information such as:

Product name.
Product image.
Description.
Price.
Rating.
Category.

The page will also provide an option to submit an enquiry for the selected product.

### 3.5 Product Enquiry

Customers interested in a particular product will be able to submit an enquiry through an enquiry form.

The form will collect the customer's contact information and enquiry details.

On submission:

The frontend will send the enquiry details to the backend.
The backend will validate the submitted information.
The backend will process the enquiry and trigger an email notification to the sales inbox.
The customer will receive a confirmation message indicating that the enquiry has been submitted successfully.

The email integration should be designed to allow the email provider to be replaced in the future.

## 4. Technical and Architectural Considerations

The application should follow a modular architecture with clear separation of responsibilities between the frontend, backend, business logic and external data sources.

Key considerations:

Product data access should be abstracted so that Fake Store API can be replaced with another data source in the future.
Email delivery should be abstracted to support different email providers.
The backend should handle product retrieval, category filtering, search and enquiry processing.
Appropriate request validation and error handling should be implemented.
The application should be easy to configure and run locally.
Environment-specific configuration and secrets should be managed through environment variables.
The solution should remain compatible with AWS if infrastructure is introduced.

## 5. Testing

Testing should cover the application's critical functionality, including:

Retrieving featured products.
Retrieving products by category.
Searching products.
Retrieving individual product details.
Submitting product enquiries.
Validating enquiry form inputs.
Handling API errors and unsuccessful requests.

Both frontend and backend testing should be considered.

## 6. Project Deliverables

The final submission will include:

A publicly accessible GitHub repository containing the complete source code.
A feature branch containing the implementation.
An open Pull Request targeting the main branch.
A README.md file containing project overview, architecture, technology decisions and setup instructions.
A DECISIONS.md file documenting assumptions, trade-offs, simplified requirements, architectural decisions and potential future improvements.
An AI_USAGE.md file documenting AI tools, models, prompts, agent instructions and the process followed to review AI-generated code.
Relevant unit and integration tests.
Documentation of the actual time spent across planning, implementation, testing and reviewing.

## 7. Evaluation Criteria

The solution will be evaluated across five areas:

**Solution Design:** Application architecture, separation of concerns and ability to evolve beyond the initial PoC.
**Decision-Making and Assumptions:** Ability to make reasonable assumptions, explain trade-offs and justify implementation decisions.
**Implementation Quality:** Code readability, consistency, error handling, validation and security practices.
**Testing:** Test coverage of critical functionality and confidence in the implementation.
**AI Engineering Practice:** Effective use of AI tools, quality of instructions and prompts, critical review of AI-generated code and ownership of the final implementation.

The submission will subsequently be reviewed in a 45-minute follow-up interview, during which shortlisted candidates will be asked to explain their implementation and make a small change to the application.

## 8. Overall Objective

The goal is not simply to build a functional product catalogue but to demonstrate the ability to use AI-assisted development effectively while making sound engineering decisions.

The final solution should be small, functional, maintainable, well-tested and easy for reviewers to understand and run.