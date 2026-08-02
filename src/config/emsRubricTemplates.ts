import { EmsRubricCriteria } from '../types';

export type EmsRubricPresetItem = Omit<EmsRubricCriteria, 'id' | 'event_id'>;

export const IFAMB_SHOWCASE_PRESET: EmsRubricPresetItem[] = [
  // Section 1: TIKTOK PROMOTION (25%)
  {
    category_name: 'Best Showcase',
    section_name: 'TIKTOK PROMOTION (25%)',
    criteria_name: 'Creativity & Originality of Video Content',
    max_score: 5,
    weight: 10,
    sort_order: 1,
    descriptors: {
      '5': 'Highly creative, original and engaging',
      '4': 'Creative with minor originality',
      '3': 'Moderately creative',
      '2': 'Limited creativity',
      '1': 'No creativity or originality'
    }
  },
  {
    category_name: 'Best Showcase',
    section_name: 'TIKTOK PROMOTION (25%)',
    criteria_name: 'Content Quality',
    max_score: 5,
    weight: 5,
    sort_order: 2,
    descriptors: {
      '5': 'Clear, professional and highly informative',
      '4': 'Clear and informative',
      '3': 'Adequate with minor weaknesses',
      '2': 'Unclear or incomplete',
      '1': 'Poor quality and difficult to understand'
    }
  },
  {
    category_name: 'Best Showcase',
    section_name: 'TIKTOK PROMOTION (25%)',
    criteria_name: 'Promotional Effectiveness',
    max_score: 5,
    weight: 5,
    sort_order: 3,
    descriptors: {
      '5': 'Excellent audience engagement and reach',
      '4': 'Good engagement',
      '3': 'Moderate engagement',
      '2': 'Low engagement',
      '1': 'Little or no engagement'
    }
  },
  {
    category_name: 'Best Showcase',
    section_name: 'TIKTOK PROMOTION (25%)',
    criteria_name: 'Official Hashtags & Competition Compliance',
    max_score: 5,
    weight: 5,
    sort_order: 4,
    descriptors: {
      '5': 'Fully complies and uses all required hashtags',
      '4': 'Minor omissions',
      '3': 'Partially complies',
      '2': 'Complies',
      '1': 'Does not comply'
    }
  },
  // Section 2: BOOTH EXHIBITION / SHOWCASE (25%)
  {
    category_name: 'Best Showcase',
    section_name: 'BOOTH EXHIBITION / SHOWCASE (25%)',
    criteria_name: 'Booth Design & Branding',
    max_score: 5,
    weight: 10,
    sort_order: 5,
    descriptors: {
      '5': 'Professional, attractive, and well-branded booth with a strong visual identity.',
      '4': 'Well-designed booth with clear branding and good visual appeal.',
      '3': 'Adequate booth design with acceptable branding.',
      '2': 'Basic booth design with limited branding.',
      '1': 'Poorly designed booth with little or no branding.'
    }
  },
  {
    category_name: 'Best Showcase',
    section_name: 'BOOTH EXHIBITION / SHOWCASE (25%)',
    criteria_name: 'Booth Layout & Product Organization',
    max_score: 5,
    weight: 5,
    sort_order: 6,
    descriptors: {
      '5': 'Products are well-organized, easy to view, and logically arranged.',
      '4': 'Products are neatly displayed with good organization.',
      '3': 'Products are adequately organized with minor issues.',
      '2': 'Products are poorly arranged and difficult to navigate.',
      '1': 'Products are disorganized and poorly displayed.'
    }
  },
  {
    category_name: 'Best Showcase',
    section_name: 'BOOTH EXHIBITION / SHOWCASE (25%)',
    criteria_name: 'Creativity & Visual Presentation',
    max_score: 5,
    weight: 5,
    sort_order: 7,
    descriptors: {
      '5': 'Highly creative and visually impressive presentation.',
      '4': 'Creative and visually appealing presentation.',
      '3': 'Moderately creative with an acceptable presentation.',
      '2': 'Limited creativity and visual appeal.',
      '1': 'Lacks creativity and visual impact.'
    }
  },
  {
    category_name: 'Best Showcase',
    section_name: 'BOOTH EXHIBITION / SHOWCASE (25%)',
    criteria_name: 'Cleanliness, Tidiness & Safety',
    max_score: 5,
    weight: 5,
    sort_order: 8,
    descriptors: {
      '5': 'Booth is clean, tidy, safe, and well-maintained.',
      '4': 'Booth is clean and tidy with minor issues.',
      '3': 'Generally clean and safe.',
      '2': 'Noticeable cleanliness or safety issues.',
      '1': 'Untidy, unsafe, or poorly maintained booth.'
    }
  },
  // Section 3: CUSTOMER INTERACTION (25%)
  {
    category_name: 'Best Showcase',
    section_name: 'CUSTOMER INTERACTION (25%)',
    criteria_name: 'Communication & Presentation Skills',
    max_score: 5,
    weight: 10,
    sort_order: 9,
    descriptors: {
      '5': 'Communicates clearly, confidently, and professionally.',
      '4': 'Communicates effectively with good confidence.',
      '3': 'Communicates adequately with minor hesitation.',
      '2': 'Communication lacks clarity and confidence.',
      '1': 'Unable to communicate effectively.'
    }
  },
  {
    category_name: 'Best Showcase',
    section_name: 'CUSTOMER INTERACTION (25%)',
    criteria_name: 'Professionalism & Customer Service',
    max_score: 5,
    weight: 5,
    sort_order: 10,
    descriptors: {
      '5': 'Consistently professional, courteous, and customer-focused.',
      '4': 'Professional and courteous with minor improvements needed.',
      '3': 'Generally professional with acceptable customer service.',
      '2': 'Limited professionalism and customer service.',
      '1': 'Unprofessional attitude and poor customer service.'
    }
  },
  {
    category_name: 'Best Showcase',
    section_name: 'CUSTOMER INTERACTION (25%)',
    criteria_name: 'Ability to Engage & Attract Customers',
    max_score: 5,
    weight: 5,
    sort_order: 11,
    descriptors: {
      '5': 'Actively engages customers and creates strong interest.',
      '4': 'Engages customers effectively.',
      '3': 'Shows moderate customer engagement.',
      '2': 'Limited effort to engage customers.',
      '1': 'Fails to engage or attract customers.'
    }
  },
  {
    category_name: 'Best Showcase',
    section_name: 'CUSTOMER INTERACTION (25%)',
    criteria_name: 'Salesmanship, Confidence & Persuasion Skills',
    max_score: 5,
    weight: 5,
    sort_order: 12,
    descriptors: {
      '5': 'Highly confident, persuasive, and demonstrates excellent salesmanship.',
      '4': 'Confident and persuasive with good sales techniques.',
      '3': 'Demonstrates acceptable confidence and sales skills.',
      '2': 'Limited confidence and persuasion ability.',
      '1': 'Fails to demonstrate salesmanship.'
    }
  },
  // Section 4: Question & Answer - Q&A (25%)
  {
    category_name: 'Best Showcase',
    section_name: 'Question & Answer - Q&A (25%)',
    criteria_name: 'Product Knowledge & Understanding',
    max_score: 5,
    weight: 10,
    sort_order: 13,
    descriptors: {
      '5': 'Demonstrates comprehensive product knowledge.',
      '4': 'Demonstrates good product knowledge.',
      '3': 'Demonstrates adequate product knowledge.',
      '2': 'Demonstrates limited product knowledge.',
      '1': 'Demonstrates insufficient product knowledge.'
    }
  },
  {
    category_name: 'Best Showcase',
    section_name: 'Question & Answer - Q&A (25%)',
    criteria_name: 'Confidence & Professionalism',
    max_score: 5,
    weight: 5,
    sort_order: 14,
    descriptors: {
      '5': 'Responds confidently and professionally.',
      '4': 'Responds with confidence and professionalism.',
      '3': 'Responds with moderate confidence.',
      '2': 'Responds with limited confidence.',
      '1': 'Lacks confidence and professionalism.'
    }
  },
  {
    category_name: 'Best Showcase',
    section_name: 'Question & Answer - Q&A (25%)',
    criteria_name: 'Accuracy & Clarity of Responses',
    max_score: 5,
    weight: 5,
    sort_order: 15,
    descriptors: {
      '5': 'Responses are accurate, clear, and well-structured.',
      '4': 'Responses are mostly accurate and clear.',
      '3': 'Responses are generally accurate with minor errors.',
      '2': 'Responses lack clarity or accuracy.',
      '1': 'Responses are inaccurate or unclear.'
    }
  },
  {
    category_name: 'Best Showcase',
    section_name: 'Question & Answer - Q&A (25%)',
    criteria_name: 'Ability to Respond Effectively to Spontaneous Questions',
    max_score: 5,
    weight: 5,
    sort_order: 16,
    descriptors: {
      '5': 'Responds accurately and confidently to spontaneous questions.',
      '4': 'Responds well with minor hesitation.',
      '3': 'Responds adequately with some hesitation.',
      '2': 'Struggles to answer spontaneous questions.',
      '1': 'Unable to respond effectively to spontaneous questions.'
    }
  }
];

