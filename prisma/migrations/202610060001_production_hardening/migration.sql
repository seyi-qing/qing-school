-- Qing School v1.3 production hardening
-- Tenant-owned child records receive a direct schoolId. Parent-derived triggers
-- keep legacy create paths safe while application code is migrated to explicit scope.

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "sessionVersion" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "failedLoginCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lockedUntil" TIMESTAMP(3);

ALTER TABLE "Term" ADD COLUMN IF NOT EXISTS "schoolId" TEXT;
ALTER TABLE "Arm" ADD COLUMN IF NOT EXISTS "schoolId" TEXT;
ALTER TABLE "ArmSubject" ADD COLUMN IF NOT EXISTS "schoolId" TEXT;
ALTER TABLE "TimetableSlot" ADD COLUMN IF NOT EXISTS "schoolId" TEXT;
ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "schoolId" TEXT;
ALTER TABLE "LeaveRequest" ADD COLUMN IF NOT EXISTS "schoolId" TEXT;
ALTER TABLE "BookLoan" ADD COLUMN IF NOT EXISTS "schoolId" TEXT;
ALTER TABLE "HostelAllocation" ADD COLUMN IF NOT EXISTS "schoolId" TEXT;
ALTER TABLE "TransportEnrollment" ADD COLUMN IF NOT EXISTS "schoolId" TEXT;
ALTER TABLE "CbtQuestion" ADD COLUMN IF NOT EXISTS "schoolId" TEXT;
ALTER TABLE "CbtBankQuestion" ADD COLUMN IF NOT EXISTS "schoolId" TEXT;
ALTER TABLE "CbtAttempt" ADD COLUMN IF NOT EXISTS "schoolId" TEXT;
ALTER TABLE "ReportCardTemplate" ADD COLUMN IF NOT EXISTS "schoolId" TEXT;
ALTER TABLE "GradeBand" ADD COLUMN IF NOT EXISTS "schoolId" TEXT;
ALTER TABLE "Score" ADD COLUMN IF NOT EXISTS "schoolId" TEXT;
ALTER TABLE "Attendance" ADD COLUMN IF NOT EXISTS "schoolId" TEXT;
ALTER TABLE "ResultPin" ADD COLUMN IF NOT EXISTS "schoolId" TEXT;
ALTER TABLE "FeeItem" ADD COLUMN IF NOT EXISTS "schoolId" TEXT;
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "schoolId" TEXT;
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "schoolId" TEXT;
ALTER TABLE "Payslip" ADD COLUMN IF NOT EXISTS "schoolId" TEXT;
ALTER TABLE "MediaAsset" ADD COLUMN IF NOT EXISTS "schoolId" TEXT;
ALTER TABLE "SiteTheme" ADD COLUMN IF NOT EXISTS "schoolId" TEXT;
ALTER TABLE "MessageLog" ADD COLUMN IF NOT EXISTS "schoolId" TEXT;
ALTER TABLE "ParentLink" ADD COLUMN IF NOT EXISTS "schoolId" TEXT;

