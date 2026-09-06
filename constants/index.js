// Current Date
import {
  ManageAccounts,
  Campaign,
  ConnectWithoutContact,
  DesignServices,
  Palette,
  Language,
  Mobile2,
  SportsEsports,
  Analytics,
  Hub,
  Cloud,
  Trophy,
} from "@material-symbols-svg/react/outlined";

export const curDay = new Date().getDay();
export const curYear = new Date().getFullYear();
export const curDate = new Date().getDate();
export const curMonth = new Date().getMonth();
export const months = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export const days = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

// Contact Links
export const LINKS = {
  instagram: "#",
  discord: "#",
  gmail: "#",
  linkedin: "#",
  x: "#",
};

// Department Details
export const reviews = [
  {
    id: "c21ca066-ab4d-40a3-943c-f170d6312bdc",
    icon: ManageAccounts,
    tone: "#FBBC04",
    name: "Management",
    description:
      "The backbone of the organization, turning vision into reality by planning, executing, and improvising. Oversees events, operations, and growth, ensuring smooth functioning, success, and impactful experiences.",
  },
  {
    id: "4499a966-2740-4c36-88dd-8916a909fc77",
    icon: Campaign,
    tone: "#EA4335",
    name: "Publicity",
    description:
      "Drives online presence with creative campaigns, video editing, and storytelling, boosting engagement, promoting events, and showcasing the club to inspire participation and community growth.",
  },
  {
    id: "3936d5a2-acd9-4a98-ac97-42c2c92f5c02",
    icon: ConnectWithoutContact,
    tone: "#4285F4",
    name: "Outreach",
    description:
      "Builds partnerships and expands outreach by connecting with communities, sponsors, and collaborators, ensuring diverse opportunities and impactful collaborations both within and beyond campus.",
  },
  {
    id: "e2ed9c2c-c36c-457f-a8bb-cf2e8bc7c2e1",
    icon: DesignServices,
    tone: "#0F9D58",
    name: "UI/UX",
    description:
      "Designs visually appealing, user-friendly digital interfaces with a focus on accessibility, usability, and aesthetics, ensuring products provide enjoyable, intuitive, and meaningful user experiences.",
  },
  {
    id: "d3beefc1-f8b0-4202-b26c-36e9804b6636",
    icon: Palette,
    tone: "#329A4E",
    name: "Design",
    description:
      "Creates stunning visuals, event posters, and branding materials that capture the organization's identity, ensuring every design communicates creativity, professionalism, and excitement to engage the community.",
  },
  {
    id: "8143de1d-db17-42fa-958d-13b10804f894",
    icon: Language,
    tone: "#FBBC04",
    name: "Web Dev",
    description:
      "Designs, develops, and maintains responsive, high-performance websites for projects and events, using modern web technologies to enhance accessibility, user experience, and community engagement online.",
  },
  {
    id: "339f0f8a-72f2-44b9-92ab-2b0d4dcfa0f6",
    icon: Mobile2,
    tone: "#EA4335",
    name: "App Dev",
    description:
      "Builds intuitive, impactful mobile applications, improving accessibility, interaction, and convenience for members and event participants through functional, user-focused design.",
  },
  {
    id: "9055864f-c7dc-44cd-91d5-8759d32a496a",
    icon: SportsEsports,
    tone: "#4285F4",
    name: "Game Dev",
    description:
      "Combines creativity and technical skills to design engaging, entertaining games, giving members hands-on experience with real-world game development tools, engines, and production workflows.",
  },
  {
    id: "c0f3b1d1-ce05-45f6-9e34-ac9443fc5fcb",
    icon: Analytics,
    tone: "#EA4335",
    name: "Data Science",
    description:
      "Applies AI, machine learning, and analytics to transform data into actionable insights, helping solve problems, build predictive models, and inspire innovation across projects.",
  },
  {
    id: "a1d920df-9eb9-49eb-b3a4-e4a3d1245ede",
    icon: Cloud,
    tone: "#FBBC04",
    name: "Cloud & DevOps",
    description:
      "Explores cloud computing, infrastructure, and automation by building scalable applications, hosting hands-on workshops, and educating members about cloud platforms, containerization, CI/CD pipelines, and DevOps practices.",
  },
  {
    id: "6a89c4e2-7b19-4f32-821e-9821a41b5201",
    icon: Hub,
    tone: "#FF7A6B",
    name: "Blockchain",
    description:
      "Explores decentralized apps, smart contracts, and Web3 development, giving members hands-on experience with blockchain protocols and tools.",
  },
  {
    id: "3e9ac635-01d4-495e-aa87-a7335a2403c2",
    icon: Trophy,
    tone: "#0F9D58",
    name: "Competitive Programming",
    description:
      "Promotes problem-solving skills through coding contests, hackathons, and peer learning, helping members sharpen algorithms, logic, and efficiency while preparing for real-world tech challenges.",
  },
];

