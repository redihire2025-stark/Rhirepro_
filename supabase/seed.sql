-- =============================================================
-- SEED DATA — Run AFTER creating users in Supabase Auth
-- =============================================================
--
-- Step 1: Go to Supabase Dashboard → Authentication → Users → Add User
-- Create these 8 accounts (Email confirmed: ON, Auto-confirm: ON):
--
--   Job Seekers:
--     arjun.mehta@redhire.dev       / RedHire@123
--     priya.sharma@redhire.dev      / RedHire@123
--     rohan.gupta@redhire.dev       / RedHire@123
--     sneha.verma@redhire.dev       / RedHire@123
--
--   Recruiters:
--     hr@techcorp.redhire.dev       / RedHire@123
--     hr@infosys.redhire.dev        / RedHire@123
--     hr@zomato.redhire.dev         / RedHire@123
--     hr@flipkart.redhire.dev       / RedHire@123
--
-- Step 2: After creating, go to Authentication → Users, click each user
-- and copy their UUID. Paste them below replacing the placeholder values.
--
-- Step 3: Run this entire script in the SQL Editor.
-- =============================================================

DO $$
DECLARE
  -- ── PASTE REAL UUIDs HERE ─────────────────────────────────
  arjun_id    uuid := '0794e888-2ab4-4a94-9f04-611ab1c3f73f';
  priya_id    uuid := 'c71327f1-95cb-4a39-a216-18853a6b54b3';
  rohan_id    uuid := '9916e023-668e-4ff1-84c2-38beb4f5c19d';
  sneha_id    uuid := 'fb2318c3-ec18-4ba5-a6f1-4838225b4627';
  techcorp_id uuid := '97dfe612-ca99-491c-96db-91165db3da99';
  infosys_id  uuid := '692b5a61-a565-4d09-974b-12b1c8b5a7ef';
  zomato_id   uuid := 'cdd9740c-2a37-4369-916b-620019dc5449';
  flipkart_id uuid := 'b56d18e8-9c4b-4d12-8fe8-63996d60e1d8';
  -- ──────────────────────────────────────────────────────────

