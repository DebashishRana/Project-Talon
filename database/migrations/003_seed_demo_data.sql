-- SYNTHETIC DEMO ONLY. No real names, passport numbers, biometrics, or storage objects.
SET time_zone = '+00:00';
START TRANSACTION;

INSERT INTO organizations (organization_id, organization_code, name) VALUES
 (UUID_TO_BIN('11111111-1111-4111-8111-111111111111',1),'SIH-DEMO','SentinelTrail synthetic demo organization');
INSERT INTO checkpoints (checkpoint_id,organization_id,checkpoint_code,name,country_code,timezone_name) VALUES
 (UUID_TO_BIN('22222222-2222-4222-8222-222222222222',1),UUID_TO_BIN('11111111-1111-4111-8111-111111111111',1),'DEMO-GATE','Synthetic training gate','IN','Asia/Kolkata');
INSERT INTO roles (role_id,role_code,description) VALUES
 (UUID_TO_BIN('33333333-3333-4333-8333-333333333331',1),'officer','May make final workflow decisions'),
 (UUID_TO_BIN('33333333-3333-4333-8333-333333333332',1),'reviewer','May review evidence but not administer access');
INSERT INTO users (user_id,organization_id,external_subject,display_name) VALUES
 (UUID_TO_BIN('44444444-4444-4444-8444-444444444444',1),UUID_TO_BIN('11111111-1111-4111-8111-111111111111',1),'synthetic.officer','Synthetic Demo Officer');
INSERT INTO user_roles (user_id,role_id) VALUES
 (UUID_TO_BIN('44444444-4444-4444-8444-444444444444',1),UUID_TO_BIN('33333333-3333-4333-8333-333333333331',1));
INSERT INTO registered_devices (device_id,organization_id,assigned_user_id,device_public_id,device_type,public_key_fingerprint) VALUES
 (UUID_TO_BIN('55555555-5555-4555-8555-555555555555',1),UUID_TO_BIN('11111111-1111-4111-8111-111111111111',1),UUID_TO_BIN('44444444-4444-4444-8444-444444444444',1),'SYNTHETIC-SCANNER-01','scanner',UNHEX(SHA2('synthetic-device-key',256)));
INSERT INTO rule_sets (rule_set_id,document_type,country_code,template_version,rule_version,status,rules_payload,effective_from) VALUES
 (UUID_TO_BIN('66666666-6666-4666-8666-666666666666',1),'passport','IN','synthetic-v1','2026.09.demo','active',JSON_OBJECT('expiry_rule','must be future','mrz_rule','TD3 checksums'),'2026-01-01 00:00:00.000000');

-- Four training cases: clear; visual/MRZ expiry mismatch; photo replacement; fake stamp.
INSERT INTO screening_cases (case_id,organization_id,checkpoint_id,intake_device_id,case_token_hash,case_reference,status,opened_at,closed_at,created_by_user_id) VALUES
 (UUID_TO_BIN('70000000-0000-4000-8000-000000000001',1),UUID_TO_BIN('11111111-1111-4111-8111-111111111111',1),UUID_TO_BIN('22222222-2222-4222-8222-222222222222',1),UUID_TO_BIN('55555555-5555-4555-8555-555555555555',1),UNHEX(SHA2('demo-token-clear',256)),'SYN-CASE-001','closed','2026-09-01 08:00:00.000000','2026-09-01 08:01:00.000000',UUID_TO_BIN('44444444-4444-4444-8444-444444444444',1)),
 (UUID_TO_BIN('70000000-0000-4000-8000-000000000002',1),UUID_TO_BIN('11111111-1111-4111-8111-111111111111',1),UUID_TO_BIN('22222222-2222-4222-8222-222222222222',1),UUID_TO_BIN('55555555-5555-4555-8555-555555555555',1),UNHEX(SHA2('demo-token-mrz',256)),'SYN-CASE-002','in_review','2026-09-01 08:10:00.000000',NULL,UUID_TO_BIN('44444444-4444-4444-8444-444444444444',1)),
 (UUID_TO_BIN('70000000-0000-4000-8000-000000000003',1),UUID_TO_BIN('11111111-1111-4111-8111-111111111111',1),UUID_TO_BIN('22222222-2222-4222-8222-222222222222',1),UUID_TO_BIN('55555555-5555-4555-8555-555555555555',1),UNHEX(SHA2('demo-token-photo',256)),'SYN-CASE-003','in_review','2026-09-01 08:20:00.000000',NULL,UUID_TO_BIN('44444444-4444-4444-8444-444444444444',1)),
 (UUID_TO_BIN('70000000-0000-4000-8000-000000000004',1),UUID_TO_BIN('11111111-1111-4111-8111-111111111111',1),UUID_TO_BIN('22222222-2222-4222-8222-222222222222',1),UUID_TO_BIN('55555555-5555-4555-8555-555555555555',1),UNHEX(SHA2('demo-token-stamp',256)),'SYN-CASE-004','in_review','2026-09-01 08:30:00.000000',NULL,UUID_TO_BIN('44444444-4444-4444-8444-444444444444',1));

