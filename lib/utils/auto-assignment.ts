/**
 * Auto-assignment rules based on email subject keywords
 */

export interface AssignmentRule {
  keywords: string[];
  departmentName: string;
  priority?: 'urgent' | 'normal' | 'low';
}

export const ASSIGNMENT_RULES: AssignmentRule[] = [
  {
    keywords: ['autorizatie', 'autorizație', 'construire', 'constructie', 'construcție', 'demolare', 'amenajare'],
    departmentName: 'Urbanism',
    priority: 'normal',
  },
  {
    keywords: ['certificat', 'casatorie', 'căsătorie', 'nastere', 'naștere', 'deces', 'stare civila', 'stare civilă'],
    departmentName: 'Stare Civilă',
    priority: 'normal',
  },
  {
    keywords: ['ajutor social', 'asistenta sociala', 'asistență socială', 'venit minim', 'alocatie', 'alocație'],
    departmentName: 'Asistență Socială',
    priority: 'normal',
  },
  {
    keywords: ['taxa', 'impozit', 'plata', 'plată', 'penalitate', 'amenda', 'amendă'],
    departmentName: 'Taxe și Impozite',
    priority: 'normal',
  },
  {
    keywords: ['iluminat', 'canalizare', 'strada', 'drum', 'asfalt', 'groapa', 'groapă'],
    departmentName: 'Lucrări Publice',
    priority: 'urgent',
  },
  {
    keywords: ['registru agricol', 'teren agricol', 'animale', 'gospodarie'],
    departmentName: 'Agricultură',
    priority: 'low',
  },
];

/**
 * Find matching department based on email subject
 */
export function findDepartmentBySubject(subject: string): string | null {
  const lowerSubject = subject.toLowerCase();

  for (const rule of ASSIGNMENT_RULES) {
    for (const keyword of rule.keywords) {
      if (lowerSubject.includes(keyword)) {
        return rule.departmentName;
      }
    }
  }

  return null;
}

/**
 * Get suggested priority based on email subject
 */
export function getSuggestedPriority(subject: string): 'urgent' | 'normal' | 'low' {
  const lowerSubject = subject.toLowerCase();

  // Check for urgent keywords
  const urgentKeywords = ['urgent', 'emergency', 'avarie', 'pericol', 'pericolul'];
  if (urgentKeywords.some(keyword => lowerSubject.includes(keyword))) {
    return 'urgent';
  }

  // Check assignment rules for priority
  for (const rule of ASSIGNMENT_RULES) {
    for (const keyword of rule.keywords) {
      if (lowerSubject.includes(keyword) && rule.priority) {
        return rule.priority;
      }
    }
  }

  return 'normal';
}
