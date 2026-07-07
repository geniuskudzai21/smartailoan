const pg = require('pg');

require('dotenv').config();

const pool = new pg.Pool({
  host: process.env.SUPABASE_HOST,
  port: parseInt(process.env.SUPABASE_PORT, 10),
  database: process.env.SUPABASE_DATABASE,
  user: process.env.SUPABASE_USER,
  password: process.env.SUPABASE_PASSWORD,
  ssl: { rejectUnauthorized: false },
});

const sql = `
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) UNIQUE NOT NULL,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS loan_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  amount DECIMAL(12,2),
  purpose TEXT,
  preferred_date DATE,
  monthly_income DECIMAL(12,2),
  employment_status TEXT,
  repayment_period TEXT,
  status TEXT DEFAULT 'Pending',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS residential_address TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notify_email BOOLEAN DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notify_sms BOOLEAN DEFAULT true;

ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS preferred_date DATE;
ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS ai_score INT;
ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS ai_risk TEXT;
ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS ai_decision TEXT;
ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS ai_reason TEXT;
ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS remaining_balance DECIMAL(12,2);

ALTER TABLE transactions ADD COLUMN IF NOT EXISTS loan_id UUID REFERENCES loan_applications(id);

CREATE TABLE IF NOT EXISTS user_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_name TEXT,
  file_size INTEGER,
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Verified', 'Rejected')),
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TABLE IF EXISTS kyc_documents;

CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  type TEXT,
  amount DECIMAL(12,2),
  reference TEXT,
  status TEXT DEFAULT 'Completed',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  subject TEXT,
  message TEXT,
  status TEXT DEFAULT 'Open',
  created_at TIMESTAMPTZ DEFAULT now()
);
`;

(async () => {
  try {
    await pool.query(sql);
    console.log('Migration completed successfully!');
  } catch (err) {
    console.error('Migration failed:', err.message);
  } finally {
    await pool.end();
  }
})();