INSERT INTO documents (document_id,case_id,document_type,issuing_country_code,document_number_ciphertext,document_number_lookup_token,encryption_key_id,status) VALUES
 (UUID_TO_BIN('71000000-0000-4000-8000-000000000001',1),UUID_TO_BIN('70000000-0000-4000-8000-000000000001',1),'passport','IN',X'53494E5448455449432D434950484552544558542D303031',UNHEX(SHA2('hmac:synthetic-passport-001',256)),'demo-key-not-production','review_ready'),
 (UUID_TO_BIN('71000000-0000-4000-8000-000000000002',1),UUID_TO_BIN('70000000-0000-4000-8000-000000000002',1),'passport','IN',X'53494E5448455449432D434950484552544558542D303032',UNHEX(SHA2('hmac:synthetic-passport-002',256)),'demo-key-not-production','review_ready'),
 (UUID_TO_BIN('71000000-0000-4000-8000-000000000003',1),UUID_TO_BIN('70000000-0000-4000-8000-000000000003',1),'passport','IN',X'53494E5448455449432D434950484552544558542D303033',UNHEX(SHA2('hmac:synthetic-passport-003',256)),'demo-key-not-production','review_ready'),
 (UUID_TO_BIN('71000000-0000-4000-8000-000000000004',1),UUID_TO_BIN('70000000-0000-4000-8000-000000000004',1),'visa','IN',X'53494E5448455449432D434950484552544558542D303034',UNHEX(SHA2('hmac:synthetic-visa-004',256)),'demo-key-not-production','review_ready');
INSERT INTO document_files (document_file_id,document_id,file_role,storage_object_id,content_sha256,media_type,byte_size,capture_metadata) VALUES
 (UUID_TO_BIN('72000000-0000-4000-8000-000000000001',1),UUID_TO_BIN('71000000-0000-4000-8000-000000000001',1),'front',UUID_TO_BIN('73000000-0000-4000-8000-000000000001',1),UNHEX(SHA2('synthetic-clear-image',256)),'image/png',1024,JSON_OBJECT('synthetic',true)),
 (UUID_TO_BIN('72000000-0000-4000-8000-000000000002',1),UUID_TO_BIN('71000000-0000-4000-8000-000000000002',1),'front',UUID_TO_BIN('73000000-0000-4000-8000-000000000002',1),UNHEX(SHA2('synthetic-mrz-image',256)),'image/png',1024,JSON_OBJECT('synthetic',true)),
 (UUID_TO_BIN('72000000-0000-4000-8000-000000000003',1),UUID_TO_BIN('71000000-0000-4000-8000-000000000003',1),'front',UUID_TO_BIN('73000000-0000-4000-8000-000000000003',1),UNHEX(SHA2('synthetic-photo-image',256)),'image/png',1024,JSON_OBJECT('synthetic',true)),
 (UUID_TO_BIN('72000000-0000-4000-8000-000000000004',1),UUID_TO_BIN('71000000-0000-4000-8000-000000000004',1),'front',UUID_TO_BIN('73000000-0000-4000-8000-000000000004',1),UNHEX(SHA2('synthetic-stamp-image',256)),'image/png',1024,JSON_OBJECT('synthetic',true));
INSERT INTO extraction_runs (extraction_run_id,document_id,source_file_id,engine_name,engine_version,model_version,status,started_at,completed_at) VALUES
 (UUID_TO_BIN('74000000-0000-4000-8000-000000000001',1),UUID_TO_BIN('71000000-0000-4000-8000-000000000001',1),UUID_TO_BIN('72000000-0000-4000-8000-000000000001',1),'demo-ocr','1.0','demo-ocr-1','completed','2026-09-01 08:00:01.000000','2026-09-01 08:00:02.000000'),
 (UUID_TO_BIN('74000000-0000-4000-8000-000000000002',1),UUID_TO_BIN('71000000-0000-4000-8000-000000000002',1),UUID_TO_BIN('72000000-0000-4000-8000-000000000002',1),'demo-ocr','1.0','demo-ocr-1','completed','2026-09-01 08:10:01.000000','2026-09-01 08:10:02.000000');