UPDATE "Term" t SET "schoolId"=s."schoolId" FROM "Session" s WHERE t."schoolId" IS NULL AND t."sessionId"=s."id";
UPDATE "Arm" a SET "schoolId"=c."schoolId" FROM "SchoolClass" c WHERE a."schoolId" IS NULL AND a."schoolClassId"=c."id";
UPDATE "ArmSubject" x SET "schoolId"=a."schoolId" FROM "Arm" a WHERE x."schoolId" IS NULL AND x."armId"=a."id";
UPDATE "TimetableSlot" x SET "schoolId"=a."schoolId" FROM "Arm" a WHERE x."schoolId" IS NULL AND x."armId"=a."id";
UPDATE "Document" x SET "schoolId"=s."schoolId" FROM "Student" s WHERE x."schoolId" IS NULL AND x."studentId"=s."id";
UPDATE "LeaveRequest" x SET "schoolId"=s."schoolId" FROM "Staff" s WHERE x."schoolId" IS NULL AND x."staffId"=s."id";
UPDATE "BookLoan" x SET "schoolId"=b."schoolId" FROM "LibraryBook" b WHERE x."schoolId" IS NULL AND x."bookId"=b."id";
UPDATE "HostelAllocation" x SET "schoolId"=r."schoolId" FROM "HostelRoom" r WHERE x."schoolId" IS NULL AND x."roomId"=r."id";
UPDATE "TransportEnrollment" x SET "schoolId"=r."schoolId" FROM "TransportRoute" r WHERE x."schoolId" IS NULL AND x."routeId"=r."id";
UPDATE "CbtQuestion" x SET "schoolId"=e."schoolId" FROM "CbtExam" e WHERE x."schoolId" IS NULL AND x."examId"=e."id";
UPDATE "CbtAttempt" x SET "schoolId"=e."schoolId" FROM "CbtExam" e WHERE x."schoolId" IS NULL AND x."examId"=e."id";
UPDATE "Score" x SET "schoolId"=s."schoolId" FROM "Student" s WHERE x."schoolId" IS NULL AND x."studentId"=s."id";
UPDATE "Attendance" x SET "schoolId"=s."schoolId" FROM "Student" s WHERE x."schoolId" IS NULL AND x."studentId"=s."id";
UPDATE "ResultPin" x SET "schoolId"=t."schoolId" FROM "Term" t WHERE x."schoolId" IS NULL AND x."termId"=t."id";
UPDATE "FeeItem" x SET "schoolId"=a."schoolId" FROM "Arm" a WHERE x."schoolId" IS NULL AND x."armId"=a."id";
UPDATE "Invoice" x SET "schoolId"=s."schoolId" FROM "Student" s WHERE x."schoolId" IS NULL AND x."studentId"=s."id";
UPDATE "Payment" x SET "schoolId"=s."schoolId" FROM "Student" s WHERE x."schoolId" IS NULL AND x."studentId"=s."id";
UPDATE "Payslip" x SET "schoolId"=s."schoolId" FROM "Staff" s WHERE x."schoolId" IS NULL AND x."staffId"=s."id";
UPDATE "ParentLink" x SET "schoolId"=s."schoolId" FROM "Student" s WHERE x."schoolId" IS NULL AND x."studentId"=s."id";

CREATE OR REPLACE FUNCTION set_term_school() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW."schoolId" IS NULL THEN SELECT "schoolId" INTO NEW."schoolId" FROM "Session" WHERE id=NEW."sessionId"; END IF; RETURN NEW; END $$;
CREATE OR REPLACE FUNCTION set_arm_school() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW."schoolId" IS NULL THEN SELECT "schoolId" INTO NEW."schoolId" FROM "SchoolClass" WHERE id=NEW."schoolClassId"; END IF; RETURN NEW; END $$;
CREATE OR REPLACE FUNCTION set_arm_subject_school() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW."schoolId" IS NULL THEN SELECT "schoolId" INTO NEW."schoolId" FROM "Arm" WHERE id=NEW."armId"; END IF; RETURN NEW; END $$;
CREATE OR REPLACE FUNCTION set_timetable_school() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW."schoolId" IS NULL THEN SELECT "schoolId" INTO NEW."schoolId" FROM "Arm" WHERE id=NEW."armId"; END IF; RETURN NEW; END $$;
CREATE OR REPLACE FUNCTION set_document_school() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW."schoolId" IS NULL THEN SELECT "schoolId" INTO NEW."schoolId" FROM "Student" WHERE id=NEW."studentId"; END IF; RETURN NEW; END $$;
CREATE OR REPLACE FUNCTION set_leave_school() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW."schoolId" IS NULL THEN SELECT "schoolId" INTO NEW."schoolId" FROM "Staff" WHERE id=NEW."staffId"; END IF; RETURN NEW; END $$;
CREATE OR REPLACE FUNCTION set_bookloan_school() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW."schoolId" IS NULL THEN SELECT "schoolId" INTO NEW."schoolId" FROM "LibraryBook" WHERE id=NEW."bookId"; END IF; RETURN NEW; END $$;
CREATE OR REPLACE FUNCTION set_hostelalloc_school() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW."schoolId" IS NULL THEN SELECT "schoolId" INTO NEW."schoolId" FROM "HostelRoom" WHERE id=NEW."roomId"; END IF; RETURN NEW; END $$;
CREATE OR REPLACE FUNCTION set_transport_school() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW."schoolId" IS NULL THEN SELECT "schoolId" INTO NEW."schoolId" FROM "TransportRoute" WHERE id=NEW."routeId"; END IF; RETURN NEW; END $$;
CREATE OR REPLACE FUNCTION set_cbtquestion_school() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW."schoolId" IS NULL THEN SELECT "schoolId" INTO NEW."schoolId" FROM "CbtExam" WHERE id=NEW."examId"; END IF; RETURN NEW; END $$;
CREATE OR REPLACE FUNCTION set_cbta_school() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW."schoolId" IS NULL THEN SELECT "schoolId" INTO NEW."schoolId" FROM "CbtExam" WHERE id=NEW."examId"; END IF; RETURN NEW; END $$;
CREATE OR REPLACE FUNCTION set_score_school() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW."schoolId" IS NULL THEN SELECT "schoolId" INTO NEW."schoolId" FROM "Student" WHERE id=NEW."studentId"; END IF; RETURN NEW; END $$;
CREATE OR REPLACE FUNCTION set_attendance_school() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW."schoolId" IS NULL THEN SELECT "schoolId" INTO NEW."schoolId" FROM "Student" WHERE id=NEW."studentId"; END IF; RETURN NEW; END $$;
CREATE OR REPLACE FUNCTION set_resultpin_school() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW."schoolId" IS NULL THEN SELECT "schoolId" INTO NEW."schoolId" FROM "Term" WHERE id=NEW."termId"; END IF; RETURN NEW; END $$;
CREATE OR REPLACE FUNCTION set_feeitem_school() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW."schoolId" IS NULL THEN SELECT "schoolId" INTO NEW."schoolId" FROM "Arm" WHERE id=NEW."armId"; END IF; RETURN NEW; END $$;
CREATE OR REPLACE FUNCTION set_invoice_school() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW."schoolId" IS NULL THEN SELECT "schoolId" INTO NEW."schoolId" FROM "Student" WHERE id=NEW."studentId"; END IF; RETURN NEW; END $$;
CREATE OR REPLACE FUNCTION set_payment_school() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW."schoolId" IS NULL THEN SELECT "schoolId" INTO NEW."schoolId" FROM "Student" WHERE id=NEW."studentId"; END IF; RETURN NEW; END $$;
CREATE OR REPLACE FUNCTION set_payslip_school() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW."schoolId" IS NULL THEN SELECT "schoolId" INTO NEW."schoolId" FROM "Staff" WHERE id=NEW."staffId"; END IF; RETURN NEW; END $$;
CREATE OR REPLACE FUNCTION set_parentlink_school() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW."schoolId" IS NULL THEN SELECT "schoolId" INTO NEW."schoolId" FROM "Student" WHERE id=NEW."studentId"; END IF; RETURN NEW; END $$;