// Questionnaire Data
export const QuestionnaireData = [
  {
    department: "App Dev",
    questions: [
      {
        name: "Which mobile frameworks or platforms do you prefer (e.g., Flutter, React Native, Native Android/iOS) and why?",
        type: "generic",
        placeholder: "e.g., Flutter for cross-platform efficiency, Kotlin for native performance...",
      },
      {
        name: "Describe a mobile application or project you have developed or contributed to.",
        type: "long-text",
        placeholder: "Outline the app's purpose, technologies used, and your contribution.",
      },
      {
        name: "Share links to your GitHub profile, mobile apps (Play Store/App Store), or APK demos.",
        type: "short-text",
        placeholder: "https://github.com/yourusername",
      },
      {
        name: "How do you handle mobile state management and offline data synchronization?",
        type: "long-text",
        placeholder: "e.g., Riverpod/Bloc/Redux, SQLite/Hive, caching strategies...",
      },
      {
        name: "Why do you want to join the App Dev department at GDG on Campus?",
        type: "long-text",
        placeholder: "Share your learning goals and what you hope to build with the community.",
      },
    ],
  },
  {
    department: "Blockchain",
    questions: [
      {
        name: "What experience do you have with Web3 development, Solidity, or smart contracts?",
        type: "long-text",
        placeholder: "Describe protocols, tools (Hardhat, Foundry, ethers.js), or projects you've explored.",
      },
      {
        name: "Describe a decentralized application (dApp) or blockchain project you built or researched.",
        type: "long-text",
        placeholder: "Explain the architecture, network used, and user interactions.",
      },
      {
        name: "Share your GitHub profile or project repositories.",
        type: "short-text",
        placeholder: "https://github.com/yourusername",
      },
      {
        name: "What excites you most about the future of decentralized technologies?",
        type: "long-text",
        placeholder: "Share your thoughts on DeFi, zero-knowledge proofs, or Web3 scalability.",
      },
    ],
  },
  {
    department: "Cloud & DevOps",
    questions: [
      {
        name: "Share your GitHub profile or portfolio link.",
        type: "short-text",
        placeholder: "https://github.com/yourusername",
      },
      {
        name: "Which cloud providers and DevOps tools have you worked with (e.g., Docker, Kubernetes, AWS, GCP, GitHub Actions)?",
        type: "generic",
        placeholder: "e.g., Docker containers, AWS EC2/S3, GitHub Actions CI/CD pipelines...",
      },
      {
        name: "Describe any infrastructure automation, CI/CD pipeline, or deployment project you have built.",
        type: "long-text",
        placeholder: "Detail the setup, deployment flow, and challenges encountered.",
      },
      {
        name: "Why do you want to join the Cloud & DevOps team?",
        type: "long-text",
        placeholder: "Tell us about your interests in infrastructure, scalability, and site reliability.",
      },
    ],
  },
  {
    department: "Competitive Programming",
    questions: [
      {
        name: "Codeforces Handle / Profile URL",
        type: "short-text",
        placeholder: "https://codeforces.com/profile/yourhandle",
      },
      {
        name: "LeetCode Profile URL",
        type: "short-text",
        placeholder: "https://leetcode.com/yourusername",
      },
      {
        name: "CodeChef Handle / Profile URL",
        type: "short-text",
        placeholder: "https://www.codechef.com/users/yourhandle",
      },
      {
        name: "Preferred Programming Language for CP",
        type: "short-text",
        placeholder: "e.g., C++, Java, Python",
      },
      {
        name: "Describe an interesting algorithmic problem you recently solved and your strategy.",
        type: "long-text",
        placeholder: "Share the concept (e.g. DP, Graphs, Segment Trees) and how you reached the optimal solution.",
      },
    ],
  },
  {
    department: "Data Science",
    questions: [
      {
        name: "What domains within AI/ML/Data Science are you most passionate about (e.g., NLP, Computer Vision, Deep Learning, Analytics)?",
        type: "generic",
        placeholder: "e.g., Natural Language Processing, Computer Vision, Predictive Modeling...",
      },
      {
        name: "Which data science and ML libraries/frameworks do you regularly use?",
        type: "generic",
        placeholder: "e.g., PyTorch, TensorFlow, Scikit-learn, Pandas, NumPy, OpenCV...",
      },
      {
        name: "Describe an AI/ML project or data analysis you worked on.",
        type: "long-text",
        placeholder: "Discuss dataset, model selection, metrics, and outcomes.",
      },
      {
        name: "Share your GitHub, Kaggle, or Hugging Face profile links.",
        type: "short-text",
        placeholder: "https://github.com/yourusername or https://kaggle.com/yourusername",
      },
      {
        name: "Why are you interested in joining the Data Science department?",
        type: "long-text",
        placeholder: "Tell us what you hope to achieve and collaborate on in GDG.",
      },
    ],
  },
  {
    department: "Design",
    questions: [
      {
        name: "Share links to your Behance, Dribbble, Figma, or personal design portfolio.",
        type: "short-text",
        placeholder: "https://behance.net/yourusername",
      },
      {
        name: "Which design tools do you use proficiently (e.g., Figma, Adobe Illustrator, Photoshop, Blender)?",
        type: "generic",
        placeholder: "e.g., Figma, Illustrator, Photoshop, After Effects...",
      },
      {
        name: "Walk us through a design piece (poster, brand identity, graphic) you are proud of.",
        type: "long-text",
        placeholder: "Explain the concept, visual choices, and tools you utilized.",
      },
      {
        name: "How do you balance creative expression with clear organizational branding?",
        type: "long-text",
        placeholder: "Describe how you maintain consistency while creating engaging designs.",
      },
    ],
  },
  {
    department: "Game Dev",
    questions: [
      {
        name: "Which game engines and 3D/audio tools have you worked with (e.g., Unity, Unreal Engine, Godot, Blender)?",
        type: "generic",
        placeholder: "e.g., Unity (C#), Godot (GDScript), Blender 3D modeling...",
      },
      {
        name: "Describe a game project or prototype you have built or participated in creating.",
        type: "long-text",
        placeholder: "Detail game mechanics, storyline, and your implementation role.",
      },
      {
        name: "Share your Itch.io, GitHub, or playable game build/video links.",
        type: "short-text",
        placeholder: "https://yourusername.itch.io or GitHub link",
      },
      {
        name: "What aspect of game creation interests you most (gameplay code, level design, art, physics)?",
        type: "long-text",
        placeholder: "Share your focus areas and what game genres you love building.",
      },
    ],
  },
  {
    department: "Management",
    questions: [
      {
        name: "Describe any events, initiatives, or team projects you have previously organized or led.",
        type: "long-text",
        placeholder: "Mention event scale, roles, responsibilities, and key achievements.",
      },
      {
        name: "How do you handle unexpected crises or logistical hiccups during a live event?",
        type: "long-text",
        placeholder: "Give a concrete example or explain your troubleshooting approach.",
      },
      {
        name: "What leadership and coordination strengths make you a great fit for our management team?",
        type: "long-text",
        placeholder: "e.g., timeline tracking, vendor negotiation, volunteer management...",
      },
      {
        name: "Why do you want to contribute to the Management department at GDG on Campus?",
        type: "long-text",
        placeholder: "Explain what drives your enthusiasm for community operations.",
      },
    ],
  },
  {
    department: "Outreach",
    questions: [
      {
        name: "What experience do you have in public relations, community management, or sponsorship acquisition?",
        type: "long-text",
        placeholder: "Highlight any sponsorships closed, communities engaged, or partnerships forged.",
      },
      {
        name: "How would you pitch GDG on Campus to a company or industry speaker to collaborate with us?",
        type: "long-text",
        placeholder: "Outline your value proposition and communication style.",
      },
      {
        name: "Share links to your LinkedIn profile or past sponsorship brochures/proposals.",
        type: "short-text",
        placeholder: "https://linkedin.com/in/yourprofile",
      },
      {
        name: "Why do you want to join the Outreach team?",
        type: "long-text",
        placeholder: "Tell us how you plan to elevate our external presence and opportunities.",
      },
    ],
  },
  {
    department: "Publicity",
    questions: [
      {
        name: "Which video editing and media production tools do you use (e.g., Premiere Pro, After Effects, DaVinci Resolve, CapCut)?",
        type: "generic",
        placeholder: "e.g., Premiere Pro, After Effects, Photoshop, Audition...",
      },
      {
        name: "Share links to video edits, reels, campaigns, or social media handles you have managed.",
        type: "short-text",
        placeholder: "https://drive.google.com/your-portfolio or social links",
      },
      {
        name: "How would you design a campaign to maximize attendance for our flagship hackathon?",
        type: "long-text",
        placeholder: "Describe teaser timelines, reel ideas, storytelling angles, and engagement strategies.",
      },
      {
        name: "Why do you want to join the Publicity department?",
        type: "long-text",
        placeholder: "Share your passion for digital storytelling and audience growth.",
      },
    ],
  },
  {
    department: "UI/UX",
    questions: [
      {
        name: "Share your Figma, Behance, or interactive prototype portfolio link.",
        type: "short-text",
        placeholder: "https://figma.com/@yourusername or portfolio link",
      },
      {
        name: "Describe your UX design process from problem discovery to final interactive prototype.",
        type: "long-text",
        placeholder: "Explain user personas, wireframing, usability testing, and iteration.",
      },
      {
        name: "Name one product with outstanding user experience and what specifically makes it so effective.",
        type: "long-text",
        placeholder: "Analyze its onboarding, information architecture, or micro-interactions.",
      },
      {
        name: "Why do you want to design with the UI/UX team at GDG on Campus?",
        type: "long-text",
        placeholder: "Tell us how you aim to elevate our product experiences.",
      },
    ],
  },
  {
    department: "Web Dev",
    questions: [
      {
        name: "Share your GitHub profile, portfolio link, or live web applications.",
        type: "short-text",
        placeholder: "https://github.com/yourusername",
      },
      {
        name: "Which web technologies and frameworks are you strongest in (e.g., React, Next.js, TypeScript, Tailwind, Node.js)?",
        type: "generic",
        placeholder: "e.g., Next.js, React, TypeScript, Tailwind CSS, PostgreSQL/Firebase...",
      },
      {
        name: "Describe a web application you built, highlighting tricky architectural challenges and how you solved them.",
        type: "long-text",
        placeholder: "Discuss frontend architecture, state management, API integration, and deployment.",
      },
      {
        name: "Why do you want to join the Web Development department?",
        type: "long-text",
        placeholder: "Tell us what you want to build and learn with the team.",
      },
    ],
  },
];