INSERT INTO extracted_fields (extracted_field_id,extraction_run_id,field_name,display_value,confidence,normalized_format) VALUES
 (UUID_TO_BIN('75000000-0000-4000-8000-000000000001',1),UUID_TO_BIN('74000000-0000-4000-8000-000000000001',1),'expiry_date','****-**-31',0.9900,'YYYY-MM-DD'),
 (UUID_TO_BIN('75000000-0000-4000-8000-000000000002',1),UUID_TO_BIN('74000000-0000-4000-8000-000000000002',1),'expiry_date','****-**-31',0.9900,'YYYY-MM-DD');
INSERT INTO mrz_records (mrz_record_id,extraction_run_id,raw_mrz_ciphertext,format_code,document_number_checksum_valid,birth_date_checksum_valid,expiry_date_checksum_valid,composite_checksum_valid,visual_mrz_contradiction,contradiction_summary) VALUES
 (UUID_TO_BIN('76000000-0000-4000-8000-000000000001',1),UUID_TO_BIN('74000000-0000-4000-8000-000000000001',1),X'53594E5448455449432D4D525A2D303031','TD3',true,true,true,true,false,NULL),
 (UUID_TO_BIN('76000000-0000-4000-8000-000000000002',1),UUID_TO_BIN('74000000-0000-4000-8000-000000000002',1),X'53594E5448455449432D4D525A2D303032','TD3',true,true,true,true,true,'Synthetic visual expiry 2031-12-31 conflicts with MRZ expiry 2030-12-31.');
INSERT INTO validation_runs (validation_run_id,document_id,rule_set_id,engine_name,engine_version,status,run_at) VALUES
 (UUID_TO_BIN('77000000-0000-4000-8000-000000000001',1),UUID_TO_BIN('71000000-0000-4000-8000-000000000001',1),UUID_TO_BIN('66666666-6666-4666-8666-666666666666',1),'demo-validator','1.0','completed','2026-09-01 08:00:03.000000'),
 (UUID_TO_BIN('77000000-0000-4000-8000-000000000002',1),UUID_TO_BIN('71000000-0000-4000-8000-000000000002',1),UUID_TO_BIN('66666666-6666-4666-8666-666666666666',1),'demo-validator','1.0','completed','2026-09-01 08:10:03.000000');
INSERT INTO validation_results (validation_result_id,validation_run_id,rule_code,severity,passed,evidence,explanation) VALUES
 (UUID_TO_BIN('78000000-0000-4000-8000-000000000001',1),UUID_TO_BIN('77000000-0000-4000-8000-000000000001',1),'MRZ_VISUAL_MATCH','info',true,JSON_OBJECT('synthetic',true),'Synthetic clear passport: visual and MRZ values agree.'),
 (UUID_TO_BIN('78000000-0000-4000-8000-000000000002',1),UUID_TO_BIN('77000000-0000-4000-8000-000000000002',1),'MRZ_VISUAL_EXPIRY_MATCH','high',false,JSON_OBJECT('visual_expiry','2031-12-31','mrz_expiry','2030-12-31'),'Synthetic test mismatch requires officer review.');
INSERT INTO forensic_runs (forensic_run_id,document_id,source_file_id,engine_name,engine_version,model_version,status,run_at) VALUES
 (UUID_TO_BIN('79000000-0000-4000-8000-000000000003',1),UUID_TO_BIN('71000000-0000-4000-8000-000000000003',1),UUID_TO_BIN('72000000-0000-4000-8000-000000000003',1),'demo-forensics','1.0','demo-forensics-1','completed','2026-09-01 08:20:04.000000'),
 (UUID_TO_BIN('79000000-0000-4000-8000-000000000004',1),UUID_TO_BIN('71000000-0000-4000-8000-000000000004',1),UUID_TO_BIN('72000000-0000-4000-8000-000000000004',1),'demo-forensics','1.0','demo-forensics-1','completed','2026-09-01 08:30:04.000000');
