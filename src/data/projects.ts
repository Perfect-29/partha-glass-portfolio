import type { Project } from './portfolioData';

export interface FeaturedProject extends Project {
  applications: string[];
}

export const FEATURED_PROJECTS: FeaturedProject[] = [
  {
    id: 'sentinel-x',
    kind: 'software',
    title: 'Sentinel X',
    subtitle: 'AI-Based Intelligent Technology Project',
    category: 'AI Technology',
    status: 'Concept',
    poster: '/assets/thumbnails/Sentinel-X.webp',
    description: 'An AI-focused project concept. Specific implementation details have not yet been documented.',
    problem: 'A verified problem statement has not yet been provided.',
    objectives: ['Document the project scope and objectives once confirmed.'],
    features: ['Verified feature details are not yet available.'],
    tags: [],
    applications: ['Specific real-world applications have not yet been documented.'],
  },
  {
    id: 'svhec-smart-lab',
    kind: 'software',
    title: 'SVHEC Smart Lab',
    subtitle: 'AI Face Recognition',
    category: 'Artificial Intelligence',
    status: 'In Development',
    poster: '/assets/thumbnails/SVHEC-Smart-Lab-AI-Face-Recognition.webp',
    description: 'A face-recognition system concept for automating student lab entry and exit, verification, and computer allocation.',
    problem: 'Manual lab entry, exit, and computer allocation can be time-consuming and difficult to track consistently.',
    objectives: [
      'Recognize students during lab entry and exit.',
      'Support student verification and activity tracking.',
      'Automate computer allocation and provide administrator analytics.',
    ],
    solution: 'Connect face recognition to a web-based management dashboard for student verification and lab activity records.',
    implementation: 'The project is being developed with Python, Flask, OpenCV, deep-learning face-recognition models, and SQL or Firebase.',
    features: [
      'Real-time face detection and recognition',
      'Student verification',
      'Automatic computer allocation',
      'Entry and exit tracking',
      'Administrator dashboard and analytics',
    ],
    tags: ['Python', 'Flask', 'OpenCV', 'Deep Learning', 'SQL / Firebase'],
    applications: [
      'Automate student access and attendance workflows in computer laboratories.',
      'Help administrators coordinate lab usage and computer allocation.',
    ],
  },
  {
    id: 'land-stack',
    kind: 'software',
    title: 'LAND-STACK',
    subtitle: 'GIS Land Governance',
    category: 'GIS & Data Science',
    status: 'Concept',
    poster: '/assets/thumbnails/LAND-STACK-GIS-Land-Governance.webp',
    description: 'A GIS platform concept for organizing land information, urban parcel mapping, and geospatial analysis.',
    problem: 'Urban land information can be difficult to organize and analyze without an integrated geospatial platform.',
    objectives: [
      'Explore land-information management.',
      'Support urban parcel mapping.',
      'Enable geospatial analysis and visualization.',
    ],
    solution: 'Explore a GIS-based application for organizing and presenting land-parcel information.',
    implementation: 'The proposed stack includes Python, Flask, GIS, JavaScript, and geospatial technologies.',
    features: [
      'Land-information organization',
      'Urban parcel mapping',
      'Geospatial data analysis',
    ],
    tags: ['Python', 'Flask', 'GIS', 'JavaScript', 'Geospatial Technologies'],
    applications: [
      'Organize land and parcel information for review.',
      'Support geospatial analysis in land-governance workflows.',
    ],
  },
  {
    id: 'omniverse',
    kind: 'software',
    title: 'OMNIVERSE',
    subtitle: 'Future City 2050',
    category: 'Future Technology',
    status: 'Concept',
    poster: '/assets/thumbnails/OMNIVERSE-Future-City-2050.webp',
    description: 'A smart-city concept exploring AI-powered urban environments, intelligent infrastructure, and connected technology.',
    problem: 'Future urban environments offer opportunities to explore connected, intelligent, and sustainable infrastructure concepts.',
    objectives: [
      'Explore AI-powered smart-city concepts.',
      'Visualize connected future infrastructure.',
      'Present ideas for intelligent urban environments.',
    ],
    solution: 'OMNIVERSE is a concept project for exploring a connected future-city experience.',
    implementation: 'A specific implementation stack has not yet been verified.',
    features: [
      'Future-city concept exploration',
      'Connected infrastructure visualization',
      'Smart-city technology themes',
    ],
    tags: [],
    applications: [
      'Explore and communicate future smart-city planning concepts.',
      'Specific deployed use cases have not yet been documented.',
    ],
  },
  {
    id: 'sih-urban-parcel-mapping',
    kind: 'software',
    title: 'SIH Urban Parcel Mapping',
    subtitle: 'Geospatial Technology',
    category: 'Geospatial Technology',
    status: 'Academic Project',
    poster: '/assets/thumbnails/SIH-Urban-Parcel-Mapping.webp',
    description: 'A geospatial project focused on urban parcel mapping and spatial-data analysis.',
    problem: 'Urban parcel boundaries and spatial information require structured mapping and analysis.',
    objectives: [
      'Explore automated urban parcel mapping.',
      'Analyze geospatial and spatial datasets.',
      'Present parcel information for decision support.',
    ],
    solution: 'Combine geospatial processing with Python analysis and mapping-focused application components.',
    implementation: 'The listed technology stack includes Python, Flask, GIS, OpenCV, Shapely, and Pandas.',
    features: [
      'Urban parcel mapping',
      'Spatial-data analysis',
      'Parcel information for decision support',
    ],
    tags: ['Python', 'Flask', 'GIS', 'OpenCV', 'Shapely', 'Pandas'],
    applications: [
      'Support urban parcel inventories and mapping workflows.',
      'Help organize spatial information for planning and decision support.',
    ],
  },
  {
    id: 'parthas-kitchen',
    kind: 'software',
    title: "Partha's Kitchen",
    subtitle: 'Restaurant Management',
    category: 'Software',
    status: 'In Development',
    poster: '/assets/thumbnails/Parthas-Kitchen-Restaurant-Management.webp',
    description: 'A restaurant ordering and management platform concept with QR-based table access, a digital menu, order management, and billing.',
    problem: 'Restaurant ordering can involve manual table management, repeated order communication, and billing coordination.',
    objectives: [
      'Provide QR-based access for individual tables.',
      'Manage a digital menu and table-based orders.',
      'Calculate bills and support customer and administrator management.',
    ],
    solution: 'Connect table QR codes with menu, order, billing, and administrative workflows.',
    implementation: 'The project uses HTML, CSS, JavaScript, Python or Flask, and Firebase or SQL.',
    features: [
      'Table QR codes',
      'Digital menu',
      'Table-based ordering',
      'Automatic bill calculation',
      'Customer information management',
      'Administrator management',
    ],
    tags: ['HTML', 'CSS', 'JavaScript', 'Python / Flask', 'Firebase / SQL'],
    applications: [
      'Let restaurant guests access menus and place table-based orders.',
      'Help restaurant staff coordinate orders and billing.',
    ],
  },
];