// Sample Admin Data
export const sampleAdminHeader = [
  {
    Header: "SrNo",
    accessor: "srno",
  },
  {
    Header: "Name",
    accessor: "name",
  },
  {
    Header: "Email",
    accessor: "email",
  },
  {
    Header: "Department",
    accessor: "department",
  },
];

// Headers for CSV exports
export const CSV_Header = [
  {
    label: "Name",
    key: "Name",
  },
  {
    label: "Email",
    key: "Email",
  },
  {
    label: "Registration Number",
    key: "RegistrationNumber",
  },
  {
    label: "Phone",
    key: "Phone",
  },
  {
    label: "Department",
    key: "Department",
  },
  {
    label: "Preference",
    key: "Pref",
  },
  {
    label: "Shortlisted",
    key: "shortlisted",
  },
  {
    label: "Questions",
    key: "Questions",
  },
];

// Mailing Templates
export const mailingTemplate = {
  Interview:
    "<p>Dear Applicant,</p><p>Thank you for applying to GDG on Campus! We are thrilled to let you know that you have been shortlisted for the #dept Department.</p><p>We will contact you shortly with interview schedule details.</p><p>Best regards,<br>The Recruitment Team</p>",
};

export const technicalCards = [
  {
    title: "Blockchain",
    description:
      "Explores decentralized apps, smart contracts, and Web3 development, giving members hands-on experience with blockchain protocols and tools.",
    color: "#FF7A6B",
    image: "/assets/images/icons/blockchain.svg",
    formLink: "/6a89c4e2-7b19-4f32-821e-9821a41b5201",
  },
  {
    title: "Cloud &\nDevOps",
    description:
      "Explores cloud computing, infrastructure, and automation by building scalable applications, hosting hands-on workshops, and educating members about cloud platforms, containerization, CI/CD pipelines, and DevOps practices.",
    color: "#FBBC04",
    image: "/assets/images/icons/cloud.svg",
    formLink: "/a1d920df-9eb9-49eb-b3a4-e4a3d1245ede",
  },
  {
    title: "Game Dev",
    description:
      "Combines creativity and technical skills to design engaging, entertaining games, giving members hands-on experience with real-world game development tools, engines, and production workflows.",
    color: "#4285F4",
    image: "/assets/images/icons/game-dev.svg",
    formLink: "/9055864f-c7dc-44cd-91d5-8759d32a496a",
  },
  {
    title: "App Dev",
    description:
      "Builds intuitive, impactful mobile applications, improving accessibility, interaction, and convenience for members and event participants through functional, user-focused design.",
    color: "#EA4335",
    image: "/assets/images/icons/app-dev.svg",
    formLink: "/339f0f8a-72f2-44b9-92ab-2b0d4dcfa0f6",
  },
  {
    title: "UI/UX",
    description:
      "Designs visually appealing, user-friendly digital interfaces with a focus on accessibility, usability, and aesthetics, ensuring products provide enjoyable, intuitive, and meaningful user experiences.",
    color: "#0F9D58",
    image: "/assets/images/icons/ui-ux.svg",
    formLink: "/e2ed9c2c-c36c-457f-a8bb-cf2e8bc7c2e1",
  },
  {
    title: "Data\nScience",
    description:
      "Applies AI, machine learning, and analytics to transform data into actionable insights, helping solve problems, build predictive models, and inspire innovation across projects.",
    color: "#EA4335",
    image: "/assets/images/icons/data-science.svg",
    formLink: "/c0f3b1d1-ce05-45f6-9e34-ac9443fc5fcb",
  },
  {
    title: "Competitive Programming",
    description:
      "Promotes problem-solving skills through coding contests, hackathons, and peer learning, helping members sharpen algorithms, logic, and efficiency while preparing for real-world tech challenges.",
    color: "#0F9D58",
    image: "/assets/images/icons/cp.svg",
    formLink: "/3e9ac635-01d4-495e-aa87-a7335a2403c2",
  },
  {
    title: "Web Dev",
    description:
      "Designs, develops, and maintains responsive, high-performance websites for projects and events, using modern web technologies to enhance accessibility, user experience, and community engagement online.",
    color: "#FBBC04",
    image: "/assets/images/icons/web-dev.svg",
    formLink: "/8143de1d-db17-42fa-958d-13b10804f894",
  },
  {
    title: "Open\nSource",
    description:
      "Encourages members to contribute to open-source projects, building collaboration skills, real-world coding experience, and a culture of transparency, learning, and global tech impact.",
    color: "#4285F4",
    image: "/assets/images/icons/open-source.svg",
    formLink: "/ae7db51a-c6db-4f8d-9159-40767c5354cb",
  },
];

