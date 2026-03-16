import { useState } from "react";
import { Menu, ChevronRight, Facebook, Instagram, Twitter, Bell, Star, ArrowRight, MapPin, Clock, User } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from "../components/ui/sheet";
import { useNavigate, useParams } from "react-router";
import logoImage from "../../logo/logo.png";

const articles = [
  {
    id: 1,
    title: "Why Soft Skills Matter More Than Ever",
    category: "Career Tips",
    date: "March 1, 2026",
    author: "Sarah Johnson",
    readTime: "6 min read",
    intro: "In today's rapidly evolving workplace, technical expertise alone is no longer enough to secure or advance in a career. Employers across every industry are increasingly placing a premium on soft skills — the interpersonal, communication, and emotional competencies that define how we work with others and navigate challenges.",
    sections: [
      {
        heading: "What Are Soft Skills?",
        content: "Soft skills are non-technical abilities that relate to how you interact with others, manage your work, and handle challenges. Unlike hard skills — such as coding, data analysis, or financial modelling — soft skills are often harder to quantify but equally important. Examples include communication, adaptability, teamwork, problem-solving, empathy, time management, and leadership."
      },
      {
        heading: "Why Are They More Important Now?",
        content: "The rise of automation and AI has shifted the workforce landscape dramatically. Many routine, technical tasks can now be performed by machines, leaving humans to focus on higher-order thinking, creativity, and collaboration. According to a recent LinkedIn study, 92% of hiring managers say soft skills are equally or more important than hard skills. In a remote or hybrid work environment, the ability to communicate clearly, manage time independently, and collaborate across digital channels has become non-negotiable."
      },
      {
        heading: "Top Soft Skills Employers Look For",
        content: "Communication tops the list for most employers — both written and verbal clarity can set candidates apart instantly. Adaptability is close behind, especially as businesses pivot rapidly in response to market changes. Emotional intelligence, the ability to understand and manage your own emotions while empathising with others, is now considered a leadership prerequisite. Problem-solving and critical thinking round out the most sought-after soft skills, allowing employees to navigate ambiguity and deliver solutions independently."
      },
      {
        heading: "How to Showcase Soft Skills in Your Application",
        content: "The challenge with soft skills is demonstrating them on a resume or in an interview. Rather than simply listing 'good communicator' on your CV, show it with evidence. Describe a situation where your communication resolved a conflict, led a successful project, or helped a team reach consensus. Use the STAR method — Situation, Task, Action, Result — to frame your examples. In interviews, let your listening skills shine by pausing before answering and asking thoughtful follow-up questions."
      },
      {
        heading: "Developing Your Soft Skills",
        content: "The good news is that soft skills can be learned and refined over time. Seek feedback from managers and peers regularly. Take on cross-functional projects that challenge you to work with different personalities. Consider enrolling in courses on communication, leadership, or emotional intelligence. Even reading widely — novels, biographies, thought-leadership essays — builds empathy and perspective. Volunteer work and community involvement are also excellent training grounds for collaboration and leadership under real-world conditions."
      }
    ],
    conclusion: "Soft skills are no longer a 'nice to have' — they are a career differentiator. As the workplace becomes more automated and globally connected, the human element in every job becomes more valuable. Invest in developing your soft skills today, and you will stand out in any competitive job market."
  },
  {
    id: 2,
    title: "How Companies Are Battling Talent Shortages",
    category: "Industry Insights",
    date: "February 28, 2026",
    author: "Michael Chen",
    readTime: "7 min read",
    intro: "Across industries from technology to healthcare, companies are facing an unprecedented challenge: there simply aren't enough qualified workers to fill open roles. The global talent shortage has reached a historic high, with organisations of all sizes scrambling to attract, develop, and retain the people they need to grow. Here's how forward-thinking companies are fighting back.",
    sections: [
      {
        heading: "The Scale of the Problem",
        content: "According to ManpowerGroup's 2025 Talent Shortage Survey, 75% of employers worldwide report difficulty finding the talent they need — the highest level in nearly two decades. The shortage is most acute in IT, engineering, sales, and marketing, but touches virtually every sector. Contributing factors include an aging workforce retiring faster than new workers enter, rapid skill evolution driven by technology, and shifting employee expectations post-pandemic."
      },
      {
        heading: "Flexible Work Arrangements as a Competitive Edge",
        content: "One of the most powerful tools companies are using is flexibility. Remote and hybrid work options have expanded the talent pool dramatically — instead of competing for candidates within a commuting radius, companies can now hire from anywhere. This has proven especially effective for smaller companies that can't match the salaries of large corporations but can offer lifestyle flexibility that many candidates value equally."
      },
      {
        heading: "Upskilling and Internal Mobility",
        content: "Rather than hunting exclusively for external candidates with every required skill, smart organisations are investing heavily in upskilling their existing workforce. Companies like Amazon and Walmart have committed billions to internal training programmes. Internal mobility — promoting and re-deploying existing employees into new roles — reduces hiring costs, preserves institutional knowledge, and boosts employee morale and retention."
      },
      {
        heading: "Enhanced Compensation and Benefits",
        content: "With candidates holding more negotiating power than ever, companies are revamping their total compensation packages. Beyond base salary, employers are competing on signing bonuses, equity stakes, student loan repayment, childcare support, mental health benefits, and generous parental leave. Some organisations are introducing four-day work weeks as a recruitment and retention tool, reporting no loss in productivity while seeing significant gains in employee satisfaction."
      },
      {
        heading: "Partnerships with Educational Institutions",
        content: "To build a reliable pipeline of future talent, leading companies are partnering directly with universities, coding bootcamps, and vocational schools. These partnerships include sponsored degree programmes, apprenticeships, and internships that are designed to convert participants into full-time hires. This approach is particularly effective for industries with long-standing skill gaps in emerging technologies."
      },
      {
        heading: "Diversity and Inclusion as a Talent Strategy",
        content: "Companies that broaden their definition of a 'qualified candidate' by removing unnecessary degree requirements and focusing on skills and potential are accessing talent pools that competitors overlook. Structured inclusion programmes bring in candidates from underrepresented backgrounds who bring fresh perspectives, strong loyalty, and high performance. Research consistently shows that diverse teams outperform homogeneous ones."
      }
    ],
    conclusion: "The talent shortage is a complex problem with no single solution. The companies winning this war are those that treat their workforce strategy with the same creativity and investment as their product or market strategy. Building a great employer brand, investing in people, and staying adaptable is the formula for coming out ahead."
  },
  {
    id: 3,
    title: "Recruiters Now Focus on Candidate Experience",
    category: "Trends",
    date: "February 25, 2026",
    author: "Emma Davis",
    readTime: "5 min read",
    intro: "The hiring process has undergone a profound transformation. Where once recruiters held most of the power, today's job market has shifted the balance. Candidates now have options, and how a company treats them during the hiring process can make or break the organisation's ability to attract top talent. Candidate experience is no longer a buzzword — it's a business imperative.",
    sections: [
      {
        heading: "What Is Candidate Experience?",
        content: "Candidate experience encompasses every interaction a job seeker has with an organisation from the moment they discover a job posting to the time they receive an offer — or a rejection. It includes the clarity of the job description, the ease of the application process, communication during screening, the quality of interviews, and the professionalism of the offer or rejection letter. Every touchpoint matters."
      },
      {
        heading: "Why It Matters More Than Ever",
        content: "In the age of Glassdoor, LinkedIn, and social media, a poor candidate experience doesn't stay private. Candidates who feel disrespected or ignored during a hiring process will share their experiences publicly. A single viral post about a bad interview can damage an employer brand that took years to build. Conversely, a smooth, respectful, and transparent process — even when the outcome is a rejection — can generate goodwill and positive word of mouth."
      },
      {
        heading: "The Pain Points Candidates Hate Most",
        content: "Research consistently identifies the same frustrations: application processes that take over 30 minutes, lack of communication after submission, being asked to repeat information already in their CV, last-minute interview cancellations, and receiving no feedback after final-stage interviews. Ghost-ing — disappearing without any communication after an interview — has become one of the most cited reasons candidates leave negative reviews about companies."
      },
      {
        heading: "How Forward-Thinking Recruiters Are Responding",
        content: "Leading organisations are auditing their entire hiring funnel from the candidate's perspective. They are simplifying application forms, setting clear timelines, and sending personalised acknowledgement emails within 24 hours. Many are introducing video introductions from the hiring manager so candidates know who they'll be speaking to. Structured interview processes with standardised questions reduce bias and make the experience feel fair and professional."
      },
      {
        heading: "Technology's Role in Improving the Experience",
        content: "AI-powered tools are helping recruiters communicate at scale without losing the personal touch. Automated status updates, chatbots that answer candidate questions in real time, and digital scheduling tools that eliminate back-and-forth emails are all reducing friction. Some companies are using AI to analyse candidate feedback after each hiring cycle and identify the specific steps where the experience breaks down."
      }
    ],
    conclusion: "The companies that will win the war for talent in 2026 and beyond are those that treat candidates as they would treat customers. A respectful, transparent, and efficient hiring process signals the kind of culture candidates want to be part of. Invest in the candidate experience, and the right people will choose you."
  },
  {
    id: 4,
    title: "How to Stand Out in a Competitive Market",
    category: "Job Search",
    date: "February 20, 2026",
    author: "David Park",
    readTime: "6 min read",
    intro: "The modern job market is more competitive than ever. With hundreds of applications flooding in for every desirable role, blending in is the same as losing. Standing out requires more than just a polished CV — it demands a strategic, multi-channel approach to personal branding, networking, and professional positioning. Here is how to rise above the noise.",
    sections: [
      {
        heading: "Start With a Compelling Personal Brand",
        content: "Your personal brand is the story you tell about yourself — your expertise, values, and professional identity. Start by defining what makes you unique: your combination of skills, experiences, and perspectives that no one else has. Articulate this clearly in your LinkedIn headline, summary, and the narrative thread running through your resume. A coherent, authentic brand makes you memorable and searchable."
      },
      {
        heading: "Optimise Your LinkedIn Profile",
        content: "LinkedIn is the primary professional networking platform, and a half-complete profile is a missed opportunity. Use a professional headshot, write a headline that goes beyond your job title to describe the value you deliver, and craft a summary that reads like a compelling introduction, not a list of duties. Request recommendations from former managers and colleagues. Post and comment on industry content regularly to stay visible in your network's feed."
      },
      {
        heading: "Network With Intention",
        content: "Up to 85% of jobs are filled through networking, according to LinkedIn data. This doesn't mean attending every event and handing out business cards indiscriminately. Intentional networking means identifying the 20 to 30 people in your industry whose opinions matter most and building genuine relationships with them over time. Comment thoughtfully on their content, offer help before asking for it, and follow up consistently after meetings."
      },
      {
        heading: "Tailor Every Application",
        content: "Mass-applying with a generic resume is a low-yield strategy. Take the time to tailor each application to the specific role and company. Mirror the language in the job description, research the company's recent news and challenges, and reference them specifically in your cover letter. Hiring managers notice when a candidate has done their homework — it signals genuine interest and professional seriousness."
      },
      {
        heading: "Build a Portfolio of Work",
        content: "For many roles — design, writing, marketing, software development — a portfolio of real work is more persuasive than any resume. Publish articles on LinkedIn or Medium. Contribute to open-source projects. Create a personal website showcasing your projects and case studies. Even if you're in a field not traditionally associated with portfolios, documenting results you achieved with data and visuals demonstrates impact in a way bullet points cannot."
      },
      {
        heading: "Prepare Extraordinary Interview Responses",
        content: "Once you land an interview, preparation is the differentiator. Research the company deeply — its mission, competitors, recent news, and culture. Prepare five to ten specific stories using the STAR method that demonstrate your key competencies. Practice answering common questions aloud until your delivery is natural, not rehearsed. Prepare three to five thoughtful questions for the interviewer that show strategic thinking, not just interest in the role."
      }
    ],
    conclusion: "Standing out in a competitive market is not about luck — it is about deliberate strategy. Invest the time in your personal brand, build genuine relationships, tailor every touchpoint, and prepare meticulously for every opportunity. The candidates who do this consistently are the ones who don't just find jobs — they find the right jobs."
  },
  {
    id: 5,
    title: "Why Employer Branding Matters in 2026",
    category: "Employer Tips",
    date: "February 15, 2026",
    author: "Priya Sharma",
    readTime: "6 min read",
    intro: "In a world where job seekers can research a company's culture on Glassdoor before applying, the employer brand has become one of the most powerful tools in a company's recruitment arsenal. Employer branding — how a company is perceived as a place to work — now directly influences who applies, who accepts offers, and who stays. Here's why it matters more than ever in 2026.",
    sections: [
      {
        heading: "What Is Employer Branding?",
        content: "Employer branding is the reputation a company holds as an employer, distinct from its consumer or product brand. It encompasses everything from the company's stated mission and values to the day-to-day reality of working there, as reported by current and former employees. It is shaped by reviews on platforms like Glassdoor and Indeed, by what employees say on LinkedIn and social media, and by how the company presents itself in job postings and career pages."
      },
      {
        heading: "The Business Case Is Clear",
        content: "Companies with strong employer brands receive 50% more qualified applicants and spend significantly less on cost-per-hire. They also retain employees longer, reducing the expensive cycle of turnover and re-hiring. LinkedIn data shows that a poor employer brand can cost a company up to twice as much per hire compared to companies with strong reputations. In short, employer branding is not a marketing luxury — it is a cost-reduction and talent-acquisition strategy."
      },
      {
        heading: "Culture Is the Core of Employer Brand",
        content: "You cannot manufacture an employer brand — it must reflect the genuine experience of your employees. That starts with culture. Do your people feel respected, trusted, and challenged? Is there a clear path for growth? Are managers supportive or micromanaging? Candidates in 2026 are sophisticated: they read between the lines of polished career pages and look for authentic employee voices. A culture that values people will radiate through every review, post, and referral."
      },
      {
        heading: "Showcasing Your Employer Brand",
        content: "Start with your career page — it should go beyond listing benefits to telling real stories of real employees. Feature video testimonials, day-in-the-life content, and case studies of career growth within the organisation. Use social media to give candidates a window into the company's culture, events, and achievements. Employee advocacy programmes — encouraging your team to share their experiences publicly — are one of the most credible and cost-effective employer branding tools available."
      },
      {
        heading: "Responding to Reviews and Feedback",
        content: "One of the most visible signals of employer brand health is how a company responds to negative reviews on platforms like Glassdoor. Companies that respond professionally, acknowledge concerns, and communicate what they are doing to improve signal maturity and accountability. Ignoring or dismissively responding to criticism sends the opposite message. Regularly survey your employees, share the results honestly, and take visible action on the feedback."
      }
    ],
    conclusion: "Employer branding is not a set-and-forget activity — it requires continuous investment and authenticity. In 2026, the best talent has choices, and they will choose employers who demonstrate genuine care for their people. Build a culture worth joining, tell that story honestly, and the right candidates will come to you."
  },
  {
    id: 6,
    title: "Remote Work Continues to Dominate",
    category: "Work Trends",
    date: "February 10, 2026",
    author: "James Wilson",
    readTime: "7 min read",
    intro: "Five years after the pandemic-driven shift to remote work, one thing is clear: the genie is not going back in the bottle. While some companies have pushed aggressively for a return to the office, the data tells a consistent story — employees want flexibility, and the organisations that provide it are winning the talent war. Here is a comprehensive look at the state of remote and hybrid work in 2026.",
    sections: [
      {
        heading: "The State of Remote Work in 2026",
        content: "According to the latest Global Workforce Survey, 64% of knowledge workers currently work in a hybrid arrangement, 22% work fully remote, and only 14% work fully in the office five days a week. The fully remote figure has stabilised after a post-pandemic dip, as organisations settle into hybrid models that balance flexibility with in-person collaboration. The demand for remote-friendly roles continues to far outstrip supply, with remote jobs attracting three to four times more applicants than equivalent on-site roles."
      },
      {
        heading: "Why Employees Still Prefer Flexibility",
        content: "The appeal of remote work goes deeper than avoiding a commute. Workers report better focus, reduced stress, greater autonomy, and improved work-life balance as the primary benefits. Parents cite flexibility around childcare as a transformative quality-of-life improvement. For many employees, flexibility has become a non-negotiable: surveys show that over 60% of workers would consider leaving their job if forced to return to the office full-time."
      },
      {
        heading: "The Productivity Debate Settles",
        content: "One of the central arguments against remote work — that employees are less productive outside the office — has been largely put to rest by a growing body of research. A Stanford study found that remote workers are 13% more productive than their in-office counterparts, with lower attrition rates. The caveat is management quality: teams with strong communication practices, clear goals, and frequent check-ins perform well remotely; teams with poor management structures struggle regardless of location."
      },
      {
        heading: "The Rise of Asynchronous Work",
        content: "As remote teams span multiple time zones, asynchronous communication has become the default for many organisations. Tools like Loom for video messages, Notion for documentation, and project management platforms like Linear and Asana have made it possible for teams to collaborate without being online simultaneously. This shift has forced companies to become far more intentional about documentation, communication norms, and outcomes-based management."
      },
      {
        heading: "Challenges That Remain",
        content: "Remote work is not without its challenges. Isolation and loneliness remain concerns for a significant minority of remote workers, particularly those living alone or newer to the workforce. Career advancement can be slower for remote employees who are less visible to senior leadership — the 'proximity bias' problem. Onboarding new hires fully remotely remains genuinely difficult, with many companies now bringing new employees to the office for their first weeks before transitioning to hybrid."
      },
      {
        heading: "What Employers Should Do Now",
        content: "Companies that have resisted flexibility risk losing their best people to competitors who offer it. The path forward is to design intentional hybrid models — not mandating office days arbitrarily but identifying which tasks and moments genuinely benefit from in-person presence, such as brainstorming sessions, team-building events, and onboarding. Invest in the digital infrastructure and management training that makes remote teams thrive. Measure outcomes, not hours."
      }
    ],
    conclusion: "Remote work is no longer an experiment — it is a permanent feature of the professional landscape. The organisations that embrace this reality, invest in making it work well, and trust their people to deliver will attract and retain the talent they need to compete. The office is not dead, but its role has fundamentally changed. Flexibility, done right, is a competitive advantage."
  }
];

