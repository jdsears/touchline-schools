/**
 * National Curriculum for Physical Education (England, 2013 statutory framework)
 * Content for each key stage: activity areas, assessment strands, and pathways.
 */

export const KEY_STAGES = [
  {
    id: 'KS1',
    label: 'KS1',
    yearRange: 'Years 1–2',
    years: [1, 2],
    primaryOnly: true,
    description: 'Build foundational movement skills and a love of physical activity through play and exploration.',
    activityAreas: [
      { name: 'Fundamental Movement Skills', sports: ['Running', 'Jumping', 'Throwing', 'Catching', 'Kicking', 'Balancing'], color: 'pitch' },
      { name: 'Simple Team Games', sports: ['Tag Games', 'Target Games', 'Cooperative Games'], color: 'amber' },
      { name: 'Dance', sports: ['Creative Movement', 'Expressive Dance', 'Music & Rhythm'], color: 'pitch' },
      { name: 'Gymnastics', sports: ['Rolling', 'Balancing', 'Jumping', 'Climbing'], color: 'amber' },
    ],
    strands: [
      { name: 'Mastering Basic Movements', description: 'Run, jump, throw and catch with growing control and coordination' },
      { name: 'Agility, Balance & Coordination', description: 'Develop physical literacy through varied movement challenges' },
      { name: 'Participation in Team Games', description: 'Develop simple rules, fair play, and cooperative play' },
      { name: 'Creative Performance', description: 'Perform dances and sequences using simple movement patterns' },
    ],
  },
  {
    id: 'KS2',
    label: 'KS2',
    yearRange: 'Years 3–6',
    years: [3, 4, 5, 6],
    primaryOnly: true,
    description: 'Broaden and deepen competence across activity areas, including statutory swimming.',
    activityAreas: [
      { name: 'Invasion Games', sports: ['Football', 'Netball', 'Tag Rugby', 'Basketball', 'Hockey'], color: 'pitch' },
      { name: 'Net/Wall Games', sports: ['Tennis', 'Badminton', 'Short Tennis'], color: 'amber' },
      { name: 'Striking & Fielding', sports: ['Cricket', 'Rounders', 'Softball'], color: 'pitch' },
      { name: 'Athletics', sports: ['Running', 'Jumping', 'Throwing'], color: 'amber' },
      { name: 'Gymnastics', sports: ['Floor Sequences', 'Apparatus', 'Vaulting'], color: 'pitch' },
      { name: 'Dance', sports: ['Folk Dance', 'Cultural Dance', 'Creative Composition'], color: 'amber' },
      { name: 'Swimming (Statutory)', sports: ['25m Unaided (by end of KS2)', 'Front Crawl', 'Backstroke', 'Breaststroke', 'Water Safety'], color: 'pitch' },
      { name: 'Outdoor & Adventurous', sports: ['Orienteering', 'Problem Solving', 'Team Challenges'], color: 'amber' },
    ],
    strands: [
      { name: 'Developing Competence', description: 'Apply and develop skills across a range of physical activities' },
      { name: 'Performing with Control', description: 'Execute movements with increasing accuracy and fluency' },
      { name: 'Making Decisions', description: 'Apply simple rules, strategies and tactics to games and activities' },
      { name: 'Evaluating Performance', description: 'Watch, describe and improve own and others\' performance' },
    ],
  },
  {
    id: 'KS3',
    label: 'KS3',
    yearRange: 'Years 7–9',
    years: [7, 8, 9],
    primaryOnly: false,
    description: 'Develop confidence, competence and broader understanding across the full range of activity areas.',
    activityAreas: [
      { name: 'Invasion Games', sports: ['Football', 'Rugby', 'Hockey', 'Netball', 'Basketball', 'Handball'], color: 'pitch' },
      { name: 'Net/Wall Games', sports: ['Badminton', 'Tennis', 'Table Tennis', 'Volleyball'], color: 'amber' },
      { name: 'Striking & Fielding', sports: ['Cricket', 'Rounders'], color: 'pitch' },
      { name: 'Athletics', sports: ['Track Events', 'Field Events', 'Cross Country'], color: 'amber' },
      { name: 'Gymnastics', sports: ['Floor', 'Apparatus', 'Acrobatics'], color: 'pitch' },
      { name: 'Dance', sports: ['Creative', 'Cultural', 'Performance'], color: 'amber' },
      { name: 'Swimming', sports: ['Stroke Development', 'Water Safety', 'Life Saving'], color: 'pitch' },
      { name: 'Outdoor & Adventurous', sports: ['Orienteering', 'Climbing', 'Kayaking', 'Team Challenges'], color: 'amber' },
    ],
    strands: [
      { name: 'Physical Competence', description: 'Develop competence to excel in a broad range of physical activities' },
      { name: 'Rules, Strategies & Tactics', description: 'Apply rules, strategies and tactics across different sports and activities' },
      { name: 'Health and Fitness', description: 'Understand how to lead a healthy, active lifestyle and improve fitness' },
      { name: 'Evaluation and Improvement', description: 'Analyse performance, identify strengths and areas for development' },
    ],
  },
  {
    id: 'KS4',
    label: 'KS4 / GCSE',
    yearRange: 'Years 10–11',
    years: [10, 11],
    primaryOnly: false,
    description: 'Core PE continues for all; GCSE PE available as an examined option.',
    activityAreas: [
      { name: 'Invasion Games', sports: ['Football', 'Rugby', 'Hockey', 'Netball', 'Basketball'], color: 'pitch' },
      { name: 'Net/Wall Games', sports: ['Badminton', 'Tennis', 'Table Tennis', 'Volleyball'], color: 'amber' },
      { name: 'Striking & Fielding', sports: ['Cricket', 'Rounders'], color: 'pitch' },
      { name: 'Athletics', sports: ['Track Events', 'Field Events', 'Multi-Sport'], color: 'amber' },
      { name: 'Fitness Activities', sports: ['Gym & Conditioning', 'Yoga', 'Cycling', 'Swimming'], color: 'pitch' },
      { name: 'Outdoor & Adventurous', sports: ['Duke of Edinburgh', 'Orienteering', 'Climbing'], color: 'amber' },
    ],
    strands: [
      { name: 'Performance Excellence', description: 'Demonstrate high-level technical competence in chosen activities' },
      { name: 'Health and Wellbeing', description: 'Apply knowledge of training principles and healthy lifestyle choices' },
      { name: 'Tactical & Technical Development', description: 'Analyse and apply advanced strategies, rules and tactics' },
      { name: 'Leadership & Officiating', description: 'Lead warm-ups, coach peers, and fulfil officiating roles' },
    ],
    pathways: [
      {
        id: 'gcse',
        label: 'GCSE Physical Education',
        examBoard: 'AQA (default)',
        components: [
          { label: 'Practical Performance', weight: '30%', detail: '3 assessed activities: 1 team, 1 individual, 1 free choice from approved list' },
          { label: 'Socio-Cultural Influences & Sport Psychology', weight: '30%', detail: 'Written exam: participation trends, ethics, psychology, health and wellbeing' },
          { label: 'Applied Anatomy, Physiology & Physical Training', weight: '30%', detail: 'Written exam: skeletal system, muscular system, cardiovascular, training principles' },
          { label: 'Analysis & Evaluation of Performance (AEP)', weight: '10%', detail: 'Coursework: analyse own or others\' performance and plan improvements' },
        ],
      },
    ],
  },
  {
    id: 'KS5',
    label: 'KS5 / Post-16',
    yearRange: 'Years 12–13',
    years: [12, 13],
    primaryOnly: false,
    description: 'Core PE as enrichment; A-Level PE and BTEC Sport as examined routes.',
    activityAreas: [
      { name: 'Enrichment PE', sports: ['Student-Led Activities', 'Recreational Sport', 'Fitness'], color: 'pitch' },
      { name: 'Leadership', sports: ['Sports Leadership Awards', 'Coaching Qualifications', 'Officiating'], color: 'amber' },
      { name: 'Community & Clubs', sports: ['Duke of Edinburgh', 'Interschool Competition', 'External Clubs'], color: 'pitch' },
    ],
    strands: [
      { name: 'Independent Participation', description: 'Self-motivated engagement in lifelong physical activity' },
      { name: 'Leadership & Coaching', description: 'Lead, coach and officiate for peers and younger pupils' },
      { name: 'Applied Knowledge', description: 'Connect theoretical study (A-Level/BTEC) to practical contexts' },
    ],
    pathways: [
      {
        id: 'alevel',
        label: 'A-Level Physical Education',
        examBoard: 'AQA (default)',
        components: [
          { label: 'Paper 1: Factors Affecting Participation', weight: '35%', detail: 'Applied anatomy & physiology, skill acquisition, socio-cultural studies' },
          { label: 'Paper 2: Factors Affecting Optimal Performance', weight: '35%', detail: 'Exercise physiology, biomechanics, sport psychology, coaching science' },
          { label: 'NEA: Practical Performance', weight: '15%', detail: 'Assessed in 1 sport (player or official or coach)' },
          { label: 'NEA: Performance Analysis', weight: '15%', detail: 'Written analysis of own or elite performance with improvement plan' },
        ],
      },
      {
        id: 'btec',
        label: 'BTEC Sport (Level 3)',
        examBoard: 'Pearson',
        components: [
          { label: 'Unit 1: Anatomy & Physiology', weight: 'Mandatory', detail: 'Externally assessed: skeletal, muscular and cardiovascular systems' },
          { label: 'Unit 2: Fitness Training & Programming', weight: 'Mandatory', detail: 'Externally assessed: fitness testing, training programme design' },
          { label: 'Unit 3: Professional Development', weight: 'Mandatory', detail: 'Internal coursework: career planning, personal development' },
          { label: 'Optional Units', weight: 'Variable', detail: 'Sports leadership, sports massage, coaching, sports psychology, and more' },
        ],
      },
    ],
  },
]

export function getKS(id) {
  return KEY_STAGES.find(ks => ks.id === id) || KEY_STAGES[2]
}