BEGIN

  -- ── Job Seeker Profiles ───────────────────────────────────

  INSERT INTO profiles (id, email, display_name, first_name, last_name, phone, headline, location,
    experience_type, total_experience, current_company, current_title,
    current_salary, expected_salary, notice_period, skills, about)
  VALUES
  (arjun_id, 'arjun.mehta@redhire.dev', 'Arjun Mehta', 'Arjun', 'Mehta', '+91 98765 43210',
    'Senior Data Analyst | Python | SQL | Power BI',
    'Bengaluru, Karnataka', 'experienced', '5 years 3 months',
    'Infosys Ltd.', 'Data Analyst', '12 LPA', '18 LPA', '30 days',
    ARRAY['Python','SQL','Power BI','Tableau','Machine Learning','Pandas','NumPy'],
    'Passionate data analyst with 5+ years driving insights from large datasets.'),

  (priya_id, 'priya.sharma@redhire.dev', 'Priya Sharma', 'Priya', 'Sharma', '+91 87654 32109',
    'ML Engineer | Deep Learning | TensorFlow | NLP',
    'Hyderabad, Telangana', 'experienced', '6 years 1 month',
    'Google India Pvt. Ltd.', 'Machine Learning Engineer', '28 LPA', '38 LPA', '60 days',
    ARRAY['Python','TensorFlow','PyTorch','NLP','Deep Learning','Kubernetes','MLOps'],
    'ML engineer specialized in large-scale NLP models serving millions of users.'),

  (rohan_id, 'rohan.gupta@redhire.dev', 'Rohan Gupta', 'Rohan', 'Gupta', '+91 76543 21098',
    'Marketing Manager | Growth Hacking | SEO | Performance Marketing',
    'New Delhi, NCR', 'experienced', '4 years 8 months',
    'Zomato', 'Marketing Manager', '15 LPA', '22 LPA', '45 days',
    ARRAY['SEO','Google Ads','Meta Ads','Content Strategy','Analytics','CRM','A/B Testing'],
    'Growth-focused marketing leader with track record of scaling digital campaigns.'),

  (sneha_id, 'sneha.verma@redhire.dev', 'Sneha Verma', 'Sneha', 'Verma', '+91 65432 10987',
    'UI/UX Designer | Figma | Design Systems | User Research',
    'Bengaluru, Karnataka', 'experienced', '3 years 5 months',
    'Flipkart', 'Product Designer', '14 LPA', '20 LPA', '30 days',
    ARRAY['Figma','Adobe XD','Prototyping','User Research','Design Systems','Wireframing','Usability Testing'],
    'Product designer passionate about creating intuitive, accessible user experiences.')
  ON CONFLICT (id) DO NOTHING;

  -- ── Work Experience for Arjun ─────────────────────────────

  INSERT INTO work_experience (profile_id, company, title, location, start_date, end_date, is_current, description) VALUES
  (arjun_id, 'Infosys Ltd.', 'Data Analyst', 'Bengaluru', 'Jan 2022', NULL, true,
    'Led end-to-end data pipeline development, reduced reporting time by 40%. Managed dashboards for 3 business units using Power BI and Tableau.'),
  (arjun_id, 'Wipro Technologies', 'Junior Data Analyst', 'Hyderabad', 'Jun 2020', 'Dec 2021', false,
    'Worked on ETL processes, SQL optimisation and built automated reporting systems.'),
  (arjun_id, 'StartupXYZ', 'Data Science Intern', 'Pune', 'Jan 2020', 'May 2020', false,
    'Developed predictive models using Python. Performed EDA on large datasets.');

  INSERT INTO education (profile_id, institution, degree, field, start_year, end_year, score) VALUES
  (arjun_id, 'IIT Bombay', 'B.Tech', 'Computer Science & Engineering', '2016', '2020', '8.6 CGPA');

  -- ── Work Experience for Priya ─────────────────────────────

  INSERT INTO work_experience (profile_id, company, title, location, start_date, end_date, is_current, description) VALUES
  (priya_id, 'Google India Pvt. Ltd.', 'Machine Learning Engineer', 'Hyderabad', 'Mar 2021', NULL, true,
    'Designed and deployed large-scale NLP models serving 10M+ users.'),
  (priya_id, 'Microsoft IDC', 'Software Engineer II', 'Hyderabad', 'Jul 2019', 'Feb 2021', false,
    'Built ML pipelines for Azure Cognitive Services.'),
  (priya_id, 'Amazon India', 'SDE Intern', 'Bengaluru', 'May 2018', 'Jul 2018', false,
    'Worked on recommendation engine improvements for Amazon.in.');

  INSERT INTO education (profile_id, institution, degree, field, start_year, end_year, score) VALUES
  (priya_id, 'IIT Delhi', 'M.Tech', 'Artificial Intelligence', '2018', '2019', '9.1 CGPA'),
  (priya_id, 'NIT Warangal', 'B.Tech', 'Electronics & Communication', '2014', '2018', '8.9 CGPA');

  -- ── Work Experience for Rohan ─────────────────────────────

  INSERT INTO work_experience (profile_id, company, title, location, start_date, end_date, is_current, description) VALUES
  (rohan_id, 'Zomato', 'Marketing Manager', 'Gurugram', 'Apr 2022', NULL, true,
    'Managed Rs. 2Cr monthly marketing budget. Drove 35% increase in app installs.'),
  (rohan_id, 'Swiggy', 'Digital Marketing Executive', 'Bengaluru', 'Sep 2020', 'Mar 2022', false,
    'Ran multi-channel campaigns across Google, Meta, and YouTube. Achieved 40% reduction in CPA.'),
  (rohan_id, 'MakeMyTrip', 'Marketing Intern', 'New Delhi', 'Jan 2020', 'Jun 2020', false,
    'Assisted in SEO audits and content calendar management.');

  INSERT INTO education (profile_id, institution, degree, field, start_year, end_year, score) VALUES
  (rohan_id, 'IIM Lucknow', 'MBA', 'Marketing & Strategy', '2018', '2020', '3.8/4.0 GPA'),
  (rohan_id, 'Delhi University', 'B.Com (Hons.)', 'Commerce', '2015', '2018', '87%');

  -- ── Work Experience for Sneha ─────────────────────────────

  INSERT INTO work_experience (profile_id, company, title, location, start_date, end_date, is_current, description) VALUES
  (sneha_id, 'Flipkart', 'Product Designer', 'Bengaluru', 'Nov 2022', NULL, true,
    'Redesigned checkout flow increasing conversion by 22%. Led design system overhaul.'),
  (sneha_id, 'PayTM', 'UI/UX Designer', 'Noida', 'Oct 2021', 'Oct 2022', false,
    'Created high-fidelity prototypes for PayTM Money app. Conducted 50+ user interviews.');

  INSERT INTO education (profile_id, institution, degree, field, start_year, end_year, score) VALUES
  (sneha_id, 'NID Ahmedabad', 'M.Des', 'Interaction Design', '2019', '2021', 'First Class'),
  (sneha_id, 'Pune University', 'B.E.', 'Information Technology', '2015', '2019', '8.2 CGPA');

  -- ── Recruiter Profiles ────────────────────────────────────

  INSERT INTO recruiter_profiles (id, email, recruiter_name, company_name, company_size,
    company_type, industry, phone, company_description, website, location)
  VALUES
  (techcorp_id, 'hr@techcorp.redhire.dev', 'Anita Rao', 'TechCorp Inc.', '501-1000',
    'MNC', 'IT / Software', '+91 22 6789 0123',
    'Leading technology company focused on innovation and excellence, serving clients across 20+ countries.',
    'https://techcorp.com', 'Bengaluru, Karnataka'),

  (infosys_id, 'hr@infosys.redhire.dev', 'Vikram Singh', 'Infosys Solutions', '5001+',
    'Indian MNC', 'IT / Software', '+91 80 4116 7000',
    'Global leader in next-generation digital services and consulting.',
    'https://infosys.com', 'Bengaluru, Karnataka'),

  (zomato_id, 'hr@zomato.redhire.dev', 'Neha Kapoor', 'Zomato Pvt. Ltd.', '1001-5000',
    'Startup', 'E-commerce', '+91 124 4014101',
    'India largest food delivery and restaurant discovery platform.',
    'https://zomato.com', 'Gurugram, Haryana'),

  (flipkart_id, 'hr@flipkart.redhire.dev', 'Suresh Babu', 'Flipkart Internet Pvt. Ltd.', '5001+',
    'Indian MNC', 'E-commerce', '+91 80 4908 3000',
    'India leading e-commerce marketplace with 400M+ registered customers.',
    'https://flipkart.com', 'Bengaluru, Karnataka')
  ON CONFLICT (id) DO NOTHING;

  -- ── Sample Jobs ───────────────────────────────────────────

  INSERT INTO jobs (recruiter_id, title, description, company_name, location, work_mode,
    salary_min, salary_max, salary_type, experience_min, experience_max,
    employment_type, industry, skills, perks, openings, status)
  VALUES
  (techcorp_id, 'Senior Data Analyst',
    'We are looking for a Senior Data Analyst to join our growing analytics team. You will be responsible for turning complex data into actionable insights that drive business decisions.',
    'TechCorp Inc.', 'Bengaluru', 'Work from Office', 15, 25, 'LPA', 3, 7,
    'Full-time', 'IT / Software',
    ARRAY['Python','SQL','Power BI','Tableau','Machine Learning'],
    ARRAY['Health Insurance','5 Days a Week','Annual Bonus'], 2, 'Active'),

  (infosys_id, 'Machine Learning Engineer',
    'Join our AI/ML team to build cutting-edge machine learning solutions for enterprise clients globally.',
    'Infosys Solutions', 'Hyderabad', 'Hybrid', 20, 40, 'LPA', 4, 8,
    'Full-time', 'IT / Software',
    ARRAY['Python','TensorFlow','PyTorch','MLOps','Kubernetes'],
    ARRAY['Health Insurance','Stock Options','Flexible Hours','Work from Home'], 3, 'Active'),

  (zomato_id, 'Senior Marketing Manager',
    'Drive growth through data-driven marketing campaigns. Lead a team of 10+ marketers across performance, brand, and content verticals.',
    'Zomato Pvt. Ltd.', 'Gurugram', 'Hybrid', 18, 30, 'LPA', 4, 8,
    'Full-time', 'E-commerce',
    ARRAY['Google Ads','Meta Ads','SEO','Analytics','CRM','A/B Testing'],
    ARRAY['Health Insurance','Free Meals','Annual Bonus','5 Days a Week'], 1, 'Active'),

  (flipkart_id, 'Product Designer',
    'Design experiences that millions of Indians use daily. You will own end-to-end design for the checkout and payments domain.',
    'Flipkart Internet Pvt. Ltd.', 'Bengaluru', 'Work from Office', 12, 22, 'LPA', 2, 6,
    'Full-time', 'E-commerce',
    ARRAY['Figma','Design Systems','User Research','Prototyping','Usability Testing'],
    ARRAY['Health Insurance','Stock Options','5 Days a Week','Annual Bonus'], 2, 'Active'),

  (techcorp_id, 'Full Stack Engineer',
    'Build scalable, production-ready features across our React frontend and Node.js/PostgreSQL backend.',
    'TechCorp Inc.', 'Bengaluru', 'Hybrid', 20, 38, 'LPA', 3, 7,
    'Full-time', 'IT / Software',
    ARRAY['React','Node.js','TypeScript','PostgreSQL','AWS'],
    ARRAY['Health Insurance','Flexible Hours','Stock Options'], 3, 'Active');

END;
$$;
