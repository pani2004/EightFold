import type { InputSource } from "../pipeline/index.js";

export const SAMPLE_SOURCES: InputSource[] = [
  {
    name: "recruiter.csv",
    content: `name,email,phone,current_company,title,location
Priya Sharma,priya.sharma@email.com,(415) 555-0198,Acme Corp,Senior Software Engineer,San Francisco CA
`,
  },
  {
    name: "ats.json",
    content: `{
  "applicant": {
    "fullName": "Priya Sharma",
    "contactEmail": "priya.s@workmail.com",
    "mobileNumber": "+1-415-555-0198",
    "locationCity": "San Francisco",
    "locationState": "CA",
    "locationCountry": "US",
    "linkedInUrl": "https://linkedin.com/in/priyasharma-dev",
    "githubUrl": "https://github.com/priyasharma-dev",
    "portfolioUrl": "https://priyasharma.dev",
    "summary": "Full-stack engineer specializing in React and Node.js",
    "totalYears": 7
  },
  "work_history": [
    {
      "employer": "Acme Corp",
      "role": "Senior Software Engineer",
      "startDate": "01/2020",
      "endDate": "present",
      "description": "Led migration to TypeScript microservices"
    },
    {
      "employer": "StartupXYZ",
      "role": "Software Engineer",
      "startDate": "06/2017",
      "endDate": "12/2019",
      "description": "Built React dashboards and GraphQL APIs"
    }
  ],
  "education_history": [
    {
      "school": "UC Berkeley",
      "degreeName": "B.S.",
      "major": "Computer Science",
      "graduationYear": 2017
    }
  ],
  "skill_tags": ["JavaScript", "TypeScript", "React", "Node.js", "GraphQL", "AWS"]
}
`,
  },
  {
    name: "notes.txt",
    content: `Candidate: Priya Sharma

Spoke with Priya on 2025-03-10. Strong communicator.
Email: priya.sharma@email.com | Phone: 415-555-0198

Headline: Full-stack engineer with 7 years experience in JavaScript, React, and Node.js

Previously at Acme Corp as Senior Software Engineer. Also strong in TypeScript and GraphQL.
GitHub: https://github.com/priyasharma-dev
LinkedIn: https://linkedin.com/in/priyasharma-dev

Notes: Open to remote roles. Prefers backend-heavy teams.
`,
  },
];

export const SAMPLE_CONFIG = `{
  "fields": [
    { "path": "full_name", "type": "string", "required": true },
    { "path": "primary_email", "from": "emails[0]", "type": "string", "required": true },
    { "path": "phone", "from": "phones[0]", "type": "string", "normalize": "E164" },
    { "path": "skills", "from": "skills[].name", "type": "string[]", "normalize": "canonical" }
  ],
  "include_confidence": true,
  "include_provenance": false,
  "on_missing": "null"
}`;
