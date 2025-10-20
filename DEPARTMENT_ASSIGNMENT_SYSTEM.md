# Department Assignment and User Management System

## Overview

A comprehensive system for managing departments, users, and document assignments in the electronic registry (registratură). This system enables efficient routing and tracking of documents through the organization.

## Features

### 1. Department Management (`/admin/departments`)

- **Create/Edit/Delete** departments
- Assign **department heads** (responsible users)
- Track department descriptions and activities
- View all departments in a card-based layout

**Firestore Collection**: `departments`

**Fields**:
- `id` - Auto-generated document ID
- `name` - Department name (e.g., "Urbanism", "Stare Civilă")
- `description` - Department description
- `responsibleUserId` - User ID of department head
- `createdAt` - Creation timestamp
- `updatedAt` - Last update timestamp

### 2. User Management (`/admin/users`)

- **Create/Edit/Delete** users
- Assign users to departments
- Set user roles: Admin, Department Head, Employee
- Activate/Deactivate users
- View user status and department assignments

**Firestore Collection**: `users`

**Fields**:
- `id` - User ID (typically Firebase Auth UID)
- `email` - User email address
- `fullName` - Full name
- `role` - User role (admin | department_head | employee)
- `departmentId` - Assigned department ID
- `active` - Active status boolean
- `createdAt` - Creation timestamp
- `updatedAt` - Last update timestamp

### 3. Document Assignment System

Enhanced registratura with assignment capabilities:

#### Updated `registratura_emails` Schema:

**New Fields**:
- `assignedToUserId` - Assigned user ID
- `assignedToUserName` - Assigned user's full name (denormalized)
- `departmentId` - Assigned department ID
- `departmentName` - Department name (denormalized)
- `priority` - Document priority (urgent | normal | low)
- `deadline` - Calculated deadline timestamp
- `assignedAt` - Assignment timestamp
- `assignedBy` - User ID who made the assignment

#### Priority System:

- **Urgent** (⚡): 1 day deadline - Red badge
- **Normal** (🕐): 30 days deadline - Amber badge
- **Low** (📊): 60 days deadline - Gray badge

#### Visual Indicators:

- **Priority badges** - Show document urgency
- **Deadline badges** - Show time remaining (color-coded):
  - 🔴 Red: Overdue
  - 🟡 Amber: 3 days or less remaining
  - 🟢 Green: More than 3 days
- **Assignment info** - Display assigned department and user
- **Status badges** - Nou, În lucru, Rezolvat, Respins

### 4. Auto-Assignment Rules

The system automatically suggests departments based on email subject keywords:

**Built-in Rules** (`lib/utils/auto-assignment.ts`):

| Keywords | Department | Priority |
|----------|-----------|----------|
| autorizatie, construire, demolare | Urbanism | Normal |
| certificat, casatorie, nastere, deces | Stare Civilă | Normal |
| ajutor social, asistenta sociala | Asistență Socială | Normal |
| taxa, impozit, plata | Taxe și Impozite | Normal |
| iluminat, canalizare, strada, groapa | Lucrări Publice | Urgent |
| registru agricol, teren agricol | Agricultură | Low |

**Priority Keywords**:
- Words like "urgent", "emergency", "avarie", "pericol" trigger **Urgent** priority

### 5. Assignment Dialog

Interactive dialog for assigning documents:

- **Auto-suggestions** based on email subject
- **Department selection** with descriptions
- **User filtering** by selected department
- **Priority selection** with visual indicators
- **Assignment summary** before confirming

## File Structure

```
app/admin/
├── departments/
│   └── page.tsx           # Department management UI
├── users/
│   └── page.tsx           # User management UI
└── registratura/
    └── page.tsx           # Enhanced registry with assignments

components/admin/registratura/
└── AssignmentDialog.tsx   # Assignment dialog component

lib/utils/
├── deadline-utils.ts      # Deadline calculation utilities
└── auto-assignment.ts     # Auto-assignment rules

types/
├── departments.ts         # Department and User types
└── registratura.ts        # Updated with assignment fields
```

## Usage Guide

### Setting Up Departments

1. Navigate to `/admin/departments`
2. Click "Departament Nou"
3. Enter department name and description
4. Optionally assign a responsible user (department head)
5. Click "Creează"

### Managing Users