INSERT INTO forensic_findings (forensic_finding_id,forensic_run_id,finding_type,severity,confidence,evidence,explanation) VALUES
 (UUID_TO_BIN('7A000000-0000-4000-8000-000000000003',1),UUID_TO_BIN('79000000-0000-4000-8000-000000000003',1),'photo_replacement','high',0.9100,JSON_OBJECT('synthetic',true,'signal','boundary inconsistency'),'Synthetic suspected photo replacement; review is required.'),
 (UUID_TO_BIN('7A000000-0000-4000-8000-000000000004',1),UUID_TO_BIN('79000000-0000-4000-8000-000000000004',1),'fake_stamp','high',0.8800,JSON_OBJECT('synthetic',true,'signal','ink texture mismatch'),'Synthetic suspected fake stamp; review is required.');
INSERT INTO risk_assessments (risk_assessment_id,case_id,engine_name,engine_version,model_version,policy_version,score,band,recommended_action,assessed_at) VALUES
 (UUID_TO_BIN('7B000000-0000-4000-8000-000000000001',1),UUID_TO_BIN('70000000-0000-4000-8000-000000000001',1),'demo-risk','1.0','demo-risk-1','demo-policy-1',5.000,'low','proceed','2026-09-01 08:00:05.000000'),
 (UUID_TO_BIN('7B000000-0000-4000-8000-000000000002',1),UUID_TO_BIN('70000000-0000-4000-8000-000000000002',1),'demo-risk','1.0','demo-risk-1','demo-policy-1',65.000,'high','review','2026-09-01 08:10:05.000000'),
 (UUID_TO_BIN('7B000000-0000-4000-8000-000000000003',1),UUID_TO_BIN('70000000-0000-4000-8000-000000000003',1),'demo-risk','1.0','demo-risk-1','demo-policy-1',72.000,'high','review','2026-09-01 08:20:05.000000'),
 (UUID_TO_BIN('7B000000-0000-4000-8000-000000000004',1),UUID_TO_BIN('70000000-0000-4000-8000-000000000004',1),'demo-risk','1.0','demo-risk-1','demo-policy-1',68.000,'high','review','2026-09-01 08:30:05.000000');
INSERT INTO risk_contributions (risk_contribution_id,risk_assessment_id,source_type,source_id,contribution_points,reason_code,evidence,explanation) VALUES
 (UUID_TO_BIN('7C000000-0000-4000-8000-000000000002',1),UUID_TO_BIN('7B000000-0000-4000-8000-000000000002',1),'validation_result',UUID_TO_BIN('78000000-0000-4000-8000-000000000002',1),65.000,'MRZ_VISUAL_EXPIRY_MISMATCH',JSON_OBJECT('synthetic',true),'Visual/MRZ expiry contradiction increased advisory risk.'),
 (UUID_TO_BIN('7C000000-0000-4000-8000-000000000003',1),UUID_TO_BIN('7B000000-0000-4000-8000-000000000003',1),'forensic_finding',UUID_TO_BIN('7A000000-0000-4000-8000-000000000003',1),72.000,'PHOTO_REPLACEMENT_SIGNAL',JSON_OBJECT('synthetic',true),'Photo-replacement signal increased advisory risk.'),
 (UUID_TO_BIN('7C000000-0000-4000-8000-000000000004',1),UUID_TO_BIN('7B000000-0000-4000-8000-000000000004',1),'forensic_finding',UUID_TO_BIN('7A000000-0000-4000-8000-000000000004',1),68.000,'FAKE_STAMP_SIGNAL',JSON_OBJECT('synthetic',true),'Fake-stamp signal increased advisory risk.');
INSERT INTO workflow_decisions (workflow_decision_id,case_id,officer_user_id,decision,rationale,decision_at) VALUES
 (UUID_TO_BIN('7D000000-0000-4000-8000-000000000001',1),UUID_TO_BIN('70000000-0000-4000-8000-000000000001',1),UUID_TO_BIN('44444444-4444-4444-8444-444444444444',1),'clear','Synthetic clear case: officer reviewed the evidence.','2026-09-01 08:01:00.000000');
INSERT INTO audit_events (audit_event_id,organization_id,actor_user_id,case_id,event_type,entity_type,entity_id,occurred_at,payload,previous_event_hash,event_hash) VALUES
 (UUID_TO_BIN('7E000000-0000-4000-8000-000000000001',1),UUID_TO_BIN('11111111-1111-4111-8111-111111111111',1),UUID_TO_BIN('44444444-4444-4444-8444-444444444444',1),UUID_TO_BIN('70000000-0000-4000-8000-000000000001',1),'case.closed','screening_case',UUID_TO_BIN('70000000-0000-4000-8000-000000000001',1),'2026-09-01 08:01:00.000000',JSON_OBJECT('synthetic',true),NULL,UNHEX(SHA2('synthetic-audit-event-001',256)));
COMMIT;
