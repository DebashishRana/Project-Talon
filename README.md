# 1. Introduction

Identity and travel-document verification is a critical challenge in **border security and high-risk screening**, where simply identifying a document or reading its text is not enough. A reliable screening system must determine whether the document is genuine, whether its information is internally consistent, whether it shows signs of manipulation, and whether the person presenting it matches the identity represented by the document.

Conventional solutions often handle these tasks independently through **document classification, OCR, or face matching**, creating gaps between different verification signals. A manipulated document may still produce accurate OCR, while a genuine document may be presented by the wrong individual. Similarly, apparent inconsistencies can result from genuine fraud or simply from blur, glare, poor lighting, perspective distortion, rotation, compression, or low-quality captures.

The challenge is further increased by the diversity of **Indian and foreign passports, visas, identity documents, driving licences, permits, and other document formats**, along with the limited availability of representative Indian datasets containing real and manipulated documents. Modern forgeries can also involve subtle, localized modifications to photographs, text, signatures, stamps, or other document regions that are difficult to identify through visual inspection alone.

**DECTRA** addresses this fragmented verification problem through a unified, multi-stage screening pipeline that combines **document classification, OCR and metadata extraction, MRZ validation, tampering detection, face verification, and cross-validation**. Rather than relying on a single prediction, DECTRA combines these signals to assess the overall consistency of the available evidence and identify documents that appear trustworthy, suspicious, or require further investigation.

> **DECTRA is designed not merely to read an identity document, but to determine whether its visual, textual, machine-readable, forensic, and biometric evidence is sufficiently consistent for reliable screening.**

## 2. DECTRA System & Model Summary

DECTRA is a multi-stage AI-assisted identity and document screening system designed to detect suspicious, manipulated, or inconsistent identity documents. Instead of relying on a single model, DECTRA combines document classification, OCR, MRZ validation, tampering detection, face verification, and cross-validation to generate an evidence-based screening result.

The complete pipeline processes a document progressively, beginning with document identification and information extraction, followed by authenticity and consistency analysis. The outputs from these modules are finally combined into a unified risk assessment that can assist an authorized operator in identifying documents requiring further verification.

> **Figure 1 — DECTRA End-to-End System Architecture**  
> *Add complete system architecture diagram here.*

### 2.1 Document Detection & Classification

The classification module identifies the type of document provided to the system, such as passport, Aadhaar, PAN, driving licence, visa, or other supported identity documents. The detected document type determines the processing and validation rules applied by subsequent modules.

> **Table 1 — Supported Document Types and Classification Status**

| Document Type | Country/Region | Classification | OCR | MRZ | Tampering | Face |
|---|---|---|---|---|---|---|
| Passport | - | - | - | - | - | - |
| Aadhaar | - | - | - | - | - | - |
| PAN | - | - | - | - | - | - |
| Driving Licence | - | - | - | - | - | - |
| Visa | - | - | - | - | - | - |
| Other | - | - | - | - | - | - |

### 2.2 OCR & Metadata Extraction

DECTRA uses OCR to extract visible text from the document and converts the extracted information into structured metadata. Important fields such as name, document number, date of birth, nationality, issue date, and expiry date can then be used by subsequent verification stages.

> **Figure 2 — OCR and Metadata Extraction Pipeline**

> **Table 2 — OCR Fields and Extracted Metadata**

| Field | Example | Source | Used For |
|---|---|---|---|
| Name | - | - | - |
| Document Number | - | - | - |
| Date of Birth | - | - | - |
| Nationality | - | - | - |
| Issue Date | - | - | - |
| Expiry Date | - | - | - |
| Address | - | - | - |
| Other Document Fields | - | - | - |

### 2.3 MRZ Extraction & Validation

For documents containing a Machine Readable Zone, DECTRA performs dedicated MRZ extraction and parsing. The extracted information is validated using MRZ check digits and compared with corresponding information obtained through OCR to identify inconsistencies.

> **Figure 3 — MRZ Extraction and Validation Flow**

> **Table 3 — MRZ Validation Checks**

| Validation | Description | Result |
|---|---|---|
| MRZ Detection | - | - |
| MRZ Parsing | - | - |
| Document Number Check Digit | - | - |
| Date of Birth Check Digit | - | - |
| Expiry Date Check Digit | - | - |
| OCR–MRZ Consistency | - | - |

### 2.4 Document Tampering Detection

The tampering detection module analyzes documents for signs of digital or visual manipulation. The analysis covers modifications such as altered text, photographs, signatures, stamps/seals, and other document regions. Authentic and controlled tampered samples are used to develop and evaluate this component.

> **Figure 4 — Document Tampering Categories**

> **Table 4 — Tampering Types and Dataset Distribution**