export const nonTechnicalCards = [
  {
    title: "Design",
    description:
      "Creates stunning visuals, event posters, and branding materials that capture the organization's identity, ensuring every design communicates creativity, professionalism, and excitement to engage the community.",
    color: "#329A4E",
    image: "/assets/images/icons/design.svg",
    formLink: "/d3beefc1-f8b0-4202-b26c-36e9804b6636",
  },
  {
    title: "Outreach",
    description:
      "Builds partnerships and expands outreach by connecting with communities, sponsors, and collaborators, ensuring diverse opportunities and impactful collaborations both within and beyond campus.",
    color: "#4285F4",
    image: "/assets/images/icons/outreach.svg",
    formLink: "/3936d5a2-acd9-4a98-ac97-42c2c92f5c02",
  },
  {
    title: "Publicity",
    description:
      "Drives online presence with creative campaigns, video editing, and storytelling, boosting engagement, promoting events, and showcasing the club to inspire participation and community growth.",
    color: "#EA4335",
    image: "/assets/images/icons/social-media.svg",
    formLink: "/4499a966-2740-4c36-88dd-8916a909fc77",
  },
  {
    title: "Management",
    description:
      "The backbone of the organization, turning vision into reality by planning, executing, and improvising. Oversees events, operations, and growth, ensuring smooth functioning, success, and impactful experiences.",
    color: "#FBBC04",
    image: "/assets/images/icons/management.svg",
    formLink: "/c21ca066-ab4d-40a3-943c-f170d6312bdc",
  },
];