1. Navigate to `/admin/users`
2. Click "Utilizator Nou"
3. Enter user details:
   - Email (required)
   - Full Name (required)
   - Role (Admin, Department Head, or Employee)
   - Department assignment
   - Active status
4. Click "Creează"

### Assigning Documents

1. Navigate to `/admin/registratura`
2. Find the document you want to assign
3. Click the **User Plus icon** (👤+) button
4. In the assignment dialog:
   - Review auto-suggestions (if any)
   - Select department
   - Select specific user (optional)
   - Choose priority level
   - Review summary
5. Click "Atribuie"

**What Happens**:
- Document status changes to "În lucru"
- Deadline is calculated based on priority
- Assignment info is saved and displayed
- Department and user are notified (if notifications enabled)

### Viewing Assignment Status

In the registratura list, each email card shows:
- **Purple badge** - Assigned department
- **Blue badge** - Assigned user
- **Colored priority badge** - Urgent/Normal/Low
- **Deadline badge** - Days remaining (color-coded by urgency)

### Filtering and Monitoring

- Filter by status (Nou, În lucru, Rezolvat, Respins)
- Search by registration number, sender, subject
- Sort by date (newest/oldest first)
- Visual priority and deadline indicators help identify urgent items

## Technical Implementation

### Deadline Calculation

```typescript
// lib/utils/deadline-utils.ts
export function calculateDeadline(priority: EmailPriority, fromDate: Date = new Date()): Timestamp {
  const deadline = new Date(fromDate);
  switch (priority) {
    case 'urgent':
      deadline.setDate(deadline.getDate() + 1);
      break;
    case 'normal':
      deadline.setDate(deadline.getDate() + 30);
      break;
    case 'low':
      deadline.setDate(deadline.getDate() + 60);
      break;
  }
  return Timestamp.fromDate(deadline);
}
```

### Auto-Assignment Logic

```typescript
// lib/utils/auto-assignment.ts
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
```

### Assignment Handler

```typescript
const handleAssignment = async (
  departmentId: string | null,
  userId: string | null,
  priority: EmailPriority
) => {
  const department = departments.find(d => d.id === departmentId);
  const user = users.find(u => u.id === userId);
  const deadline = calculateDeadline(priority);

  await updateDoc(doc(db, COLLECTIONS.REGISTRATURA_EMAILS, emailId), {
    assignedToUserId: userId,
    assignedToUserName: user?.fullName || null,
    departmentId: departmentId,
    departmentName: department?.name || null,
    priority: priority,
    deadline: deadline,
    assignedAt: new Date(),
    status: 'in_lucru', // Auto-change status
  });
};
```

## Best Practices

### 1. Department Setup
- Create departments matching your organizational structure
- Assign department heads for accountability
- Keep descriptions clear and specific

### 2. User Management
- Use meaningful full names
- Assign appropriate roles
- Deactivate users instead of deleting (preserves assignment history)

### 3. Document Assignment
- Use auto-suggestions when available
- Set appropriate priority levels
- Assign to specific users for accountability
- Monitor deadlines regularly

### 4. Extending Auto-Assignment Rules

Edit `lib/utils/auto-assignment.ts` to add new rules:

```typescript
export const ASSIGNMENT_RULES: AssignmentRule[] = [
  {
    keywords: ['your', 'keywords', 'here'],
    departmentName: 'Your Department Name',
    priority: 'normal', // or 'urgent' or 'low'
  },
  // ... existing rules
];
```

## Navigation

The admin sidebar now includes:
- **Dashboard** - Overview
- **Cereri** - Requests
- **Registratură** - Electronic registry
- **Departamente** - Department management (NEW)
- **Utilizatori** - User management (NEW)
- **Probleme Raportate** - Reported issues
- **Notificări** - Notifications
- **Anunțuri** - Announcements
- **Joburi** - Job listings

## Future Enhancements

Potential improvements:
- Email notifications on assignment
- Workload distribution analytics
- Auto-reassignment on deadline approaching
- Department performance metrics
- User workload tracking
- Assignment history log
- Bulk assignment operations
- Custom priority rules per department

## Support

For questions or issues:
1. Check this documentation
2. Review type definitions in `/types`
3. Inspect auto-assignment rules in `/lib/utils/auto-assignment.ts`
4. Test in development environment first

## Created By

🤖 Generated with Claude Code