| Tampering Category | Affected Region | Description | Samples |
|---|---|---|---:|
| Text Tampering | - | - | - |
| Face Tampering | - | - | - |
| Signature Tampering | - | - | - |
| Stamp/Seal Tampering | - | - | - |
| Other Manipulation | - | - | - |
| **Total** | - | - | **-** |

### 2.5 Face Verification

For documents containing a facial photograph, DECTRA can compare the document face with a separately captured (live) face image. The resulting similarity information provides an additional identity-consistency signal and can help identify cases where the presented document and person do not correspond.

> **Figure 5 — Face Verification Workflow**

### 2.6 Cross-Validation

DECTRA compares information obtained from independent verification stages, including OCR fields, MRZ data, document regions, and facial information. This enables the system to identify inconsistencies that may not be visible through a single verification method.

> **Figure 6 — Cross-Validation Architecture**

### 2.7 Decision & Risk Assessment

The final decision layer combines the outputs of the individual verification modules into an overall screening assessment. Classification confidence, OCR consistency, MRZ validation, tampering indicators, and face verification results can contribute to the final risk level.

## 3. Datasets & Data Preparation

DECTRA uses a combination of publicly available identity-document datasets and project-specific document samples for training and evaluation. The available datasets provide authentic document images, document-type variations, OCR/MRZ samples, and existing examples relevant to document analysis. Since publicly available datasets do not fully cover the required Indian document-fraud scenarios, additional samples are prepared specifically for the project.

> **Table 7 — Dataset Overview**

| Dataset Name | Document Type | Purpose | Source | Usage |
|---|---|---|---|---|
| - | - | - | - | - |
| - | - | - | - | - |
| - | - | - | - | - |
| - | - | - | - | - |
| - | - | - | - | - |
| - | - | - | - | - |

### 3.1 Dataset Collection and Preparation

The collected data is organized according to document type and the specific DECTRA module for which it is required. Images are cleaned, resized, cropped, and standardized where necessary before being used for model development.

Authentic documents are retained as genuine reference samples. Where required, different orientations, lighting conditions, image quality, and other capture variations are introduced to improve robustness against real-world document images.

> **Table 8 — Dataset Distribution**

| Document Class | Authentic Samples | Tampered Samples | Training | Validation | Testing |
|---|---:|---:|---:|---:|---:|
| - | - | - | - | - | - |
| - | - | - | - | - | - |
| - | - | - | - | - | - |
| - | - | - | - | - | - |
| **Total** | **-** | **-** | **-** | **-** | **-** |

### 3.2 Tampered Document Dataset

Tampered samples are **not taken directly from the online datasets**. Instead, authentic document images obtained from the available datasets and project-specific sources are used as the base, and controlled modifications are performed externally to create synthetic tampered samples.

The modifications cover relevant fraud scenarios such as **text alteration, face replacement, signature manipulation, stamp/seal modification, and other document-region changes**. Both noticeable and subtle variations are created to provide different levels of manipulation difficulty.

> **Figure 8 — Tampered Dataset Generation Pipeline**  
> *Show: Authentic Document → External Tampering → Tampered Document → Annotation/Quality Check.*

> **Table 9 — Tampering Categories**

| Tampering Type | Affected Region | Description | Number of Samples |
|---|---|---|---:|
| Text Tampering | - | - | - |
| Face Tampering | - | - | - |
| Signature Tampering | - | - | - |
| Stamp/Seal Tampering | - | - | - |
| Other Manipulation | - | - | - |
| **Total** | - | - | **-** |

### 3.3 Preprocessing and Dataset Splitting

Before training, the data is standardized according to the requirements of each model. Preprocessing may include resizing, normalization, cropping, orientation correction, and quality filtering.

The datasets are divided into training, validation, and test sets while keeping different modified versions of the same original document within the same split. This prevents data leakage and ensures that evaluation is performed on documents that the model has not effectively seen during training.

> **Figure 9 — Dataset Splitting Strategy**  
> *Show document-level grouping → train/validation/test split.*

## 4. Evaluation Results

DECTRA is evaluated independently across its major verification components using unseen test data. Each module is measured using task-specific metrics to assess its ability to correctly identify documents, extract information, detect manipulation, and verify identity.

### 4.1 Document Classification

The document classification models are evaluated on their ability to correctly identify supported document types from unseen test images.

**Metrics:** Accuracy, Precision, Recall, and F1-Score.

> **Table 10 — Document Classification Results**

| Document Type | Precision | Recall | F1-Score |
|---|---:|---:|---:|
| Passport | — | — | — |
| Aadhaar | — | — | — |
| PAN | — | — | — |
| Other Supported Documents | — | — | — |
| **Overall** | **—** | **—** | **—** |

> **Figure 11 — Classification Confusion Matrix**

### 4.2 OCR & MRZ Evaluation