export function resolveFeaturedProjects(liveProjects: readonly Project[]): FeaturedProject[] {
  if (!liveProjects.length) return FEATURED_PROJECTS;

  const featuredIds = new Set(FEATURED_PROJECTS.map((project) => project.id));
  const featuredProjects = FEATURED_PROJECTS.flatMap((featured) => {
    const liveProject = liveProjects.find((project) => project.id === featured.id);
    if (!liveProject) return [];

    return [{
      ...featured,
      ...liveProject,
      id: featured.id,
      poster: liveProject.poster?.trim() || featured.poster,
      description: liveProject.description?.trim() || featured.description,
      problem: liveProject.problem?.trim() || featured.problem,
      objectives: liveProject.objectives?.length ? liveProject.objectives : featured.objectives,
      solution: liveProject.solution?.trim() || featured.solution,
      implementation: liveProject.implementation?.trim() || featured.implementation,
      features: liveProject.features?.length ? liveProject.features : featured.features,
      tags: liveProject.tags?.length ? liveProject.tags : featured.tags,
      applications: liveProject.applications?.length ? liveProject.applications : featured.applications,
    }];
  });

  const additionalProjects = liveProjects
    .filter((project) => !featuredIds.has(project.id))
    .map((project) => ({ ...project, applications: project.applications ?? [] }));

  return [...featuredProjects, ...additionalProjects];
}
