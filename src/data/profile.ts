// Single source for all intro / experience / contact copy (from the owner's CV, approved in the design).
export const profile = {
  name: 'Yizhak (Itzik) Orfanian',
  title: 'Senior Software Developer',
  tagline: 'Cloud Security & AI',
  location: 'Israel',
  about: [
    '10 years at Check Point Software Technologies building cloud security products across AWS, Azure, GCP and VMware.',
    'Java, Python, Node.js. Recently integrating LLMs (Copilot), LangFlow and vector databases into product features.',
    'Mentor to junior developers. Former Computer Science lecturer (2012–2020).',
  ],
  experience: [
    { role: 'Senior Software Developer', org: 'Check Point Software Technologies', period: 'Apr 2016 – present',
      line: 'Cloud security products across VMware, AWS, Azure and GCP; multi-cloud orchestration, centralized logging, AI-powered developer tooling.' },
    { role: 'Computer Science Lecturer', org: 'Various colleges', period: '2012 – 2020',
      line: 'Java, Python, networking, server programming, network security, algorithms, data analysis.' },
    { role: 'Software Developer', org: 'Angel Apps', period: '2012 – 2015',
      line: 'Cross-platform container-tracking app for a customs broker (C#, Java).' },
    { role: 'System Architect', org: 'S.M.I Computers & Networks', period: '1994 – 2012',
      line: 'Network infrastructure and security solutions for SOHO and SMB clients.' },
  ],
  education: [
    { degree: 'M.A., Computer Science', school: 'Open University of Israel', years: '2013 – 2023',
      note: 'Cybersecurity specialization. Thesis: Identifying Threats to Medical Data and Medical Devices.' },
    { degree: 'B.A., Computer Science', school: 'Sapir College', years: '2008 – 2012', note: "Dean's Honors List 2010." },
  ],
  skills: [
    { group: 'languages', items: ['Java', 'Python', 'Node.js', 'C#', 'C'] },
    { group: 'cloud', items: ['AWS', 'Azure', 'GCP', 'VMware', 'Docker', 'Microservices'] },
    { group: 'security', items: ['Cloud security', 'Network security', 'Cybersecurity'] },
    { group: 'ai', items: ['LLM integration', 'LangFlow', 'Vector databases', 'Rapid prototyping'] },
    { group: 'data', items: ['SQL', 'NoSQL', 'Data modeling'] },
    { group: 'devops', items: ['Git', 'CI/CD', 'Monitoring', 'Logging', 'Agile/Scrum'] },
  ],
  certifications: ['Microsoft Certified Solutions Expert (MCSE)', 'Novell Network Engineer (CNE)'],
  employer: 'Check Point Software Technologies',
  links: {
    linkedin: 'https://www.linkedin.com/in/oitzik/',
    github: 'https://github.com/itzikorfa',
    email: 'hi@program-il.com',
  },
} as const;
