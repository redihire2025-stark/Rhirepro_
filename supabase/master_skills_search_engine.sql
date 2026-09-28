-- Migration: master_skills_search_engine.sql
-- Purpose: Unified database-driven search engine for skills, designations, and keywords
-- Platform-wide Single Source of Truth for Autocomplete, Candidate Search, and Job Recommendations

-- 1. Enable pg_trgm for fast trigram fuzzy matching & similarity scoring
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. Create master_skills table
CREATE TABLE IF NOT EXISTS public.master_skills (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  type text NOT NULL DEFAULT 'skill' CHECK (type IN ('skill', 'designation', 'category')),
  category text,
  subcategory text,
  aliases text[] DEFAULT '{}'::text[],
  search_synonyms text[] DEFAULT '{}'::text[],
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT master_skills_name_unique UNIQUE (name)
);

-- 3. Indexes for sub-millisecond search performance
CREATE INDEX IF NOT EXISTS idx_master_skills_name_trgm ON public.master_skills USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_master_skills_type_active ON public.master_skills (type, is_active);
CREATE INDEX IF NOT EXISTS idx_master_skills_name_lower ON public.master_skills (lower(name));

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.master_skills ENABLE ROW LEVEL SECURITY;

-- Allow anyone (authenticated or anonymous) to view active skills & designations for search suggestions
DROP POLICY IF EXISTS "Public read active master_skills" ON public.master_skills;
CREATE POLICY "Public read active master_skills"
  ON public.master_skills
  FOR SELECT
  USING (is_active = true);