export const IFAMB_PITCHING_PRESET: EmsRubricPresetItem[] = [
  {
    category_name: 'Best Pitching',
    section_name: 'Pembentangan & Pitched Idea (100%)',
    criteria_name: 'Product Name',
    max_score: 5,
    weight: 5,
    sort_order: 1,
    descriptors: {
      '5': 'Clear, memorable, unique, and reflects the product well',
      '4': 'Clear and relevant',
      '3': 'Adequate but lacks creativity',
      '2': 'Confusing or too generic',
      '1': 'No product name or irrelevant'
    }
  },
  {
    category_name: 'Best Pitching',
    section_name: 'Pembentangan & Pitched Idea (100%)',
    criteria_name: 'Participant Names & Institution',
    max_score: 5,
    weight: 5,
    sort_order: 2,
    descriptors: {
      '5': 'Complete, accurate, and professionally presented',
      '4': 'Minor formatting issues',
      '3': 'Mostly complete',
      '2': 'Incomplete information',
      '1': 'Missing information'
    }
  },
  {
    category_name: 'Best Pitching',
    section_name: 'Pembentangan & Pitched Idea (100%)',
    criteria_name: 'Problem Statement',
    max_score: 5,
    weight: 15,
    sort_order: 3,
    descriptors: {
      '5': 'Clearly identifies a significant problem supported by relevant evidence',
      '4': 'Problem is clear and relevant',
      '3': 'Problem is understandable but lacks detail',
      '2': 'Problem is vague',
      '1': 'No clear problem identified'
    }
  },
  {
    category_name: 'Best Pitching',
    section_name: 'Pembentangan & Pitched Idea (100%)',
    criteria_name: 'Solution / Product Benefits',
    max_score: 5,
    weight: 15,
    sort_order: 4,
    descriptors: {
      '5': 'Solution effectively addresses the problem with clear and compelling benefits',
      '4': 'Solution is relevant with good explanation',
      '3': 'Benefits are adequate',
      '2': 'Benefits are unclear or weak',
      '1': 'Solution does not address the problem'
    }
  },
  {
    category_name: 'Best Pitching',
    section_name: 'Pembentangan & Pitched Idea (100%)',
    criteria_name: 'Product Impact',
    max_score: 5,
    weight: 15,
    sort_order: 5,
    descriptors: {
      '5': 'Demonstrates strong economic, social, environmental, or commercial impact with convincing evidence',
      '4': 'Good explanation of impact',
      '3': 'Moderate impact described',
      '2': 'Limited impact explained',
      '1': 'No clear impact presented'
    }
  },
  {
    category_name: 'Best Pitching',
    section_name: 'Pembentangan & Pitched Idea (100%)',
    criteria_name: 'Target Market & Commercial Potential',
    max_score: 5,
    weight: 15,
    sort_order: 6,
    descriptors: {
      '5': 'Clearly identifies target customers and demonstrates strong market potential and scalability',
      '4': 'Good target market analysis',
      '3': 'Basic target market identified',
      '2': 'Limited market understanding',
      '1': 'No target market identified'
    }
  },
  {
    category_name: 'Best Pitching',
    section_name: 'Pembentangan & Pitched Idea (100%)',
    criteria_name: 'Images / Charts / Diagrams',
    max_score: 5,
    weight: 10,
    sort_order: 7,
    descriptors: {
      '5': 'High-quality visuals that effectively support and enhance understanding',
      '4': 'Good visuals with minor improvements needed',
      '3': 'Adequate visuals',
      '2': 'Poor quality or limited visuals',
      '1': 'No visuals or irrelevant visuals'
    }
  },
  {
    category_name: 'Best Pitching',
    section_name: 'Pembentangan & Pitched Idea (100%)',
    criteria_name: 'Overall Poster Design & Presentation',
    max_score: 5,
    weight: 10,
    sort_order: 8,
    descriptors: {
      '5': 'Professional, visually attractive, well-organised, easy to read, and excellent use of layout',
      '4': 'Attractive and well-organised',
      '3': 'Acceptable layout',
      '2': 'Cluttered or inconsistent design',
      '1': 'Difficult to read or poorly organised'
    }
  },
  {
    category_name: 'Best Pitching',
    section_name: 'Pembentangan & Pitched Idea (100%)',
    criteria_name: 'Question & Answer (Q&A)',
    max_score: 5,
    weight: 5,
    sort_order: 9,
    descriptors: {
      '5': 'Accurate, confident, and professional responses.',
      '4': 'Mostly accurate and confident responses.',
      '3': 'Adequate responses with minor hesitation.',
      '2': 'Limited knowledge and unclear responses.',
      '1': 'Unable to answer accurately.'
    }
  },
  {
    category_name: 'Best Pitching',
    section_name: 'Pembentangan & Pitched Idea (100%)',
    criteria_name: 'Presentation Skills & Confidence',
    max_score: 5,
    weight: 5,
    sort_order: 10,
    descriptors: {
      '5': 'Clear, confident, engaging, and professional presentation.',
      '4': 'Clear and confident presentation with good engagement.',
      '3': 'Satisfactory presentation with moderate confidence.',
      '2': 'Limited confidence and audience engagement.',
      '1': 'Unclear presentation with low confidence.'
    }
  }
];