CREATE TRIGGER term_school BEFORE INSERT OR UPDATE OF "sessionId","schoolId" ON "Term" FOR EACH ROW EXECUTE FUNCTION set_term_school();
CREATE TRIGGER arm_school BEFORE INSERT OR UPDATE OF "schoolClassId","schoolId" ON "Arm" FOR EACH ROW EXECUTE FUNCTION set_arm_school();
CREATE TRIGGER arm_subject_school BEFORE INSERT OR UPDATE OF "armId","schoolId" ON "ArmSubject" FOR EACH ROW EXECUTE FUNCTION set_arm_subject_school();
CREATE TRIGGER timetable_school BEFORE INSERT OR UPDATE OF "armId","schoolId" ON "TimetableSlot" FOR EACH ROW EXECUTE FUNCTION set_timetable_school();
CREATE TRIGGER document_school BEFORE INSERT OR UPDATE OF "studentId","schoolId" ON "Document" FOR EACH ROW EXECUTE FUNCTION set_document_school();
CREATE TRIGGER leave_school BEFORE INSERT OR UPDATE OF "staffId","schoolId" ON "LeaveRequest" FOR EACH ROW EXECUTE FUNCTION set_leave_school();
CREATE TRIGGER bookloan_school BEFORE INSERT OR UPDATE OF "bookId","schoolId" ON "BookLoan" FOR EACH ROW EXECUTE FUNCTION set_bookloan_school();
CREATE TRIGGER hostelalloc_school BEFORE INSERT OR UPDATE OF "roomId","schoolId" ON "HostelAllocation" FOR EACH ROW EXECUTE FUNCTION set_hostelalloc_school();
CREATE TRIGGER transport_school BEFORE INSERT OR UPDATE OF "routeId","schoolId" ON "TransportEnrollment" FOR EACH ROW EXECUTE FUNCTION set_transport_school();
CREATE TRIGGER cbtquestion_school BEFORE INSERT OR UPDATE OF "examId","schoolId" ON "CbtQuestion" FOR EACH ROW EXECUTE FUNCTION set_cbtquestion_school();
CREATE TRIGGER cbta_school BEFORE INSERT OR UPDATE OF "examId","schoolId" ON "CbtAttempt" FOR EACH ROW EXECUTE FUNCTION set_cbta_school();
CREATE TRIGGER score_school BEFORE INSERT OR UPDATE OF "studentId","schoolId" ON "Score" FOR EACH ROW EXECUTE FUNCTION set_score_school();
CREATE TRIGGER attendance_school BEFORE INSERT OR UPDATE OF "studentId","schoolId" ON "Attendance" FOR EACH ROW EXECUTE FUNCTION set_attendance_school();
CREATE TRIGGER resultpin_school BEFORE INSERT OR UPDATE OF "termId","schoolId" ON "ResultPin" FOR EACH ROW EXECUTE FUNCTION set_resultpin_school();
CREATE TRIGGER feeitem_school BEFORE INSERT OR UPDATE OF "armId","schoolId" ON "FeeItem" FOR EACH ROW EXECUTE FUNCTION set_feeitem_school();
CREATE TRIGGER invoice_school BEFORE INSERT OR UPDATE OF "studentId","schoolId" ON "Invoice" FOR EACH ROW EXECUTE FUNCTION set_invoice_school();
CREATE TRIGGER payment_school BEFORE INSERT OR UPDATE OF "studentId","schoolId" ON "Payment" FOR EACH ROW EXECUTE FUNCTION set_payment_school();
CREATE TRIGGER payslip_school BEFORE INSERT OR UPDATE OF "staffId","schoolId" ON "Payslip" FOR EACH ROW EXECUTE FUNCTION set_payslip_school();
CREATE TRIGGER parentlink_school BEFORE INSERT OR UPDATE OF "studentId","schoolId" ON "ParentLink" FOR EACH ROW EXECUTE FUNCTION set_parentlink_school();

DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['Term','Arm','ArmSubject','TimetableSlot','Document','LeaveRequest','BookLoan','HostelAllocation','TransportEnrollment','CbtQuestion','CbtAttempt','Score','Attendance','ResultPin','FeeItem','Invoice','Payment','Payslip','ParentLink'] LOOP
    EXECUTE format('ALTER TABLE "%s" ALTER COLUMN "schoolId" SET NOT NULL', t);
    EXECUTE format('CREATE INDEX IF NOT EXISTS "%s_schoolId_idx" ON "%s" ("schoolId")', lower(t), t);
  END LOOP;
END $$;

ALTER TABLE "Staff" ALTER COLUMN "monthlySalary" TYPE DECIMAL(12,2) USING ROUND("monthlySalary"::numeric,2);
ALTER TABLE "TransportRoute" ALTER COLUMN "feeAmount" TYPE DECIMAL(12,2) USING ROUND("feeAmount"::numeric,2);
ALTER TABLE "FeeItem" ALTER COLUMN "amount" TYPE DECIMAL(12,2) USING ROUND("amount"::numeric,2);
ALTER TABLE "Invoice" ALTER COLUMN "totalAmount" TYPE DECIMAL(12,2) USING ROUND("totalAmount"::numeric,2);
ALTER TABLE "Invoice" ALTER COLUMN "amountPaid" TYPE DECIMAL(12,2) USING ROUND("amountPaid"::numeric,2);
ALTER TABLE "Payment" ALTER COLUMN "amount" TYPE DECIMAL(12,2) USING ROUND("amount"::numeric,2);
ALTER TABLE "ExpenseRecord" ALTER COLUMN "amount" TYPE DECIMAL(12,2) USING ROUND("amount"::numeric,2);
ALTER TABLE "Payslip" ALTER COLUMN "gross" TYPE DECIMAL(12,2) USING ROUND("gross"::numeric,2);
ALTER TABLE "Payslip" ALTER COLUMN "deductions" TYPE DECIMAL(12,2) USING ROUND("deductions"::numeric,2);
ALTER TABLE "Payslip" ALTER COLUMN "net" TYPE DECIMAL(12,2) USING ROUND("net"::numeric,2);

ALTER TABLE "Term" ADD CONSTRAINT "Term_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id");
ALTER TABLE "Arm" ADD CONSTRAINT "Arm_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id");
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id");
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id");
ALTER TABLE "FeeItem" ADD CONSTRAINT "FeeItem_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id");
ALTER TABLE "ExpenseRecord" ADD CONSTRAINT "ExpenseRecord_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id");