-- Allow authenticated users / service_role to insert or update skills
DROP POLICY IF EXISTS "Admins and service_role can manage master_skills" ON public.master_skills;
DROP POLICY IF EXISTS "Admins and recruiters can manage master_skills" ON public.master_skills;
CREATE POLICY "Admins and recruiters can manage master_skills"
  ON public.master_skills
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 5. Stored Procedure for Fuzzy & Prefix Autocomplete Search
CREATE OR REPLACE FUNCTION public.search_master_skills(
  p_query text,
  p_type text DEFAULT 'all',
  p_limit int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  name text,
  type text,
  category text,
  subcategory text,
  similarity real
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_clean text := trim(lower(p_query));
BEGIN
  IF v_clean IS NULL OR v_clean = '' THEN
    RETURN QUERY
    SELECT 
      m.id,
      m.name,
      m.type,
      m.category,
      m.subcategory,
      1.0::real as similarity
    FROM public.master_skills m
    WHERE m.is_active = true
      AND (p_type = 'all' OR m.type = p_type)
    ORDER BY m.name ASC
    LIMIT p_limit;
    RETURN;
  END IF;

  RETURN QUERY
  SELECT 
    m.id,
    m.name,
    m.type,
    m.category,
    m.subcategory,
    CASE 
      WHEN lower(m.name) = v_clean THEN 1.0::real
      WHEN lower(m.name) LIKE (v_clean || '%') THEN 0.9::real
      WHEN lower(m.name) ~* ('(^|[[:space:]])' || v_clean) THEN 0.7::real
      WHEN length(v_clean) >= 3 AND lower(m.name) LIKE ('%' || v_clean || '%') THEN 0.5::real
      ELSE similarity(lower(m.name), v_clean)::real
    END as similarity
  FROM public.master_skills m
  WHERE m.is_active = true
    AND (p_type = 'all' OR m.type = p_type)
    AND (
      lower(m.name) LIKE (v_clean || '%')
      OR lower(m.name) ~* ('(^|[[:space:]])' || v_clean)
      OR (length(v_clean) >= 3 AND lower(m.name) LIKE ('%' || v_clean || '%'))
      OR v_clean = ANY(SELECT lower(x) FROM unnest(m.aliases) x)
      OR (length(v_clean) >= 3 AND similarity(lower(m.name), v_clean) > 0.25)
    )
  ORDER BY 
    CASE 
      WHEN lower(m.name) = v_clean THEN 1
      WHEN lower(m.name) LIKE (v_clean || '%') THEN 2
      WHEN lower(m.name) ~* ('(^|[[:space:]])' || v_clean) THEN 3
      ELSE 4
    END,
    length(m.name) ASC,
    similarity(lower(m.name), v_clean) DESC,
    m.name ASC
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.search_master_skills(text, text, int) TO authenticated, anon, service_role;

-- 6. Initial Seed Data (Standard Industry Skills and Designations)
INSERT INTO public.master_skills (name, type, category, subcategory, aliases)
VALUES
  -- Designations
  ('Software Engineer', 'designation', 'Engineering', 'Software', ARRAY['Software Developer', 'Programmer', 'SDE']),
  ('Frontend Developer', 'designation', 'IT & Software Development', 'Frontend', ARRAY['Frontend Engineer', 'UI Developer', 'Client Engineer']),
  ('Backend Developer', 'designation', 'IT & Software Development', 'Backend', ARRAY['Backend Engineer', 'Server Engineer', 'API Developer']),
  ('Full Stack Developer', 'designation', 'IT & Software Development', 'Full Stack', ARRAY['Full Stack Engineer', 'Fullstack']),
  ('React Developer', 'designation', 'IT & Software Development', 'Frontend', ARRAY['React Engineer', 'ReactJS Developer']),
  ('Node.js Developer', 'designation', 'IT & Software Development', 'Backend', ARRAY['NodeJS Developer', 'Node Engineer']),
  ('Java Developer', 'designation', 'IT & Software Development', 'Backend', ARRAY['Java Engineer', 'Core Java Developer', 'Spring Developer']),
  ('Python Developer', 'designation', 'IT & Software Development', 'Backend', ARRAY['Python Engineer', 'Django Developer']),
  ('DevOps Engineer', 'designation', 'IT & Software Development', 'Cloud, DevOps & Security', ARRAY['DevOps Specialist', 'Platform Engineer', 'SRE', 'Site Reliability Engineer']),
  ('Cloud Architect', 'designation', 'IT & Software Development', 'Cloud, DevOps & Security', ARRAY['Cloud Engineer', 'AWS Architect', 'Azure Architect']),
  ('Data Scientist', 'designation', 'IT & Software Development', 'Data Science & AI', ARRAY['Data Science Specialist', 'ML Scientist']),
  ('Data Analyst', 'designation', 'IT & Software Development', 'Data Science & AI', ARRAY['Business Data Analyst', 'BI Analyst']),
  ('Data Engineer', 'designation', 'IT & Software Development', 'Data Science & AI', ARRAY['Big Data Engineer', 'ETL Developer']),
  ('Machine Learning Engineer', 'designation', 'IT & Software Development', 'Data Science & AI', ARRAY['ML Engineer', 'AI Specialist']),
  ('AI Engineer', 'designation', 'IT & Software Development', 'Data Science & AI', ARRAY['Artificial Intelligence Engineer', 'GenAI Engineer']),
  ('QA Engineer', 'designation', 'IT & Software Development', 'QA Testing', ARRAY['Quality Assurance Engineer', 'Test Engineer', 'QA Tester', 'Automation Tester']),
  ('UI/UX Designer', 'designation', 'Design', 'Product Design', ARRAY['Product Designer', 'UX Designer', 'UI Designer', 'Interaction Designer']),
  ('Product Manager', 'designation', 'Management', 'Product', ARRAY['Associate Product Manager', 'Technical Product Manager', 'PM']),
  ('Project Manager', 'designation', 'Management', 'Project', ARRAY['Scrum Master', 'Agile Coach', 'Delivery Manager']),
  ('HR Manager', 'designation', 'Human Resources', 'HR Management', ARRAY['Human Resources Manager', 'People Manager']),
  ('Recruiter', 'designation', 'Human Resources', 'Talent Acquisition', ARRAY['Talent Acquisition Specialist', 'Technical Recruiter', 'Sourcing Specialist']),

  -- Tech Frontend Skills
  ('React', 'skill', 'IT & Software Development', 'Frontend', ARRAY['React.js', 'ReactJS']),
  ('TypeScript', 'skill', 'IT & Software Development', 'Frontend', ARRAY['TS']),
  ('JavaScript', 'skill', 'IT & Software Development', 'Frontend', ARRAY['JS', 'ECMAScript']),
  ('Next.js', 'skill', 'IT & Software Development', 'Frontend', ARRAY['NextJS']),
  ('Vue.js', 'skill', 'IT & Software Development', 'Frontend', ARRAY['Vue', 'VueJS']),
  ('Angular', 'skill', 'IT & Software Development', 'Frontend', ARRAY['AngularJS', 'Angular 2+']),
  ('HTML', 'skill', 'IT & Software Development', 'Frontend', ARRAY['HTML5']),
  ('CSS', 'skill', 'IT & Software Development', 'Frontend', ARRAY['CSS3']),
  ('Tailwind CSS', 'skill', 'IT & Software Development', 'Frontend', ARRAY['Tailwind']),
  ('Redux', 'skill', 'IT & Software Development', 'Frontend', ARRAY['Redux Toolkit', 'RTK']),

  -- Tech Backend Skills
  ('Node.js', 'skill', 'IT & Software Development', 'Backend', ARRAY['Node', 'NodeJS']),
  ('Python', 'skill', 'IT & Software Development', 'Backend', ARRAY['Python 3']),
  ('Java', 'skill', 'IT & Software Development', 'Backend', ARRAY['Core Java', 'J2EE']),
  ('Spring Boot', 'skill', 'IT & Software Development', 'Backend', ARRAY['SpringBoot', 'Spring Framework']),
  ('Django', 'skill', 'IT & Software Development', 'Backend', ARRAY['Django REST Framework', 'DRF']),
  ('FastAPI', 'skill', 'IT & Software Development', 'Backend', ARRAY['Fast API']),
  ('Express.js', 'skill', 'IT & Software Development', 'Backend', ARRAY['Express', 'ExpressJS']),
  ('Go', 'skill', 'IT & Software Development', 'Backend', ARRAY['Golang']),
  ('C#', 'skill', 'IT & Software Development', 'Backend', ARRAY['CSharp', '.NET']),
  ('.NET', 'skill', 'IT & Software Development', 'Backend', ARRAY['dotnet', 'ASP.NET', '.NET Core']),
  ('PHP', 'skill', 'IT & Software Development', 'Backend', ARRAY['Laravel']),
  ('REST API', 'skill', 'IT & Software Development', 'Backend', ARRAY['RESTful API', 'Web APIs']),
  ('GraphQL', 'skill', 'IT & Software Development', 'Backend', ARRAY['GQL']),
  ('Microservices', 'skill', 'IT & Software Development', 'Backend', ARRAY['Microservices Architecture']),

  -- Data & AI Skills
  ('SQL', 'skill', 'IT & Software Development', 'Data Science & AI', ARRAY['Structured Query Language']),
  ('PostgreSQL', 'skill', 'IT & Software Development', 'Data Science & AI', ARRAY['Postgres']),
  ('MySQL', 'skill', 'IT & Software Development', 'Data Science & AI', ARRAY['My SQL']),
  ('MongoDB', 'skill', 'IT & Software Development', 'Data Science & AI', ARRAY['Mongo']),
  ('Redis', 'skill', 'IT & Software Development', 'Data Science & AI', ARRAY['Redis Cache']),
  ('Machine Learning', 'skill', 'IT & Software Development', 'Data Science & AI', ARRAY['ML']),
  ('Deep Learning', 'skill', 'IT & Software Development', 'Data Science & AI', ARRAY['Neural Networks']),
  ('TensorFlow', 'skill', 'IT & Software Development', 'Data Science & AI', ARRAY['TF']),
  ('PyTorch', 'skill', 'IT & Software Development', 'Data Science & AI', ARRAY['Torch']),
  ('Natural Language Processing', 'skill', 'IT & Software Development', 'Data Science & AI', ARRAY['NLP']),
  ('Generative AI', 'skill', 'IT & Software Development', 'Data Science & AI', ARRAY['GenAI', 'LLM', 'Large Language Models']),
  ('Prompt Engineering', 'skill', 'IT & Software Development', 'Data Science & AI', ARRAY['Prompting']),
  ('Pandas', 'skill', 'IT & Software Development', 'Data Science & AI', ARRAY['Python Pandas']),
  ('Power BI', 'skill', 'IT & Software Development', 'Data Science & AI', ARRAY['PowerBI']),
  ('Tableau', 'skill', 'IT & Software Development', 'Data Science & AI', ARRAY['Tableau Desktop']),

  -- Cloud, DevOps & Security Skills
  ('DevOps', 'skill', 'IT & Software Development', 'Cloud, DevOps & Security', ARRAY['DevOps Practices', 'DevOps Tools', 'CI/CD']),
  ('AWS', 'skill', 'IT & Software Development', 'Cloud, DevOps & Security', ARRAY['Amazon Web Services', 'EC2', 'S3']),
  ('Azure', 'skill', 'IT & Software Development', 'Cloud, DevOps & Security', ARRAY['Microsoft Azure']),
  ('Google Cloud', 'skill', 'IT & Software Development', 'Cloud, DevOps & Security', ARRAY['GCP', 'Google Cloud Platform']),
  ('Cloud Architecture', 'skill', 'IT & Software Development', 'Cloud, DevOps & Security', ARRAY['Cloud Computing', 'Cloud Platforms']),
  ('Docker', 'skill', 'IT & Software Development', 'Cloud, DevOps & Security', ARRAY['Containers', 'Docker Compose']),
  ('Kubernetes', 'skill', 'IT & Software Development', 'Cloud, DevOps & Security', ARRAY['K8s']),
  ('CI/CD', 'skill', 'IT & Software Development', 'Cloud, DevOps & Security', ARRAY['Continuous Integration', 'Pipelines']),
  ('Jenkins', 'skill', 'IT & Software Development', 'Cloud, DevOps & Security', ARRAY['Jenkins CI']),
  ('Terraform', 'skill', 'IT & Software Development', 'Cloud, DevOps & Security', ARRAY['IaC', 'Infrastructure as Code']),
  ('Linux', 'skill', 'IT & Software Development', 'Cloud, DevOps & Security', ARRAY['Ubuntu', 'RedHat', 'CentOS']),
  ('Cyber Security', 'skill', 'IT & Software Development', 'Cloud, DevOps & Security', ARRAY['Information Security', 'InfoSec', 'Cybersecurity']),

  -- Design & Product
  ('UI/UX', 'skill', 'Design', 'Product Design', ARRAY['UI', 'UX', 'UI Design', 'UX Design', 'User Interface', 'User Experience']),
  ('Product Management', 'skill', 'Management', 'Product', ARRAY['Product Strategy', 'Roadmapping', 'PRD']),
  ('Project Management', 'skill', 'Management', 'Project', ARRAY['Agile', 'Scrum', 'Sprint Planning']),

  -- Testing & Mobile
  ('QA Testing', 'skill', 'IT & Software Development', 'QA Testing', ARRAY['QA', 'Quality Assurance', 'Software Testing']),
  ('Selenium', 'skill', 'IT & Software Development', 'QA Testing', ARRAY['Selenium WebDriver']),
  ('Cypress', 'skill', 'IT & Software Development', 'QA Testing', ARRAY['Cypress.io']),
  ('Playwright', 'skill', 'IT & Software Development', 'QA Testing', ARRAY['Playwright Testing']),
  ('Automation Testing', 'skill', 'IT & Software Development', 'QA Testing', ARRAY['Automated Testing', 'Test Automation']),
  ('Manual Testing', 'skill', 'IT & Software Development', 'QA Testing', ARRAY['Manual QA']),
  ('Flutter', 'skill', 'IT & Software Development', 'Mobile Development', ARRAY['Dart', 'Flutter SDK']),
  ('React Native', 'skill', 'IT & Software Development', 'Mobile Development', ARRAY['RN']),
  ('Android Development', 'skill', 'IT & Software Development', 'Mobile Development', ARRAY['Android', 'Kotlin', 'Android SDK']),
  ('iOS Development', 'skill', 'IT & Software Development', 'Mobile Development', ARRAY['iOS', 'Swift', 'Xcode']),

  -- Data & AI Skills Additions
  ('Data Science', 'skill', 'IT & Software Development', 'Data Science & AI', ARRAY['Data Science Tools']),
  ('Data Analysis', 'skill', 'IT & Software Development', 'Data Science & AI', ARRAY['Data Analytics', 'Business Intelligence']),
  ('Data Engineering', 'skill', 'IT & Software Development', 'Data Science & AI', ARRAY['ETL Pipelines', 'Data Pipelines']),
  ('Artificial Intelligence', 'skill', 'IT & Software Development', 'Data Science & AI', ARRAY['AI', 'Machine Intelligence']),

  -- HR & Business
  ('Talent Acquisition', 'skill', 'Human Resources', 'Recruitment', ARRAY['Recruitment', 'Hiring', 'Staffing']),
  ('Boolean Search', 'skill', 'Human Resources', 'Sourcing', ARRAY['Boolean Sourcing', 'Candidate Sourcing']),
  ('HRIS', 'skill', 'Human Resources', 'Operations', ARRAY['Human Resources Information System', 'Workday'])
ON CONFLICT (name) DO NOTHING;