export default function BlogDetailPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [email, setEmail] = useState("");
  const navigate = useNavigate();
  const { id } = useParams();

  const article = articles.find(a => a.id === Number(id)) || articles[0];

  return (
    <div className="min-h-screen bg-[#F6F6F6]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
            <img src={logoImage} alt="RhirePro Logo" className="w-10 h-10" />
            <div className="text-xl font-bold text-[#3A1F1F]">
              Rhire<span className="text-[#FF2B2B]">Pro</span>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <button onClick={() => navigate('/')} className="text-[#3A1F1F] hover:text-[#FF2B2B] transition-colors">
              Home
            </button>
            <button onClick={() => navigate('/')} className="text-[#3A1F1F] hover:text-[#FF2B2B] transition-colors">
              About Us
            </button>
            <button onClick={() => navigate('/jobs')} className="text-[#3A1F1F] hover:text-[#FF2B2B] transition-colors">
              Jobs
            </button>
            <Button
              onClick={() => navigate('/blog')}
              className="bg-[#FF2B2B] hover:bg-[#e02525] text-white rounded-full px-6"
            >
              Blog
            </Button>
            <button onClick={() => navigate('/')} className="text-[#3A1F1F] hover:text-[#FF2B2B] transition-colors">
              Contact Us
            </button>
          </nav>

          {/* Hamburger Menu */}
          <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <SheetTrigger asChild>
              <button className="md:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <Menu className="h-6 w-6 text-[#3A1F1F]" />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80 bg-white">
              <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
              <SheetDescription className="sr-only">Navigation links</SheetDescription>
              <div className="flex flex-col gap-4 mt-8">
                <div className="flex items-center gap-3 mb-4">
                  <img src={logoImage} alt="RhirePro Logo" className="w-10 h-10" />
                  <h3 className="text-xl font-bold text-[#3A1F1F]">Rhire<span className="text-[#FF2B2B]">Pro</span></h3>
                </div>
                {[
                  { label: "Home", path: "/" },
                  { label: "Jobs", path: "/jobs" },
                  { label: "Blog", path: "/blog" },
                  { label: "Sign In", path: "/signin" },
                ].map(({ label, path }) => (
                  <button
                    key={label}
                    className="w-full text-left px-4 py-2 rounded-lg hover:bg-[#ECECF4] text-[#3A1F1F]"
                    onClick={() => { setIsMenuOpen(false); navigate(path); }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      {/* Hero / Breadcrumb */}
      <section className="bg-white py-12">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-2 text-sm text-[#8A8A8A] mb-6">
            <a href="/" className="hover:text-[#FF2B2B]">Home</a>
            <ChevronRight className="h-4 w-4" />
            <a href="/blog" className="hover:text-[#FF2B2B]">Blog</a>
            <ChevronRight className="h-4 w-4" />
            <span className="text-[#FF2B2B] border border-[#FF2B2B] px-3 py-1 rounded-full">
              {article.category}
            </span>
          </div>
          <div className="max-w-3xl">
            <span className="inline-block bg-[#FF2B2B] text-white px-4 py-1 rounded-full text-sm mb-4">
              {article.category.toUpperCase()}
            </span>
            <h1 className="text-4xl md:text-5xl font-bold text-[#3A1F1F] mb-6 leading-tight">
              {article.title}
            </h1>
            <div className="flex flex-wrap items-center gap-6 text-sm text-[#8A8A8A]">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-[#FF2B2B]" />
                <span>{article.author}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-[#FF2B2B]" />
                <span>{article.readTime}</span>
              </div>
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-[#FF2B2B]" />
                <span>{article.date}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Article Content */}
      <section className="bg-[#ECECF4] py-16">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Article */}
            <div className="lg:col-span-2 space-y-6">
              {/* Intro */}
              <div className="bg-white rounded-2xl p-8 shadow-md">
                <p className="text-lg text-[#8A8A8A] leading-relaxed border-l-4 border-[#FF2B2B] pl-6 italic">
                  {article.intro}
                </p>
              </div>

              {/* Sections */}
              {article.sections.map((section, index) => (
                <div key={index} className="bg-white rounded-2xl p-8 shadow-md">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 bg-[#FF2B2B] rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-sm font-bold">{index + 1}</span>
                    </div>
                    <h2 className="text-2xl font-bold text-[#3A1F1F]">{section.heading}</h2>
                  </div>
                  <p className="text-[#8A8A8A] leading-relaxed">{section.content}</p>
                </div>
              ))}

              {/* Conclusion */}
              <div className="bg-[#FF2B2B] rounded-2xl p-8 text-white shadow-md">
                <h2 className="text-2xl font-bold mb-4">Key Takeaway</h2>
                <p className="leading-relaxed text-white/90">{article.conclusion}</p>
              </div>

              {/* Navigation between articles */}
              <div className="bg-white rounded-2xl p-6 shadow-md flex justify-between items-center gap-4">
                <Button
                  onClick={() => navigate(`/blog/${Math.max(1, article.id - 1)}`)}
                  disabled={article.id === 1}
                  variant="outline"
                  className="border-2 border-[#FF2B2B] text-[#FF2B2B] hover:bg-[#FF2B2B] hover:text-white rounded-full px-6 disabled:opacity-40"
                >
                  ← Previous Article
                </Button>
                <Button
                  onClick={() => navigate('/blog')}
                  variant="outline"
                  className="border-2 border-gray-300 text-[#3A1F1F] hover:bg-gray-100 rounded-full px-6"
                >
                  All Articles
                </Button>
                <Button
                  onClick={() => navigate(`/blog/${Math.min(articles.length, article.id + 1)}`)}
                  disabled={article.id === articles.length}
                  className="bg-[#FF2B2B] hover:bg-[#e02525] text-white rounded-full px-6 disabled:opacity-40"
                >
                  Next Article →
                </Button>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* About the Author */}
              <div className="bg-white rounded-2xl p-6 shadow-md">
                <h3 className="text-lg font-bold text-[#3A1F1F] mb-4">About the Author</h3>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 bg-[#FF2B2B] rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-bold text-lg">{article.author.charAt(0)}</span>
                  </div>
                  <div>
                    <p className="font-semibold text-[#3A1F1F]">{article.author}</p>
                    <p className="text-sm text-[#8A8A8A]">{article.category} Expert</p>
                  </div>
                </div>
                <p className="text-sm text-[#8A8A8A]">
                  A seasoned professional with deep expertise in {article.category.toLowerCase()}, sharing insights to help professionals and organisations thrive in today's dynamic market.
                </p>
              </div>

              {/* Other Articles */}
              <div className="bg-white rounded-2xl p-6 shadow-md">
                <h3 className="text-lg font-bold text-[#3A1F1F] mb-4">More Articles</h3>
                <div className="space-y-4">
                  {articles.filter(a => a.id !== article.id).slice(0, 4).map(a => (
                    <div
                      key={a.id}
                      className="cursor-pointer hover:bg-[#F6F6F6] p-3 rounded-xl transition-colors"
                      onClick={() => navigate(`/blog/${a.id}`)}
                    >
                      <span className="inline-block bg-[#ECECF4] text-[#3A1F1F] px-2 py-0.5 rounded-full text-xs mb-1">
                        {a.category}
                      </span>
                      <p className="text-sm font-semibold text-[#3A1F1F] leading-snug hover:text-[#FF2B2B] transition-colors">
                        {a.title}
                      </p>
                      <p className="text-xs text-[#8A8A8A] mt-1">{a.readTime} · {a.date}</p>
                    </div>
                  ))}
                </div>
                <Button
                  onClick={() => navigate('/blog')}
                  variant="outline"
                  className="w-full mt-4 border-2 border-[#FF2B2B] text-[#FF2B2B] hover:bg-[#FF2B2B] hover:text-white rounded-full"
                >
                  View All Articles
                </Button>
              </div>

              {/* Related Topics */}
              <div className="bg-white rounded-2xl p-6 shadow-md">
                <h3 className="text-lg font-bold text-[#3A1F1F] mb-4">Related Topics</h3>
                <div className="flex flex-wrap gap-2">
                  {["Career Growth", "Interview Tips", "Resume Writing", "Remote Work", "Salary Negotiation", "Networking"].map((topic) => (
                    <span
                      key={topic}
                      className="bg-[#ECECF4] text-[#3A1F1F] px-3 py-1 rounded-full text-sm hover:bg-[#FF2B2B] hover:text-white cursor-pointer transition-colors"
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              </div>

              {/* Newsletter */}
              <div className="bg-[#3A1F1F] rounded-2xl p-6 text-white shadow-md">
                <h3 className="text-lg font-bold mb-2">Stay Updated</h3>
                <p className="text-white/80 text-sm mb-4">Get the latest articles delivered to your inbox.</p>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/50 rounded-xl mb-3 focus-visible:ring-[#FF2B2B]"
                  placeholder="Your email"
                />
                <Button className="w-full bg-[#FF2B2B] hover:bg-[#e02525] text-white rounded-full">
                  Subscribe <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#FF2B2B] text-white py-10">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8 mb-6">
            <div>
              <h2 className="text-2xl font-bold mb-4">Work With Purpose.<br />Grow With Us.</h2>
              <div className="space-y-2 text-white/90 text-sm mb-4">
                <p className="flex items-center gap-2"><MapPin className="h-4 w-4" /> ID 123/201</p>
                <p className="flex items-center gap-2"><Bell className="h-4 w-4" /> www.RhirePro.com</p>
                <p className="flex items-center gap-2"><Star className="h-4 w-4" /> 0120 - 3532 - 510</p>
              </div>
              <div className="flex gap-3">
                {[Facebook, Instagram, Twitter].map((Icon, i) => (
                  <div key={i} className="w-9 h-9 bg-white rounded-full flex items-center justify-center">
                    <Icon className="h-4 w-4 text-[#FF2B2B]" />
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h4 className="font-bold mb-3 text-sm">Company</h4>
              <ul className="space-y-2 text-white/80 text-sm">
                <li><a href="/" className="hover:text-white transition-colors">Home</a></li>
                <li><a href="/blog" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="/jobs" className="hover:text-white transition-colors">Jobs</a></li>
                <li><a href="/services" className="hover:text-white transition-colors">Services</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-3 text-sm">Services</h4>
              <ul className="space-y-2 text-white/80 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Talent Sourcing</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Executive Search</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Career Coaching</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Job Matching</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/20 pt-6 flex flex-col md:flex-row justify-between items-center gap-3 text-white/80 text-xs">
            <p>Copyright © 2025 RhirePro. All Rights Reserved.</p>
            <p>Privacy and Policy</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