OCR is evaluated based on the accuracy of extracted text and important document fields. For documents containing an MRZ, extraction accuracy and validation performance are evaluated separately.

> **Table 11 — OCR & MRZ Results**

| Component | Metric | Result |
|---|---|---:|
| OCR | Character Error Rate (CER) | — |
| OCR | Field Accuracy | — |
| MRZ | Character/Field Accuracy | — |
| MRZ | Check-Digit Validation Rate | — |
| MRZ | OCR–MRZ Consistency | — |

### 4.3 Tampering Detection

The tampering detection model is evaluated using authentic and externally generated tampered document samples across the defined manipulation categories.

**Metrics:** Precision, Recall, F1-Score, and ROC-AUC.

> **Table 12 — Tampering Detection Results**

| Metric | Result |
|---|---:|
| Precision | — |
| Recall | — |
| F1-Score | — |
| ROC-AUC | — |

> **Figure 12 — Tampering Detection Results**

### 4.4 Face Verification

Face verification is evaluated using matching and non-matching document/person pairs at the selected verification threshold.

**Metrics:** FAR, FRR, and TAR at a defined FAR.

> **Table 13 — Face Verification Results**

| Metric | Result |
|---|---:|
| Verification Threshold | — |
| FAR | — |
| FRR | — |
| TAR @ FAR | — |

### 4.5 Evaluation Summary

The final results will be updated as the individual models and complete DECTRA pipeline are finalized. Reported metrics will be based on the held-out test sets and will be accompanied by the corresponding dataset size and experimental conditions.

> **Table 14 — DECTRA Evaluation Summary**

| Module | Primary Metric | Result |
|---|---|---:|
| Document Classification | F1-Score | — |
| OCR | Field Accuracy | — |
| MRZ | Validation Rate | — |
| Tampering Detection | F1-Score | — |
| Face Verification | TAR @ FAR | — |

## 5. Web Application & Usage

DECTRA provides a web-based interface for performing identity-document screening through a single workflow. Users can upload a supported document and view its classification, extracted information, tampering analysis, MRZ validation, face verification, and overall screening result from the dashboard.

> **Figure 13 — DECTRA Web Application Workflow**  
> *Upload → AI Processing → Verification → Risk Assessment*

### 5.1 Verification Dashboard

The dashboard presents the results of the different verification modules in a structured view, allowing the user to review detected document information, inconsistencies, tampering indicators, and identity-verification results.

> **Figure 14 — DECTRA Verification Dashboard**  
> *Add application screenshot here.*

### 5.2 Screening Result

DECTRA combines the available verification signals and presents an overall assessment indicating whether the document appears consistent or requires further investigation. The system is intended to support authorized personnel rather than replace official verification procedures.

## 6. System Architecture & Deployment

DECTRA follows a modular architecture in which the web interface, backend services, AI models, document-processing modules, and verification services operate as separate components. This structure allows individual models and services to be updated without redesigning the complete system.

> **Figure 15 — DECTRA System Architecture**  
> *Show frontend → backend/API → AI/verification modules → storage/external services.*

### 6.1 Application Architecture

The frontend provides the user interface for document submission and result visualization. The backend manages requests, coordinates the required AI modules, processes verification results, and returns the final assessment to the dashboard.

### 6.2 Deployment

DECTRA can be deployed as a web application with the AI processing and sensitive credentials maintained on the server side. The modular design supports local or cloud-based deployment depending on operational requirements and available computing resources.

> **Figure 16 — DECTRA Deployment Architecture**  
> *Show client → server/backend → AI services → database/storage, where applicable.*

## 7. Security & Limitations

DECTRA is designed to process sensitive identity and biometric information. The system should therefore use secure communication, protected backend credentials, controlled access, and appropriate data-retention practices. Sensitive documents and personal information should not be exposed through logs or unauthorized interfaces.

DECTRA is an AI-assisted screening system and does not independently establish legal identity or guarantee document authenticity. Model performance can be affected by image quality, unseen document formats, new forgery techniques, and limited availability of representative real-world fraudulent data. Results should therefore be treated as decision-support evidence and verified through authorized procedures when required.

> **Security Considerations**
> - Secure document transmission and storage
> - Controlled access to sensitive results
> - Minimal retention of uploaded documents
> - No sensitive information in application logs

## 8. Future Scope

- Expansion to additional Indian and foreign identity documents.
- Improved detection of advanced and previously unseen forgery techniques.
- Integration with authorized identity/document verification services.
- Liveness detection for stronger biometric verification.
- Larger real-world datasets for continuous evaluation and improvement.

## 9. License

License information will be added upon final release.

## 10. Contact

For questions, collaboration, or further information regarding DECTRA, please contact the project team.

**Project:** DECTRA  
**Event:** Smart India Hackathon 2026  
**Problem Statement:** PS 26188 — AI-Based Fake Identity & Document Screening System
